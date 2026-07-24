import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuditRequestContext } from '../audit/audit-request-context.service';

/**
 * Guard for WMS (Company Hub) endpoints. Ensures the request comes from an
 * authenticated user with a resolvable email. Role-specific restrictions on
 * individual endpoints are handled by AccessLevelGuard + @RequireAccessLevel.
 */
@Injectable()
export class InternalAccessGuard implements CanActivate {
  constructor(private readonly auditContext: AuditRequestContext) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: { email?: string; preferred_username?: string; upn?: string };
      header?: (name: string) => string | undefined;
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

    if (!email.trim()) {
      throw new ForbiddenException('Authentication required to access Company Hub.');
    }

    return true;
  }
}
