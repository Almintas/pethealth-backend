import { VaccinationModel } from '../models/vaccination.model';

export type VaccinationsPageQuery = {
  page: number;
  limit: number;
  search?: string;
  vaccineName?: string;
  administeredFrom?: Date;
  administeredTo?: Date;
  upcomingOnly?: boolean;
};

export type VaccinationsPageResult = {
  items: VaccinationModel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  nextDueVaccineName?: string;
  nextDueAt?: Date;
};
