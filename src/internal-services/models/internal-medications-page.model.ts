import { Field, Int, ObjectType } from '@nestjs/graphql';
import { InternalMedicationForVet } from './internal-medication-for-vet.model';

@ObjectType()
export class InternalMedicationsPageForVet {
  @Field(() => [InternalMedicationForVet])
  items!: InternalMedicationForVet[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field(() => Int)
  activeTotal!: number;
}
