import { ConfigService } from '@nestjs/config';

export const CLOUDINARY_ENV_KEYS = {
  cloudName: 'CLOUDINARY_CLOUD_NAME',
  apiKey: 'CLOUDINARY_API_KEY',
  apiSecret: 'CLOUDINARY_API_SECRET',
  folder: 'CLOUDINARY_PET_PHOTO_FOLDER',
} as const;

export const DEFAULT_CLOUDINARY_PET_PHOTO_FOLDER = 'pethealth/pets';

export function isCloudinaryPetPhotoConfigured(
  configService: ConfigService,
): boolean {
  const cloudName = configService
    .get<string>(CLOUDINARY_ENV_KEYS.cloudName)
    ?.trim();
  const apiKey = configService.get<string>(CLOUDINARY_ENV_KEYS.apiKey)?.trim();
  const apiSecret = configService
    .get<string>(CLOUDINARY_ENV_KEYS.apiSecret)
    ?.trim();

  return Boolean(cloudName && apiKey && apiSecret);
}

export function readCloudinaryPetPhotoFolder(
  configService: ConfigService,
): string {
  return (
    configService.get<string>(CLOUDINARY_ENV_KEYS.folder)?.trim() ||
    DEFAULT_CLOUDINARY_PET_PHOTO_FOLDER
  );
}
