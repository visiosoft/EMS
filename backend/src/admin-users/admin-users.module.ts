import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { EntraAuthGuard } from './entra-auth.guard';

@Module({
  imports: [ConfigModule, AuditModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService, EntraAuthGuard],
  exports: [AdminUsersService],
})
export class AdminUsersModule {}
