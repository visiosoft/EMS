import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import {
  EmployeeEmploymentService,
  UpdateEmployeeEmploymentProfileDto,
} from './employee-employment.service';
import {
  EmployeeExperienceService,
} from './employee-experience.service';
import {
  EmployeeHealthInsuranceService,
  UpdateEmployeeHealthInsuranceDto,
} from './employee-health-insurance.service';
import {
  EmployeeProfileService,
  UpdateEmployeePersonalProfileDto,
} from './employee-profile.service';
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
    private readonly employeeEmploymentService: EmployeeEmploymentService,
    private readonly employeeExperienceService: EmployeeExperienceService,
    private readonly employeeHealthInsuranceService: EmployeeHealthInsuranceService,
    private readonly employeeProfileService: EmployeeProfileService,
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

  @Get('users/:email/personal-profile')
  async getPersonalProfile(@Param('email') email: string) {
    return this.employeeProfileService.getPersonalProfile(email);
  }

  @Patch('users/:email/personal-profile')
  async updatePersonalProfile(
    @Param('email') email: string,
    @Body() dto: UpdateEmployeePersonalProfileDto,
  ) {
    return this.employeeProfileService.updatePersonalProfile(email, dto);
  }

  @Get('users/:email/employment-profile')
  async getEmploymentProfile(@Param('email') email: string) {
    return this.employeeEmploymentService.getEmploymentProfile(email);
  }

  @Patch('users/:email/employment-profile')
  async updateEmploymentProfile(
    @Param('email') email: string,
    @Body() dto: UpdateEmployeeEmploymentProfileDto,
  ) {
    return this.employeeEmploymentService.updateEmploymentProfile(email, dto);
  }

  @Get('users/:email/experience')
  async getExperience(@Param('email') email: string) {
    return this.employeeExperienceService.getExperience(email);
  }

  @Get('users/:email/health-insurance')
  async getHealthInsurance(@Param('email') email: string) {
    return this.employeeHealthInsuranceService.getHealthInsurance(email);
  }

  @Patch('users/:email/health-insurance')
  async updateHealthInsurance(
    @Param('email') email: string,
    @Body() dto: UpdateEmployeeHealthInsuranceDto,
  ) {
    return this.employeeHealthInsuranceService.updateHealthInsurance(email, dto);
  }

  @Get('workstations')
  async listWorkstations() {
    return this.employeeEmploymentService.listWorkstations();
  }

  @Get('phone-extensions')
  async listPhoneExtensions() {
    return this.employeeEmploymentService.listPhoneExtensions();
  }

  @Get('phone-devices')
  async listPhoneDevices() {
    return this.employeeEmploymentService.listPhoneDevices();
  }

  @Get('users/:email/licenses')
  async getUserLicenses(
    @Param('email') email: string,
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.adminUsersService.getUserLicenses(email, graphAccessToken);
  }

  @Get('users/:email/groups')
  async getUserGroups(
    @Param('email') email: string,
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.adminUsersService.getUserGroups(email, graphAccessToken);
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
