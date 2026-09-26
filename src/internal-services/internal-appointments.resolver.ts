import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLISODateTime } from '@nestjs/graphql';
import { InternalCreateAppointmentForVetInput } from './dto/internal-create-appointment-for-vet.input';
import { InternalUpdateAppointmentForVetInput } from './dto/internal-update-appointment-for-vet.input';
import { InternalServiceGuard } from './guards/internal-service.guard';
import { InternalAppointmentsService } from './internal-appointments.service';
import { InternalAppointmentForVet } from './models/internal-appointment-for-vet.model';

@Resolver()
export class InternalAppointmentsResolver {
  constructor(
    private readonly internalAppointmentsService: InternalAppointmentsService,
  ) {}

  @Query(() => [InternalAppointmentForVet], {
    name: 'internalAppointmentsByPetIds',
  })
  @UseGuards(InternalServiceGuard)
  internalAppointmentsByPetIds(
    @Args('petIds', { type: () => [ID] }) petIds: string[],
    @Args('scheduledFrom', { type: () => GraphQLISODateTime, nullable: true })
    scheduledFrom?: Date,
    @Args('scheduledTo', { type: () => GraphQLISODateTime, nullable: true })
    scheduledTo?: Date,
  ): Promise<InternalAppointmentForVet[]> {
    return this.internalAppointmentsService.findByPetIds(
      petIds,
      scheduledFrom,
      scheduledTo,
    );
  }

  @Query(() => InternalAppointmentForVet, {
    name: 'internalAppointmentById',
  })
  @UseGuards(InternalServiceGuard)
  internalAppointmentById(
    @Args('appointmentId', { type: () => ID }) appointmentId: string,
  ): Promise<InternalAppointmentForVet> {
    return this.internalAppointmentsService.findById(appointmentId);
  }

  @Mutation(() => InternalAppointmentForVet, {
    name: 'internalCreateAppointmentForVet',
  })
  @UseGuards(InternalServiceGuard)
  internalCreateAppointmentForVet(
    @Args('input') input: InternalCreateAppointmentForVetInput,
  ): Promise<InternalAppointmentForVet> {
    return this.internalAppointmentsService.createForVet(input);
  }

  @Mutation(() => InternalAppointmentForVet, {
    name: 'internalUpdateAppointmentForVet',
  })
  @UseGuards(InternalServiceGuard)
  internalUpdateAppointmentForVet(
    @Args('appointmentId', { type: () => ID }) appointmentId: string,
    @Args('input') input: InternalUpdateAppointmentForVetInput,
  ): Promise<InternalAppointmentForVet> {
    return this.internalAppointmentsService.updateForVet(appointmentId, input);
  }
}
