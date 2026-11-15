import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: 'One-time code the owner gives to a veterinary clinic',
})
export class PetShareCodeModel {
  @Field(() => String, {
    description: 'Code to show the clinic, e.g. ABCD-2345',
  })
  code!: string;

  @Field(() => Date)
  expiresAt!: Date;
}
