import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  EntraTokenVerifier,
  getOptionalBearerToken,
} from '../auth/entra-token-verifier.service';
import { AuditRequestContext } from './audit-request-context.service';

@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  constructor(
    private readonly auditContext: AuditRequestContext,
    private readonly tokenVerifier: EntraTokenVerifier,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const token = getOptionalBearerToken(req.headers.authorization);
    const graphAccessToken = req.header('x-entra-graph-access-token') ?? null;
    let userOid = readAuditUserOidHeader(req);
    let userDisplayName = readAuditUserNameHeader(req);
    let userEmailCandidates = readAuditUserEmailHeaderCandidates(req);

    if (token) {
      try {
        const user = await this.tokenVerifier.verify(token);
        userOid = normalizeAuditUserOid(user.oid) ?? userOid;
        userDisplayName =
          normalizeAuditUserName(user.name) ??
          normalizeAuditUserName(user.preferred_username) ??
          userDisplayName;
        /**
         * The `email`, `preferred_username`, and `upn` claims can each carry a different
         * address (e.g. `mail` vs. sign-in UPN on the same Entra account). Internal contact
         * lookups match against whichever address EMS has on file, so keep all of them as
         * candidates rather than collapsing to a single "best" claim.
         */
        const tokenEmailCandidates = [
          normalizeAuditUserEmail(user.email),
          normalizeAuditUserEmail(user.preferred_username),
          normalizeAuditUserEmail(user.upn),
        ].filter((value): value is string => value != null);
        if (tokenEmailCandidates.length > 0) {
          userEmailCandidates = dedupeStrings([
            ...tokenEmailCandidates,
            ...userEmailCandidates,
          ]);
        }
      } catch {
        userOid = readAuditUserOidHeader(req);
        userDisplayName = readAuditUserNameHeader(req);
        userEmailCandidates = readAuditUserEmailHeaderCandidates(req);
      }
    }

    this.auditContext.run(
      {
        userOid,
        userDisplayName,
        userEmail: userEmailCandidates[0] ?? null,
        userEmailCandidates,
        graphAccessToken,
      },
      next,
    );
  }
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function readAuditUserOidHeader(req: Request): string | null {
  return (
    normalizeAuditUserOid(req.header('x-user-oid')) ??
    normalizeAuditUserOid(req.header('x-entra-oid')) ??
    normalizeAuditUserOid(req.header('x-ms-client-principal-id')) ??
    null
  );
}

function readAuditUserNameHeader(req: Request): string | null {
  return (
    normalizeAuditUserName(req.header('x-user-name')) ??
    normalizeAuditUserName(req.header('x-entra-name')) ??
    normalizeAuditUserName(req.header('x-ms-client-principal-name')) ??
    null
  );
}

function normalizeAuditUserOid(
  value: string | undefined | null,
): string | null {
  const oid = String(value ?? '').trim();
  if (!oid || oid.length > 150) return null;
  if (
    Array.from(oid).some((char) => {
      const code = char.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  ) {
    return null;
  }
  return oid;
}

function readAuditUserEmailHeaderCandidates(req: Request): string[] {
  return dedupeStrings(
    [
      normalizeAuditUserEmail(req.header('x-user-email')),
      normalizeAuditUserEmail(req.header('x-entra-email')),
    ].filter((value): value is string => value != null),
  );
}

function normalizeAuditUserEmail(
  value: string | undefined | null,
): string | null {
  const email = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!email || email.length > 254) return null;
  if (!email.includes('@')) return null;
  return email;
}

function normalizeAuditUserName(
  value: string | undefined | null,
): string | null {
  const name = String(value ?? '').trim();
  if (!name || name.length > 200) return null;
  if (
    Array.from(name).some((char) => {
      const code = char.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  ) {
    return null;
  }
  return name;
}
