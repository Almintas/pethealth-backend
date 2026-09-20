import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { UserRole } from '../enums/user-role.enum';
import { NotificationPreferencesModel } from './notification-preferences.model';

@ObjectType({ description: 'Application user' })
export class UserModel {
  @Field(() => ID, { description: 'Unique user identifier' })
  id!: string;

  @Field(() => String, { description: 'Unique email address' })
  email!: string;

  @Field(() => String, { description: 'Given name' })
  firstName!: string;

  @Field(() => String, { description: 'Family name' })
  lastName!: string;

  @Field(() => UserRole, { description: 'Assigned role' })
  role!: UserRole;

  @Field(() => GraphQLISODateTime, { description: 'Account creation time' })
  createdAt!: Date;

  @Field(() => GraphQLISODateTime, { description: 'Last update time' })
  updatedAt!: Date;

  @Field(() => NotificationPreferencesModel, {
    description: 'Email notification preferences',
  })
  notificationPreferences!: NotificationPreferencesModel;
}
