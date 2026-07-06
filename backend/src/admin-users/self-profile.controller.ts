import { Controller, Get } from '@nestjs/common';
import { SelfProfileService } from './self-profile.service';

/**
 * Self-service profile for the signed-in internal employee. Deliberately NOT behind
 * EntraAuthGuard: the user is resolved from the EMS database by their signed-in email
 * (via the audit request context / x-user-email header), exactly like the Company Hub
 * widgets — no live Microsoft Entra token verification is required to read your own record.
 */
@Controller('internal')
export class SelfProfileController {
  constructor(private readonly selfProfileService: SelfProfileService) {}

  @Get('my-profile')
  getMyProfile() {
    return this.selfProfileService.getMyFullProfile();
  }
}
