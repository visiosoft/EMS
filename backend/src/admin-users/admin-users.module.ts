import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { EmployeeEmploymentService } from './employee-employment.service';
import { EmployeeProfileService } from './employee-profile.service';
import { EntraAuthGuard } from './entra-auth.guard';
import { InternalContactSyncService } from './internal-contact-sync.service';
import { UserProfileService } from './user-profile.service';

@Module({
  imports: [ConfigModule, AuditModule],
  controllers: [AdminUsersController],
  providers: [
    AdminUsersService,
    EmployeeEmploymentService,
    EmployeeProfileService,
    EntraAuthGuard,
    InternalContactSyncService,
    UserProfileService,
  ],
  exports: [AdminUsersService, EntraAuthGuard],
})
export class AdminUsersModule {}
