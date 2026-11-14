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
    const appModule =
      (await import('../src/app.module')) as typeof import('../src/app.module');
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
