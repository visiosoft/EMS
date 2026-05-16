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
    let userOid = readAuditUserOidHeader(req);
    let userDisplayName = readAuditUserNameHeader(req);

    if (token) {
      try {
        const user = await this.tokenVerifier.verify(token);
        userOid = normalizeAuditUserOid(user.oid) ?? userOid;
        userDisplayName =
          normalizeAuditUserName(user.name) ??
          normalizeAuditUserName(user.preferred_username) ??
          userDisplayName;
      } catch {
        userOid = readAuditUserOidHeader(req);
        userDisplayName = readAuditUserNameHeader(req);
      }
    }

    this.auditContext.run({ userOid, userDisplayName }, next);
  }
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

function normalizeAuditUserOid(value: string | undefined | null): string | null {
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

function normalizeAuditUserName(value: string | undefined | null): string | null {
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
