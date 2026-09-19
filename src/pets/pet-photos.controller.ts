import {
  Controller,
  Delete,
  HttpCode,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserModel } from '../users/models/user.model';
import { PET_PHOTO_MAX_UPLOAD_BYTES } from '../pet-photos/pet-photo.constants';
import { PetModel } from './models/pet.model';
import { PetsService } from './pets.service';

@Controller('pets')
@UseGuards(JwtAuthGuard)
export class PetPhotosController {
  constructor(private readonly petsService: PetsService) {}

  @Post(':petId/photo')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: PET_PHOTO_MAX_UPLOAD_BYTES },
    }),
  )
  async uploadPetPhoto(
    @CurrentUser() user: UserModel,
    @Param('petId') petId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: PET_PHOTO_MAX_UPLOAD_BYTES }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ): Promise<PetModel> {
    return this.petsService.uploadPetPhoto(user.id, petId, file.buffer);
  }

  @Delete(':petId/photo')
  @HttpCode(200)
  async removePetPhoto(
    @CurrentUser() user: UserModel,
    @Param('petId') petId: string,
  ): Promise<PetModel> {
    return this.petsService.removePetPhoto(user.id, petId);
  }
}
