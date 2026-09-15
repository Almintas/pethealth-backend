import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UserModel } from '../users/models/user.model';
import { AuthService } from './auth.service';
import { RegisterInput } from './dto/register.input';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => UserModel, {
    name: 'register',
    description: 'Register a new user account',
  })
  register(@Args('input') input: RegisterInput): Promise<UserModel> {
    return this.authService.register(input);
  }
}
