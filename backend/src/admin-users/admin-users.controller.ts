import { Body, Controller, Get, Headers, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { EntraAuthGuard } from './entra-auth.guard';
import {
  ApplyInternalContactSyncDto,
  InternalContactSyncService,
} from './internal-contact-sync.service';
import {
  UpdateMyProfileDto,
  UserProfileService,
} from './user-profile.service';

@Controller('admin')
@UseGuards(EntraAuthGuard)
export class AdminUsersController {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly internalContactSyncService: InternalContactSyncService,
    private readonly userProfileService: UserProfileService,
  ) {}

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

  @Get('me/profile')
  async getMyProfile() {
    return this.userProfileService.getMyProfile();
  }

  @Patch('me/profile')
  async updateMyProfile(@Body() dto: UpdateMyProfileDto) {
    return this.userProfileService.updateMyProfile(dto);
  }

  @Post('internal-contact-sync/preview')
  async previewInternalContactSync(
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.internalContactSyncService.previewInternalContactSync(
      graphAccessToken,
    );
  }

  @Post('internal-contact-sync/entra-to-ems/preview')
  async previewEntraToEmsContactSync(
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.internalContactSyncService.previewEntraToEmsContactSync(
      graphAccessToken,
    );
  }

  @Post('internal-contact-sync/entra-to-ems/apply')
  async applyEntraToEmsContactSync(
    @Body() dto: ApplyInternalContactSyncDto,
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.internalContactSyncService.applyEntraToEmsContactSync(
      dto,
      graphAccessToken,
    );
  }

  @Post('internal-contact-sync/ems-to-entra/preview')
  async previewEmsToEntraContactSync(
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.internalContactSyncService.previewEmsToEntraContactSync(
      graphAccessToken,
    );
  }

  @Post('internal-contact-sync/ems-to-entra/apply')
  async applyEmsToEntraContactSync(
    @Body() dto: ApplyInternalContactSyncDto,
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.internalContactSyncService.applyEmsToEntraContactSync(
      dto,
      graphAccessToken,
    );
  }

  @Post('internal-contact-sync/apply')
  async applyInternalContactSync(
    @Body() dto: ApplyInternalContactSyncDto,
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.internalContactSyncService.applyInternalContactSync(
      dto,
      graphAccessToken,
    );
  }
}
