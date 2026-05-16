import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
    EntraTokenVerifier,
    getOptionalBearerToken,
    type EntraRequestUser,
} from '../auth/entra-token-verifier.service';

export type EntraRequest = Request & { user?: EntraRequestUser };

@Injectable()
export class EntraAuthGuard implements CanActivate {
    constructor(private readonly tokenVerifier: EntraTokenVerifier) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<EntraRequest>();
        const token = getOptionalBearerToken(request.headers.authorization);
        if (!token) {
            throw new UnauthorizedException(
                request.headers.authorization
                    ? 'Authorization header must use Bearer token format.'
                    : 'Missing Authorization header.',
            );
        }

        try {
            request.user = await this.tokenVerifier.verify(token);
            return true;
        } catch (error) {
            if (error instanceof ServiceUnavailableException) throw error;
            throw new UnauthorizedException({
                message: 'Invalid or expired Microsoft Entra access token.',
                detail: this.tokenVerifier.buildTokenValidationDetail(token, error),
            });
        }
    }
}
