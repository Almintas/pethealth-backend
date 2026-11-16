import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InternalMedicalRecordForVet } from '../internal-services/models/internal-medical-record-for-vet.model';
import { MedicalRecordModel } from '../medical-records/models/medical-record.model';
import { AttachmentFilesService } from './attachment-files.service';
import { MedicalRecordAttachmentModel } from './models/medical-record-attachment.model';

/*
 * The parent queries already check who may read the record (owner JWT or
 * the internal service secret), so the field resolvers only load the list.
 */

@Resolver(() => MedicalRecordModel)
export class MedicalRecordAttachmentsResolver {
  constructor(private readonly attachmentFiles: AttachmentFilesService) {}

  @ResolveField(() => [MedicalRecordAttachmentModel], {
    description: 'Files attached to the record by a clinic',
  })
  attachments(
    @Parent() record: MedicalRecordModel,
  ): Promise<MedicalRecordAttachmentModel[]> {
    return this.attachmentFiles.listForRecord(record.id);
  }
}

@Resolver(() => InternalMedicalRecordForVet)
export class InternalMedicalRecordAttachmentsResolver {
  constructor(private readonly attachmentFiles: AttachmentFilesService) {}

  @ResolveField(() => [MedicalRecordAttachmentModel], {
    description: 'Files attached to the record',
  })
  attachments(
    @Parent() record: InternalMedicalRecordForVet,
  ): Promise<MedicalRecordAttachmentModel[]> {
    return this.attachmentFiles.listForRecord(record.id);
  }
}
