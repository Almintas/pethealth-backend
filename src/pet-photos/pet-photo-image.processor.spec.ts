import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { processPetPhotoImage } from './pet-photo-image.processor';

describe('processPetPhotoImage', () => {
  it('accepts a valid PNG and returns webp', async () => {
    const png = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: '#336699',
      },
    })
      .png()
      .toBuffer();

    const result = await processPetPhotoImage(png);

    expect(result.contentType).toBe('image/webp');
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('rejects empty buffers', async () => {
    await expect(processPetPhotoImage(Buffer.alloc(0))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects non-image data', async () => {
    await expect(
      processPetPhotoImage(Buffer.from('not-an-image')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects oversized buffers', async () => {
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1, 1);
    await expect(processPetPhotoImage(oversized)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
