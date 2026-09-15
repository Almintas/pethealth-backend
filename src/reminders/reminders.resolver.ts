import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { UserModel } from '../users/models/user.model';
import { CreateReminderInput } from './dto/create-reminder.input';
import { UpdateReminderInput } from './dto/update-reminder.input';
import { ReminderModel } from './models/reminder.model';
import { RemindersService } from './reminders.service';

@UseGuards(GqlAuthGuard)
@Resolver(() => ReminderModel)
export class RemindersResolver {
  constructor(private readonly remindersService: RemindersService) {}

  @Mutation(() => ReminderModel, {
    name: 'createReminder',
    description: 'Create a reminder for one of the user pets',
  })
  createReminder(
    @CurrentUser() user: UserModel,
    @Args('input') input: CreateReminderInput,
  ): Promise<ReminderModel> {
    return this.remindersService.createReminder(user.id, input);
  }

  @Mutation(() => ReminderModel, {
    name: 'updateReminder',
    description: 'Update a reminder for one of the user pets',
  })
  updateReminder(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateReminderInput,
  ): Promise<ReminderModel> {
    return this.remindersService.updateReminder(user.id, id, input);
  }

  @Mutation(() => ReminderModel, {
    name: 'completeReminder',
    description: 'Mark a pending reminder as completed',
  })
  completeReminder(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ReminderModel> {
    return this.remindersService.completeReminder(user.id, id);
  }

  @Mutation(() => ReminderModel, {
    name: 'dismissReminder',
    description: 'Mark a pending reminder as dismissed',
  })
  dismissReminder(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ReminderModel> {
    return this.remindersService.dismissReminder(user.id, id);
  }

  @Mutation(() => Boolean, {
    name: 'deleteReminder',
    description: 'Delete a reminder for one of the user pets',
  })
  deleteReminder(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.remindersService.deleteReminder(user.id, id);
  }

  @Query(() => [ReminderModel], {
    name: 'reminders',
    description: 'List reminders for a pet owned by the user',
  })
  reminders(
    @CurrentUser() user: UserModel,
    @Args('petId', { type: () => ID }) petId: string,
  ): Promise<ReminderModel[]> {
    return this.remindersService.findRemindersForPet(user.id, petId);
  }

  @Query(() => ReminderModel, {
    name: 'reminder',
    description: 'Get a reminder owned through one of the user pets',
  })
  reminder(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ReminderModel> {
    return this.remindersService.findReminderByIdForOwner(user.id, id);
  }
}
