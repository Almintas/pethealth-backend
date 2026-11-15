import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { PetOwnerSummaryForVet } from './pet-owner-summary-for-vet.model';

@ObjectType({
  description: 'Canonical Pet data for authenticated Vet backend integration',
})
export class InternalPetForVet {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  species!: string;

  @Field({ nullable: true })
  breed?: string;

  @Field({ nullable: true })
  gender?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  birthDate?: Date;

  @Field(() => PetOwnerSummaryForVet)
  owner!: PetOwnerSummaryForVet;
}
