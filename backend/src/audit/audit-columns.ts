import { Column } from 'typeorm';

export abstract class AuditColumns {
  @Column({ name: 'created_by', type: 'varchar', length: 150, nullable: true })
  createdBy: string | null;

  @Column({ name: 'created_at', type: 'datetime', nullable: true })
  createdAt: Date | null;

  @Column({ name: 'modified_by', type: 'varchar', length: 150, nullable: true })
  modifiedBy: string | null;

  @Column({ name: 'modified_at', type: 'datetime', nullable: true })
  modifiedAt: Date | null;
}

export type AuditColumnFlags = {
  createdBy: boolean;
  createdAt: boolean;
  modifiedBy: boolean;
  modifiedAt: boolean;
};

type AuditableEntity = {
  createdBy?: string | null;
  createdAt?: Date | null;
  modifiedBy?: string | null;
  modifiedAt?: Date | null;
};

export function applyAuditColumns(
  entity: object | undefined,
  flags: AuditColumnFlags,
  mode: 'insert' | 'update',
  userOid: string | null,
  now: Date,
): void {
  if (!entity) return;

  const row = entity as AuditableEntity;

  if (mode === 'insert') {
    if (flags.createdAt && row.createdAt == null) row.createdAt = now;
    if (flags.createdBy && userOid) row.createdBy = userOid;
  }

  if (flags.modifiedAt) row.modifiedAt = now;
  if (flags.modifiedBy && userOid) row.modifiedBy = userOid;
}
