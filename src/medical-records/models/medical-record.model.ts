import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Medical record for a pet' })
export class MedicalRecordModel {
  @Field(() => ID, { description: 'Unique medical record identifier' })
  id!: string;

  @Field(() => ID, { description: 'Pet this record belongs to' })
  petId!: string;

  @Field(() => GraphQLISODateTime, { description: 'Date of the medical event' })
  date!: Date;

  @Field(() => String, { description: 'Type of medical record' })
  type!: string;

  @Field(() => String, { description: 'Record title' })
  title!: string;

  @Field(() => String, { description: 'Detailed description', nullable: true })
  description?: string;

  @Field(() => String, { description: 'Diagnosis summary', nullable: true })
  diagnosis?: string;

  @Field(() => String, { description: 'Veterinarian name', nullable: true })
  veterinarianName?: string;

  @Field(() => String, { description: 'Clinic name', nullable: true })
  clinicName?: string;

  @Field(() => String, { description: 'Additional notes', nullable: true })
  notes?: string;

  @Field(() => GraphQLISODateTime, { description: 'Record creation time' })
  createdAt!: Date;

  @Field(() => GraphQLISODateTime, { description: 'Last update time' })
  updatedAt!: Date;
}
