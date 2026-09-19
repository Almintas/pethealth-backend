import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { resolve } from 'path';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { isCloudinaryPetPhotoConfigured } from './cloudinary-pet-photo.config';
import { CloudinaryPetPhotoStorage } from './cloudinary-pet-photo.storage';

config({ path: resolve(__dirname, '../../.env') });

function buildConfigService(): ConfigService {
  return {
    get: <T = string>(key: string) => process.env[key] as T,
    getOrThrow: <T = string>(key: string) => {
      const value = process.env[key];
      if (!value?.trim()) {
        throw new Error(`Missing configuration: ${key}`);
      }
      return value as T;
    },
  } as ConfigService;
}

const configService = buildConfigService();
const cloudinaryConfigured = isCloudinaryPetPhotoConfigured(configService);

async function assetExists(publicId: string): Promise<boolean> {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const result = await cloudinary.api.resource(publicId, {
    resource_type: 'image',
  });

  return Boolean(result?.public_id);
}

async function buildTinyPng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 48,
      height: 48,
      channels: 3,
      background: '#3b82f6',
    },
  })
    .png()
    .toBuffer();
}

(cloudinaryConfigured ? describe : describe.skip)(
  'CloudinaryPetPhotoStorage (integration)',
  () => {
    const storage = new CloudinaryPetPhotoStorage(configService);
    const ownerId = '507f1f77bcf86cd799439011';
    const petId = '507f1f77bcf86cd799439021';

    it('uploads to pethealth/pets/{petId} and returns public_id + CDN URL', async () => {
      const buffer = await buildTinyPng();
      const stored = await storage.storePetPhoto(
        ownerId,
        petId,
        buffer,
        'image/png',
      );

      expect(stored.storageKey).toMatch(
        new RegExp(`^pethealth/pets/${petId}/[\\w-]+$`),
      );
      expect(stored.photoUrl).toMatch(/^https:\/\/res\.cloudinary\.com\//);
      expect(stored.photoUrl).not.toContain(process.env.CLOUDINARY_API_SECRET);

      await storage.deletePetPhoto(stored.storageKey);
    });

    it('deletes the Cloudinary asset when remove is called', async () => {
      const buffer = await buildTinyPng();
      const stored = await storage.storePetPhoto(
        ownerId,
        petId,
        buffer,
        'image/png',
      );

      await storage.deletePetPhoto(stored.storageKey);

      await expect(assetExists(stored.storageKey)).rejects.toThrow();
    });

    it('replace flow deletes the previous public_id', async () => {
      const buffer = await buildTinyPng();
      const first = await storage.storePetPhoto(ownerId, petId, buffer, 'image/png');
      const second = await storage.storePetPhoto(
        ownerId,
        petId,
        buffer,
        'image/png',
      );

      expect(second.storageKey).not.toBe(first.storageKey);

      await storage.deletePetPhoto(first.storageKey);
      await expect(assetExists(first.storageKey)).rejects.toThrow();
      await expect(assetExists(second.storageKey)).resolves.toBe(true);

      await storage.deletePetPhoto(second.storageKey);
    });
  },
);
