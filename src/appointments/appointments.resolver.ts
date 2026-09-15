import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { UserModel } from '../users/models/user.model';
import { CreateAppointmentInput } from './dto/create-appointment.input';
import { UpdateAppointmentInput } from './dto/update-appointment.input';
import { AppointmentModel } from './models/appointment.model';
import { AppointmentsService } from './appointments.service';

@UseGuards(GqlAuthGuard)
@Resolver(() => AppointmentModel)
export class AppointmentsResolver {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Mutation(() => AppointmentModel, {
    name: 'createAppointment',
    description: 'Create an appointment for one of the user pets',
  })
  createAppointment(
    @CurrentUser() user: UserModel,
    @Args('input') input: CreateAppointmentInput,
  ): Promise<AppointmentModel> {
    return this.appointmentsService.createAppointment(user.id, input);
  }

  @Mutation(() => AppointmentModel, {
    name: 'updateAppointment',
    description: 'Update an appointment for one of the user pets',
  })
  updateAppointment(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateAppointmentInput,
  ): Promise<AppointmentModel> {
    return this.appointmentsService.updateAppointment(user.id, id, input);
  }

  @Mutation(() => Boolean, {
    name: 'deleteAppointment',
    description: 'Delete an appointment for one of the user pets',
  })
  deleteAppointment(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.appointmentsService.deleteAppointment(user.id, id);
  }

  @Query(() => [AppointmentModel], {
    name: 'appointments',
    description: 'List appointments for a pet owned by the user',
  })
  appointments(
    @CurrentUser() user: UserModel,
    @Args('petId', { type: () => ID }) petId: string,
  ): Promise<AppointmentModel[]> {
    return this.appointmentsService.findAppointmentsForPet(user.id, petId);
  }

  @Query(() => AppointmentModel, {
    name: 'appointment',
    description: 'Get an appointment owned through one of the user pets',
  })
  appointment(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<AppointmentModel> {
    return this.appointmentsService.findAppointmentByIdForOwner(user.id, id);
  }
}
