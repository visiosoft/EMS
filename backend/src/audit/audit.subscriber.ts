import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { applyAuditColumns, type AuditColumnFlags } from './audit-columns';
import { AuditRequestContext } from './audit-request-context.service';

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<object> {
  constructor(
    dataSource: DataSource,
    private readonly auditContext: AuditRequestContext,
  ) {
    dataSource.subscribers.push(this);
  }

  beforeInsert(event: InsertEvent<object>): void {
    this.apply(event, 'insert');
  }

  beforeUpdate(event: UpdateEvent<object>): void {
    this.apply(event, 'update');
  }

  private apply(
    event: InsertEvent<object> | UpdateEvent<object>,
    mode: 'insert' | 'update',
  ): void {
    const flags = this.getAuditColumnFlags(event);
    if (!Object.values(flags).some(Boolean)) return;

    applyAuditColumns(
      event.entity,
      flags,
      mode,
      this.auditContext.getUserOid(),
      new Date(),
    );
  }

  private getAuditColumnFlags(
    event: InsertEvent<object> | UpdateEvent<object>,
  ): AuditColumnFlags {
    const has = (propertyName: string) =>
      event.metadata.columns.some(
        (column) => column.propertyName === propertyName,
      );

    return {
      createdBy: has('createdBy'),
      createdAt: has('createdAt'),
      modifiedBy: has('modifiedBy'),
      modifiedAt: has('modifiedAt'),
    };
  }
}
