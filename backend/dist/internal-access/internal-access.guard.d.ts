import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AuditRequestContext } from '../audit/audit-request-context.service';
export declare class InternalAccessGuard implements CanActivate {
    private readonly auditContext;
    constructor(auditContext: AuditRequestContext);
    canActivate(context: ExecutionContext): boolean;
}
