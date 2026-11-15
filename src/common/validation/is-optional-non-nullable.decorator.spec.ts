import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProfileInput } from '../../auth/dto/update-profile.input';
import { UpdatePetInput } from '../../pets/dto/update-pet.input';

async function errorPropertiesFor<T extends object>(
  cls: new () => T,
  input: Record<string, unknown>,
): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, input));
  return errors.map((error) => error.property);
}

describe('IsOptionalNonNullable', () => {
  it('allows omitting required fields on update inputs', async () => {
    await expect(
      errorPropertiesFor(UpdatePetInput, { breed: 'Beagle' }),
    ).resolves.toEqual([]);
  });

  it('rejects explicit null for fields required in the database', async () => {
    await expect(
      errorPropertiesFor(UpdatePetInput, { name: null, species: null }),
    ).resolves.toEqual(['name', 'species']);
    await expect(
      errorPropertiesFor(UpdateProfileInput, { email: null }),
    ).resolves.toEqual(['email']);
  });

  it('still allows null to clear genuinely optional fields', async () => {
    await expect(
      errorPropertiesFor(UpdatePetInput, { breed: null }),
    ).resolves.toEqual([]);
  });
});
