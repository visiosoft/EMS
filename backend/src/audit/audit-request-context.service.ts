import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

type AuditRequestStore = {
  userOid: string | null;
  userDisplayName: string | null;
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
}
