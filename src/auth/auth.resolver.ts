import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserModel } from '../users/models/user.model';
import { AuthRateLimit } from './decorators/auth-rate-limit.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
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
}
