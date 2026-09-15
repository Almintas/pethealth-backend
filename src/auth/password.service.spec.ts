import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('hashes a password without storing plain text in the result', async () => {
    const plainPassword = 'secure-password';

    const hash = await service.hash(plainPassword);

    expect(hash).not.toBe(plainPassword);
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('compares a plain password against its hash', async () => {
    const plainPassword = 'another-secure-password';
    const hash = await service.hash(plainPassword);

    await expect(service.compare(plainPassword, hash)).resolves.toBe(true);
    await expect(service.compare('wrong-password', hash)).resolves.toBe(false);
  });
});
