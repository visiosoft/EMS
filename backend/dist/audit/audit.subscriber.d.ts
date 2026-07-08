import { DataSource, EntitySubscriberInterface, InsertEvent, UpdateEvent } from 'typeorm';
import { AuditRequestContext } from './audit-request-context.service';
export declare class AuditSubscriber implements EntitySubscriberInterface<object> {
    private readonly auditContext;
    constructor(dataSource: DataSource, auditContext: AuditRequestContext);
    beforeInsert(event: InsertEvent<object>): void;
    beforeUpdate(event: UpdateEvent<object>): void;
    private apply;
    private getAuditColumnFlags;
}
