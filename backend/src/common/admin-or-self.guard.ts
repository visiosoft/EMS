import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AccessLevel, meetsAccessLevel } from './access-level.enum';
import { AccessLevelService } from './access-level.service';
import { AuditRequestContext } from '../audit/audit-request-context.service';

/**
 * Guard that allows access if:
 *  1. The user is Administrator or higher, OR
 *  2. The :email route param matches the logged-in user's email (self-access)
 *
 * Use this on `users/:email/*` endpoints where employees should be able to
 * view/edit their own data but not other people's.
 */
@Injectable()
export class AdminOrSelfGuard implements CanActivate {
  constructor(
    private readonly accessLevelService: AccessLevelService,
    private readonly auditContext: AuditRequestContext,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params?: Record<string, string>;
      user?: { email?: string; preferred_username?: string; upn?: string };
      header?: (name: string) => string | undefined;
    }>();

    const loggedInEmail = (
      this.auditContext.getUserEmail() ??
      request.user?.email ??
      request.user?.preferred_username ??
      request.user?.upn ??
      (typeof request.header === 'function'
        ? request.header('x-user-email')
        : undefined) ??
      ''
    ).trim().toLowerCase();

    const targetEmail = (request.params?.email ?? '').trim().toLowerCase();

    // Self-access: allow if the target email matches the logged-in user
    if (loggedInEmail && targetEmail && loggedInEmail === targetEmail) {
      return true;
    }

    // Otherwise require Administrator+
    const userLevel = await this.accessLevelService.resolveAccessLevel(loggedInEmail);
    if (meetsAccessLevel(userLevel, AccessLevel.Administrator)) {
      return true;
    }

    throw new ForbiddenException(
      'You can only access your own profile, or you need Administrator access.',
    );
  }
}
