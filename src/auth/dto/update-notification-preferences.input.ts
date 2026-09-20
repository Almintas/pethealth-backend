import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional } from 'class-validator';

@InputType({ description: 'Update email notification preferences' })
export class UpdateNotificationPreferencesInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Email reminders before appointments',
  })
  @IsOptional()
  @IsBoolean()
  emailAppointmentReminders?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Email reminders for medications',
  })
  @IsOptional()
  @IsBoolean()
  emailMedicationReminders?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Email reminders for vaccinations',
  })
  @IsOptional()
  @IsBoolean()
  emailVaccinationReminders?: boolean;
}
