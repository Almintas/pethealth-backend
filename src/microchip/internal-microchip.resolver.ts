import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { InternalServiceGuard } from '../internal-services/guards/internal-service.guard';
import { InternalNotifyOwnerPetFoundInput } from './dto/internal-notify-owner-pet-found.input';
import { MicrochipService } from './microchip.service';
import { InternalMicrochipMatch } from './models/microchip-match.model';

/** Microchip lookup for the clinic (vet) backend, which rate-limits it. */
@SkipThrottle()
@UseGuards(InternalServiceGuard)
@Resolver()
export class InternalMicrochipResolver {
  constructor(private readonly microchipService: MicrochipService) {}

  @Query(() => [InternalMicrochipMatch], {
    name: 'internalPetsByMicrochipForVet',
  })
  internalPetsByMicrochipForVet(
    @Args('microchip') microchip: string,
  ): Promise<InternalMicrochipMatch[]> {
    return this.microchipService.lookup(microchip);
  }

  @Mutation(() => Boolean, {
    name: 'internalNotifyOwnerPetFoundForVet',
    description: 'Emails the owner; false if no email could be sent',
  })
  internalNotifyOwnerPetFoundForVet(
    @Args('input') input: InternalNotifyOwnerPetFoundInput,
  ): Promise<boolean> {
    return this.microchipService.notifyOwner(input);
  }
}
