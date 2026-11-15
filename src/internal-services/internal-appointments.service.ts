import { Injectable } from '@nestjs/common';
import { AppointmentsService } from '../appointments/appointments.service';
import { CreateAppointmentInput } from '../appointments/dto/create-appointment.input';
import { UpdateAppointmentInput } from '../appointments/dto/update-appointment.input';
import { InternalCreateAppointmentForVetInput } from './dto/internal-create-appointment-for-vet.input';
import { InternalUpdateAppointmentForVetInput } from './dto/internal-update-appointment-for-vet.input';
import { InternalAppointmentForVet } from './models/internal-appointment-for-vet.model';

@Injectable()
export class InternalAppointmentsService {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  async findByPetIds(
    petIds: string[],
    scheduledFrom?: Date,
    scheduledTo?: Date,
  ): Promise<InternalAppointmentForVet[]> {
    const appointments =
      await this.appointmentsService.findAppointmentsByPetIds(petIds, {
        scheduledFrom,
        scheduledTo,
      });
    return appointments.map((appointment) => this.mapAppointment(appointment));
  }

  async createForVet(
    input: InternalCreateAppointmentForVetInput,
  ): Promise<InternalAppointmentForVet> {
    const createInput: CreateAppointmentInput = {
      petId: input.petId,
      scheduledAt: input.scheduledAt,
      type: input.type,
      clinicName: input.clinicName,
      veterinarianName: input.veterinarianName,
      reason: input.reason,
      notes: input.notes,
      status: input.status,
    };
    const created = await this.appointmentsService.createAppointmentForService(
      input.petId,
      { ...createInput, vetClinicId: input.vetClinicId },
    );
    return this.mapAppointment(created);
  }

  async updateForVet(
    appointmentId: string,
    input: InternalUpdateAppointmentForVetInput,
  ): Promise<InternalAppointmentForVet> {
    const updateInput: UpdateAppointmentInput = {
      scheduledAt: input.scheduledAt,
      type: input.type,
      clinicName: input.clinicName,
      veterinarianName: input.veterinarianName,
      reason: input.reason,
      notes: input.notes,
      status: input.status,
    };
    const updated = await this.appointmentsService.updateAppointmentForService(
      appointmentId,
      updateInput,
    );
    return this.mapAppointment(updated);
  }

  async findById(appointmentId: string): Promise<InternalAppointmentForVet> {
    const appointment =
      await this.appointmentsService.findAppointmentById(appointmentId);
    return this.mapAppointment(appointment);
  }

  private mapAppointment(appointment: {
    id: string;
    petId: string;
    scheduledAt: Date;
    type: string;
    vetClinicId?: string;
    clinicName?: string;
    veterinarianName?: string;
    reason?: string;
    notes?: string;
    status: InternalAppointmentForVet['status'];
    createdAt: Date;
    updatedAt: Date;
  }): InternalAppointmentForVet {
    return {
      id: appointment.id,
      petId: appointment.petId,
      scheduledAt: appointment.scheduledAt,
      type: appointment.type,
      vetClinicId: appointment.vetClinicId,
      clinicName: appointment.clinicName,
      veterinarianName: appointment.veterinarianName,
      reason: appointment.reason,
      notes: appointment.notes,
      status: appointment.status,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }
}
