import { Injectable, NotFoundException } from '@nestjs/common';
import { PetsService } from './pets.service';

@Injectable()
export class PetOwnershipService {
  constructor(private readonly petsService: PetsService) {}

  async assertPetBelongsToOwner(
    ownerId: string,
    petId: string,
    notFoundMessage = 'Pet not found',
  ): Promise<void> {
    try {
      await this.petsService.findPetByIdForOwner(ownerId, petId);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(notFoundMessage);
      }
      throw error;
    }
  }
}
