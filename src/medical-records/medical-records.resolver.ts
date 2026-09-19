import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { VETERINARY_HEALTH_WRITE_ROLES } from '../auth/constants/veterinary-health-write.roles';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserModel } from '../users/models/user.model';
import { CreateMedicalRecordInput } from './dto/create-medical-record.input';
import { UpdateMedicalRecordInput } from './dto/update-medical-record.input';
import { MedicalRecordModel } from './models/medical-record.model';
import { MedicalRecordsService } from './medical-records.service';

@UseGuards(GqlAuthGuard)
@Resolver(() => MedicalRecordModel)
export class MedicalRecordsResolver {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Roles(...VETERINARY_HEALTH_WRITE_ROLES)
  @UseGuards(RolesGuard)
  @Mutation(() => MedicalRecordModel, {
    name: 'createMedicalRecord',
    description: 'Create a medical record for one of the user pets',
  })
  createMedicalRecord(
    @CurrentUser() user: UserModel,
    @Args('input') input: CreateMedicalRecordInput,
  ): Promise<MedicalRecordModel> {
    return this.medicalRecordsService.createMedicalRecord(user.id, input);
  }

  @Roles(...VETERINARY_HEALTH_WRITE_ROLES)
  @UseGuards(RolesGuard)
  @Mutation(() => MedicalRecordModel, {
    name: 'updateMedicalRecord',
    description: 'Update a medical record for one of the user pets',
  })
  updateMedicalRecord(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateMedicalRecordInput,
  ): Promise<MedicalRecordModel> {
    return this.medicalRecordsService.updateMedicalRecord(user.id, id, input);
  }

  @Roles(...VETERINARY_HEALTH_WRITE_ROLES)
  @UseGuards(RolesGuard)
  @Mutation(() => Boolean, {
    name: 'deleteMedicalRecord',
    description: 'Delete a medical record for one of the user pets',
  })
  deleteMedicalRecord(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.medicalRecordsService.deleteMedicalRecord(user.id, id);
  }

  @Query(() => [MedicalRecordModel], {
    name: 'medicalRecords',
    description: 'List medical records for a pet owned by the user',
  })
  medicalRecords(
    @CurrentUser() user: UserModel,
    @Args('petId', { type: () => ID }) petId: string,
  ): Promise<MedicalRecordModel[]> {
    return this.medicalRecordsService.findMedicalRecordsForPet(user.id, petId);
  }

  @Query(() => MedicalRecordModel, {
    name: 'medicalRecord',
    description: 'Get a medical record owned through one of the user pets',
  })
  medicalRecord(
    @CurrentUser() user: UserModel,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<MedicalRecordModel> {
    return this.medicalRecordsService.findMedicalRecordByIdForOwner(
      user.id,
      id,
    );
  }
}
