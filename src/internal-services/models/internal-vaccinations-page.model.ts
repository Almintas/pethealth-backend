import { Field, GraphQLISODateTime, Int, ObjectType } from '@nestjs/graphql';
import { InternalVaccinationForVet } from './internal-vaccination-for-vet.model';

@ObjectType()
export class InternalVaccinationsPageForVet {
  @Field(() => [InternalVaccinationForVet])
  items!: InternalVaccinationForVet[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field({ nullable: true })
  nextDueVaccineName?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  nextDueAt?: Date;
}
