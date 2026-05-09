import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, decodeJwt, jwtVerify, type JWTPayload } from 'jose';
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
            const jwks = getJwks(tenantId);

            // Try v2 issuer first, then fall back to v1 (sts.windows.net).
            // Also accept the audience both with and without the api:// prefix
            // since v1 tokens omit it.
            const audiences = [audience, audience.replace(/^api:\/\//, '')].filter(Boolean);
            const issuers = [
                `https://login.microsoftonline.com/${tenantId}/v2.0`,
                `https://sts.windows.net/${tenantId}/`,
            ];

            let payload: JWTPayload | undefined;
            let lastError: unknown;
            for (const iss of issuers) {
                for (const aud of audiences) {
                    try {
                        ({ payload } = await jwtVerify(token, jwks, {
                            issuer: iss,
                            audience: aud,
                            algorithms: ['RS256'],
                        }));
                        break;
                    } catch (err) {
                        lastError = err;
                    }
                }
                if (payload) break;
            }

            if (!payload) throw lastError;

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
        } catch (error) {
            throw new UnauthorizedException({
                message: 'Invalid or expired Microsoft Entra access token.',
                detail: buildTokenValidationDetail(token, tenantId, audience, error),
            });
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

function buildTokenValidationDetail(
    token: string,
    tenantId: string,
    audience: string,
    error: unknown,
): string {
    const expectedIssuers = [
        `https://login.microsoftonline.com/${tenantId}/v2.0`,
        `https://sts.windows.net/${tenantId}/`,
    ];
    const expectedAudiences = [audience, audience.replace(/^api:\/\//, '')];

    try {
        const decoded = decodeJwt(token) as JWTPayload & {
            iss?: string;
            aud?: string | string[];
            scp?: string;
            roles?: string[];
        };

        const actualAudience = Array.isArray(decoded.aud)
            ? decoded.aud.join(', ')
            : decoded.aud ?? '(missing)';
        const actualRoles = Array.isArray(decoded.roles) ? decoded.roles.join(', ') : '(none)';
        const actualScopes = typeof decoded.scp === 'string' ? decoded.scp : '(none)';
        const errorMessage = error instanceof Error ? error.message : 'Unknown JWT validation error';

        return [
            `Expected issuer: ${expectedIssuers.join(' or ')}`,
            `Actual issuer: ${decoded.iss ?? '(missing)'}`,
            `Expected audience: ${expectedAudiences.join(' or ')}`,
            `Actual audience: ${actualAudience}`,
            `Scopes: ${actualScopes}`,
            `Roles: ${actualRoles}`,
            `JWT validation error: ${errorMessage}`,
        ].join(' | ');
    } catch {
        return [
            `Expected issuer: ${expectedIssuers.join(' or ')}`,
            `Expected audience: ${expectedAudiences.join(' or ')}`,
            `JWT validation error: ${error instanceof Error ? error.message : 'Unknown JWT validation error'}`,
        ].join(' | ');
    }
}