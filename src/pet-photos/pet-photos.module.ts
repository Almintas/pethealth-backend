import { Module } from '@nestjs/common';
import { CloudinaryPetPhotoStorage } from './cloudinary-pet-photo.storage';
import { PET_PHOTO_STORAGE } from './pet-photo-storage.interface';

@Module({
  providers: [
    CloudinaryPetPhotoStorage,
    {
      provide: PET_PHOTO_STORAGE,
      useExisting: CloudinaryPetPhotoStorage,
    },
  ],
  exports: [PET_PHOTO_STORAGE],
})
export class PetPhotosModule {}
