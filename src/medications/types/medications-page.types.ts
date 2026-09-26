import { MedicationModel } from '../models/medication.model';

export type MedicationsPageQuery = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
};

export type MedicationsPageResult = {
  items: MedicationModel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  activeTotal: number;
};
