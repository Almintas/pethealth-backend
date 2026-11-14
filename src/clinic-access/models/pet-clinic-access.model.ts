import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A veterinary clinic that can access a pet' })
export class PetClinicAccessModel {
  @Field(() => ID)
  clinicId!: string;

  @Field(() => String)
  clinicName!: string;

  @Field(() => String, { nullable: true })
  clinicPhone?: string | null;

  @Field(() => String, { nullable: true })
  clinicAddress?: string | null;

  @Field(() => Date)
  grantedAt!: Date;
}
