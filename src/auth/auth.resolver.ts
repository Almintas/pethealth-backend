import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserModel } from '../users/models/user.model';
import { AuthRateLimit } from './decorators/auth-rate-limit.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChangePasswordInput } from './dto/change-password.input';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { UpdateNotificationPreferencesInput } from './dto/update-notification-preferences.input';
import { UpdateProfileInput } from './dto/update-profile.input';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { AuthPayload } from './models/auth-payload.model';
import { AuthService } from './auth.service';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => UserModel, {
    name: 'register',
    description: 'Register a new user account',
  })
  @AuthRateLimit()
  register(@Args('input') input: RegisterInput): Promise<UserModel> {
    return this.authService.register(input);
  }

  @Mutation(() => AuthPayload, {
    name: 'login',
    description: 'Authenticate with email and password',
  })
  @AuthRateLimit()
  login(@Args('input') input: LoginInput): Promise<AuthPayload> {
    return this.authService.login(input);
  }

  @Query(() => UserModel, {
    name: 'me',
    description: 'Returns the currently authenticated user',
  })
  @UseGuards(GqlAuthGuard)
  me(@CurrentUser() user: UserModel): UserModel {
    return user;
  }

  @Mutation(() => UserModel, {
    name: 'updateProfile',
    description: 'Update the authenticated user profile',
  })
  @UseGuards(GqlAuthGuard)
  updateProfile(
    @CurrentUser() user: UserModel,
    @Args('input') input: UpdateProfileInput,
  ): Promise<UserModel> {
    return this.authService.updateProfile(user, input);
  }

  @Mutation(() => Boolean, {
    name: 'changePassword',
    description: 'Change password for the authenticated user',
  })
  @UseGuards(GqlAuthGuard)
  changePassword(
    @CurrentUser() user: UserModel,
    @Args('input') input: ChangePasswordInput,
  ): Promise<boolean> {
    return this.authService.changePassword(user, input);
  }

  @Mutation(() => UserModel, {
    name: 'updateNotificationPreferences',
    description: 'Update email notification preferences for the current user',
  })
  @UseGuards(GqlAuthGuard)
  updateNotificationPreferences(
    @CurrentUser() user: UserModel,
    @Args('input') input: UpdateNotificationPreferencesInput,
  ): Promise<UserModel> {
    return this.authService.updateNotificationPreferences(user, input);
  }
}
