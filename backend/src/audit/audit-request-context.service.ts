import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

type AuditRequestStore = {
  userOid: string | null;
  userDisplayName: string | null;
  /** Entra preferred_username / UPN when available (used for "my" list filters). */
  userEmail: string | null;
  /** All Entra email-like claims (email, preferred_username, upn) for internal contact matching. */
  userEmailCandidates: string[];
  graphAccessToken: string | null;
};

@Injectable()
export class AuditRequestContext {
  private readonly storage = new AsyncLocalStorage<AuditRequestStore>();

  run<T>(store: AuditRequestStore, callback: () => T): T {
    return this.storage.run(store, callback);
  }

  getUserOid(): string | null {
    return this.storage.getStore()?.userOid ?? null;
  }

  getUserDisplayName(): string | null {
    return this.storage.getStore()?.userDisplayName ?? null;
  }

  getUserEmail(): string | null {
    return this.storage.getStore()?.userEmail ?? null;
  }

  /** All Entra email-like claims for the signed-in user, most-authoritative first. */
  getUserEmailCandidates(): string[] {
    return this.storage.getStore()?.userEmailCandidates ?? [];
  }

  getGraphAccessToken(): string | null {
    return this.storage.getStore()?.graphAccessToken ?? null;
  }
}
