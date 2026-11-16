import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AccountDataService } from './account-data.service';

const execOf = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});
const leanOf = (value: unknown) => ({ lean: () => execOf(value) });

describe('AccountDataService', () => {
  const userId = new Types.ObjectId();
  const petId = new Types.ObjectId();

  const userModel = { findById: jest.fn(), deleteOne: jest.fn() };
  const petModel = { find: jest.fn(), deleteMany: jest.fn() };
  const recordModels = () => ({ find: jest.fn(), deleteMany: jest.fn() });
  const medicalRecordModel = recordModels();
  const vaccinationModel = recordModels();
  const medicationModel = recordModels();
  const appointmentModel = recordModels();
  const reminderModel = recordModels();
  const shareCodeModel = { deleteMany: jest.fn() };
  const deliveryModel = { deleteMany: jest.fn() };
  const activationTokenModel = { deleteMany: jest.fn() };
  const petPhotoStorage = { deletePetPhoto: jest.fn() };
  const vetBackendClient = {
    listClinicAccessForPet: jest.fn(),
    listAuditEventsForPet: jest.fn(),
    revokeClinicAccess: jest.fn(),
  };
  const passwordService = { compare: jest.fn() };

  let service: AccountDataService;

  beforeEach(() => {
    jest.clearAllMocks();
    for (const model of [
      medicalRecordModel,
      vaccinationModel,
      medicationModel,
      appointmentModel,
      reminderModel,
      shareCodeModel,
      deliveryModel,
      activationTokenModel,
      petModel,
    ]) {
      model.deleteMany.mockReturnValue(execOf({ deletedCount: 1 }));
    }
    userModel.deleteOne.mockReturnValue(execOf({ deletedCount: 1 }));
    petPhotoStorage.deletePetPhoto.mockResolvedValue(undefined);
    service = new AccountDataService(
      userModel as never,
      petModel as never,
      medicalRecordModel as never,
      vaccinationModel as never,
      medicationModel as never,
      appointmentModel as never,
      reminderModel as never,
      shareCodeModel as never,
      deliveryModel as never,
      activationTokenModel as never,
      petPhotoStorage as never,
      vetBackendClient as never,
      passwordService as never,
    );
  });

  describe('exportData', () => {
    beforeEach(() => {
      userModel.findById.mockReturnValue(
        leanOf({
          _id: userId,
          email: 'jane@example.com',
          firstName: 'Jane',
          tokenVersion: 3,
          passwordResetTokenHash: 'secret-hash',
          __v: 0,
        }),
      );
      petModel.find.mockReturnValue({
        sort: () =>
          leanOf([
            { _id: petId, ownerId: userId, name: 'Luna', photoStorageKey: 'k' },
          ]),
      });
      vaccinationModel.find.mockReturnValue(
        leanOf([{ _id: new Types.ObjectId(), petId, vaccineName: 'Rabies' }]),
      );
      for (const model of [
        medicalRecordModel,
        medicationModel,
        appointmentModel,
        reminderModel,
      ]) {
        model.find.mockReturnValue(leanOf([]));
      }
    });

    it('exports the account and pets with records, without internal fields', async () => {
      vetBackendClient.listClinicAccessForPet.mockResolvedValue([
        { clinicId: 'c1', clinicName: 'Paws' },
      ]);
      vetBackendClient.listAuditEventsForPet.mockResolvedValue([]);

      const data = JSON.parse(await service.exportData(userId.toString())) as {
        format: string;
        account: Record<string, unknown>;
        pets: Record<string, unknown>[];
      };

      expect(data.format).toBe('pethealth-owner-export');
      expect(data.account).toMatchObject({
        id: userId.toString(),
        email: 'jane@example.com',
      });
      expect(data.account).not.toHaveProperty('tokenVersion');
      expect(data.account).not.toHaveProperty('passwordResetTokenHash');
      expect(data.pets[0]).toMatchObject({
        id: petId.toString(),
        name: 'Luna',
        vaccinations: [expect.objectContaining({ vaccineName: 'Rabies' })],
        clinicAccess: [{ clinicId: 'c1', clinicName: 'Paws' }],
      });
      expect(data.pets[0]).not.toHaveProperty('photoStorageKey');
    });

    it('still exports when the clinic system is unreachable', async () => {
      vetBackendClient.listClinicAccessForPet.mockRejectedValue(
        new Error('down'),
      );
      vetBackendClient.listAuditEventsForPet.mockResolvedValue([]);

      const data = JSON.parse(await service.exportData(userId.toString())) as {
        pets: Record<string, unknown>[];
      };
      expect(data.pets[0].clinicAccess).toBeNull();
      expect(data.pets[0].activityLog).toBeNull();
    });
  });

  describe('deleteAccount', () => {
    function mockUser(passwordHash: string | undefined) {
      userModel.findById.mockReturnValue({
        select: () => execOf({ _id: userId, passwordHash }),
      });
    }

    it('refuses a wrong password and deletes nothing', async () => {
      mockUser('hash');
      passwordService.compare.mockResolvedValue(false);

      await expect(
        service.deleteAccount(userId.toString(), 'wrong'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(petModel.deleteMany).not.toHaveBeenCalled();
      expect(userModel.deleteOne).not.toHaveBeenCalled();
    });

    it('revokes clinic access, deletes all data and the account', async () => {
      mockUser('hash');
      passwordService.compare.mockResolvedValue(true);
      petModel.find.mockReturnValue(
        execOf([{ _id: petId, photoStorageKey: 'photo-key' }]),
      );
      vetBackendClient.listClinicAccessForPet.mockResolvedValue([
        { clinicId: 'c1' },
        { clinicId: 'c2' },
      ]);
      vetBackendClient.revokeClinicAccess.mockResolvedValue(true);

      await expect(
        service.deleteAccount(userId.toString(), 'correct'),
      ).resolves.toBe(true);

      expect(vetBackendClient.revokeClinicAccess).toHaveBeenCalledWith(
        petId.toString(),
        'c1',
      );
      expect(vetBackendClient.revokeClinicAccess).toHaveBeenCalledWith(
        petId.toString(),
        'c2',
      );
      expect(vaccinationModel.deleteMany).toHaveBeenCalledWith({
        petId: { $in: [petId] },
      });
      expect(shareCodeModel.deleteMany).toHaveBeenCalledWith({
        ownerId: userId,
      });
      expect(deliveryModel.deleteMany).toHaveBeenCalledWith({ userId });
      expect(petModel.deleteMany).toHaveBeenCalledWith({ ownerId: userId });
      expect(userModel.deleteOne).toHaveBeenCalledWith({ _id: userId });
      expect(petPhotoStorage.deletePetPhoto).toHaveBeenCalledWith('photo-key');
    });

    it('deletes the account even if the clinic system is unreachable', async () => {
      mockUser('hash');
      passwordService.compare.mockResolvedValue(true);
      petModel.find.mockReturnValue(execOf([{ _id: petId }]));
      vetBackendClient.listClinicAccessForPet.mockRejectedValue(
        new Error('down'),
      );

      await expect(
        service.deleteAccount(userId.toString(), 'correct'),
      ).resolves.toBe(true);
      expect(userModel.deleteOne).toHaveBeenCalled();
    });

    it('reports a missing account', async () => {
      userModel.findById.mockReturnValue({ select: () => execOf(null) });
      await expect(
        service.deleteAccount(userId.toString(), 'x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
