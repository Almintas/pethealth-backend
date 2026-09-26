import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { InternalCreateMedicalRecordForVetInput } from './dto/internal-create-medical-record-for-vet.input';
import { InternalMedicalRecordsPageInput } from './dto/internal-medical-records-page.input';
import { InternalUpdateMedicalRecordForVetInput } from './dto/internal-update-medical-record-for-vet.input';
import { InternalServiceGuard } from './guards/internal-service.guard';
import { InternalMedicalRecordsService } from './internal-medical-records.service';
import { InternalMedicalRecordForVet } from './models/internal-medical-record-for-vet.model';
import { InternalMedicalRecordsPageForVet } from './models/internal-medical-records-page.model';

@Resolver()
export class InternalMedicalRecordsResolver {
  constructor(
    private readonly internalMedicalRecordsService: InternalMedicalRecordsService,
  ) {}

  @Query(() => InternalMedicalRecordsPageForVet, {
    name: 'internalMedicalRecordsPageForVet',
  })
  @UseGuards(InternalServiceGuard)
  internalMedicalRecordsPageForVet(
    @Args('petId', { type: () => ID }) petId: string,
    @Args('query', { nullable: true }) query?: InternalMedicalRecordsPageInput,
  ): Promise<InternalMedicalRecordsPageForVet> {
    return this.internalMedicalRecordsService.findPageForVet(
      petId,
      query ?? {},
    );
  }

  @Query(() => [InternalMedicalRecordForVet], {
    name: 'internalMedicalRecordsByPetIds',
  })
  @UseGuards(InternalServiceGuard)
  internalMedicalRecordsByPetIds(
    @Args('petIds', { type: () => [ID] }) petIds: string[],
  ): Promise<InternalMedicalRecordForVet[]> {
    return this.internalMedicalRecordsService.findByPetIds(petIds);
  }

  @Query(() => InternalMedicalRecordForVet, {
    name: 'internalMedicalRecordById',
  })
  @UseGuards(InternalServiceGuard)
  internalMedicalRecordById(
    @Args('medicalRecordId', { type: () => ID }) medicalRecordId: string,
  ): Promise<InternalMedicalRecordForVet> {
    return this.internalMedicalRecordsService.findById(medicalRecordId);
  }

  @Mutation(() => InternalMedicalRecordForVet, {
    name: 'internalCreateMedicalRecordForVet',
  })
  @UseGuards(InternalServiceGuard)
  internalCreateMedicalRecordForVet(
    @Args('input') input: InternalCreateMedicalRecordForVetInput,
  ): Promise<InternalMedicalRecordForVet> {
    return this.internalMedicalRecordsService.createForVet(input);
  }

  @Mutation(() => InternalMedicalRecordForVet, {
    name: 'internalUpdateMedicalRecordForVet',
  })
  @UseGuards(InternalServiceGuard)
  internalUpdateMedicalRecordForVet(
    @Args('medicalRecordId', { type: () => ID }) medicalRecordId: string,
    @Args('input') input: InternalUpdateMedicalRecordForVetInput,
  ): Promise<InternalMedicalRecordForVet> {
    return this.internalMedicalRecordsService.updateForVet(
      medicalRecordId,
      input,
    );
  }
}
