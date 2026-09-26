import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { InternalCreateMedicationForVetInput } from './dto/internal-create-medication-for-vet.input';
import { InternalMedicationsPageInput } from './dto/internal-medications-page.input';
import { InternalUpdateMedicationForVetInput } from './dto/internal-update-medication-for-vet.input';
import { InternalServiceGuard } from './guards/internal-service.guard';
import { InternalMedicationsService } from './internal-medications.service';
import { InternalMedicationForVet } from './models/internal-medication-for-vet.model';
import { InternalMedicationsPageForVet } from './models/internal-medications-page.model';

@Resolver()
export class InternalMedicationsResolver {
  constructor(
    private readonly internalMedicationsService: InternalMedicationsService,
  ) {}

  @Query(() => InternalMedicationsPageForVet, {
    name: 'internalMedicationsPageForVet',
  })
  @UseGuards(InternalServiceGuard)
  internalMedicationsPageForVet(
    @Args('petId', { type: () => ID }) petId: string,
    @Args('query', { nullable: true }) query?: InternalMedicationsPageInput,
  ): Promise<InternalMedicationsPageForVet> {
    return this.internalMedicationsService.findPageForVet(petId, query ?? {});
  }

  @Query(() => InternalMedicationForVet, {
    name: 'internalMedicationById',
  })
  @UseGuards(InternalServiceGuard)
  internalMedicationById(
    @Args('medicationId', { type: () => ID }) medicationId: string,
  ): Promise<InternalMedicationForVet> {
    return this.internalMedicationsService.findById(medicationId);
  }

  @Mutation(() => InternalMedicationForVet, {
    name: 'internalCreateMedicationForVet',
  })
  @UseGuards(InternalServiceGuard)
  internalCreateMedicationForVet(
    @Args('input') input: InternalCreateMedicationForVetInput,
  ): Promise<InternalMedicationForVet> {
    return this.internalMedicationsService.createForVet(input);
  }

  @Mutation(() => InternalMedicationForVet, {
    name: 'internalUpdateMedicationForVet',
  })
  @UseGuards(InternalServiceGuard)
  internalUpdateMedicationForVet(
    @Args('medicationId', { type: () => ID }) medicationId: string,
    @Args('input') input: InternalUpdateMedicationForVetInput,
  ): Promise<InternalMedicationForVet> {
    return this.internalMedicationsService.updateForVet(medicationId, input);
  }
}
