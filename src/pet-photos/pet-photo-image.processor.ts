import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import {
  PET_PHOTO_ALLOWED_MIME_TYPES,
  PET_PHOTO_MAX_UPLOAD_BYTES,
} from './pet-photo.constants';

export type ProcessedPetPhoto = {
  buffer: Buffer;
  contentType: 'image/webp';
  extension: 'webp';
};

const SHARP_FORMAT_TO_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export async function processPetPhotoImage(
  fileBuffer: Buffer,
): Promise<ProcessedPetPhoto> {
  if (!fileBuffer?.length) {
    throw new BadRequestException('Photo file is required');
  }

  if (fileBuffer.length > PET_PHOTO_MAX_UPLOAD_BYTES) {
    throw new BadRequestException(
      'Photo must be 5 MB or smaller. Choose a smaller image.',
    );
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(fileBuffer, { failOn: 'error' }).metadata();
  } catch {
    throw new BadRequestException(
      'Unsupported image. Use a JPG, PNG, or WebP photo.',
    );
  }

  const format = metadata.format;
  if (!format || !SHARP_FORMAT_TO_MIME[format]) {
    throw new BadRequestException(
      'Unsupported image. Use a JPG, PNG, or WebP photo.',
    );
  }

  const detectedMime = SHARP_FORMAT_TO_MIME[format];
  if (!PET_PHOTO_ALLOWED_MIME_TYPES.has(detectedMime)) {
    throw new BadRequestException(
      'Unsupported image. Use a JPG, PNG, or WebP photo.',
    );
  }

  try {
    const processed = await sharp(fileBuffer, { failOn: 'error' })
      .rotate()
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();

    return {
      buffer: processed,
      contentType: 'image/webp',
      extension: 'webp',
    };
  } catch {
    throw new BadRequestException(
      'Could not process this image. Try another photo.',
    );
  }
}
