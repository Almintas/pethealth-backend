import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Vaccination record for a pet' })
export class VaccinationModel {
  @Field(() => ID, { description: 'Unique vaccination identifier' })
  id!: string;

  @Field(() => ID, { description: 'Pet this vaccination belongs to' })
  petId!: string;

  @Field(() => String, { description: 'Name of the vaccine' })
  vaccineName!: string;

  @Field(() => GraphQLISODateTime, {
    description: 'When the vaccine was administered',
  })
  administeredAt!: Date;

  @Field(() => GraphQLISODateTime, {
    description: 'When the next dose is due',
    nullable: true,
  })
  nextDueAt?: Date;

  @Field(() => String, { description: 'Veterinarian name', nullable: true })
  veterinarianName?: string;

  @Field(() => String, { description: 'Clinic name', nullable: true })
  clinicName?: string;

  @Field(() => String, { description: 'Vaccine batch number', nullable: true })
  batchNumber?: string;

  @Field(() => String, { description: 'Additional notes', nullable: true })
  notes?: string;

  @Field(() => GraphQLISODateTime, { description: 'Record creation time' })
  createdAt!: Date;

  @Field(() => GraphQLISODateTime, { description: 'Last update time' })
  updatedAt!: Date;
}
