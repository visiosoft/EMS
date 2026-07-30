import { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { EntraTokenVerifier } from '../auth/entra-token-verifier.service';
import { AuditRequestContext } from './audit-request-context.service';
export declare class AuditContextMiddleware implements NestMiddleware {
    private readonly auditContext;
    private readonly tokenVerifier;
    constructor(auditContext: AuditRequestContext, tokenVerifier: EntraTokenVerifier);
    use(req: Request, _res: Response, next: NextFunction): Promise<void>;
}
