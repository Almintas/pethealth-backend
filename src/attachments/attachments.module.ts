import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MedicalRecordsModule } from '../medical-records/medical-records.module';
import { AttachmentFilesModule } from './attachment-files.module';
import { AttachmentsController } from './attachments.controller';
import {
  InternalMedicalRecordAttachmentsResolver,
  MedicalRecordAttachmentsResolver,
} from './attachments.resolver';
import { InternalAttachmentsController } from './internal-attachments.controller';

/** Files on medical records: owner downloads, clinic uploads, GraphQL lists. */
@Module({
  imports: [AuthModule, MedicalRecordsModule, AttachmentFilesModule],
  controllers: [AttachmentsController, InternalAttachmentsController],
  providers: [
    MedicalRecordAttachmentsResolver,
    InternalMedicalRecordAttachmentsResolver,
  ],
})
export class AttachmentsModule {}
