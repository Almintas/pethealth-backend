import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MicrochipService } from './microchip.service';

const execOf = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('MicrochipService', () => {
  const petId = new Types.ObjectId();
  const ownerId = new Types.ObjectId();
  const pet = {
    _id: petId,
    ownerId,
    name: 'Rex',
    species: 'Dog',
    breed: undefined,
  };
  const petModel = { find: jest.fn() };
  const userModel = { findById: jest.fn() };
  const emailService = { send: jest.fn() };
  const configService = { get: jest.fn().mockReturnValue('https://app.test/') };
  let service: MicrochipService;

  beforeEach(() => {
    jest.clearAllMocks();
    petModel.find.mockReturnValue({ limit: () => execOf([pet]) });
    service = new MicrochipService(
      petModel as never,
      userModel as never,
      emailService as never,
      configService as never,
    );
  });

  it('returns only pet details, never the owner', async () => {
    const matches = await service.lookup('440 123 456 789 012');

    expect(matches).toEqual([
      { petId: petId.toString(), name: 'Rex', species: 'Dog', breed: null },
    ]);
    const filter = petModel.find.mock.calls[0][0] as Record<string, unknown>;
    expect(filter.deletedAt).toBeNull();
  });

  it('rejects invalid chip numbers', async () => {
    await expect(service.lookup('12')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(petModel.find).not.toHaveBeenCalled();
  });

  it('emails the owner with the clinic contact', async () => {
    userModel.findById.mockReturnValue(
      execOf({ email: 'ona@example.com', firstName: 'Ona' }),
    );
    emailService.send.mockResolvedValue({ ok: true, messageId: 'm1' });

    const sent = await service.notifyOwner({
      microchip: '440123456789012',
      petId: petId.toString(),
      clinicName: 'Paws',
      clinicPhone: '+370 600 00000',
    });

    expect(sent).toBe(true);
    const email = emailService.send.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(email.to).toBe('ona@example.com');
    expect(email.subject).toContain('Rex');
    expect(email.html).toContain('+370 600 00000');
    expect(email.html).toContain(`https://app.test/pets/${petId.toString()}`);
  });

  it('refuses to email the owner of a pet with another chip', async () => {
    await expect(
      service.notifyOwner({
        microchip: '440123456789012',
        petId: new Types.ObjectId().toString(),
        clinicName: 'Paws',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(emailService.send).not.toHaveBeenCalled();
  });
});
