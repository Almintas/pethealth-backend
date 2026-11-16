import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
} from '../appointments/schemas/appointment.schema';
import {
  AccountActivationToken,
  AccountActivationTokenDocument,
} from '../auth/account-activation/schemas/account-activation-token.schema';
import { PasswordService } from '../auth/password.service';
import {
  PetShareCode,
  PetShareCodeDocument,
} from '../clinic-access/schemas/pet-share-code.schema';
import { VetBackendClient } from '../clinic-access/vet-backend.client';
import {
  MedicalRecord,
  MedicalRecordDocument,
} from '../medical-records/schemas/medical-record.schema';
import {
  Medication,
  MedicationDocument,
} from '../medications/schemas/medication.schema';
import {
  NotificationDelivery,
  NotificationDeliveryDocument,
} from '../notifications/schemas/notification-delivery.schema';
import {
  PET_PHOTO_STORAGE,
  type PetPhotoStorage,
} from '../pet-photos/pet-photo-storage.interface';
import { Pet, PetDocument } from '../pets/schemas/pet.schema';
import {
  Reminder,
  ReminderDocument,
} from '../reminders/schemas/reminder.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { AttachmentFilesService } from '../attachments/attachment-files.service';
import {
  Vaccination,
  VaccinationDocument,
} from '../vaccinations/schemas/vaccination.schema';

/** Fields that are internal implementation details, never exported. */
const INTERNAL_FIELDS = new Set([
  '__v',
  'passwordHash',
  'passwordResetTokenHash',
  'passwordResetExpiresAt',
  'tokenVersion',
  'photoStorageKey',
]);

function clean(document: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(document)
      .filter(([key]) => !INTERNAL_FIELDS.has(key))
      .map(([key, value]) => [
        key === '_id' ? 'id' : key,
        value instanceof Types.ObjectId ? value.toString() : value,
      ]),
  );
}

/**
 * GDPR tools for owners: a full copy of their data (right of access and
 * portability) and permanent deletion of their account (right to erasure).
 */
@Injectable()
export class AccountDataService {
  static readonly WRONG_PASSWORD_MESSAGE = 'The password is not correct.';

  private readonly logger = new Logger(AccountDataService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Pet.name) private readonly petModel: Model<PetDocument>,
    @InjectModel(MedicalRecord.name)
    private readonly medicalRecordModel: Model<MedicalRecordDocument>,
    @InjectModel(Vaccination.name)
    private readonly vaccinationModel: Model<VaccinationDocument>,
    @InjectModel(Medication.name)
    private readonly medicationModel: Model<MedicationDocument>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Reminder.name)
    private readonly reminderModel: Model<ReminderDocument>,
    @InjectModel(PetShareCode.name)
    private readonly shareCodeModel: Model<PetShareCodeDocument>,
    @InjectModel(NotificationDelivery.name)
    private readonly deliveryModel: Model<NotificationDeliveryDocument>,
    @InjectModel(AccountActivationToken.name)
    private readonly activationTokenModel: Model<AccountActivationTokenDocument>,
    @Inject(PET_PHOTO_STORAGE)
    private readonly petPhotoStorage: PetPhotoStorage,
    private readonly vetBackendClient: VetBackendClient,
    private readonly passwordService: PasswordService,
    private readonly attachmentFiles: AttachmentFilesService,
  ) {}

  /** Everything PetHealth holds about the owner, as pretty-printed JSON. */
  async exportData(userId: string): Promise<string> {
    const userObjectId = new Types.ObjectId(userId);
    const user = await this.userModel.findById(userObjectId).lean().exec();
    if (!user) {
      throw new NotFoundException('Account not found');
    }

    const pets = await this.petModel
      .find({ ownerId: userObjectId, deletedAt: null })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    const petIds = pets.map((pet) => pet._id);
    const byPet = <T extends { petId?: unknown }>(rows: T[]) => {
      const grouped = new Map<string, Record<string, unknown>[]>();
      for (const row of rows) {
        const key = String(row.petId);
        grouped.set(key, [
          ...(grouped.get(key) ?? []),
          clean(row as Record<string, unknown>),
        ]);
      }
      return grouped;
    };

    const [
      records,
      vaccinations,
      medications,
      appointments,
      reminders,
      attachments,
    ] = await Promise.all([
      this.medicalRecordModel
        .find({ petId: { $in: petIds } })
        .lean()
        .exec(),
      this.vaccinationModel
        .find({ petId: { $in: petIds } })
        .lean()
        .exec(),
      this.medicationModel
        .find({ petId: { $in: petIds } })
        .lean()
        .exec(),
      this.appointmentModel
        .find({ petId: { $in: petIds } })
        .lean()
        .exec(),
      this.reminderModel
        .find({ petId: { $in: petIds } })
        .lean()
        .exec(),
      this.attachmentFiles.listForPets(petIds),
    ]);
    const recordsByPet = byPet(records);
    const vaccinationsByPet = byPet(vaccinations);
    const medicationsByPet = byPet(medications);
    const appointmentsByPet = byPet(appointments);
    const remindersByPet = byPet(reminders);
    // File names and details only; the files are downloaded from each record.
    const attachmentsByRecord = new Map<string, unknown[]>();
    for (const attachment of attachments) {
      attachmentsByRecord.set(attachment.medicalRecordId, [
        ...(attachmentsByRecord.get(attachment.medicalRecordId) ?? []),
        attachment,
      ]);
    }

    const exportedPets = await Promise.all(
      pets.map(async (pet) => {
        const id = pet._id.toString();
        return {
          ...clean(pet as unknown as Record<string, unknown>),
          medicalRecords: (recordsByPet.get(id) ?? []).map((record) => ({
            ...record,
            attachments: attachmentsByRecord.get(String(record.id)) ?? [],
          })),
          vaccinations: vaccinationsByPet.get(id) ?? [],
          medications: medicationsByPet.get(id) ?? [],
          appointments: appointmentsByPet.get(id) ?? [],
          reminders: remindersByPet.get(id) ?? [],
          ...(await this.clinicDataForPet(id)),
        };
      }),
    );

    return JSON.stringify(
      {
        format: 'pethealth-owner-export',
        version: 1,
        exportedAt: new Date().toISOString(),
        account: clean(user as unknown as Record<string, unknown>),
        pets: exportedPets,
      },
      null,
      2,
    );
  }

  /**
   * Permanently deletes the owner's account and all their pets' data after
   * re-checking the password. Clinics lose access first; clean-up of
   * external resources (clinic access, photos) is best-effort.
   */
  async deleteAccount(userId: string, password: string): Promise<boolean> {
    const userObjectId = new Types.ObjectId(userId);
    const user = await this.userModel
      .findById(userObjectId)
      .select('+passwordHash')
      .exec();
    if (!user) {
      throw new NotFoundException('Account not found');
    }
    const passwordOk = user.passwordHash
      ? await this.passwordService.compare(password, user.passwordHash)
      : false;
    if (!passwordOk) {
      // 403, not 401: the session is fine, only the confirmation failed.
      throw new ForbiddenException(AccountDataService.WRONG_PASSWORD_MESSAGE);
    }

    const pets = await this.petModel.find({ ownerId: userObjectId }).exec();
    const petIds = pets.map((pet) => pet._id);

    for (const pet of pets) {
      await this.revokeClinicAccess(pet._id.toString());
    }

    await this.attachmentFiles.deleteForPets(petIds);
    await Promise.all([
      this.medicalRecordModel.deleteMany({ petId: { $in: petIds } }).exec(),
      this.vaccinationModel.deleteMany({ petId: { $in: petIds } }).exec(),
      this.medicationModel.deleteMany({ petId: { $in: petIds } }).exec(),
      this.appointmentModel.deleteMany({ petId: { $in: petIds } }).exec(),
      this.reminderModel.deleteMany({ petId: { $in: petIds } }).exec(),
      this.shareCodeModel.deleteMany({ ownerId: userObjectId }).exec(),
      this.deliveryModel.deleteMany({ userId: userObjectId }).exec(),
      this.activationTokenModel.deleteMany({ userId: userObjectId }).exec(),
    ]);
    await this.petModel.deleteMany({ ownerId: userObjectId }).exec();
    await this.userModel.deleteOne({ _id: userObjectId }).exec();

    for (const pet of pets) {
      if (pet.photoStorageKey) {
        await this.petPhotoStorage
          .deletePetPhoto(pet.photoStorageKey)
          .catch((error: unknown) =>
            this.logger.warn(
              `Photo cleanup failed after account deletion: ${String(error)}`,
            ),
          );
      }
    }

    this.logger.log(
      `Owner account ${userId} and ${pets.length} pet(s) deleted`,
    );
    return true;
  }

  private async clinicDataForPet(petId: string): Promise<{
    clinicAccess: unknown[] | null;
    activityLog: unknown[] | null;
  }> {
    try {
      const [clinicAccess, activityLog] = await Promise.all([
        this.vetBackendClient.listClinicAccessForPet(petId),
        this.vetBackendClient.listAuditEventsForPet(petId, 200),
      ]);
      return { clinicAccess, activityLog };
    } catch (error) {
      this.logger.warn(
        `Clinic data unavailable for export of pet ${petId}: ${String(error)}`,
      );
      return { clinicAccess: null, activityLog: null };
    }
  }

  private async revokeClinicAccess(petId: string): Promise<void> {
    try {
      const access = await this.vetBackendClient.listClinicAccessForPet(petId);
      for (const entry of access) {
        await this.vetBackendClient.revokeClinicAccess(petId, entry.clinicId);
      }
    } catch (error) {
      // The pet is deleted anyway; a clinic left with a dangling grant can
      // no longer load anything for it.
      this.logger.warn(
        `Could not revoke clinic access for deleted pet ${petId}: ${String(error)}`,
      );
    }
  }
}
