import { Field, Int, ObjectType } from '@nestjs/graphql';
import { InternalMedicalRecordForVet } from './internal-medical-record-for-vet.model';

@ObjectType()
export class InternalMedicalRecordsPageForVet {
  @Field(() => [InternalMedicalRecordForVet])
  items!: InternalMedicalRecordForVet[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;
}
