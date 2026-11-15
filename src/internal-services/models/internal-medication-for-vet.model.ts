import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class InternalMedicationForVet {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  petId!: string;

  @Field()
  name!: string;

  @Field()
  dosage!: number;

  @Field()
  dosageUnit!: string;

  @Field()
  frequency!: string;

  @Field(() => GraphQLISODateTime)
  startDate!: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  endDate?: Date;

  @Field({ nullable: true })
  veterinarianName?: string;

  @Field({ nullable: true })
  clinicName?: string;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  isActive!: boolean;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
