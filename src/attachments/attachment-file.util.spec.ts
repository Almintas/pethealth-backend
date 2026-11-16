import { BadRequestException } from '@nestjs/common';
import {
  ATTACHMENT_MAX_BYTES,
  assertAttachmentAllowed,
  contentDisposition,
  decodeMultipartFileName,
  detectAttachmentContentType,
  sanitizeAttachmentFileName,
} from './attachment-file.util';

const pdf = Buffer.from('%PDF-1.7\n...');
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0]);
const webp = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
]);

describe('attachment files', () => {
  it('recognises allowed files by their content', () => {
    expect(detectAttachmentContentType(pdf)).toBe('application/pdf');
    expect(detectAttachmentContentType(png)).toBe('image/png');
    expect(detectAttachmentContentType(jpeg)).toBe('image/jpeg');
    expect(detectAttachmentContentType(webp)).toBe('image/webp');
  });

  it('rejects other, empty and oversized files', () => {
    expect(() => assertAttachmentAllowed(Buffer.from('<html>'))).toThrow(
      BadRequestException,
    );
    expect(() => assertAttachmentAllowed(Buffer.alloc(0))).toThrow(
      BadRequestException,
    );
    expect(() => assertAttachmentAllowed(undefined)).toThrow(
      BadRequestException,
    );
    const big = Buffer.alloc(ATTACHMENT_MAX_BYTES + 1);
    pdf.copy(big);
    expect(() => assertAttachmentAllowed(big)).toThrow(/10 MB/);
  });

  it('keeps a readable name with the real extension', () => {
    expect(
      sanitizeAttachmentFileName(
        'C:\\scans\\Rentgenas ąžuolas.PDF',
        'application/pdf',
      ),
    ).toBe('Rentgenas ąžuolas.pdf');
    expect(sanitizeAttachmentFileName('../../evil"name.exe', 'image/png')).toBe(
      'evilname.png',
    );
    expect(sanitizeAttachmentFileName(undefined, 'image/jpeg')).toBe(
      'file.jpg',
    );
    expect(
      sanitizeAttachmentFileName(`${'a'.repeat(300)}.pdf`, 'application/pdf'),
    ).toHaveLength(114);
  });

  it('repairs UTF-8 names that multipart parsing read as latin1', () => {
    const mangled = Buffer.from('Krūtinės rentgenas.pdf', 'utf8').toString(
      'latin1',
    );
    expect(decodeMultipartFileName(mangled)).toBe('Krūtinės rentgenas.pdf');
    expect(decodeMultipartFileName('Krūtinės.pdf')).toBe('Krūtinės.pdf');
    expect(decodeMultipartFileName('café.pdf')).toBe('café.pdf');
    expect(sanitizeAttachmentFileName(mangled, 'application/pdf')).toBe(
      'Krūtinės rentgenas.pdf',
    );
  });

  it('builds a download header that keeps non-ASCII names', () => {
    expect(contentDisposition('Kraujo tyrimas č.pdf')).toBe(
      'attachment; filename="Kraujo tyrimas c.pdf"; ' +
        "filename*=UTF-8''Kraujo%20tyrimas%20%C4%8D.pdf",
    );
  });
});
