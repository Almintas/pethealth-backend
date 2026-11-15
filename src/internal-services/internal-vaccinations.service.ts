import { Injectable } from '@nestjs/common';
import { UpdateVaccinationInput } from '../vaccinations/dto/update-vaccination.input';
import { VaccinationsService } from '../vaccinations/vaccinations.service';
import { InternalCreateVaccinationForVetInput } from './dto/internal-create-vaccination-for-vet.input';
import { InternalUpdateVaccinationForVetInput } from './dto/internal-update-vaccination-for-vet.input';
import { InternalVaccinationsPageInput } from './dto/internal-vaccinations-page.input';
import { InternalVaccinationForVet } from './models/internal-vaccination-for-vet.model';
import { InternalVaccinationsPageForVet } from './models/internal-vaccinations-page.model';

@Injectable()
export class InternalVaccinationsService {
  constructor(private readonly vaccinationsService: VaccinationsService) {}

  async findPageForVet(
    petId: string,
    input: InternalVaccinationsPageInput,
  ): Promise<InternalVaccinationsPageForVet> {
    const page = await this.vaccinationsService.findVaccinationsPageForService(
      petId,
      {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
        search: input.search,
        vaccineName: input.vaccineName,
        administeredFrom: input.administeredFrom,
        administeredTo: input.administeredTo,
        upcomingOnly: input.upcomingOnly,
      },
    );
    return {
      items: page.items.map((record) => this.mapVaccination(record)),
      total: page.total,
      page: page.page,
      limit: page.limit,
      totalPages: page.totalPages,
      nextDueVaccineName: page.nextDueVaccineName,
      nextDueAt: page.nextDueAt,
    };
  }

  async findById(vaccinationId: string): Promise<InternalVaccinationForVet> {
    const record =
      await this.vaccinationsService.findVaccinationByIdForService(
        vaccinationId,
      );
    return this.mapVaccination(record);
  }

  async createForVet(
    input: InternalCreateVaccinationForVetInput,
  ): Promise<InternalVaccinationForVet> {
    const created = await this.vaccinationsService.createVaccinationForService(
      input.petId,
      {
        vaccineName: input.vaccineName,
        administeredAt: input.administeredAt,
        nextDueAt: input.nextDueAt,
        veterinarianName: input.veterinarianName,
        clinicName: input.clinicName,
        batchNumber: input.batchNumber,
        notes: input.notes,
      },
    );
    return this.mapVaccination(created);
  }

  async updateForVet(
    vaccinationId: string,
    input: InternalUpdateVaccinationForVetInput,
  ): Promise<InternalVaccinationForVet> {
    const updateInput: UpdateVaccinationInput = {
      vaccineName: input.vaccineName,
      administeredAt: input.administeredAt,
      nextDueAt: input.nextDueAt,
      veterinarianName: input.veterinarianName,
      clinicName: input.clinicName,
      batchNumber: input.batchNumber,
      notes: input.notes,
    };
    const updated = await this.vaccinationsService.updateVaccinationForService(
      vaccinationId,
      updateInput,
    );
    return this.mapVaccination(updated);
  }

  private mapVaccination(record: {
    id: string;
    petId: string;
    vaccineName: string;
    administeredAt: Date;
    nextDueAt?: Date;
    veterinarianName?: string;
    clinicName?: string;
    batchNumber?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
  }): InternalVaccinationForVet {
    return {
      id: record.id,
      petId: record.petId,
      vaccineName: record.vaccineName,
      administeredAt: record.administeredAt,
      nextDueAt: record.nextDueAt,
      veterinarianName: record.veterinarianName,
      clinicName: record.clinicName,
      batchNumber: record.batchNumber,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
