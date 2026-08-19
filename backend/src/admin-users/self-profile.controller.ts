import { Body, Controller, Get, Headers, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { EntraProfileSyncService, EMPLOYEE_SYNCABLE_FIELDS } from './entra-profile-sync.service';
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
  async getMyProfile() {
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
   * Preview changes from Entra without applying them.
   * Non-admin employees only see employee-visible fields.
   */
  @Post('my-profile/sync-from-entra/preview')
  async previewSyncFromEntra(
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    const email = this.selfProfileService.getSignedInEmail();
    const isAdmin = await this.selfProfileService.isSignedInUserAdmin();
    const result = await this.entraProfileSyncService.previewSingleUserFromEntra(
      email,
      graphAccessToken,
    );
    if (!isAdmin) {
      result.changes = result.changes.filter((c) => EMPLOYEE_SYNCABLE_FIELDS.has(c.field));
    }
    return result;
  }

  /** Temporary: test Graph CSA fetch directly for any email */
  @Get('debug/entra-csa')
  async debugEntraCsa(@Query('email') email: string) {
    return this.entraProfileSyncService.debugFetchEntraProfile(email);
  }

  /**
   * Pull the signed-in user's profile fields from Entra into EMS.
   * Non-admin employees can only sync employee-visible fields.
   */
  @Post('my-profile/sync-from-entra')
  async syncMyProfileFromEntra(
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    const email = this.selfProfileService.getSignedInEmail();
    const isAdmin = await this.selfProfileService.isSignedInUserAdmin();
    if (!isAdmin) {
      // For non-admin employees, use selective sync with only employee fields
      const allFields = [...EMPLOYEE_SYNCABLE_FIELDS];
      return this.entraProfileSyncService.syncSelectedFieldsFromEntra(
        email,
        allFields,
        graphAccessToken,
      );
    }
    return this.entraProfileSyncService.syncSingleUserFromEntra(
      email,
      graphAccessToken,
    );
  }

  @Post('my-profile/sync-from-entra/apply-selected')
  async applySelectedSync(
    @Body() body: { fields: string[] },
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    const email = this.selfProfileService.getSignedInEmail();
    const isAdmin = await this.selfProfileService.isSignedInUserAdmin();
    const fields = isAdmin
      ? body.fields ?? []
      : (body.fields ?? []).filter((f) => EMPLOYEE_SYNCABLE_FIELDS.has(f));
    return this.entraProfileSyncService.syncSelectedFieldsFromEntra(
      email,
      fields,
      graphAccessToken,
    );
  }

  /**
   * Update the signed-in employee's WMS-editable profile fields.
   * Only fields the employee is allowed to edit from WMS are accepted.
   */
  @Patch('my-profile')
  async updateMyProfile(@Body() body: UpdateMyProfileDto) {
    return this.selfProfileService.updateMyProfile(body);
  }

  /**
   * Administrator edits another employee's WMS-editable profile fields.
   * Rejects if the signed-in user is not an Administrator or Super Admin.
   */
  @Patch('employees/:contactId/profile')
  async updateEmployeeProfile(
    @Param('contactId', ParseIntPipe) contactId: number,
    @Body() body: UpdateMyProfileDto,
  ) {
    return this.selfProfileService.updateEmployeeProfile(contactId, body);
  }
}

/** DTO for WMS-editable profile fields. All fields optional — only send what changed. */
export interface UpdateMyProfileDto {
  cellPhone?: string;
  workPhone?: string;
  homeAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    stateProvince?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContacts?: {
    fullName: string;
    phoneNumber: string;
    email: string;
    isPrimary: boolean;
  }[];
  workstation?: string;
  workAuthorizationLinkUrl?: string;
  deskPhoneExtensionId?: number | null;
  deskPhoneId?: number | null;
  pcComputerId?: number | null;
  // Freeform Entra-CSA-backed equipment fields (admin only). Writes to the
  // linked EquipmentPhone / EquipmentComputer row; creates one on demand.
  deskPhoneMac?: string;
  deskPhoneModel?: string;
  pcServiceTag?: string;
  pcBrand?: string;
  pcModel?: string;
  bluetoothStatus?: string;
}
