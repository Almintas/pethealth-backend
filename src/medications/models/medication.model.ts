import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Medication prescribed for a pet' })
export class MedicationModel {
  @Field(() => ID, { description: 'Unique medication identifier' })
  id!: string;

  @Field(() => ID, { description: 'Pet this medication belongs to' })
  petId!: string;

  @Field(() => String, { description: 'Medication name' })
  name!: string;

  @Field(() => Number, { description: 'Dosage amount' })
  dosage!: number;

  @Field(() => String, { description: 'Dosage unit' })
  dosageUnit!: string;

  @Field(() => String, { description: 'Dosing frequency' })
  frequency!: string;

  @Field(() => GraphQLISODateTime, { description: 'Treatment start date' })
  startDate!: Date;

  @Field(() => GraphQLISODateTime, {
    description: 'Treatment end date',
    nullable: true,
  })
  endDate?: Date;

  @Field(() => String, { description: 'Veterinarian name', nullable: true })
  veterinarianName?: string;

  @Field(() => String, { description: 'Clinic name', nullable: true })
  clinicName?: string;

  @Field(() => String, { description: 'Additional notes', nullable: true })
  notes?: string;

  @Field(() => Boolean, { description: 'Whether the medication is active' })
  isActive!: boolean;

  @Field(() => GraphQLISODateTime, { description: 'Record creation time' })
  createdAt!: Date;

  @Field(() => GraphQLISODateTime, { description: 'Last update time' })
  updatedAt!: Date;
}
