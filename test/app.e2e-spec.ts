import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import {
  expectGraphqlErrors,
  postGraphql,
  uniqueEmail,
} from './helpers/graphql-test.helpers';

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

    /* AppModule is imported dynamically so test env vars exist before ConfigModule validation runs. */
    const appModule = (await import(
      '../src/app.module'
    )) as typeof import('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [appModule.AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
    it('allows an owner to create and retrieve their pet and medical record', async () => {
      const owner = await registerUser('owner-happy');
      const token = await loginUser(owner.email, owner.password);

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
        token,
      );

      expect(petResponse.body.errors).toBeUndefined();
      const petId = petResponse.body.data!.createPet.id;

      const getPetResponse = await postGraphql<{
        pet: { id: string; name: string };
      }>(app, PET_QUERY, { id: petId }, token);
      expect(getPetResponse.body.errors).toBeUndefined();
      expect(getPetResponse.body.data?.pet.name).toBe('Buddy');

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
        token,
      );

      expect(recordResponse.body.errors).toBeUndefined();
      const recordId = recordResponse.body.data!.createMedicalRecord.id;

      const getRecordResponse = await postGraphql<{
        medicalRecord: { id: string; title: string };
      }>(app, MEDICAL_RECORD_QUERY, { id: recordId }, token);

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
        tokenA,
      );
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
});
