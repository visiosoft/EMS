import { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { EntraTokenVerifier, type EntraRequestUser } from '../auth/entra-token-verifier.service';
export type EntraRequest = Request & {
    user?: EntraRequestUser;
};
export declare class EntraAuthGuard implements CanActivate {
    private readonly tokenVerifier;
    constructor(tokenVerifier: EntraTokenVerifier);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
