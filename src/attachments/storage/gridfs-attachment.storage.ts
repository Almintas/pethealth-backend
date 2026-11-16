import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, isValidObjectId, mongo, Types } from 'mongoose';
import type { Readable } from 'node:stream';
import type { AttachmentStorage } from './attachment-storage.interface';

export const ATTACHMENT_BUCKET_NAME = 'medical_attachment_files';

/**
 * Keeps attachment bytes in MongoDB GridFS, next to the records they belong
 * to: private by default (served only through the API), no extra service to
 * configure, and removed together with the owner's data.
 */
@Injectable()
export class GridFsAttachmentStorage implements AttachmentStorage {
  private bucket?: mongo.GridFSBucket;

  constructor(@InjectConnection() private readonly connection: Connection) {}

  private getBucket(): mongo.GridFSBucket {
    if (!this.bucket) {
      const db = this.connection.db;
      if (!db) {
        throw new Error('MongoDB connection is not ready');
      }
      this.bucket = new mongo.GridFSBucket(db, {
        bucketName: ATTACHMENT_BUCKET_NAME,
      });
    }
    return this.bucket;
  }

  save(
    buffer: Buffer,
    meta: { fileName: string; contentType: string; petId: string },
  ): Promise<string> {
    const upload = this.getBucket().openUploadStream(meta.fileName, {
      metadata: { contentType: meta.contentType, petId: meta.petId },
    });
    return new Promise((resolve, reject) => {
      upload.once('error', reject);
      upload.once('finish', () => resolve(upload.id.toString()));
      upload.end(buffer);
    });
  }

  async open(storageKey: string): Promise<Readable> {
    if (!isValidObjectId(storageKey)) {
      throw new NotFoundException('Attachment not found');
    }
    const id = new Types.ObjectId(storageKey);
    const files = await this.getBucket().find({ _id: id }).limit(1).toArray();
    if (files.length === 0) {
      throw new NotFoundException('Attachment not found');
    }
    return this.getBucket().openDownloadStream(id);
  }

  async delete(storageKey: string): Promise<void> {
    if (!isValidObjectId(storageKey)) {
      return;
    }
    try {
      await this.getBucket().delete(new Types.ObjectId(storageKey));
    } catch (error: unknown) {
      // Already gone is fine; anything else is for the caller to log.
      if (!(error instanceof Error && /file not found/i.test(error.message))) {
        throw error;
      }
    }
  }
}
