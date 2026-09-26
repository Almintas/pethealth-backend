import { Injectable } from '@nestjs/common';
import { UpdateMedicationInput } from '../medications/dto/update-medication.input';
import { MedicationsService } from '../medications/medications.service';
import { InternalCreateMedicationForVetInput } from './dto/internal-create-medication-for-vet.input';
import { InternalMedicationsPageInput } from './dto/internal-medications-page.input';
import { InternalUpdateMedicationForVetInput } from './dto/internal-update-medication-for-vet.input';
import { InternalMedicationForVet } from './models/internal-medication-for-vet.model';
import { InternalMedicationsPageForVet } from './models/internal-medications-page.model';

@Injectable()
export class InternalMedicationsService {
  constructor(private readonly medicationsService: MedicationsService) {}

  async findPageForVet(
    petId: string,
    input: InternalMedicationsPageInput,
  ): Promise<InternalMedicationsPageForVet> {
    const page = await this.medicationsService.findMedicationsPageForService(
      petId,
      {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
        search: input.search,
        isActive: input.isActive,
      },
    );
    return {
      items: page.items.map((medication) => this.mapMedication(medication)),
      total: page.total,
      page: page.page,
      limit: page.limit,
      totalPages: page.totalPages,
      activeTotal: page.activeTotal,
    };
  }

  async findById(medicationId: string): Promise<InternalMedicationForVet> {
    const medication =
      await this.medicationsService.findMedicationByIdForService(medicationId);
    return this.mapMedication(medication);
  }

  async createForVet(
    input: InternalCreateMedicationForVetInput,
  ): Promise<InternalMedicationForVet> {
    const created = await this.medicationsService.createMedicationForService(
      input.petId,
      {
        name: input.name,
        dosage: input.dosage,
        dosageUnit: input.dosageUnit,
        frequency: input.frequency,
        startDate: input.startDate,
        endDate: input.endDate,
        veterinarianName: input.veterinarianName,
        clinicName: input.clinicName,
        notes: input.notes,
        isActive: input.isActive,
      },
    );
    return this.mapMedication(created);
  }

  async updateForVet(
    medicationId: string,
    input: InternalUpdateMedicationForVetInput,
  ): Promise<InternalMedicationForVet> {
    const updateInput: UpdateMedicationInput = {
      name: input.name,
      dosage: input.dosage,
      dosageUnit: input.dosageUnit,
      frequency: input.frequency,
      startDate: input.startDate,
      endDate: input.endDate,
      veterinarianName: input.veterinarianName,
      clinicName: input.clinicName,
      notes: input.notes,
      isActive: input.isActive,
    };
    const updated = await this.medicationsService.updateMedicationForService(
      medicationId,
      updateInput,
    );
    return this.mapMedication(updated);
  }

  private mapMedication(medication: {
    id: string;
    petId: string;
    name: string;
    dosage: number;
    dosageUnit: string;
    frequency: string;
    startDate: Date;
    endDate?: Date;
    veterinarianName?: string;
    clinicName?: string;
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): InternalMedicationForVet {
    return {
      id: medication.id,
      petId: medication.petId,
      name: medication.name,
      dosage: medication.dosage,
      dosageUnit: medication.dosageUnit,
      frequency: medication.frequency,
      startDate: medication.startDate,
      endDate: medication.endDate,
      veterinarianName: medication.veterinarianName,
      clinicName: medication.clinicName,
      notes: medication.notes,
      isActive: medication.isActive,
      createdAt: medication.createdAt,
      updatedAt: medication.updatedAt,
    };
  }
}
