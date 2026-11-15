import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { InternalPetsService } from '../internal-services/internal-pets.service';
import { EmailService } from '../notifications/email.service';
import { PetOwnershipService } from '../pets/pet-ownership.service';
import { ClinicAccessService } from './clinic-access.service';
import { PetShareCode } from './schemas/pet-share-code.schema';
import { VetBackendClient } from './vet-backend.client';

describe('ClinicAccessService', () => {
  let service: ClinicAccessService;

  const ownerId = new Types.ObjectId().toString();
  const petId = new Types.ObjectId().toString();
  const vetClinicId = new Types.ObjectId().toString();

  const shareCodeModel = {
    deleteMany: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  const petOwnershipService = { assertPetBelongsToOwner: jest.fn() };
  const internalPetsService = { findActivePetsByIds: jest.fn() };
  const vetBackendClient = {
    listClinicAccessForPet: jest.fn(),
    revokeClinicAccess: jest.fn(),
    listAuditEventsForPet: jest.fn(),
  };

  const emailService = { send: jest.fn() };
  const configService = {
    get: jest.fn((key: string) =>
      key === 'FRONTEND_URL' ? 'https://app.pethealth.test/' : undefined,
    ),
  };

  const sha256 = (value: string) =>
    createHash('sha256').update(value).digest('hex');

  beforeEach(async () => {
    jest.clearAllMocks();
    emailService.send.mockResolvedValue({ ok: true, messageId: 'm-1' });
    shareCodeModel.deleteMany.mockReturnValue({
      exec: jest.fn().mockResolvedValue({}),
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicAccessService,
        { provide: getModelToken(PetShareCode.name), useValue: shareCodeModel },
        { provide: PetOwnershipService, useValue: petOwnershipService },
        { provide: InternalPetsService, useValue: internalPetsService },
        { provide: VetBackendClient, useValue: vetBackendClient },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(ClinicAccessService);
  });

  it('creates a formatted single-use code and stores only its hash', async () => {
    let storedDoc: Record<string, unknown> = {};
    shareCodeModel.create.mockImplementation((doc: Record<string, unknown>) => {
      storedDoc = doc;
      return Promise.resolve(doc);
    });

    const result = await service.createShareCode(ownerId, petId);

    expect(petOwnershipService.assertPetBelongsToOwner).toHaveBeenCalledWith(
      ownerId,
      petId,
    );
    expect(result.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(result.code).not.toMatch(/[01OIL]/);
    const rawCode = result.code.replace('-', '');
    expect(storedDoc.codeHash).toBe(sha256(rawCode));
    expect(JSON.stringify(storedDoc)).not.toContain(rawCode);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('refuses to create a code for a pet the user does not own', async () => {
    petOwnershipService.assertPetBelongsToOwner.mockRejectedValueOnce(
      new NotFoundException('Pet not found'),
    );

    await expect(
      service.createShareCode(ownerId, petId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(shareCodeModel.create).not.toHaveBeenCalled();
  });

  it('redeems a valid code (case and dash insensitive) and returns the pet', async () => {
    let filter: Record<string, unknown> = {};
    let update: { $set?: Record<string, unknown> } = {};
    shareCodeModel.findOneAndUpdate.mockImplementation(
      (
        nextFilter: Record<string, unknown>,
        nextUpdate: { $set?: Record<string, unknown> },
      ) => {
        filter = nextFilter;
        update = nextUpdate;
        return {
          exec: () =>
            Promise.resolve({
              petId: new Types.ObjectId(petId),
              ownerId: new Types.ObjectId(ownerId),
            }),
        };
      },
    );
    const pet = { id: petId, owner: { id: ownerId } };
    internalPetsService.findActivePetsByIds.mockResolvedValue([pet]);

    const result = await service.redeemShareCode('abcd-2345', vetClinicId);

    expect(result).toBe(pet);
    expect(filter.codeHash).toBe(sha256('ABCD2345'));
    expect(filter.usedAt).toBeNull();
    expect(update.$set?.usedByVetClinicId).toBe(vetClinicId);
  });

  function mockRedeemableCode() {
    shareCodeModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        petId: new Types.ObjectId(petId),
        ownerId: new Types.ObjectId(ownerId),
      }),
    });
    internalPetsService.findActivePetsByIds.mockResolvedValue([
      {
        id: petId,
        name: 'Luna',
        owner: { id: ownerId, firstName: 'Jane', email: 'jane@example.com' },
      },
    ]);
  }

  it('emails the owner when a clinic redeems their code', async () => {
    mockRedeemableCode();

    await service.redeemShareCode('ABCD-2345', vetClinicId, 'Paws Clinic');

    expect(emailService.send).toHaveBeenCalledTimes(1);
    const [message] = emailService.send.mock.calls[0] as [
      { to: string; subject: string; html: string; text: string },
    ];
    expect(message.to).toBe('jane@example.com');
    expect(message.subject).toContain('Paws Clinic');
    expect(message.text).toContain(`https://app.pethealth.test/pets/${petId}`);
  });

  it('still grants access when the notification email fails', async () => {
    mockRedeemableCode();
    emailService.send.mockRejectedValue(new Error('smtp down'));

    await expect(
      service.redeemShareCode('ABCD-2345', vetClinicId),
    ).resolves.toMatchObject({ id: petId });
  });

  it('rejects unknown, used or expired codes', async () => {
    shareCodeModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.redeemShareCode('ABCD-2345', vetClinicId),
    ).rejects.toThrow(ClinicAccessService.INVALID_CODE_MESSAGE);
  });

  it('rejects malformed codes without querying the database', async () => {
    await expect(service.redeemShareCode('ABC', vetClinicId)).rejects.toThrow(
      ClinicAccessService.INVALID_CODE_MESSAGE,
    );
    expect(shareCodeModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a code whose pet now belongs to someone else', async () => {
    shareCodeModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        petId: new Types.ObjectId(petId),
        ownerId: new Types.ObjectId(ownerId),
      }),
    });
    internalPetsService.findActivePetsByIds.mockResolvedValue([
      { id: petId, owner: { id: new Types.ObjectId().toString() } },
    ]);

    await expect(
      service.redeemShareCode('ABCD-2345', vetClinicId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('checks ownership before listing or revoking clinic access', async () => {
    vetBackendClient.listClinicAccessForPet.mockResolvedValue([
      {
        clinicId: vetClinicId,
        clinicName: 'Vet Clinic',
        grantedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    vetBackendClient.revokeClinicAccess.mockResolvedValue(true);

    const list = await service.listClinicAccess(ownerId, petId);
    const revoked = await service.revokeClinicAccess(
      ownerId,
      petId,
      vetClinicId,
    );

    expect(petOwnershipService.assertPetBelongsToOwner).toHaveBeenCalledTimes(
      2,
    );
    expect(list[0]?.grantedAt).toBeInstanceOf(Date);
    expect(revoked).toBe(true);
    expect(vetBackendClient.revokeClinicAccess).toHaveBeenCalledWith(
      petId,
      vetClinicId,
    );
  });

  it('lists pet activity for the owner with a capped limit', async () => {
    vetBackendClient.listAuditEventsForPet.mockResolvedValue([
      {
        id: 'event-1',
        action: 'CREATED',
        entityType: 'VACCINATION',
        actorType: 'CLINIC_USER',
        actorName: 'Ona Vet',
        clinicName: 'Vet Clinic',
        summary: 'Rabies',
        createdAt: '2026-11-15T10:00:00.000Z',
      },
    ]);

    const events = await service.listActivity(ownerId, petId, 10_000);

    expect(petOwnershipService.assertPetBelongsToOwner).toHaveBeenCalledWith(
      ownerId,
      petId,
    );
    expect(vetBackendClient.listAuditEventsForPet).toHaveBeenCalledWith(
      petId,
      200,
    );
    expect(events[0]).toEqual({
      id: 'event-1',
      action: 'CREATED',
      entityType: 'VACCINATION',
      actorType: 'CLINIC_USER',
      actorName: 'Ona Vet',
      clinicName: 'Vet Clinic',
      summary: 'Rabies',
      createdAt: new Date('2026-11-15T10:00:00.000Z'),
    });
  });

  it('does not reach the Vet backend for pets the user does not own', async () => {
    petOwnershipService.assertPetBelongsToOwner.mockRejectedValueOnce(
      new NotFoundException('Pet not found'),
    );

    await expect(service.listActivity(ownerId, petId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(vetBackendClient.listAuditEventsForPet).not.toHaveBeenCalled();
  });
});
