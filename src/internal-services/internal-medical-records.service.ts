import { Injectable } from '@nestjs/common';
import { UpdateMedicalRecordInput } from '../medical-records/dto/update-medical-record.input';
import { MedicalRecordsService } from '../medical-records/medical-records.service';
import { InternalCreateMedicalRecordForVetInput } from './dto/internal-create-medical-record-for-vet.input';
import { InternalUpdateMedicalRecordForVetInput } from './dto/internal-update-medical-record-for-vet.input';
import { InternalMedicalRecordsPageInput } from './dto/internal-medical-records-page.input';
import { InternalMedicalRecordForVet } from './models/internal-medical-record-for-vet.model';
import { InternalMedicalRecordsPageForVet } from './models/internal-medical-records-page.model';

@Injectable()
export class InternalMedicalRecordsService {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  async findPageForVet(
    petId: string,
    input: InternalMedicalRecordsPageInput,
  ): Promise<InternalMedicalRecordsPageForVet> {
    const page =
      await this.medicalRecordsService.findMedicalRecordsPageForService(petId, {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
        search: input.search,
        type: input.type,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
      });
    return {
      items: page.items.map((record) => this.mapRecord(record)),
      total: page.total,
      page: page.page,
      limit: page.limit,
      totalPages: page.totalPages,
    };
  }

  async findByPetIds(petIds: string[]): Promise<InternalMedicalRecordForVet[]> {
    const records =
      await this.medicalRecordsService.findMedicalRecordsByPetIdsForService(
        petIds,
      );
    return records.map((record) => this.mapRecord(record));
  }

  async findById(recordId: string): Promise<InternalMedicalRecordForVet> {
    const record =
      await this.medicalRecordsService.findMedicalRecordByIdForService(
        recordId,
      );
    return this.mapRecord(record);
  }

  async createForVet(
    input: InternalCreateMedicalRecordForVetInput,
  ): Promise<InternalMedicalRecordForVet> {
    const created =
      await this.medicalRecordsService.createMedicalRecordForService(
        input.petId,
        {
          date: input.date,
          type: input.type,
          title: input.title,
          description: input.description,
          diagnosis: input.diagnosis,
          veterinarianName: input.veterinarianName,
          clinicName: input.clinicName,
          notes: input.notes,
        },
      );
    return this.mapRecord(created);
  }

  async updateForVet(
    recordId: string,
    input: InternalUpdateMedicalRecordForVetInput,
  ): Promise<InternalMedicalRecordForVet> {
    const updateInput: UpdateMedicalRecordInput = {
      date: input.date,
      type: input.type,
      title: input.title,
      description: input.description,
      diagnosis: input.diagnosis,
      veterinarianName: input.veterinarianName,
      clinicName: input.clinicName,
      notes: input.notes,
    };
    const updated =
      await this.medicalRecordsService.updateMedicalRecordForService(
        recordId,
        updateInput,
      );
    return this.mapRecord(updated);
  }

  private mapRecord(record: {
    id: string;
    petId: string;
    date: Date;
    type: string;
    title: string;
    description?: string;
    diagnosis?: string;
    veterinarianName?: string;
    clinicName?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
  }): InternalMedicalRecordForVet {
    return {
      id: record.id,
      petId: record.petId,
      date: record.date,
      type: record.type,
      title: record.title,
      description: record.description,
      diagnosis: record.diagnosis,
      veterinarianName: record.veterinarianName,
      clinicName: record.clinicName,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
