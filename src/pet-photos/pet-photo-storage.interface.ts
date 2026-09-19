export type StoredPetPhoto = {
  storageKey: string;
  photoUrl: string;
};

export interface PetPhotoStorage {
  storePetPhoto(
    ownerId: string,
    petId: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<StoredPetPhoto>;

  deletePetPhoto(storageKey: string): Promise<void>;
}

export const PET_PHOTO_STORAGE = Symbol('PET_PHOTO_STORAGE');
