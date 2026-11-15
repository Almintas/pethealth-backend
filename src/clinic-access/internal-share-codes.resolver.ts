import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { InternalServiceGuard } from '../internal-services/guards/internal-service.guard';
import { InternalPetForVet } from '../internal-services/models/internal-pet-for-vet.model';
import { ClinicAccessService } from './clinic-access.service';

@Resolver()
export class InternalShareCodesResolver {
  constructor(private readonly clinicAccessService: ClinicAccessService) {}

  @Mutation(() => InternalPetForVet, {
    name: 'internalRedeemPetShareCode',
    description:
      "Service-to-service: redeem an owner's one-time share code for a Vet clinic",
  })
  @UseGuards(InternalServiceGuard)
  internalRedeemPetShareCode(
    @Args('code') code: string,
    @Args('vetClinicId', { type: () => ID }) vetClinicId: string,
    @Args('clinicName', {
      type: () => String,
      nullable: true,
      description: 'Shown to the owner in the access notification email',
    })
    clinicName?: string | null,
  ): Promise<InternalPetForVet> {
    return this.clinicAccessService.redeemShareCode(
      code,
      vetClinicId,
      clinicName,
    );
  }
}
