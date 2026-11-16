import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { InternalServiceGuard } from '../internal-services/guards/internal-service.guard';
import { MedicalRecordsService } from '../medical-records/medical-records.service';
import { ATTACHMENT_MAX_BYTES } from './attachment-file.util';
import { AttachmentFilesService } from './attachment-files.service';
import { attachmentDownload } from './attachment-response.util';
import {
  InternalAttachmentDeleteQuery,
  InternalAttachmentUploadBody,
} from './dto/internal-attachment.dto';
import { MedicalRecordAttachmentModel } from './models/medical-record-attachment.model';

/**
 * Attachment endpoints for the clinic (vet) backend. The vet backend checks
 * the clinic user's access to the pet before calling these.
 */
// Calls come from the vet backend's IP, authenticated by the shared secret.
@SkipThrottle()
@Controller('internal/medical-records')
@UseGuards(InternalServiceGuard)
export class InternalAttachmentsController {
  constructor(
    private readonly medicalRecordsService: MedicalRecordsService,
    private readonly attachmentFiles: AttachmentFilesService,
  ) {}

  @Post(':recordId/attachments')
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: ATTACHMENT_MAX_BYTES, files: 1 },
    }),
  )
  async upload(
    @Param('recordId') recordId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: InternalAttachmentUploadBody,
  ): Promise<MedicalRecordAttachmentModel> {
    const record =
      await this.medicalRecordsService.findMedicalRecordByIdForService(
        recordId,
      );
    return this.attachmentFiles.create(record, file ?? {}, {
      clinicId: body.clinicId,
      clinicName: body.clinicName,
      uploadedByName: body.uploadedByName,
    });
  }

  @Get(':recordId/attachments/:attachmentId')
  async download(
    @Param('recordId') recordId: string,
    @Param('attachmentId') attachmentId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const opened = await this.attachmentFiles.open(recordId, attachmentId);
    return attachmentDownload(response, opened);
  }

  @Delete(':recordId/attachments/:attachmentId')
  delete(
    @Param('recordId') recordId: string,
    @Param('attachmentId') attachmentId: string,
    @Query() query: InternalAttachmentDeleteQuery,
  ): Promise<MedicalRecordAttachmentModel> {
    return this.attachmentFiles.delete(recordId, attachmentId, query.clinicId);
  }
}
