import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessLevel, meetsAccessLevel } from './access-level.enum';
import { AccessLevelService } from './access-level.service';
import { ACCESS_LEVEL_KEY } from './require-access-level.decorator';
import { AuditRequestContext } from '../audit/audit-request-context.service';

/**
 * Guard that enforces access-level restrictions.
 *
 * It reads the minimum required level from the @RequireAccessLevel() decorator
 * (applied at controller or handler level). If no decorator is present, access
 * is granted (equivalent to requiring Employee level).
 *
 * The guard expects `request.user` to already be populated by the EntraAuthGuard.
 * It resolves the user's effective access level from the database.
 */
@Injectable()
export class AccessLevelGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessLevelService: AccessLevelService,
    private readonly auditContext: AuditRequestContext,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Determine the required level from decorator metadata.
    // Handler-level overrides class-level.
    const requiredLevel =
      this.reflector.get<AccessLevel | undefined>(
        ACCESS_LEVEL_KEY,
        context.getHandler(),
      ) ??
      this.reflector.get<AccessLevel | undefined>(
        ACCESS_LEVEL_KEY,
        context.getClass(),
      );

    // No decorator → no restriction beyond authentication
    if (!requiredLevel) return true;

    // Resolve email: prefer audit context (populated from token by middleware),
    // fall back to request.user fields, then X-User-Email header.
    const request = context.switchToHttp().getRequest<{
      user?: { email?: string; preferred_username?: string; upn?: string };
      header?: (name: string) => string | undefined;
      headers?: Record<string, string | string[] | undefined>;
    }>();

    const email =
      this.auditContext.getUserEmail() ??
      request.user?.email ??
      request.user?.preferred_username ??
      request.user?.upn ??
      (typeof request.header === 'function'
        ? request.header('x-user-email')
        : undefined) ??
      '';

    const userLevel = await this.accessLevelService.resolveAccessLevel(email);

    if (meetsAccessLevel(userLevel, requiredLevel)) return true;

    throw new ForbiddenException(
      `This action requires ${requiredLevel} access or higher.`,
    );
  }
}
