import { Body, Controller, Get, Headers, Param, Patch, Put, Post, UseGuards } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { EmployeeCertificationsService } from './employee-certifications.service';
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
  BulkUpdateHealthInsuranceDto,
} from './employee-health-insurance.service';
import {
  EmployeeProfileService,
  UpdateEmployeePersonalProfileDto,
} from './employee-profile.service';
import { EntraAuthGuard } from './entra-auth.guard';
import { InternalContactSyncService } from './internal-contact-sync.service';
import type { ApplyInternalContactSyncDto } from './internal-contact-sync.service';
import { UserProfileService } from './user-profile.service';
import type { UpdateMyProfileDto } from './user-profile.service';
import { AccessLevelService } from '../common/access-level.service';
import { AccessLevelGuard } from '../common/access-level.guard';
import { AccessLevel } from '../common/access-level.enum';
import { RequireAccessLevel } from '../common/require-access-level.decorator';
import { AdminOrSelfGuard } from '../common/admin-or-self.guard';
import { AuditRequestContext } from '../audit/audit-request-context.service';

@Controller('admin')
@UseGuards(EntraAuthGuard, AccessLevelGuard)
export class AdminUsersController {
  constructor(
    private readonly accessLevelService: AccessLevelService,
    private readonly adminUsersService: AdminUsersService,
    private readonly auditContext: AuditRequestContext,
    private readonly employeeCertificationsService: EmployeeCertificationsService,
    private readonly employeeEmploymentService: EmployeeEmploymentService,
    private readonly employeeExperienceService: EmployeeExperienceService,
    private readonly employeeHealthInsuranceService: EmployeeHealthInsuranceService,
    private readonly employeeProfileService: EmployeeProfileService,
    private readonly internalContactSyncService: InternalContactSyncService,
    private readonly userProfileService: UserProfileService,
  ) {}

  @Get('me/access-level')
  async getMyAccessLevel() {
    const email = this.auditContext.getUserEmail();
    const accessLevel = await this.accessLevelService.resolveAccessLevel(email);
    return { accessLevel };
  }

  @Get('users')
  @RequireAccessLevel(AccessLevel.Administrator)
  async listUsers(
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.adminUsersService.listUsers(graphAccessToken);
  }

  @Get('users/entra-raw')
  @RequireAccessLevel(AccessLevel.Administrator)
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
  @UseGuards(AdminOrSelfGuard)
  async getPersonalProfile(@Param('email') email: string) {
    return this.employeeProfileService.getPersonalProfile(email);
  }

  @Patch('users/:email/personal-profile')
  @UseGuards(AdminOrSelfGuard)
  async updatePersonalProfile(
    @Param('email') email: string,
    @Body() dto: UpdateEmployeePersonalProfileDto,
  ) {
    return this.employeeProfileService.updatePersonalProfile(email, dto);
  }

  @Get('users/:email/employment-profile')
  @UseGuards(AdminOrSelfGuard)
  async getEmploymentProfile(@Param('email') email: string) {
    return this.employeeEmploymentService.getEmploymentProfile(email);
  }

  @Get('access-levels')
  @RequireAccessLevel(AccessLevel.Administrator)
  async getAllAccessLevels() {
    return this.employeeEmploymentService.getAllAccessLevels();
  }

  @Patch('users/:email/employment-profile')
  @RequireAccessLevel(AccessLevel.Administrator)
  async updateEmploymentProfile(
    @Param('email') email: string,
    @Body() dto: UpdateEmployeeEmploymentProfileDto,
  ) {
    return this.employeeEmploymentService.updateEmploymentProfile(email, dto);
  }

  @Get('users/:email/experience')
  @UseGuards(AdminOrSelfGuard)
  async getExperience(@Param('email') email: string) {
    return this.employeeExperienceService.getExperience(email);
  }

  @Get('users/:email/certifications')
  @UseGuards(AdminOrSelfGuard)
  async getCertifications(@Param('email') email: string) {
    return this.employeeCertificationsService.getCertifications(email);
  }

  @Get('users/:email/health-insurance')
  @UseGuards(AdminOrSelfGuard)
  async getHealthInsurance(@Param('email') email: string) {
    return this.employeeHealthInsuranceService.getHealthInsurance(email);
  }

  @Patch('users/:email/health-insurance')
  @UseGuards(AdminOrSelfGuard)
  async updateHealthInsurance(
    @Param('email') email: string,
    @Body() dto: UpdateEmployeeHealthInsuranceDto,
  ) {
    return this.employeeHealthInsuranceService.updateHealthInsurance(email, dto);
  }

  @Put('users/:email/health-insurance')
  @UseGuards(AdminOrSelfGuard)
  async bulkUpdateHealthInsurance(
    @Param('email') email: string,
    @Body() dto: BulkUpdateHealthInsuranceDto,
  ) {
    return this.employeeHealthInsuranceService.bulkUpdateHealthInsurance(email, dto);
  }

  @Get('workstations')
  @RequireAccessLevel(AccessLevel.Administrator)
  async listWorkstations() {
    return this.employeeEmploymentService.listWorkstations();
  }

  @Get('phone-extensions')
  @RequireAccessLevel(AccessLevel.Administrator)
  async listPhoneExtensions() {
    return this.employeeEmploymentService.listPhoneExtensions();
  }

  @Get('phone-devices')
  @RequireAccessLevel(AccessLevel.Administrator)
  async listPhoneDevices() {
    return this.employeeEmploymentService.listPhoneDevices();
  }

  @Get('pc-devices')
  @RequireAccessLevel(AccessLevel.Administrator)
  async listPcDevices() {
    return this.employeeEmploymentService.listPcDevices();
  }

  @Get('users/:email/licenses')
  @UseGuards(AdminOrSelfGuard)
  async getUserLicenses(
    @Param('email') email: string,
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.adminUsersService.getUserLicenses(email, graphAccessToken);
  }

  @Get('users/:email/groups')
  @UseGuards(AdminOrSelfGuard)
  async getUserGroups(
    @Param('email') email: string,
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.adminUsersService.getUserGroups(email, graphAccessToken);
  }

  @Post('internal-contact-sync/preview')
  @RequireAccessLevel(AccessLevel.Administrator)
  async previewInternalContactSync(
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.internalContactSyncService.previewInternalContactSync(
      graphAccessToken,
    );
  }

  @Post('internal-contact-sync/entra-to-ems/preview')
  @RequireAccessLevel(AccessLevel.Administrator)
  async previewEntraToEmsContactSync(
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.internalContactSyncService.previewEntraToEmsContactSync(
      graphAccessToken,
    );
  }

  @Post('internal-contact-sync/entra-to-ems/apply')
  @RequireAccessLevel(AccessLevel.Administrator)
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
  @RequireAccessLevel(AccessLevel.Administrator)
  async previewEmsToEntraContactSync(
    @Headers('x-entra-graph-access-token') graphAccessToken?: string,
  ) {
    return this.internalContactSyncService.previewEmsToEntraContactSync(
      graphAccessToken,
    );
  }

  @Post('internal-contact-sync/ems-to-entra/apply')
  @RequireAccessLevel(AccessLevel.Administrator)
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
  @RequireAccessLevel(AccessLevel.Administrator)
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
