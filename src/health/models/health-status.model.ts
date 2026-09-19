import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Service health information' })
export class HealthStatus {
  @Field(() => String, { description: 'Overall service status' })
  status!: string;

  @Field(() => String, { description: 'ISO-8601 timestamp of the check' })
  timestamp!: string;

  @Field(() => String, { description: 'Active runtime environment' })
  environment!: string;
}
