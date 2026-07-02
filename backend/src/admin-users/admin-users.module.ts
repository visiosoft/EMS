import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { EmployeeCertificationsService } from './employee-certifications.service';
import { EmployeeEmploymentService } from './employee-employment.service';
import { EmployeeExperienceService } from './employee-experience.service';
import { EmployeeHealthInsuranceService } from './employee-health-insurance.service';
import { EmployeeProfileService } from './employee-profile.service';
import { EntraAuthGuard } from './entra-auth.guard';
import { InternalContactSyncService } from './internal-contact-sync.service';
import { UserProfileService } from './user-profile.service';

@Module({
  imports: [ConfigModule, AuditModule],
  controllers: [AdminUsersController],
  providers: [
    AdminUsersService,
    EmployeeCertificationsService,
    EmployeeEmploymentService,
    EmployeeExperienceService,
    EmployeeHealthInsuranceService,
    EmployeeProfileService,
    EntraAuthGuard,
    InternalContactSyncService,
    UserProfileService,
  ],
  exports: [AdminUsersService, EntraAuthGuard],
})
export class AdminUsersModule {}
