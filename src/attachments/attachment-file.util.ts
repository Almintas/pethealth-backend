import { BadRequestException } from '@nestjs/common';

/** Largest file a clinic can attach to a medical record. */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/** How many files one medical record can carry. */
export const ATTACHMENT_MAX_PER_RECORD = 20;

export const ATTACHMENT_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AttachmentContentType = (typeof ATTACHMENT_CONTENT_TYPES)[number];

const EXTENSION: Record<AttachmentContentType, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE =
  'Only PDF, JPG, PNG or WebP files can be attached.';
export const ATTACHMENT_TOO_LARGE_MESSAGE =
  'The file is too large. Attach files up to 10 MB.';
export const ATTACHMENT_EMPTY_MESSAGE = 'The file is empty.';

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

/**
 * Works out the file type from its first bytes. The browser-supplied
 * Content-Type and file name are not trusted.
 */
export function detectAttachmentContentType(
  buffer: Buffer,
): AttachmentContentType | null {
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return 'application/pdf'; // %PDF-
  }
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (
    startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && // RIFF
    startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8) // WEBP
  ) {
    return 'image/webp';
  }
  return null;
}

/** Throws a 400 with a user-facing message unless the file can be stored. */
export function assertAttachmentAllowed(
  buffer: Buffer | undefined,
): AttachmentContentType {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestException(ATTACHMENT_EMPTY_MESSAGE);
  }
  if (buffer.length > ATTACHMENT_MAX_BYTES) {
    throw new BadRequestException(ATTACHMENT_TOO_LARGE_MESSAGE);
  }
  const contentType = detectAttachmentContentType(buffer);
  if (!contentType) {
    throw new BadRequestException(ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE);
  }
  return contentType;
}

/**
 * Multer (busboy) reads multipart file names as latin1, so "Krūtinės.pdf"
 * arrives as "KrÅ«tinÄ\x97s.pdf". Turn such names back into UTF-8; names that
 * are not valid UTF-8 bytes are kept as they came.
 */
export function decodeMultipartFileName(name: string): string {
  // eslint-disable-next-line no-control-regex
  if (/[^\u0000-\u00ff]/.test(name)) {
    return name;
  }
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\ufffd') ? name : decoded;
}

/**
 * A safe display/download name: no paths or control characters, at most
 * 120 characters, and the extension that matches the real file type.
 */
export function sanitizeAttachmentFileName(
  original: string | undefined,
  contentType: AttachmentContentType,
): string {
  const extension = EXTENSION[contentType];
  const baseName = decodeMultipartFileName(original ?? '')
    .normalize('NFC')
    .split(/[\\/]/)
    .pop()!
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f"<>:|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.[A-Za-z0-9]{1,5}$/, '')
    .slice(0, 110)
    .trim();
  return `${baseName || 'file'}.${extension}`;
}

/** Content-Disposition value that keeps non-ASCII names (RFC 6266/5987). */
export function contentDisposition(fileName: string): string {
  const asciiFallback = fileName
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_');
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
