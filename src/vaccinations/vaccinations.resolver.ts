import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { UserModel } from '../users/models/user.model';
import { CreateVaccinationInput } from './dto/create-vaccination.input';
import { UpdateVaccinationInput } from './dto/update-vaccination.input';
import { VaccinationModel } from './models/vaccination.model';
import { VaccinationsService } from './vaccinations.service';

@UseGuards(GqlAuthGuard)
@Resolver(() => VaccinationModel)
export class VaccinationsResolver {
  constructor(private readonly vaccinationsService: VaccinationsService) {}

  @Mutation(() => VaccinationModel, {
    name: 'createVaccination',
    description: 'Create a vaccination record for one of the user pets',
  })
  createVaccination(
    @CurrentUser() user: UserModel,
    @Args('input') input: CreateVaccinationInput,
  ): Promise<VaccinationModel> {
    return this.vaccinationsService.createVaccination(user.id, input);
  }

  @Mutation(() => VaccinationModel, {
    name: 'updateVaccination',
    description: 'Update a vaccination record for one of the user pets',
  })
  updateVaccination(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateVaccinationInput,
  ): Promise<VaccinationModel> {
    return this.vaccinationsService.updateVaccination(user.id, id, input);
  }

  @Mutation(() => Boolean, {
    name: 'deleteVaccination',
    description: 'Delete a vaccination record for one of the user pets',
  })
  deleteVaccination(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.vaccinationsService.deleteVaccination(user.id, id);
  }

  @Query(() => [VaccinationModel], {
    name: 'vaccinations',
    description: 'List vaccination records for a pet owned by the user',
  })
  vaccinations(
    @CurrentUser() user: UserModel,
    @Args('petId', { type: () => ID }) petId: string,
  ): Promise<VaccinationModel[]> {
    return this.vaccinationsService.findVaccinationsForPet(user.id, petId);
  }

  @Query(() => VaccinationModel, {
    name: 'vaccination',
    description: 'Get a vaccination record owned through one of the user pets',
  })
  vaccination(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<VaccinationModel> {
    return this.vaccinationsService.findVaccinationByIdForOwner(user.id, id);
  }
}
