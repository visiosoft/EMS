import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EntraRequest } from './entra-auth.guard';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<EntraRequest>();
    const configuredRole =
      this.configService.get<string>('ENTRA_ADMIN_ROLE')?.trim() || 'Admin';
    const roles = request.user?.roles ?? [];

    if (roles.includes(configuredRole)) return true;

    throw new ForbiddenException(
      'Only Entra admins can view the full user directory.',
    );
  }
}
