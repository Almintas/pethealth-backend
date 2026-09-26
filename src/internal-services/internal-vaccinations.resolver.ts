import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { InternalCreateVaccinationForVetInput } from './dto/internal-create-vaccination-for-vet.input';
import { InternalUpdateVaccinationForVetInput } from './dto/internal-update-vaccination-for-vet.input';
import { InternalVaccinationsPageInput } from './dto/internal-vaccinations-page.input';
import { InternalServiceGuard } from './guards/internal-service.guard';
import { InternalVaccinationsService } from './internal-vaccinations.service';
import { InternalVaccinationForVet } from './models/internal-vaccination-for-vet.model';
import { InternalVaccinationsPageForVet } from './models/internal-vaccinations-page.model';

@Resolver()
export class InternalVaccinationsResolver {
  constructor(
    private readonly internalVaccinationsService: InternalVaccinationsService,
  ) {}

  @Query(() => InternalVaccinationsPageForVet, {
    name: 'internalVaccinationsPageForVet',
  })
  @UseGuards(InternalServiceGuard)
  internalVaccinationsPageForVet(
    @Args('petId', { type: () => ID }) petId: string,
    @Args('query', { nullable: true }) query?: InternalVaccinationsPageInput,
  ): Promise<InternalVaccinationsPageForVet> {
    return this.internalVaccinationsService.findPageForVet(petId, query ?? {});
  }

  @Query(() => InternalVaccinationForVet, {
    name: 'internalVaccinationById',
  })
  @UseGuards(InternalServiceGuard)
  internalVaccinationById(
    @Args('vaccinationId', { type: () => ID }) vaccinationId: string,
  ): Promise<InternalVaccinationForVet> {
    return this.internalVaccinationsService.findById(vaccinationId);
  }

  @Mutation(() => InternalVaccinationForVet, {
    name: 'internalCreateVaccinationForVet',
  })
  @UseGuards(InternalServiceGuard)
  internalCreateVaccinationForVet(
    @Args('input') input: InternalCreateVaccinationForVetInput,
  ): Promise<InternalVaccinationForVet> {
    return this.internalVaccinationsService.createForVet(input);
  }

  @Mutation(() => InternalVaccinationForVet, {
    name: 'internalUpdateVaccinationForVet',
  })
  @UseGuards(InternalServiceGuard)
  internalUpdateVaccinationForVet(
    @Args('vaccinationId', { type: () => ID }) vaccinationId: string,
    @Args('input') input: InternalUpdateVaccinationForVetInput,
  ): Promise<InternalVaccinationForVet> {
    return this.internalVaccinationsService.updateForVet(vaccinationId, input);
  }
}
