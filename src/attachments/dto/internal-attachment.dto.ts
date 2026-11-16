import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Form fields sent with an attachment upload by the vet backend. */
export class InternalAttachmentUploadBody {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clinicId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  clinicName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  uploadedByName?: string;
}

export class InternalAttachmentDeleteQuery {
  /** When set, only an attachment added by this clinic can be removed. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clinicId?: string;
}
