import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminUsersService } from './admin-users.service';
import { EntraAuthGuard } from './entra-auth.guard';

@Controller('admin')
@UseGuards(EntraAuthGuard, AdminRoleGuard)
export class AdminUsersController {
    constructor(private readonly adminUsersService: AdminUsersService) { }

    @Get('users')
    async listUsers() {
        return this.adminUsersService.listUsers();
    }
}