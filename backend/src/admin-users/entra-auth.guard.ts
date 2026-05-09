import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Request } from 'express';

type EntraRequestUser = JWTPayload & {
    name?: string;
    oid?: string;
    preferred_username?: string;
    roles?: string[];
};

export type EntraRequest = Request & { user?: EntraRequestUser };

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

@Injectable()
export class EntraAuthGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<EntraRequest>();
        const token = getBearerToken(request.headers.authorization);
        const tenantId = this.configService.get<string>('ENTRA_TENANT_ID');
        const audience = this.configService.get<string>('ENTRA_API_AUDIENCE');

        if (!tenantId || !audience) {
            throw new ServiceUnavailableException(
                'Admin user directory is not configured. Set ENTRA_TENANT_ID and ENTRA_API_AUDIENCE on the backend.',
            );
        }

        try {
            const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
            const jwks = getJwks(tenantId);
            const { payload } = await jwtVerify(token, jwks, {
                issuer,
                audience,
                algorithms: ['RS256'],
            });

            request.user = {
                ...payload,
                name: typeof payload.name === 'string' ? payload.name : undefined,
                oid: typeof payload.oid === 'string' ? payload.oid : undefined,
                preferred_username:
                    typeof payload.preferred_username === 'string'
                        ? payload.preferred_username
                        : undefined,
                roles: Array.isArray(payload.roles)
                    ? payload.roles.filter((value): value is string => typeof value === 'string')
                    : [],
            };
            return true;
        } catch {
            throw new UnauthorizedException('Invalid or expired Microsoft Entra access token.');
        }
    }
}

function getBearerToken(headerValue: string | string[] | undefined): string {
    const header = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!header) {
        throw new UnauthorizedException('Missing Authorization header.');
    }

    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        throw new UnauthorizedException('Authorization header must use Bearer token format.');
    }

    return match[1];
}

function getJwks(tenantId: string) {
    const cached = jwksCache.get(tenantId);
    if (cached) return cached;

    const jwks = createRemoteJWKSet(
        new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`),
    );
    jwksCache.set(tenantId, jwks);
    return jwks;
}