import {
  Injectable,
  InternalServerErrorException,
  Logger,
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
  private readonly logger = new Logger(CloudinaryPetPhotoStorage.name);
  private configured = false;

  constructor(private readonly configService: ConfigService) {}

  /** Temporary diagnostic logging — safe fields only (no credentials). */
  private logCloudinaryUploadStreamFailure(
    uploadOptions: {
      public_id: string;
      format: string;
      resource_type: string;
      overwrite: boolean;
    },
    error: unknown,
    missingResult: boolean,
  ): void {
    const payload: Record<string, unknown> = {
      public_id: uploadOptions.public_id,
      format: uploadOptions.format,
      resource_type: uploadOptions.resource_type,
      overwrite: uploadOptions.overwrite,
      missingResult,
    };

    if (error !== null && error !== undefined) {
      if (error instanceof Error) {
        payload.message = error.message;
        payload.name = error.name;
      }

      if (typeof error === 'object') {
        const record = error as Record<string, unknown>;
        if (typeof record.message === 'string' && !payload.message) {
          payload.message = record.message;
        }
        if (typeof record.name === 'string' && !payload.name) {
          payload.name = record.name;
        }
        if (typeof record.http_code === 'number') {
          payload.http_code = record.http_code;
        }
        if (
          typeof record.code === 'string' ||
          typeof record.code === 'number'
        ) {
          payload.code = record.code;
        }
      }
    }

    this.logger.error(
      `Cloudinary upload_stream failed (diagnostic): ${JSON.stringify(payload)}`,
    );
  }

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

    const uploadOptions = {
      public_id: publicId,
      resource_type: 'image' as const,
      overwrite: false,
      format: 'webp' as const,
    };

    try {
      const uploadResult = await new Promise<{
        public_id: string;
      }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error || !result) {
              this.logCloudinaryUploadStreamFailure(
                uploadOptions,
                error,
                !result,
              );
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
