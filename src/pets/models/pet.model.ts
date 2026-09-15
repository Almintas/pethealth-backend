import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Pet owned by a user' })
export class PetModel {
  @Field(() => ID, { description: 'Unique pet identifier' })
  id!: string;

  @Field(() => ID, { description: 'Owner user identifier' })
  ownerId!: string;

  @Field(() => String, { description: 'Pet name' })
  name!: string;

  @Field(() => String, { description: 'Pet species' })
  species!: string;

  @Field(() => String, { description: 'Pet breed', nullable: true })
  breed?: string;

  @Field(() => String, { description: 'Pet gender', nullable: true })
  gender?: string;

  @Field(() => GraphQLISODateTime, {
    description: 'Date of birth',
    nullable: true,
  })
  birthDate?: Date;

  @Field(() => String, {
    description: 'Microchip identifier',
    nullable: true,
  })
  microchipNumber?: string;

  @Field(() => GraphQLISODateTime, { description: 'Record creation time' })
  createdAt!: Date;

  @Field(() => GraphQLISODateTime, { description: 'Last update time' })
  updatedAt!: Date;
}
