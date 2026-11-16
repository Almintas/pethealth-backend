import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { InternalServiceGuard } from '../internal-services/guards/internal-service.guard';
import { InternalCreateReminderForVetInput } from './dto/internal-create-reminder-for-vet.input';
import { ReminderModel } from './models/reminder.model';
import { RemindersService } from './reminders.service';

/**
 * Reminders for the clinic (vet) backend, which checks the clinic user's
 * access to the pet first. Clinics never see the owner's own reminders.
 */
@SkipThrottle()
@UseGuards(InternalServiceGuard)
@Resolver()
export class InternalRemindersResolver {
  constructor(private readonly remindersService: RemindersService) {}

  @Query(() => [ReminderModel], { name: 'internalRemindersForPetForVet' })
  internalRemindersForPetForVet(
    @Args('petId', { type: () => ID }) petId: string,
  ): Promise<ReminderModel[]> {
    return this.remindersService.findClinicVisibleForPet(petId);
  }

  @Mutation(() => ReminderModel, { name: 'internalCreateReminderForVet' })
  internalCreateReminderForVet(
    @Args('input') input: InternalCreateReminderForVetInput,
  ): Promise<ReminderModel> {
    return this.remindersService.createForClinic(input);
  }

  @Mutation(() => ReminderModel, { name: 'internalDeleteReminderForVet' })
  internalDeleteReminderForVet(
    @Args('reminderId', { type: () => ID }) reminderId: string,
    @Args('clinicId', { type: () => ID }) clinicId: string,
    @Args('petId', { type: () => ID }) petId: string,
  ): Promise<ReminderModel> {
    return this.remindersService.deleteForClinic(reminderId, clinicId, petId);
  }
}
