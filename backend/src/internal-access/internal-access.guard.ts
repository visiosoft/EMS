import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuditRequestContext } from '../audit/audit-request-context.service';
import { isInternalHubEmailAllowed } from './internal-access';

@Injectable()
export class InternalAccessGuard implements CanActivate {
  constructor(private readonly auditContext: AuditRequestContext) {}

  canActivate(_context: ExecutionContext): boolean {
    if (isInternalHubEmailAllowed(this.auditContext.getUserEmail())) {
      return true;
    }

    throw new ForbiddenException('Company Hub access is restricted.');
  }
}
