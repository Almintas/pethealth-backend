import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttachmentFilesService } from './attachment-files.service';
import {
  MedicalRecordAttachment,
  MedicalRecordAttachmentSchema,
} from './schemas/medical-record-attachment.schema';
import { ATTACHMENT_STORAGE } from './storage/attachment-storage.interface';
import { GridFsAttachmentStorage } from './storage/gridfs-attachment.storage';

/**
 * Attachment data layer, kept free of record/pet dependencies so the
 * records, pets and account modules can clean attachments up without
 * import cycles.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MedicalRecordAttachment.name,
        schema: MedicalRecordAttachmentSchema,
      },
    ]),
  ],
  providers: [
    AttachmentFilesService,
    GridFsAttachmentStorage,
    { provide: ATTACHMENT_STORAGE, useExisting: GridFsAttachmentStorage },
  ],
  exports: [AttachmentFilesService],
})
export class AttachmentFilesModule {}
