import { Controller, Get, Headers, Param, ParseIntPipe, Post } from '@nestjs/common';
import { EntraProfileSyncService } from './entra-profile-sync.service';
import { SelfProfileService } from './self-profile.service';

/**
 * Self-service profile for the signed-in internal employee. Deliberately NOT behind
 * EntraAuthGuard: the user is resolved from the EMS database by their signed-in email
 * (via the audit request context / x-user-email header), exactly like the Company Hub
 * widgets — no live Microsoft Entra token verification is required to read your own record.
 */
@Controller('internal')
export class SelfProfileController {
  constructor(
    private readonly selfProfileService: SelfProfileService,
    private readonly entraProfileSyncService: EntraProfileSyncService,
  ) {}

  @Get('my-profile')
  async getMyProfile(
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    // Auto-sync from Entra on profile load so data is always fresh
    const email = this.selfProfileService.getSignedInEmail();
    try {
      await this.entraProfileSyncService.syncSingleUserFromEntra(email, graphAccessToken);
    } catch {
      // If Entra sync fails, still return local data
    }

    return this.selfProfileService.getMyFullProfile();
  }

  /**
   * Another employee's profile for the Company Hub directory. The service applies
   * field-level visibility: Administrator-only fields are stripped unless the signed-in
   * viewer is an Administrator or is the employee themselves.
   */
  @Get('employees/:contactId/profile')
  getEmployeeProfile(@Param('contactId', ParseIntPipe) contactId: number) {
    return this.selfProfileService.getEmployeeProfileForViewer(contactId);
  }

  /**
   * Pull the signed-in user's profile fields from Entra into EMS.
   * Triggered by a "Sync from Entra" action on the profile page.
   */
  @Post('my-profile/sync-from-entra')
  async syncMyProfileFromEntra(
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    const email = this.selfProfileService.getSignedInEmail();
    return this.entraProfileSyncService.syncSingleUserFromEntra(
      email,
      graphAccessToken,
    );
  }
}
