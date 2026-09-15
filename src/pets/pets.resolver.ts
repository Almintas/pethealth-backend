import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { UserModel } from '../users/models/user.model';
import { CreatePetInput } from './dto/create-pet.input';
import { UpdatePetInput } from './dto/update-pet.input';
import { PetModel } from './models/pet.model';
import { PetsService } from './pets.service';

@UseGuards(GqlAuthGuard)
@Resolver(() => PetModel)
export class PetsResolver {
  constructor(private readonly petsService: PetsService) {}

  @Mutation(() => PetModel, {
    name: 'createPet',
    description: 'Create a pet for the authenticated user',
  })
  createPet(
    @CurrentUser() user: UserModel,
    @Args('input') input: CreatePetInput,
  ): Promise<PetModel> {
    return this.petsService.createPet(user.id, input);
  }

  @Mutation(() => PetModel, {
    name: 'updatePet',
    description: 'Update a pet owned by the authenticated user',
  })
  updatePet(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdatePetInput,
  ): Promise<PetModel> {
    return this.petsService.updatePet(user.id, id, input);
  }

  @Mutation(() => Boolean, {
    name: 'deletePet',
    description: 'Delete a pet owned by the authenticated user',
  })
  deletePet(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.petsService.deletePet(user.id, id);
  }

  @Query(() => [PetModel], {
    name: 'myPets',
    description: 'List pets owned by the authenticated user',
  })
  myPets(@CurrentUser() user: UserModel): Promise<PetModel[]> {
    return this.petsService.findMyPets(user.id);
  }

  @Query(() => PetModel, {
    name: 'pet',
    description: 'Get a single pet owned by the authenticated user',
  })
  pet(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<PetModel> {
    return this.petsService.findPetByIdForOwner(user.id, id);
  }
}
