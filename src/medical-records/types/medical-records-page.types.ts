import { MedicalRecordModel } from '../models/medical-record.model';

export type MedicalRecordsPageQuery = {
  page: number;
  limit: number;
  search?: string;
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export type MedicalRecordsPageResult = {
  items: MedicalRecordModel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
