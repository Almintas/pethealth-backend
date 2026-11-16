import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailService } from '../notifications/email.service';
import { buildPetFoundEmail } from '../notifications/email-templates';
import { Pet, PetDocument } from '../pets/schemas/pet.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { InternalNotifyOwnerPetFoundInput } from './dto/internal-notify-owner-pet-found.input';
import { microchipPattern, normalizeMicrochip } from './microchip.util';
import { InternalMicrochipMatch } from './models/microchip-match.model';

export const INVALID_MICROCHIP_MESSAGE =
  'Enter a microchip number of 9 to 15 letters or digits.';

/**
 * Finds pets by microchip for clinics without revealing the owner: a clinic
 * that has no consent gets the pet's name and species, and can only ask
 * PetHealth to email the owner.
 */
@Injectable()
export class MicrochipService {
  private readonly logger = new Logger(MicrochipService.name);

  constructor(
    @InjectModel(Pet.name) private readonly petModel: Model<PetDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private async findPets(microchip: string): Promise<PetDocument[]> {
    const normalized = normalizeMicrochip(microchip);
    if (!normalized) {
      throw new BadRequestException(INVALID_MICROCHIP_MESSAGE);
    }
    return this.petModel
      .find({
        deletedAt: null,
        microchipNumber: { $regex: microchipPattern(normalized) },
      })
      .limit(5)
      .exec();
  }

  async lookup(microchip: string): Promise<InternalMicrochipMatch[]> {
    const pets = await this.findPets(microchip);
    return pets.map((pet) => ({
      petId: pet._id.toString(),
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? null,
    }));
  }

  /** Emails the owner; true when the email was handed to the provider. */
  async notifyOwner(input: InternalNotifyOwnerPetFoundInput): Promise<boolean> {
    // Re-check the chip so a clinic cannot email owners of arbitrary pets.
    const pet = (await this.findPets(input.microchip)).find(
      (candidate) => candidate._id.toString() === input.petId,
    );
    if (!pet) {
      throw new NotFoundException('No pet with this microchip');
    }
    const owner = await this.userModel.findById(pet.ownerId).exec();
    if (!owner?.email) {
      return false;
    }
    const frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') ?? ''
    ).replace(/\/+$/, '');
    const message = buildPetFoundEmail({
      firstName: owner.firstName,
      petName: pet.name,
      clinicName: input.clinicName,
      clinicPhone: input.clinicPhone,
      clinicAddress: input.clinicAddress,
      message: input.message,
      petUrl: `${frontendUrl}/pets/${encodeURIComponent(pet._id.toString())}`,
    });
    const result = await this.emailService.send({
      to: owner.email,
      ...message,
    });
    if (!result.ok) {
      this.logger.warn(`Pet found email not sent: ${result.errorMessage}`);
    }
    return result.ok;
  }
}
