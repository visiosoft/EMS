import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { EntraAuthGuard } from './entra-auth.guard';

@Module({
    imports: [ConfigModule],
    controllers: [AdminUsersController],
    providers: [AdminUsersService, EntraAuthGuard, AdminRoleGuard],
})
export class AdminUsersModule { }