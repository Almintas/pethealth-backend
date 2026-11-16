import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MedicalRecordsService } from '../medical-records/medical-records.service';
import { UserModel } from '../users/models/user.model';
import { AttachmentFilesService } from './attachment-files.service';
import { attachmentDownload } from './attachment-response.util';

/** Owner downloads of files clinics attached to their pets' records. */
@Controller('medical-records')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(
    private readonly medicalRecordsService: MedicalRecordsService,
    private readonly attachmentFiles: AttachmentFilesService,
  ) {}

  @Get(':recordId/attachments/:attachmentId')
  async download(
    @CurrentUser() user: UserModel,
    @Param('recordId') recordId: string,
    @Param('attachmentId') attachmentId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    // 404 unless the record belongs to one of the user's pets.
    await this.medicalRecordsService.findMedicalRecordByIdForOwner(
      user.id,
      recordId,
    );
    const opened = await this.attachmentFiles.open(recordId, attachmentId);
    return attachmentDownload(response, opened);
  }
}
