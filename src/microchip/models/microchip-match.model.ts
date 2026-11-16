import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description:
    'A pet found by microchip, without owner details (the clinic may have no access)',
})
export class InternalMicrochipMatch {
  @Field(() => ID)
  petId!: string;

  @Field()
  name!: string;

  @Field()
  species!: string;

  @Field(() => String, { nullable: true })
  breed?: string | null;
}
