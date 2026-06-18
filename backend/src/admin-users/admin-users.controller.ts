import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { EntraAuthGuard } from './entra-auth.guard';

@Controller('admin')
@UseGuards(EntraAuthGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get('users')
  async listUsers(
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.adminUsersService.listUsers(graphAccessToken);
  }

  @Get('users/entra-raw')
  async listRawUsers(
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.adminUsersService.listRawUsers(graphAccessToken);
  }
}
