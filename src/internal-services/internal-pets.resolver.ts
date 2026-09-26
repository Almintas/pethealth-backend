import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { InternalRegisterPetForVetInput } from './dto/internal-register-pet-for-vet.input';
import { InternalUpdateOwnerProfileForVetInput } from './dto/internal-update-owner-profile-for-vet.input';
import { InternalUpdatePetForVetInput } from './dto/internal-update-pet-for-vet.input';
import { InternalServiceGuard } from './guards/internal-service.guard';
import { InternalPetsService } from './internal-pets.service';
import { InternalPetForVet } from './models/internal-pet-for-vet.model';

@Resolver()
export class InternalPetsResolver {
  constructor(private readonly internalPetsService: InternalPetsService) {}

  @Query(() => [InternalPetForVet], {
    name: 'internalPetsByIds',
    description:
      'Service-to-service query for the Vet backend to load canonical Pets by id',
  })
  @UseGuards(InternalServiceGuard)
  internalPetsByIds(
    @Args('petIds', { type: () => [ID] }) petIds: string[],
  ): Promise<InternalPetForVet[]> {
    return this.internalPetsService.findActivePetsByIds(petIds);
  }

  @Mutation(() => InternalPetForVet, {
    name: 'internalRegisterPetForVet',
    description:
      'Service-to-service mutation to register a canonical Pet for an Owner',
  })
  @UseGuards(InternalServiceGuard)
  internalRegisterPetForVet(
    @Args('input') input: InternalRegisterPetForVetInput,
  ): Promise<InternalPetForVet> {
    return this.internalPetsService.registerPetForVet(input);
  }

  @Mutation(() => InternalPetForVet, {
    name: 'internalUpdateOwnerProfileForVet',
    description:
      'Service-to-service mutation to update canonical Owner name for a pet owner',
  })
  @UseGuards(InternalServiceGuard)
  internalUpdateOwnerProfileForVet(
    @Args('petId', { type: () => ID }) petId: string,
    @Args('input') input: InternalUpdateOwnerProfileForVetInput,
  ): Promise<InternalPetForVet> {
    return this.internalPetsService.updateOwnerProfileForVet(petId, input);
  }

  @Mutation(() => InternalPetForVet, {
    name: 'internalUpdatePetForVet',
    description:
      'Service-to-service mutation to update canonical Pet identity fields',
  })
  @UseGuards(InternalServiceGuard)
  internalUpdatePetForVet(
    @Args('petId', { type: () => ID }) petId: string,
    @Args('input') input: InternalUpdatePetForVetInput,
  ): Promise<InternalPetForVet> {
    return this.internalPetsService.updatePetForVet(petId, input);
  }
}
