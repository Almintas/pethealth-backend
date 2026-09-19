import { ConfigService } from '@nestjs/config';
import {
  isCloudinaryPetPhotoConfigured,
  readCloudinaryPetPhotoFolder,
} from './cloudinary-pet-photo.config';

describe('cloudinary pet photo config', () => {
  const buildConfig = (values: Record<string, string | undefined>) =>
    ({
      get: (key: string) => values[key],
    }) as ConfigService;

  it('detects when Cloudinary env is complete', () => {
    const config = buildConfig({
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
    });

    expect(isCloudinaryPetPhotoConfigured(config)).toBe(true);
  });

  it('detects missing Cloudinary configuration', () => {
    const config = buildConfig({
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: '',
    });

    expect(isCloudinaryPetPhotoConfigured(config)).toBe(false);
  });

  it('uses default folder when not configured', () => {
    const config = buildConfig({});
    expect(readCloudinaryPetPhotoFolder(config)).toBe('pethealth/pets');
  });
});
