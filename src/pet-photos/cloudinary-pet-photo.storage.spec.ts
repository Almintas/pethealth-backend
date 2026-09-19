import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { CloudinaryPetPhotoStorage } from './cloudinary-pet-photo.storage';

describe('CloudinaryPetPhotoStorage', () => {
  const buildConfig = (values: Record<string, string | undefined>) =>
    ({
      get: (key: string) => values[key],
      getOrThrow: (key: string) => {
        const value = values[key];
        if (!value) {
          throw new Error(`Missing ${key}`);
        }
        return value;
      },
    }) as ConfigService;

  it('throws a safe error when Cloudinary is not configured', async () => {
    const storage = new CloudinaryPetPhotoStorage(buildConfig({}));

    await expect(
      storage.storePetPhoto('owner', 'pet', Buffer.from('x'), 'image/png'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('skips remote delete when Cloudinary is not configured', async () => {
    const storage = new CloudinaryPetPhotoStorage(buildConfig({}));

    await expect(
      storage.deletePetPhoto('pethealth/pets/pet-id/file'),
    ).resolves.toBeUndefined();
  });
});
