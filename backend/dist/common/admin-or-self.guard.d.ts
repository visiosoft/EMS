import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AccessLevelService } from './access-level.service';
import { AuditRequestContext } from '../audit/audit-request-context.service';
export declare class AdminOrSelfGuard implements CanActivate {
    private readonly accessLevelService;
    private readonly auditContext;
    constructor(accessLevelService: AccessLevelService, auditContext: AuditRequestContext);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
