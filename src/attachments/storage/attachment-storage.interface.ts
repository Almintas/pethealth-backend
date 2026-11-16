import type { Readable } from 'node:stream';

/** Where attachment bytes are kept. Metadata stays in MongoDB either way. */
export interface AttachmentStorage {
  /** Stores the bytes and returns the key to read or delete them later. */
  save(
    buffer: Buffer,
    meta: { fileName: string; contentType: string; petId: string },
  ): Promise<string>;

  /** Streams the bytes back; rejects with NotFoundException if missing. */
  open(storageKey: string): Promise<Readable>;

  /** Best-effort delete; a missing key is not an error. */
  delete(storageKey: string): Promise<void>;
}

export const ATTACHMENT_STORAGE = Symbol('ATTACHMENT_STORAGE');
