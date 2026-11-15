import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomInt } from 'node:crypto';
import { Model, Types } from 'mongoose';
import { InternalPetsService } from '../internal-services/internal-pets.service';
import { EmailService } from '../notifications/email.service';
import { buildClinicAccessGrantedEmail } from '../notifications/email-templates';
import { InternalPetForVet } from '../internal-services/models/internal-pet-for-vet.model';
import { PetOwnershipService } from '../pets/pet-ownership.service';
import { PetActivityEventModel } from './models/pet-activity-event.model';
import { PetClinicAccessModel } from './models/pet-clinic-access.model';
import { PetShareCodeModel } from './models/pet-share-code.model';
import {
  PetShareCode,
  PetShareCodeDocument,
} from './schemas/pet-share-code.schema';
import { VetBackendClient } from './vet-backend.client';

/** Unambiguous characters (no 0/O, 1/I/L). 31^8 ≈ 8.5e11 combinations. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

/**
 * Owner-controlled clinic access, e-sveikata style: the owner generates a
 * one-time code for a pet and shows it at the clinic; the clinic redeems it
 * through the Vet backend. The owner can see and revoke clinic access anytime.
 */
@Injectable()
export class ClinicAccessService {
  static readonly CODE_TTL_MS = 15 * 60 * 1000;
  static readonly DEFAULT_ACTIVITY_LIMIT = 50;
  static readonly MAX_ACTIVITY_LIMIT = 200;
  static readonly INVALID_CODE_MESSAGE =
    'This code is invalid or has expired. Ask the owner to generate a new one.';

  constructor(
    @InjectModel(PetShareCode.name)
    private readonly shareCodeModel: Model<PetShareCodeDocument>,
    private readonly petOwnershipService: PetOwnershipService,
    private readonly internalPetsService: InternalPetsService,
    private readonly vetBackendClient: VetBackendClient,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private readonly logger = new Logger(ClinicAccessService.name);

  async createShareCode(
    ownerId: string,
    petId: string,
  ): Promise<PetShareCodeModel> {
    await this.petOwnershipService.assertPetBelongsToOwner(ownerId, petId);

    const petObjectId = new Types.ObjectId(petId);
    // Only one valid code per pet at a time.
    await this.shareCodeModel
      .deleteMany({ petId: petObjectId, usedAt: null })
      .exec();

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + ClinicAccessService.CODE_TTL_MS);
    await this.shareCodeModel.create({
      petId: petObjectId,
      ownerId: new Types.ObjectId(ownerId),
      codeHash: this.hashCode(code),
      expiresAt,
      usedAt: null,
      usedByVetClinicId: null,
    });

    return { code: this.formatCode(code), expiresAt };
  }

  /** Called by the Vet backend (service-to-service). Single use. */
  async redeemShareCode(
    rawCode: string,
    vetClinicId: string,
    clinicName?: string | null,
  ): Promise<InternalPetForVet> {
    const code = this.normalizeCode(rawCode);
    if (code.length !== CODE_LENGTH) {
      throw new NotFoundException(ClinicAccessService.INVALID_CODE_MESSAGE);
    }

    const now = new Date();
    const record = await this.shareCodeModel
      .findOneAndUpdate(
        {
          codeHash: this.hashCode(code),
          usedAt: null,
          expiresAt: { $gt: now },
        },
        { $set: { usedAt: now, usedByVetClinicId: vetClinicId } },
        { new: true },
      )
      .exec();
    if (!record) {
      throw new NotFoundException(ClinicAccessService.INVALID_CODE_MESSAGE);
    }

    const [pet] = await this.internalPetsService.findActivePetsByIds([
      record.petId.toString(),
    ]);
    if (!pet || pet.owner.id !== record.ownerId.toString()) {
      throw new NotFoundException(ClinicAccessService.INVALID_CODE_MESSAGE);
    }
    await this.notifyOwnerOfNewClinicAccess(pet, clinicName);
    return pet;
  }

  /**
   * Tells the owner a clinic now has access, so a code shared by mistake (or
   * obtained by someone else) is noticed right away. Never throws: the access
   * has already been granted and the clinic is waiting.
   */
  private async notifyOwnerOfNewClinicAccess(
    pet: InternalPetForVet,
    clinicName?: string | null,
  ): Promise<void> {
    if (!pet.owner.email) {
      return;
    }
    try {
      const frontendUrl = (
        this.configService.get<string>('FRONTEND_URL') ?? ''
      ).replace(/\/+$/, '');
      const message = buildClinicAccessGrantedEmail({
        firstName: pet.owner.firstName,
        petName: pet.name,
        clinicName,
        petUrl: `${frontendUrl}/pets/${encodeURIComponent(pet.id)}`,
      });
      const result = await this.emailService.send({
        to: pet.owner.email,
        ...message,
      });
      if (!result.ok) {
        this.logger.warn(
          `Clinic access email could not be sent: ${result.errorMessage}`,
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Failed to send clinic access email: ${message}`);
    }
  }

  async listClinicAccess(
    ownerId: string,
    petId: string,
  ): Promise<PetClinicAccessModel[]> {
    await this.petOwnershipService.assertPetBelongsToOwner(ownerId, petId);
    const records = await this.vetBackendClient.listClinicAccessForPet(petId);
    return records.map((record) => ({
      clinicId: record.clinicId,
      clinicName: record.clinicName,
      clinicPhone: record.clinicPhone ?? null,
      clinicAddress: record.clinicAddress ?? null,
      grantedAt: new Date(record.grantedAt),
    }));
  }

  async revokeClinicAccess(
    ownerId: string,
    petId: string,
    clinicId: string,
  ): Promise<boolean> {
    await this.petOwnershipService.assertPetBelongsToOwner(ownerId, petId);
    return this.vetBackendClient.revokeClinicAccess(petId, clinicId);
  }

  /** Newest-first log of what clinics did with the pet's data. */
  async listActivity(
    ownerId: string,
    petId: string,
    limit = ClinicAccessService.DEFAULT_ACTIVITY_LIMIT,
  ): Promise<PetActivityEventModel[]> {
    await this.petOwnershipService.assertPetBelongsToOwner(ownerId, petId);
    const safeLimit = Math.min(
      Math.max(Math.trunc(limit) || 1, 1),
      ClinicAccessService.MAX_ACTIVITY_LIMIT,
    );
    const events = await this.vetBackendClient.listAuditEventsForPet(
      petId,
      safeLimit,
    );
    return events.map((event) => ({
      id: event.id,
      action: event.action,
      entityType: event.entityType,
      actorType: event.actorType,
      actorName: event.actorName ?? null,
      clinicName: event.clinicName ?? null,
      summary: event.summary ?? null,
      createdAt: new Date(event.createdAt),
    }));
  }

  private generateCode(): string {
    let code = '';
    for (let index = 0; index < CODE_LENGTH; index += 1) {
      code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
    return code;
  }

  private normalizeCode(raw: string): string {
    return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private formatCode(code: string): string {
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
