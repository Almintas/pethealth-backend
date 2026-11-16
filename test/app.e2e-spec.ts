import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Types } from 'mongoose';
import { UserRole } from '../src/users/enums/user-role.enum';
import {
  expectGraphqlErrors,
  GraphqlResponse,
  postGraphql,
  uniqueEmail,
} from './helpers/graphql-test.helpers';
import { applyHttpSecurityMiddleware } from '../src/http-security.config';
import { ConfigService } from '@nestjs/config';
import { isCloudinaryPetPhotoConfigured } from '../src/pet-photos/cloudinary-pet-photo.config';
import request from 'supertest';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const REGISTER_MUTATION = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      id
      email
      firstName
      lastName
    }
  }
`;

const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        email
      }
    }
  }
`;

const ME_QUERY = `
  query Me {
    me {
      id
      email
    }
  }
`;

const CREATE_PET_MUTATION = `
  mutation CreatePet($input: CreatePetInput!) {
    createPet(input: $input) {
      id
      name
      species
      ownerId
    }
  }
`;

const PET_QUERY = `
  query Pet($id: ID!) {
    pet(id: $id) {
      id
      name
    }
  }
`;

const UPDATE_PET_MUTATION = `
  mutation UpdatePet($id: ID!, $input: UpdatePetInput!) {
    updatePet(id: $id, input: $input) {
      id
      name
    }
  }
`;

type NestErrorBody = {
  message?: string | string[];
  photoUrl?: string;
};

const DELETE_PET_MUTATION = `
  mutation DeletePet($id: ID!) {
    deletePet(id: $id)
  }
`;

const CREATE_MEDICAL_RECORD_MUTATION = `
  mutation CreateMedicalRecord($input: CreateMedicalRecordInput!) {
    createMedicalRecord(input: $input) {
      id
      petId
      title
    }
  }
`;

const MEDICAL_RECORD_QUERY = `
  query MedicalRecord($id: ID!) {
    medicalRecord(id: $id) {
      id
      title
    }
  }
`;

const E2E_SERVICE_SECRET = 'e2e-owner-service-secret-at-least-32-chars';

const CREATE_PET_SHARE_CODE_MUTATION = `
  mutation CreatePetShareCode($petId: ID!) {
    createPetShareCode(petId: $petId) {
      code
      expiresAt
    }
  }
`;

const INTERNAL_REDEEM_SHARE_CODE_MUTATION = `
  mutation Redeem($code: String!, $vetClinicId: ID!) {
    internalRedeemPetShareCode(code: $code, vetClinicId: $vetClinicId) {
      id
      name
      owner {
        id
        email
      }
    }
  }
`;

const INTERNAL_REGISTER_PET_FOR_VET_MUTATION = `
  mutation RegisterForVet($input: InternalRegisterPetForVetInput!) {
    internalRegisterPetForVet(input: $input) {
      id
      owner {
        id
        email
      }
    }
  }
`;

const INTERNAL_UPDATE_OWNER_PROFILE_MUTATION = `
  mutation UpdateOwner($petId: ID!, $input: InternalUpdateOwnerProfileForVetInput!) {
    internalUpdateOwnerProfileForVet(petId: $petId, input: $input) {
      id
    }
  }
`;

const ACTIVATE_ACCOUNT_MUTATION = `
  mutation Activate($input: ActivateAccountInput!) {
    activateAccount(input: $input) {
      accessToken
      user {
        id
        email
      }
    }
  }
`;

describe('PetHealth GraphQL (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.JWT_SECRET = 'e2e-test-jwt-secret-at-least-32-characters-long';
    process.env.THROTTLE_LIMIT = '100000';
    process.env.THROTTLE_TTL_MS = '60000';
    process.env.THROTTLE_AUTH_LIMIT = '100000';
    process.env.THROTTLE_AUTH_TTL_MS = '60000';
    process.env.OWNER_SERVICE_SECRET = E2E_SERVICE_SECRET;

    /* AppModule is imported dynamically so test env vars exist before ConfigModule validation runs. */
    const appModule = (await import(
      '../src/app.module'
    )) as typeof import('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [appModule.AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    applyHttpSecurityMiddleware(app);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (!app) {
      return;
    }
    const connection = app.get<Connection>(getConnectionToken());
    const collections = connection.collections;
    await Promise.all(
      Object.values(collections).map((collection) => collection.deleteMany({})),
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  async function registerUser(
    label: string,
    password = 'Password123!',
  ): Promise<{ id: string; email: string; password: string }> {
    const email = uniqueEmail(label);
    const response = await postGraphql<{
      register: { id: string; email: string };
    }>(app, REGISTER_MUTATION, {
      input: {
        email,
        password,
        firstName: 'E2E',
        lastName: label,
      },
    });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data?.register.id).toBeDefined();
    return {
      id: response.body.data!.register.id,
      email: response.body.data!.register.email,
      password,
    };
  }

  async function setUserRole(userId: string, role: UserRole): Promise<void> {
    const connection = app.get<Connection>(getConnectionToken());
    await connection
      .collection('users')
      .updateOne({ _id: new Types.ObjectId(userId) }, { $set: { role } });
  }

  async function loginUser(email: string, password: string): Promise<string> {
    const response = await postGraphql<{
      login: { accessToken: string };
    }>(app, LOGIN_MUTATION, {
      input: { email, password },
    });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data?.login.accessToken).toBeDefined();
    return response.body.data!.login.accessToken;
  }

  describe('authentication', () => {
    it('registers a user through GraphQL', async () => {
      const user = await registerUser('register-success');
      expect(user.email).toContain('@e2e.pethealth.test');
    });

    it('logs in and returns access token', async () => {
      const user = await registerUser('login-success');
      const token = await loginUser(user.email, user.password);
      expect(token.split('.').length).toBe(3);
    });

    it('returns the authenticated user from me', async () => {
      const user = await registerUser('me-query');
      const token = await loginUser(user.email, user.password);

      const response = await postGraphql<{ me: { id: string; email: string } }>(
        app,
        ME_QUERY,
        undefined,
        token,
      );

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data?.me.id).toBe(user.id);
      expect(response.body.data?.me.email).toBe(user.email);
    });

    it('rejects unauthenticated access to me', async () => {
      const response = await postGraphql(app, ME_QUERY);
      expectGraphqlErrors(response.body);
    });

    it('rejects invalid registration input', async () => {
      const response = await postGraphql(app, REGISTER_MUTATION, {
        input: {
          email: uniqueEmail('bad-register'),
          password: 'short',
          firstName: 'Bad',
          lastName: 'Input',
        },
      });
      expectGraphqlErrors(response.body);
    });

    it('rejects login with invalid credentials', async () => {
      const user = await registerUser('bad-login');
      const response = await postGraphql(app, LOGIN_MUTATION, {
        input: {
          email: user.email,
          password: 'WrongPassword999!',
        },
      });
      expectGraphqlErrors(response.body, 'invalid credentials');
    });

    it('rejects protected operations without a Bearer token', async () => {
      const response = await postGraphql(app, PET_QUERY, {
        id: '507f1f77bcf86cd799439011',
      });
      expectGraphqlErrors(response.body);
    });

    it('rejects a malformed JWT', async () => {
      const response = await postGraphql(
        app,
        ME_QUERY,
        undefined,
        'not.a.valid.jwt',
      );
      expectGraphqlErrors(response.body);
    });
  });

  describe('pet and medical record ownership', () => {
    it('allows an owner to manage pets and read clinic records but not create them', async () => {
      const owner = await registerUser('owner-happy');
      const ownerToken = await loginUser(owner.email, owner.password);

      const petResponse = await postGraphql<{
        createPet: { id: string; name: string };
      }>(
        app,
        CREATE_PET_MUTATION,
        {
          input: {
            name: 'Buddy',
            species: 'Dog',
          },
        },
        ownerToken,
      );

      expect(petResponse.body.errors).toBeUndefined();
      const petId = petResponse.body.data!.createPet.id;

      const getPetResponse = await postGraphql<{
        pet: { id: string; name: string };
      }>(app, PET_QUERY, { id: petId }, ownerToken);
      expect(getPetResponse.body.errors).toBeUndefined();
      expect(getPetResponse.body.data?.pet.name).toBe('Buddy');

      const ownerCreateRecord = await postGraphql(
        app,
        CREATE_MEDICAL_RECORD_MUTATION,
        {
          input: {
            petId,
            date: new Date('2024-06-01T10:00:00.000Z').toISOString(),
            type: 'checkup',
            title: 'Annual exam',
          },
        },
        ownerToken,
      );
      expectGraphqlErrors(
        ownerCreateRecord.body,
        'cannot modify veterinary health records',
      );

      await setUserRole(owner.id, UserRole.VET);
      const vetToken = await loginUser(owner.email, owner.password);

      const recordResponse = await postGraphql<{
        createMedicalRecord: { id: string; title: string };
      }>(
        app,
        CREATE_MEDICAL_RECORD_MUTATION,
        {
          input: {
            petId,
            date: new Date('2024-06-01T10:00:00.000Z').toISOString(),
            type: 'checkup',
            title: 'Annual exam',
          },
        },
        vetToken,
      );

      expect(recordResponse.body.errors).toBeUndefined();
      const recordId = recordResponse.body.data!.createMedicalRecord.id;

      const getRecordResponse = await postGraphql<{
        medicalRecord: { id: string; title: string };
      }>(app, MEDICAL_RECORD_QUERY, { id: recordId }, ownerToken);

      expect(getRecordResponse.body.errors).toBeUndefined();
      expect(getRecordResponse.body.data?.medicalRecord.title).toBe(
        'Annual exam',
      );
    });

    it('isolates pets and medical records between users', async () => {
      const userA = await registerUser('user-a');
      const userB = await registerUser('user-b');
      const tokenA = await loginUser(userA.email, userA.password);
      const tokenB = await loginUser(userB.email, userB.password);

      const petResponse = await postGraphql<{ createPet: { id: string } }>(
        app,
        CREATE_PET_MUTATION,
        {
          input: {
            name: 'Mittens',
            species: 'Cat',
          },
        },
        tokenA,
      );
      const petId = petResponse.body.data!.createPet.id;

      await setUserRole(userA.id, UserRole.VET);
      const vetTokenA = await loginUser(userA.email, userA.password);

      const recordResponse = await postGraphql<{
        createMedicalRecord: { id: string };
      }>(
        app,
        CREATE_MEDICAL_RECORD_MUTATION,
        {
          input: {
            petId,
            date: new Date('2024-07-01T12:00:00.000Z').toISOString(),
            type: 'vaccination',
            title: 'Rabies shot',
          },
        },
        vetTokenA,
      );
      expect(recordResponse.body.errors).toBeUndefined();
      const recordId = recordResponse.body.data!.createMedicalRecord.id;

      const petAsB = await postGraphql(app, PET_QUERY, { id: petId }, tokenB);
      expectGraphqlErrors(petAsB.body, 'not found');

      const updateAsB = await postGraphql(
        app,
        UPDATE_PET_MUTATION,
        {
          id: petId,
          input: { name: 'Hacked' },
        },
        tokenB,
      );
      expectGraphqlErrors(updateAsB.body, 'not found');

      const deleteAsB = await postGraphql(
        app,
        DELETE_PET_MUTATION,
        { id: petId },
        tokenB,
      );
      expectGraphqlErrors(deleteAsB.body, 'not found');

      const recordAsB = await postGraphql(
        app,
        MEDICAL_RECORD_QUERY,
        { id: recordId },
        tokenB,
      );
      expectGraphqlErrors(recordAsB.body, 'not found');

      const petStillOwned = await postGraphql<{ pet: { name: string } }>(
        app,
        PET_QUERY,
        { id: petId },
        tokenA,
      );
      expect(petStillOwned.body.errors).toBeUndefined();
      expect(petStillOwned.body.data?.pet.name).toBe('Mittens');
    });
  });

  describe('pet profile photos (REST)', () => {
    async function createPetForToken(
      token: string,
      name = 'PhotoPet',
    ): Promise<string> {
      const petResponse = await postGraphql<{ createPet: { id: string } }>(
        app,
        CREATE_PET_MUTATION,
        {
          input: {
            name,
            species: 'Dog',
          },
        },
        token,
      );
      expect(petResponse.body.errors).toBeUndefined();
      return petResponse.body.data!.createPet.id;
    }

    async function buildTestPng(): Promise<Buffer> {
      return sharp({
        create: {
          width: 48,
          height: 48,
          channels: 3,
          background: '#336699',
        },
      })
        .png()
        .toBuffer();
    }

    it('uploads when Cloudinary is configured, otherwise returns a safe configuration error', async () => {
      expect(app).toBeDefined();
      const config = app.get(ConfigService);
      const cloudinaryConfigured = isCloudinaryPetPhotoConfigured(config);

      const owner = await registerUser('photo-config');
      const token = await loginUser(owner.email, owner.password);
      const petId = await createPetForToken(token);
      const png = await buildTestPng();

      const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(httpServer)
        .post(`/pets/${petId}/photo`)
        .set('Authorization', `Bearer ${token}`)
        .attach('photo', png, {
          filename: 'pet.png',
          contentType: 'image/png',
        });

      const body = response.body as NestErrorBody;

      if (cloudinaryConfigured) {
        expect(response.status).toBe(200);
        expect(body.photoUrl).toMatch(/^https:\/\//);
      } else {
        expect(response.status).toBe(503);
        const message =
          typeof body.message === 'string'
            ? body.message
            : (body.message?.join(' ') ?? '');
        expect(message).toMatch(/not available/i);
      }

      expect(JSON.stringify(body)).not.toContain('api_secret');
    });

    it('rejects photo upload for another owner pet', async () => {
      const ownerA = await registerUser('photo-owner-a');
      const ownerB = await registerUser('photo-owner-b');
      const tokenA = await loginUser(ownerA.email, ownerA.password);
      const tokenB = await loginUser(ownerB.email, ownerB.password);
      const petId = await createPetForToken(tokenA);
      const png = await buildTestPng();

      const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(httpServer)
        .post(`/pets/${petId}/photo`)
        .set('Authorization', `Bearer ${tokenB}`)
        .attach('photo', png, {
          filename: 'pet.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(404);
    });

    it('rejects photo delete for another owner pet', async () => {
      const ownerA = await registerUser('photo-delete-a');
      const ownerB = await registerUser('photo-delete-b');
      const tokenA = await loginUser(ownerA.email, ownerA.password);
      const tokenB = await loginUser(ownerB.email, ownerB.password);
      const petId = await createPetForToken(tokenA);

      const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(httpServer)
        .delete(`/pets/${petId}/photo`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(response.status).toBe(404);
    });

    it('rejects invalid image uploads', async () => {
      const owner = await registerUser('photo-invalid');
      const token = await loginUser(owner.email, owner.password);
      const petId = await createPetForToken(token);

      const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(httpServer)
        .post(`/pets/${petId}/photo`)
        .set('Authorization', `Bearer ${token}`)
        .attach('photo', Buffer.from('not-an-image'), {
          filename: 'fake.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(400);
      const body = response.body as NestErrorBody;
      const message =
        typeof body.message === 'string'
          ? body.message
          : (body.message?.join(' ') ?? '');
      expect(message).toMatch(/JPG|PNG|WebP/i);
    });

    it('rejects unauthenticated photo upload', async () => {
      const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
      const png = await buildTestPng();
      const response = await request(httpServer)
        .post('/pets/507f1f77bcf86cd799439011/photo')
        .attach('photo', png, {
          filename: 'pet.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('medical record attachments', () => {
    const pdf = Buffer.from('%PDF-1.4\n% e2e attachment\n%%EOF\n');

    function binaryParser(
      res: NodeJS.ReadableStream,
      callback: (error: Error | null, body: Buffer) => void,
    ): void {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    }

    async function ownerWithRecord(label: string) {
      const owner = await registerUser(label);
      let token = await loginUser(owner.email, owner.password);
      const pet = await postGraphql<{ createPet: { id: string } }>(
        app,
        CREATE_PET_MUTATION,
        { input: { name: 'Rex', species: 'Dog' } },
        token,
      );
      const petId = pet.body.data!.createPet.id;

      await setUserRole(owner.id, UserRole.VET);
      const vetToken = await loginUser(owner.email, owner.password);
      const record = await postGraphql<{
        createMedicalRecord: { id: string };
      }>(
        app,
        CREATE_MEDICAL_RECORD_MUTATION,
        {
          input: {
            petId,
            date: new Date('2026-11-01T10:00:00.000Z').toISOString(),
            type: 'X-ray',
            title: 'Chest X-ray',
          },
        },
        vetToken,
      );
      expect(record.body.errors).toBeUndefined();
      await setUserRole(owner.id, UserRole.USER);
      token = await loginUser(owner.email, owner.password);
      return {
        token,
        petId,
        recordId: record.body.data!.createMedicalRecord.id,
      };
    }

    function uploadAsClinic(recordId: string, file: Buffer, name: string) {
      const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
      return request(httpServer)
        .post(`/internal/medical-records/${recordId}/attachments`)
        .set('x-pethealth-service-secret', E2E_SERVICE_SECRET)
        .field('clinicId', 'clinic-1')
        .field('clinicName', 'Paws Clinic')
        .field('uploadedByName', 'Dr Ona')
        .attach('file', file, {
          filename: name,
          contentType: 'application/pdf',
        });
    }

    it('lets a clinic attach a file that only the owner can download', async () => {
      const { token, recordId } = await ownerWithRecord('attach-owner');
      const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

      const unauthorized = await request(httpServer)
        .post(`/internal/medical-records/${recordId}/attachments`)
        .attach('file', pdf, 'scan.pdf');
      expect(unauthorized.status).toBe(401);

      const notAllowed = await uploadAsClinic(
        recordId,
        Buffer.from('<html></html>'),
        'page.pdf',
      );
      expect(notAllowed.status).toBe(400);

      const uploaded = await uploadAsClinic(
        recordId,
        pdf,
        'Krūtinės rentgenas.pdf',
      );
      expect(uploaded.status).toBe(201);
      const attachment = uploaded.body as { id: string; fileName: string };
      expect(attachment.fileName).toBe('Krūtinės rentgenas.pdf');

      const listed = await postGraphql<{
        medicalRecord: {
          attachments: { id: string; fileName: string; clinicName: string }[];
        };
      }>(
        app,
        `query ($id: ID!) { medicalRecord(id: $id) { attachments { id fileName clinicName size } } }`,
        { id: recordId },
        token,
      );
      expect(listed.body.errors).toBeUndefined();
      expect(listed.body.data?.medicalRecord.attachments).toEqual([
        expect.objectContaining({
          id: attachment.id,
          clinicName: 'Paws Clinic',
          size: pdf.length,
        }),
      ]);

      const download = await request(httpServer)
        .get(`/medical-records/${recordId}/attachments/${attachment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .buffer(true)
        .parse(binaryParser);
      expect(download.status).toBe(200);
      const headers = download.headers as Record<string, string>;
      expect(headers['content-type']).toBe('application/pdf');
      expect(headers['content-disposition']).toContain(
        "filename*=UTF-8''Kr%C5%ABtin%C4%97s%20rentgenas.pdf",
      );
      expect(Buffer.compare(download.body as Buffer, pdf)).toBe(0);

      const stranger = await registerUser('attach-stranger');
      const strangerToken = await loginUser(stranger.email, stranger.password);
      const denied = await request(httpServer)
        .get(`/medical-records/${recordId}/attachments/${attachment.id}`)
        .set('Authorization', `Bearer ${strangerToken}`);
      expect(denied.status).toBe(404);

      const anonymous = await request(httpServer).get(
        `/medical-records/${recordId}/attachments/${attachment.id}`,
      );
      expect(anonymous.status).toBe(401);
    });

    it('lets only the uploading clinic remove a file', async () => {
      const { recordId } = await ownerWithRecord('attach-delete');
      const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
      const uploaded = await uploadAsClinic(recordId, pdf, 'lab.pdf');
      const { id } = uploaded.body as { id: string };
      const path = `/internal/medical-records/${recordId}/attachments/${id}`;

      const otherClinic = await request(httpServer)
        .delete(`${path}?clinicId=clinic-2`)
        .set('x-pethealth-service-secret', E2E_SERVICE_SECRET);
      expect(otherClinic.status).toBe(403);

      const removed = await request(httpServer)
        .delete(`${path}?clinicId=clinic-1`)
        .set('x-pethealth-service-secret', E2E_SERVICE_SECRET);
      expect(removed.status).toBe(200);
      expect((removed.body as { fileName: string }).fileName).toBe('lab.pdf');

      const gone = await request(httpServer)
        .get(path)
        .set('x-pethealth-service-secret', E2E_SERVICE_SECRET);
      expect(gone.status).toBe(404);
    });

    it('deletes the files together with the pet', async () => {
      const { token, petId, recordId } = await ownerWithRecord('attach-pet');
      await uploadAsClinic(recordId, pdf, 'a.pdf');
      await uploadAsClinic(recordId, pdf, 'b.pdf');
      const connection = app.get<Connection>(getConnectionToken());
      const files = connection.collection('medical_attachment_files.files');
      const petFiles = { 'metadata.petId': petId };
      expect(await files.countDocuments(petFiles)).toBe(2);

      const deleted = await postGraphql(
        app,
        DELETE_PET_MUTATION,
        { id: petId },
        token,
      );
      expect(deleted.body.errors).toBeUndefined();

      expect(await files.countDocuments(petFiles)).toBe(0);
      expect(
        await connection
          .collection('medical_record_attachments')
          .countDocuments({ medicalRecordId: new Types.ObjectId(recordId) }),
      ).toBe(0);
    });
  });

  describe('reminders from clinics', () => {
    async function postInternal<T>(
      query: string,
      variables: Record<string, unknown>,
    ): Promise<GraphqlResponse<T>> {
      const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(httpServer)
        .post('/graphql')
        .set('x-pethealth-service-secret', E2E_SERVICE_SECRET)
        .send({ query, variables });
      return response.body as GraphqlResponse<T>;
    }

    const REMINDERS_QUERY = `
      query ($petId: ID!) {
        reminders(petId: $petId) { id title type status managedBy clinicName createdByName }
      }
    `;

    type ListedReminder = {
      id: string;
      title: string;
      type: string;
      status: string;
      managedBy: string;
      clinicName: string | null;
    };

    async function ownerWithPet(label: string) {
      const owner = await registerUser(label);
      const token = await loginUser(owner.email, owner.password);
      const pet = await postGraphql<{ createPet: { id: string } }>(
        app,
        CREATE_PET_MUTATION,
        { input: { name: 'Mia', species: 'Cat' } },
        token,
      );
      return { owner, token, petId: pet.body.data!.createPet.id };
    }

    it('shows clinic reminders to the owner, who can only complete them', async () => {
      const { token, petId } = await ownerWithPet('reminder-owner');

      const own = await postGraphql<{ createReminder: { id: string } }>(
        app,
        `mutation ($input: CreateReminderInput!) { createReminder(input: $input) { id } }`,
        {
          input: {
            petId,
            type: 'GENERAL',
            title: 'Buy food',
            dueAt: new Date('2026-12-01T09:00:00.000Z').toISOString(),
          },
        },
        token,
      );
      expect(own.body.errors).toBeUndefined();

      const created = await postInternal<{
        internalCreateReminderForVet: { id: string; managedBy: string };
      }>(
        `mutation ($input: InternalCreateReminderForVetInput!) {
          internalCreateReminderForVet(input: $input) { id managedBy }
        }`,
        {
          input: {
            petId,
            type: 'APPOINTMENT',
            title: 'Follow-up visit',
            message: 'Check the stitches',
            dueAt: new Date('2026-12-10T09:00:00.000Z').toISOString(),
            clinicId: 'clinic-1',
            clinicName: 'Paws Clinic',
            createdByName: 'Dr Ona',
          },
        },
      );
      expect(created.errors).toBeUndefined();
      const clinicReminderId = created.data!.internalCreateReminderForVet.id;

      const listed = await postGraphql<{ reminders: ListedReminder[] }>(
        app,
        REMINDERS_QUERY,
        { petId },
        token,
      );
      expect(listed.body.data?.reminders).toEqual([
        expect.objectContaining({ title: 'Buy food', managedBy: 'OWNER' }),
        expect.objectContaining({
          id: clinicReminderId,
          managedBy: 'CLINIC',
          clinicName: 'Paws Clinic',
        }),
      ]);

      const ownerDelete = await postGraphql(
        app,
        `mutation ($id: ID!) { deleteReminder(id: $id) }`,
        { id: clinicReminderId },
        token,
      );
      expectGraphqlErrors(
        ownerDelete.body,
        'comes from your veterinary clinic',
      );

      const completed = await postGraphql<{
        completeReminder: { status: string };
      }>(
        app,
        `mutation ($id: ID!) { completeReminder(id: $id) { status } }`,
        { id: clinicReminderId },
        token,
      );
      expect(completed.body.data?.completeReminder.status).toBe('COMPLETED');

      const clinicView = await postInternal<{
        internalRemindersForPetForVet: { title: string }[];
      }>(
        `query ($petId: ID!) { internalRemindersForPetForVet(petId: $petId) { title } }`,
        { petId },
      );
      expect(clinicView.data?.internalRemindersForPetForVet).toEqual([
        { title: 'Follow-up visit' },
      ]);

      const otherClinic = await postInternal(
        `mutation ($id: ID!, $clinicId: ID!) { internalDeleteReminderForVet(reminderId: $id, clinicId: $clinicId) { id } }`,
        { id: clinicReminderId, clinicId: 'clinic-2' },
      );
      expectGraphqlErrors(otherClinic, 'only the clinic that set');
    });

    it('creates and moves a reminder for a vaccination’s next due date', async () => {
      const { owner, petId } = await ownerWithPet('reminder-vaccination');
      await setUserRole(owner.id, UserRole.VET);
      const vetToken = await loginUser(owner.email, owner.password);

      const vaccination = await postGraphql<{
        createVaccination: { id: string };
      }>(
        app,
        `mutation ($input: CreateVaccinationInput!) { createVaccination(input: $input) { id } }`,
        {
          input: {
            petId,
            vaccineName: 'Rabies',
            administeredAt: new Date('2026-03-12T00:00:00.000Z').toISOString(),
            nextDueAt: new Date('2027-03-12T00:00:00.000Z').toISOString(),
          },
        },
        vetToken,
      );
      expect(vaccination.body.errors).toBeUndefined();
      const vaccinationId = vaccination.body.data!.createVaccination.id;

      const listReminders = async () => {
        const response = await postGraphql<{
          reminders: (ListedReminder & { dueAt?: string })[];
        }>(
          app,
          `query ($petId: ID!) { reminders(petId: $petId) { title type managedBy dueAt } }`,
          { petId },
          vetToken,
        );
        expect(response.body.errors).toBeUndefined();
        return response.body.data!.reminders;
      };

      expect(await listReminders()).toEqual([
        {
          title: 'Rabies',
          type: 'VACCINATION',
          managedBy: 'AUTOMATIC',
          dueAt: '2027-03-12T00:00:00.000Z',
        },
      ]);

      const updated = await postGraphql(
        app,
        `mutation ($id: ID!, $input: UpdateVaccinationInput!) { updateVaccination(id: $id, input: $input) { id } }`,
        {
          id: vaccinationId,
          input: {
            nextDueAt: new Date('2027-04-01T00:00:00.000Z').toISOString(),
          },
        },
        vetToken,
      );
      expect(updated.body.errors).toBeUndefined();
      const moved = await listReminders();
      expect(moved).toHaveLength(1);
      expect(moved[0].dueAt).toBe('2027-04-01T00:00:00.000Z');

      await postGraphql(
        app,
        `mutation ($id: ID!) { deleteVaccination(id: $id) }`,
        { id: vaccinationId },
        vetToken,
      );
      expect(await listReminders()).toEqual([]);
    });
  });

  describe('HTTP security', () => {
    it('includes Helmet security headers on GraphQL responses', async () => {
      const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(httpServer)
        .post('/graphql')
        .send({ query: '{ health { status } }' });

      expect(response.status).toBe(200);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('rejects JSON bodies larger than the configured limit', async () => {
      const oversizedPayload = JSON.stringify({
        query: `# ${'x'.repeat(1024 * 1024 + 512)}`,
      });

      const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(httpServer)
        .post('/graphql')
        .set('Content-Type', 'application/json')
        .send(oversizedPayload);

      expect(response.status).toBe(413);
    });

    it('still allows normal GraphQL requests after hardening', async () => {
      const response = await postGraphql(app, '{ health { status } }');
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data).toEqual({ health: { status: 'ok' } });
    });
  });

  describe('clinic access and account activation', () => {
    async function postInternal<T>(
      query: string,
      variables: Record<string, unknown>,
      secret: string | null = E2E_SERVICE_SECRET,
    ): Promise<GraphqlResponse<T>> {
      const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
      let req = request(httpServer).post('/graphql').send({ query, variables });
      if (secret) {
        req = req.set('x-pethealth-service-secret', secret);
      }
      const response = await req;
      return response.body as GraphqlResponse<T>;
    }

    it('lets a clinic redeem an owner share code exactly once', async () => {
      const owner = await registerUser('share-owner');
      const ownerToken = await loginUser(owner.email, owner.password);
      const petResponse = await postGraphql<{ createPet: { id: string } }>(
        app,
        CREATE_PET_MUTATION,
        { input: { name: 'Mila', species: 'Cat' } },
        ownerToken,
      );
      const petId = petResponse.body.data!.createPet.id;

      const codeResponse = await postGraphql<{
        createPetShareCode: { code: string; expiresAt: string };
      }>(app, CREATE_PET_SHARE_CODE_MUTATION, { petId }, ownerToken);
      expect(codeResponse.body.errors).toBeUndefined();
      const code = codeResponse.body.data!.createPetShareCode.code;
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

      const vetClinicId = new Types.ObjectId().toString();
      const withoutSecret = await postInternal(
        INTERNAL_REDEEM_SHARE_CODE_MUTATION,
        { code, vetClinicId },
        null,
      );
      expectGraphqlErrors(withoutSecret);

      const redeemed = await postInternal<{
        internalRedeemPetShareCode: { id: string; owner: { id: string } };
      }>(INTERNAL_REDEEM_SHARE_CODE_MUTATION, {
        code: code.toLowerCase().replace('-', ''),
        vetClinicId,
      });
      expect(redeemed.errors).toBeUndefined();
      expect(redeemed.data?.internalRedeemPetShareCode.id).toBe(petId);
      expect(redeemed.data?.internalRedeemPetShareCode.owner.id).toBe(owner.id);

      const reused = await postInternal(INTERNAL_REDEEM_SHARE_CODE_MUTATION, {
        code,
        vetClinicId,
      });
      expectGraphqlErrors(reused, 'invalid or has expired');
    });

    it('does not let another user create a share code for someone else’s pet', async () => {
      const owner = await registerUser('share-real-owner');
      const ownerToken = await loginUser(owner.email, owner.password);
      const petResponse = await postGraphql<{ createPet: { id: string } }>(
        app,
        CREATE_PET_MUTATION,
        { input: { name: 'Rex', species: 'Dog' } },
        ownerToken,
      );
      const petId = petResponse.body.data!.createPet.id;

      const stranger = await registerUser('share-stranger');
      const strangerToken = await loginUser(stranger.email, stranger.password);
      const response = await postGraphql(
        app,
        CREATE_PET_SHARE_CODE_MUTATION,
        { petId },
        strangerToken,
      );
      expectGraphqlErrors(response.body);
    });

    it('activates a clinic-created account by emailed token and then protects it from clinic edits', async () => {
      const email = uniqueEmail('placeholder-owner');
      const registered = await postInternal<{
        internalRegisterPetForVet: { id: string; owner: { id: string } };
      }>(INTERNAL_REGISTER_PET_FOR_VET_MUTATION, {
        input: {
          owner: { email, firstName: 'Ona', lastName: 'Owner' },
          name: 'Pupa',
          species: 'Dog',
        },
      });
      expect(registered.errors).toBeUndefined();
      const petId = registered.data!.internalRegisterPetForVet.id;
      const ownerId = registered.data!.internalRegisterPetForVet.owner.id;

      const selfRegister = await postGraphql(app, REGISTER_MUTATION, {
        input: {
          email,
          password: 'Password123!',
          firstName: 'Someone',
          lastName: 'Else',
        },
      });
      expectGraphqlErrors(selfRegister.body, 'activate');

      const token = 'e2e-known-activation-token';
      const connection = app.get<Connection>(getConnectionToken());
      await connection.collection('account_activation_tokens').insertOne({
        userId: new Types.ObjectId(ownerId),
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        usedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const activated = await postGraphql<{
        activateAccount: { accessToken: string; user: { id: string } };
      }>(app, ACTIVATE_ACCOUNT_MUTATION, {
        input: { token, password: 'NewPassword123!' },
      });
      expect(activated.body.errors).toBeUndefined();
      expect(activated.body.data?.activateAccount.user.id).toBe(ownerId);

      await loginUser(email, 'NewPassword123!');

      const reused = await postGraphql(app, ACTIVATE_ACCOUNT_MUTATION, {
        input: { token, password: 'Another123!' },
      });
      expectGraphqlErrors(reused.body, 'invalid or has expired');

      const clinicEdit = await postInternal(
        INTERNAL_UPDATE_OWNER_PROFILE_MUTATION,
        {
          petId,
          input: {
            firstName: 'Ona',
            lastName: 'Owner',
            email: uniqueEmail('attacker'),
          },
        },
      );
      expectGraphqlErrors(clinicEdit, 'manages their own account');
    });
  });
});
