import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createRemoteJWKSet,
  decodeJwt,
  jwtVerify,
  type JWTPayload,
} from 'jose';

export type EntraRequestUser = JWTPayload & {
  name?: string;
  oid?: string;
  email?: string;
  preferred_username?: string;
  upn?: string;
  roles?: string[];
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

@Injectable()
export class EntraTokenVerifier {
  constructor(private readonly configService: ConfigService) {}

  async verify(token: string): Promise<EntraRequestUser> {
    const tenantId = this.getTenantId();
    const audiences = this.getAudienceCandidates();

    if (!tenantId || audiences.length === 0) {
      throw new ServiceUnavailableException(
        'Entra user directory is not configured. Set ENTRA_TENANT_ID and ENTRA_CLIENT_ID on the backend.',
      );
    }

    const jwks = getJwks(tenantId);
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

    return {
      ...payload,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      oid: typeof payload.oid === 'string' ? payload.oid : undefined,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      preferred_username:
        typeof payload.preferred_username === 'string'
          ? payload.preferred_username
          : undefined,
      upn: typeof payload.upn === 'string' ? payload.upn : undefined,
      roles: Array.isArray(payload.roles)
        ? payload.roles.filter(
            (value): value is string => typeof value === 'string',
          )
        : [],
    };
  }

  buildTokenValidationDetail(token: string, error: unknown): string {
    const tenantId = this.getTenantId();
    const expectedAudiences = this.getAudienceCandidates();
    const expectedIssuers = [
      `https://login.microsoftonline.com/${tenantId}/v2.0`,
      `https://sts.windows.net/${tenantId}/`,
    ];

    try {
      const decoded = decodeJwt(token) as JWTPayload & {
        iss?: string;
        aud?: string | string[];
        scp?: string;
        roles?: string[];
      };

      const actualAudience = Array.isArray(decoded.aud)
        ? decoded.aud.join(', ')
        : (decoded.aud ?? '(missing)');
      const actualRoles = Array.isArray(decoded.roles)
        ? decoded.roles.join(', ')
        : '(none)';
      const actualScopes =
        typeof decoded.scp === 'string' ? decoded.scp : '(none)';
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown JWT validation error';

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

  private getConfigValue(...keys: string[]): string {
    for (const key of keys) {
      const value = this.configService.get<string>(key)?.trim();
      if (value) return value;
    }
    return '';
  }

  private getTenantId(): string {
    return this.getConfigValue('ENTRA_TENANT_ID', 'VITE_ENTRA_TENANT_ID');
  }

  private getClientId(): string {
    return this.getConfigValue('ENTRA_CLIENT_ID', 'VITE_ENTRA_CLIENT_ID');
  }

  private getAudienceCandidates(): string[] {
    const values = new Set<string>();
    const add = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      values.add(trimmed);
      values.add(trimmed.replace(/^api:\/\//, ''));
    };

    add(this.getConfigValue('ENTRA_API_AUDIENCE'));

    const clientId = this.getClientId();
    add(clientId);
    if (clientId) add(`api://${clientId}`);

    return [...values];
  }
}

export function getBearerToken(
  headerValue: string | string[] | undefined,
): string {
  const token = getOptionalBearerToken(headerValue);
  if (!token) {
    throw new Error('Missing or invalid bearer token.');
  }
  return token;
}

export function getOptionalBearerToken(
  headerValue: string | string[] | undefined,
): string | null {
  const header = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function getJwks(tenantId: string) {
  const cached = jwksCache.get(tenantId);
  if (cached) return cached;

  const jwks = createRemoteJWKSet(
    new URL(
      `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
    ),
  );
  jwksCache.set(tenantId, jwks);
  return jwks;
}
