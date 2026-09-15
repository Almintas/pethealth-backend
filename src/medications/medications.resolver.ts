import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { UserModel } from '../users/models/user.model';
import { CreateMedicationInput } from './dto/create-medication.input';
import { UpdateMedicationInput } from './dto/update-medication.input';
import { MedicationModel } from './models/medication.model';
import { MedicationsService } from './medications.service';

@UseGuards(GqlAuthGuard)
@Resolver(() => MedicationModel)
export class MedicationsResolver {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Mutation(() => MedicationModel, {
    name: 'createMedication',
    description: 'Create a medication record for one of the user pets',
  })
  createMedication(
    @CurrentUser() user: UserModel,
    @Args('input') input: CreateMedicationInput,
  ): Promise<MedicationModel> {
    return this.medicationsService.createMedication(user.id, input);
  }

  @Mutation(() => MedicationModel, {
    name: 'updateMedication',
    description: 'Update a medication record for one of the user pets',
  })
  updateMedication(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateMedicationInput,
  ): Promise<MedicationModel> {
    return this.medicationsService.updateMedication(user.id, id, input);
  }

  @Mutation(() => Boolean, {
    name: 'deleteMedication',
    description: 'Delete a medication record for one of the user pets',
  })
  deleteMedication(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.medicationsService.deleteMedication(user.id, id);
  }

  @Query(() => [MedicationModel], {
    name: 'medications',
    description: 'List medication records for a pet owned by the user',
  })
  medications(
    @CurrentUser() user: UserModel,
    @Args('petId', { type: () => ID }) petId: string,
  ): Promise<MedicationModel[]> {
    return this.medicationsService.findMedicationsForPet(user.id, petId);
  }

  @Query(() => MedicationModel, {
    name: 'medication',
    description: 'Get a medication record owned through one of the user pets',
  })
  medication(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<MedicationModel> {
    return this.medicationsService.findMedicationByIdForOwner(user.id, id);
  }
}
