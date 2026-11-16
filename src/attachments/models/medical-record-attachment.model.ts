import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';

@ObjectType({
  description: 'A file attached to a medical record (lab result, X-ray…)',
})
export class MedicalRecordAttachmentModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  medicalRecordId!: string;

  @Field(() => String)
  fileName!: string;

  @Field(() => String, {
    description: 'application/pdf, image/jpeg, image/png or image/webp',
  })
  contentType!: string;

  @Field(() => Int, { description: 'Size in bytes' })
  size!: number;

  @Field(() => String, {
    nullable: true,
    description: 'Vet backend clinic id of the clinic that attached it',
  })
  clinicId?: string | null;

  @Field(() => String, { nullable: true })
  clinicName?: string | null;

  @Field(() => String, { nullable: true })
  uploadedByName?: string | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}
