import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: 'Minimal owner identity exposed to the Vet service integration',
})
export class PetOwnerSummaryForVet {
  @Field(() => ID)
  id!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field({ nullable: true })
  email?: string;
}
