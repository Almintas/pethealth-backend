import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';
import {
  CLOUDINARY_ENV_KEYS,
  isCloudinaryPetPhotoConfigured,
  readCloudinaryPetPhotoFolder,
} from './cloudinary-pet-photo.config';
import type {
  PetPhotoStorage,
  StoredPetPhoto,
} from './pet-photo-storage.interface';

const AVATAR_TRANSFORM = 'c_fill,w_512,h_512,f_auto,q_auto';

export const PET_PHOTO_STORAGE_UNAVAILABLE_MESSAGE =
  'Pet photo uploads are not available right now. Please try again later or contact support.';

@Injectable()
export class CloudinaryPetPhotoStorage implements PetPhotoStorage {
  private configured = false;

  constructor(private readonly configService: ConfigService) {}

  private ensureConfigured(): void {
    if (this.configured) {
      return;
    }

    if (!isCloudinaryPetPhotoConfigured(this.configService)) {
      throw new ServiceUnavailableException(
        PET_PHOTO_STORAGE_UNAVAILABLE_MESSAGE,
      );
    }

    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>(
        CLOUDINARY_ENV_KEYS.cloudName,
      ),
      api_key: this.configService.getOrThrow<string>(
        CLOUDINARY_ENV_KEYS.apiKey,
      ),
      api_secret: this.configService.getOrThrow<string>(
        CLOUDINARY_ENV_KEYS.apiSecret,
      ),
      secure: true,
    });

    this.configured = true;
  }

  async storePetPhoto(
    _ownerId: string,
    petId: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<StoredPetPhoto> {
    void contentType;
    this.ensureConfigured();

    const folderBase = readCloudinaryPetPhotoFolder(this.configService);
    const publicId = `${folderBase}/${petId}/${randomUUID()}`;

    try {
      const uploadResult = await new Promise<{
        public_id: string;
      }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: 'image',
            overwrite: false,
            format: 'webp',
          },
          (error, result) => {
            if (error || !result) {
              reject(
                error instanceof Error
                  ? error
                  : new Error('Cloudinary upload failed'),
              );
              return;
            }
            resolve({ public_id: result.public_id });
          },
        );

        stream.end(buffer);
      });

      const photoUrl = cloudinary.url(uploadResult.public_id, {
        secure: true,
        transformation: [{ raw_transformation: AVATAR_TRANSFORM }],
      });

      return {
        storageKey: uploadResult.public_id,
        photoUrl,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to store pet photo');
    }
  }

  async deletePetPhoto(storageKey: string): Promise<void> {
    if (!storageKey) {
      return;
    }

    if (!isCloudinaryPetPhotoConfigured(this.configService)) {
      return;
    }

    this.ensureConfigured();

    try {
      await cloudinary.uploader.destroy(storageKey, {
        resource_type: 'image',
        invalidate: true,
      });
    } catch {
      // Best-effort cleanup when replacing or deleting pets.
    }
  }
}
