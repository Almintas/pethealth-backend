import { Field, ID, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

@InputType({ description: 'A clinic tells the owner their pet is with them' })
export class InternalNotifyOwnerPetFoundInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  microchip!: string;

  @Field(() => ID)
  @IsMongoId()
  petId!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  clinicName!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  clinicPhone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  clinicAddress?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimString)
  message?: string;
}
