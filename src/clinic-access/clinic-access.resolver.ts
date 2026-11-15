import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { UserModel } from '../users/models/user.model';
import { ClinicAccessService } from './clinic-access.service';
import { PetActivityEventModel } from './models/pet-activity-event.model';
import { PetClinicAccessModel } from './models/pet-clinic-access.model';
import { PetShareCodeModel } from './models/pet-share-code.model';

@UseGuards(GqlAuthGuard)
@Resolver()
export class ClinicAccessResolver {
  constructor(private readonly clinicAccessService: ClinicAccessService) {}

  @Mutation(() => PetShareCodeModel, {
    name: 'createPetShareCode',
    description:
      'Generate a one-time code (valid 15 minutes) that lets a veterinary clinic access this pet',
  })
  createPetShareCode(
    @CurrentUser() user: UserModel,
    @Args('petId', { type: () => ID }) petId: string,
  ): Promise<PetShareCodeModel> {
    return this.clinicAccessService.createShareCode(user.id, petId);
  }

  @Query(() => [PetClinicAccessModel], {
    name: 'petClinicAccess',
    description: 'Veterinary clinics that currently have access to this pet',
  })
  petClinicAccess(
    @CurrentUser() user: UserModel,
    @Args('petId', { type: () => ID }) petId: string,
  ): Promise<PetClinicAccessModel[]> {
    return this.clinicAccessService.listClinicAccess(user.id, petId);
  }

  @Query(() => [PetActivityEventModel], {
    name: 'petActivityLog',
    description:
      'Who viewed or changed this pet’s health data, newest first (max 200)',
  })
  petActivityLog(
    @CurrentUser() user: UserModel,
    @Args('petId', { type: () => ID }) petId: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<PetActivityEventModel[]> {
    return this.clinicAccessService.listActivity(user.id, petId, limit);
  }

  @Mutation(() => Boolean, {
    name: 'revokePetClinicAccess',
    description: "Remove a veterinary clinic's access to this pet",
  })
  revokePetClinicAccess(
    @CurrentUser() user: UserModel,
    @Args('petId', { type: () => ID }) petId: string,
    @Args('clinicId', { type: () => ID }) clinicId: string,
  ): Promise<boolean> {
    return this.clinicAccessService.revokeClinicAccess(
      user.id,
      petId,
      clinicId,
    );
  }
}
