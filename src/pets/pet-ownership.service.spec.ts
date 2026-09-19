import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PetOwnershipService } from './pet-ownership.service';
import { PetsService } from './pets.service';

describe('PetOwnershipService', () => {
  let service: PetOwnershipService;

  const petsServiceMock = {
    findPetByIdForOwner: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PetOwnershipService,
        {
          provide: PetsService,
          useValue: petsServiceMock,
        },
      ],
    }).compile();

    service = module.get<PetOwnershipService>(PetOwnershipService);
  });

  it('delegates to PetsService for owned pets', async () => {
    petsServiceMock.findPetByIdForOwner.mockResolvedValue({ id: 'pet-id' });

    await service.assertPetBelongsToOwner('owner-id', 'pet-id');

    expect(petsServiceMock.findPetByIdForOwner).toHaveBeenCalledWith(
      'owner-id',
      'pet-id',
    );
  });

  it('maps pet not found to a custom message', async () => {
    petsServiceMock.findPetByIdForOwner.mockRejectedValue(
      new NotFoundException('Pet not found'),
    );

    await expect(
      service.assertPetBelongsToOwner(
        'owner-id',
        'pet-id',
        'Medical record not found',
      ),
    ).rejects.toThrow('Medical record not found');
  });
});
