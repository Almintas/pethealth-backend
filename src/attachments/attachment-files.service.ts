import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import type { Readable } from 'node:stream';
import {
  ATTACHMENT_MAX_PER_RECORD,
  assertAttachmentAllowed,
  sanitizeAttachmentFileName,
} from './attachment-file.util';
import { MedicalRecordAttachmentModel } from './models/medical-record-attachment.model';
import {
  MedicalRecordAttachment,
  MedicalRecordAttachmentDocument,
} from './schemas/medical-record-attachment.schema';
import {
  ATTACHMENT_STORAGE,
  type AttachmentStorage,
} from './storage/attachment-storage.interface';

export const ATTACHMENT_LIMIT_MESSAGE = `A medical record can have at most ${ATTACHMENT_MAX_PER_RECORD} files.`;
export const ATTACHMENT_OTHER_CLINIC_MESSAGE =
  'Only the clinic that attached this file can remove it.';

export type AttachmentUploader = {
  clinicId?: string;
  clinicName?: string;
  uploadedByName?: string;
};

export type OpenedAttachment = {
  attachment: MedicalRecordAttachmentModel;
  stream: Readable;
};

/**
 * Attachment metadata and bytes. Knows nothing about who may see a record:
 * callers check access to the medical record first.
 */
@Injectable()
export class AttachmentFilesService {
  private readonly logger = new Logger(AttachmentFilesService.name);

  constructor(
    @InjectModel(MedicalRecordAttachment.name)
    private readonly attachmentModel: Model<MedicalRecordAttachmentDocument>,
    @Inject(ATTACHMENT_STORAGE)
    private readonly storage: AttachmentStorage,
  ) {}

  async listForRecord(
    medicalRecordId: string,
  ): Promise<MedicalRecordAttachmentModel[]> {
    if (!isValidObjectId(medicalRecordId)) {
      return [];
    }
    const rows = await this.attachmentModel
      .find({ medicalRecordId: new Types.ObjectId(medicalRecordId) })
      .sort({ createdAt: 1 })
      .exec();
    return rows.map((row) => this.toModel(row));
  }

  /** Metadata only (no bytes), grouped for the owner's data export. */
  async listForPets(
    petIds: Types.ObjectId[],
  ): Promise<MedicalRecordAttachmentModel[]> {
    if (petIds.length === 0) {
      return [];
    }
    const rows = await this.attachmentModel
      .find({ petId: { $in: petIds } })
      .sort({ createdAt: 1 })
      .exec();
    return rows.map((row) => this.toModel(row));
  }

  async create(
    record: { id: string; petId: string },
    file: { buffer?: Buffer; originalname?: string },
    uploader: AttachmentUploader,
  ): Promise<MedicalRecordAttachmentModel> {
    const contentType = assertAttachmentAllowed(file.buffer);
    const buffer = file.buffer!;
    const recordObjectId = new Types.ObjectId(record.id);

    const existing = await this.attachmentModel
      .countDocuments({ medicalRecordId: recordObjectId })
      .exec();
    if (existing >= ATTACHMENT_MAX_PER_RECORD) {
      throw new BadRequestException(ATTACHMENT_LIMIT_MESSAGE);
    }

    const fileName = sanitizeAttachmentFileName(file.originalname, contentType);
    const storageKey = await this.storage.save(buffer, {
      fileName,
      contentType,
      petId: record.petId,
    });

    try {
      const created = await this.attachmentModel.create({
        medicalRecordId: recordObjectId,
        petId: new Types.ObjectId(record.petId),
        fileName,
        contentType,
        size: buffer.length,
        storageKey,
        clinicId: uploader.clinicId,
        clinicName: uploader.clinicName,
        uploadedByName: uploader.uploadedByName,
      });
      return this.toModel(created);
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  /** Opens an attachment that must belong to the given medical record. */
  async open(
    medicalRecordId: string,
    attachmentId: string,
  ): Promise<OpenedAttachment> {
    const row = await this.findForRecord(medicalRecordId, attachmentId);
    return {
      attachment: this.toModel(row),
      stream: await this.storage.open(row.storageKey),
    };
  }

  /**
   * Removes an attachment of the given record. With `clinicId`, only an
   * attachment that clinic added can be removed.
   */
  async delete(
    medicalRecordId: string,
    attachmentId: string,
    clinicId?: string,
  ): Promise<MedicalRecordAttachmentModel> {
    const row = await this.findForRecord(medicalRecordId, attachmentId);
    if (clinicId !== undefined && row.clinicId !== clinicId) {
      throw new ForbiddenException(ATTACHMENT_OTHER_CLINIC_MESSAGE);
    }
    const model = this.toModel(row);
    await row.deleteOne();
    await this.deleteBytes([row.storageKey]);
    return model;
  }

  async deleteForRecord(medicalRecordId: Types.ObjectId): Promise<void> {
    await this.deleteWhere({ medicalRecordId });
  }

  async deleteForPets(petIds: Types.ObjectId[]): Promise<void> {
    if (petIds.length === 0) {
      return;
    }
    await this.deleteWhere({ petId: { $in: petIds } });
  }

  private async deleteWhere(filter: Record<string, unknown>): Promise<void> {
    const rows = await this.attachmentModel
      .find(filter)
      .select({ storageKey: 1 })
      .exec();
    if (rows.length === 0) {
      return;
    }
    await this.attachmentModel
      .deleteMany({ _id: { $in: rows.map((row) => row._id) } })
      .exec();
    await this.deleteBytes(rows.map((row) => row.storageKey));
  }

  private async deleteBytes(storageKeys: string[]): Promise<void> {
    for (const key of storageKeys) {
      try {
        await this.storage.delete(key);
      } catch (error: unknown) {
        this.logger.warn(
          `Attachment file ${key} could not be deleted: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async findForRecord(
    medicalRecordId: string,
    attachmentId: string,
  ): Promise<MedicalRecordAttachmentDocument> {
    if (!isValidObjectId(medicalRecordId) || !isValidObjectId(attachmentId)) {
      throw new NotFoundException('Attachment not found');
    }
    const row = await this.attachmentModel
      .findOne({
        _id: new Types.ObjectId(attachmentId),
        medicalRecordId: new Types.ObjectId(medicalRecordId),
      })
      .exec();
    if (!row) {
      throw new NotFoundException('Attachment not found');
    }
    return row;
  }

  private toModel(
    row: MedicalRecordAttachmentDocument,
  ): MedicalRecordAttachmentModel {
    return {
      id: row._id.toString(),
      medicalRecordId: row.medicalRecordId.toString(),
      fileName: row.fileName,
      contentType: row.contentType,
      size: row.size,
      clinicId: row.clinicId ?? null,
      clinicName: row.clinicName ?? null,
      uploadedByName: row.uploadedByName ?? null,
      createdAt: row.createdAt,
    };
  }
}
