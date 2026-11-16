import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthRateLimit } from '../auth/decorators/auth-rate-limit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { UserModel } from '../users/models/user.model';
import { AccountDataService } from './account-data.service';

@UseGuards(GqlAuthGuard)
@Resolver()
export class AccountResolver {
  constructor(private readonly accountDataService: AccountDataService) {}

  @Query(() => String, {
    name: 'exportMyData',
    description:
      'All data PetHealth holds about the signed-in owner, as a JSON document',
  })
  exportMyData(@CurrentUser() user: UserModel): Promise<string> {
    return this.accountDataService.exportData(user.id);
  }

  @Mutation(() => Boolean, {
    name: 'deleteMyAccount',
    description:
      'Permanently deletes the account, all pets and their records (password required)',
  })
  @AuthRateLimit()
  deleteMyAccount(
    @CurrentUser() user: UserModel,
    @Args('password') password: string,
  ): Promise<boolean> {
    return this.accountDataService.deleteAccount(user.id, password);
  }
}
