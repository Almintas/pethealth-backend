import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class InternalVaccinationForVet {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  petId!: string;

  @Field()
  vaccineName!: string;

  @Field(() => GraphQLISODateTime)
  administeredAt!: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  nextDueAt?: Date;

  @Field({ nullable: true })
  veterinarianName?: string;

  @Field({ nullable: true })
  clinicName?: string;

  @Field({ nullable: true })
  batchNumber?: string;

  @Field({ nullable: true })
  notes?: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
