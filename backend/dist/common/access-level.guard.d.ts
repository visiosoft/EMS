import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessLevelService } from './access-level.service';
import { AuditRequestContext } from '../audit/audit-request-context.service';
export declare class AccessLevelGuard implements CanActivate {
    private readonly reflector;
    private readonly accessLevelService;
    private readonly auditContext;
    constructor(reflector: Reflector, accessLevelService: AccessLevelService, auditContext: AuditRequestContext);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
