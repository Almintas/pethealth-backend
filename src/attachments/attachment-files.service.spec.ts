import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { Readable } from 'node:stream';
import { ATTACHMENT_MAX_PER_RECORD } from './attachment-file.util';
import { AttachmentFilesService } from './attachment-files.service';

const execOf = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('AttachmentFilesService', () => {
  const recordId = new Types.ObjectId();
  const petId = new Types.ObjectId();
  const attachmentId = new Types.ObjectId();
  const pdf = Buffer.from('%PDF-1.4 test');

  const attachmentModel = {
    countDocuments: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn(),
  };
  const storage = {
    save: jest.fn(),
    open: jest.fn(),
    delete: jest.fn(),
  };
  let service: AttachmentFilesService;

  const row = (overrides: Record<string, unknown> = {}) => ({
    _id: attachmentId,
    medicalRecordId: recordId,
    petId,
    fileName: 'xray.pdf',
    contentType: 'application/pdf',
    size: pdf.length,
    storageKey: 'key-1',
    clinicId: 'clinic-1',
    clinicName: 'Paws',
    uploadedByName: 'Dr Ona',
    createdAt: new Date('2026-11-16T10:00:00Z'),
    deleteOne: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    storage.save.mockResolvedValue('key-1');
    storage.delete.mockResolvedValue(undefined);
    service = new AttachmentFilesService(
      attachmentModel as never,
      storage as never,
    );
  });

  describe('create', () => {
    const record = { id: recordId.toString(), petId: petId.toString() };

    it('stores a PDF with a clean name and the uploader', async () => {
      attachmentModel.countDocuments.mockReturnValue(execOf(0));
      attachmentModel.create.mockImplementation(
        (data: Record<string, unknown>) => Promise.resolve(row(data)),
      );

      const created = await service.create(
        record,
        { buffer: pdf, originalname: 'Rentgenas.PDF' },
        { clinicId: 'clinic-1', clinicName: 'Paws', uploadedByName: 'Dr Ona' },
      );

      expect(storage.save).toHaveBeenCalledWith(pdf, {
        fileName: 'Rentgenas.pdf',
        contentType: 'application/pdf',
        petId: petId.toString(),
      });
      expect(attachmentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'Rentgenas.pdf',
          size: pdf.length,
          storageKey: 'key-1',
          clinicId: 'clinic-1',
        }),
      );
      expect(created).toMatchObject({
        medicalRecordId: recordId.toString(),
        fileName: 'Rentgenas.pdf',
        clinicName: 'Paws',
      });
      expect(created).not.toHaveProperty('storageKey');
    });

    it('rejects files that are not PDF or images before storing', async () => {
      await expect(
        service.create(record, { buffer: Buffer.from('MZ...') }, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('limits how many files a record can have', async () => {
      attachmentModel.countDocuments.mockReturnValue(
        execOf(ATTACHMENT_MAX_PER_RECORD),
      );
      await expect(
        service.create(record, { buffer: pdf }, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('removes the stored bytes if saving the metadata fails', async () => {
      attachmentModel.countDocuments.mockReturnValue(execOf(0));
      attachmentModel.create.mockRejectedValue(new Error('db down'));
      await expect(service.create(record, { buffer: pdf }, {})).rejects.toThrow(
        'db down',
      );
      expect(storage.delete).toHaveBeenCalledWith('key-1');
    });
  });

  describe('open', () => {
    it('only opens an attachment of the given record', async () => {
      attachmentModel.findOne.mockReturnValue(execOf(row()));
      const stream = Readable.from(['x']);
      storage.open.mockResolvedValue(stream);

      const opened = await service.open(
        recordId.toString(),
        attachmentId.toString(),
      );

      expect(attachmentModel.findOne).toHaveBeenCalledWith({
        _id: attachmentId,
        medicalRecordId: recordId,
      });
      expect(opened.stream).toBe(stream);
      expect(opened.attachment.fileName).toBe('xray.pdf');
    });

    it('answers 404 for unknown or malformed ids', async () => {
      attachmentModel.findOne.mockReturnValue(execOf(null));
      await expect(
        service.open(recordId.toString(), attachmentId.toString()),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.open('nope', 'nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('lets the uploading clinic remove its file', async () => {
      const found = row();
      attachmentModel.findOne.mockReturnValue(execOf(found));

      await service.delete(
        recordId.toString(),
        attachmentId.toString(),
        'clinic-1',
      );

      expect(found.deleteOne).toHaveBeenCalled();
      expect(storage.delete).toHaveBeenCalledWith('key-1');
    });

    it('refuses another clinic', async () => {
      const found = row();
      attachmentModel.findOne.mockReturnValue(execOf(found));

      await expect(
        service.delete(recordId.toString(), attachmentId.toString(), 'other'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(found.deleteOne).not.toHaveBeenCalled();
    });
  });

  it('deletes all files of deleted pets', async () => {
    attachmentModel.find.mockReturnValue({
      select: () => execOf([row(), row({ storageKey: 'key-2' })]),
    });
    attachmentModel.deleteMany.mockReturnValue(execOf({ deletedCount: 2 }));

    await service.deleteForPets([petId]);

    expect(attachmentModel.find).toHaveBeenCalledWith({
      petId: { $in: [petId] },
    });
    expect(storage.delete).toHaveBeenCalledWith('key-1');
    expect(storage.delete).toHaveBeenCalledWith('key-2');
  });
});
