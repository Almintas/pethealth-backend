import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard';
import { formatGraphqlError } from './common/graphql/graphql-error.formatter';
import { validate } from './config/env.validation';
import { isProductionEnvironment } from './config/environment.util';
import { buildDefaultThrottlerOptions } from './config/throttle.config';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { PetsModule } from './pets/pets.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MedicationsModule } from './medications/medications.module';
import { RemindersModule } from './reminders/reminders.module';
import { VaccinationsModule } from './vaccinations/vaccinations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        buildDefaultThrottlerOptions(configService),
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        playground: false,
        introspection: !isProductionEnvironment(
          configService.get<string>('NODE_ENV'),
        ),
        context: ({ req }: { req: unknown }) => ({ req }),
        formatError: (formattedError) =>
          formatGraphqlError(
            formattedError,
            configService.get<string>('NODE_ENV'),
          ),
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    PetsModule,
    MedicalRecordsModule,
    VaccinationsModule,
    MedicationsModule,
    AppointmentsModule,
    RemindersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
