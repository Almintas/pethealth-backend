import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { contentDisposition } from './attachment-file.util';
import type { OpenedAttachment } from './attachment-files.service';

/** Sends an attachment as a download, never rendered inline by the browser. */
export function attachmentDownload(
  response: Response,
  { attachment, stream }: OpenedAttachment,
): StreamableFile {
  response.set({
    'Content-Type': attachment.contentType,
    'Content-Length': String(attachment.size),
    'Content-Disposition': contentDisposition(attachment.fileName),
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  return new StreamableFile(stream);
}
