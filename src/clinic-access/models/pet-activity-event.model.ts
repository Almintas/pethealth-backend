import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description:
    'Something a veterinary clinic did with a pet’s data, or an owner access change',
})
export class PetActivityEventModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String, {
    description:
      'VIEWED, CREATED, UPDATED, CANCELLED, DELETED, ACCESS_GRANTED or ACCESS_REVOKED',
  })
  action!: string;

  @Field(() => String, {
    description:
      'PATIENT, MEDICAL_RECORD, MEDICATION, VACCINATION, APPOINTMENT or ATTACHMENT',
  })
  entityType!: string;

  @Field(() => String, { description: 'CLINIC_USER or OWNER' })
  actorType!: string;

  @Field(() => String, { nullable: true })
  actorName?: string | null;

  @Field(() => String, { nullable: true })
  clinicName?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'Short label such as a record title or vaccine name',
  })
  summary?: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
