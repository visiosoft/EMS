import { applyAuditColumns, type AuditColumnFlags } from './audit-columns';

const allAuditColumns: AuditColumnFlags = {
  createdBy: true,
  createdAt: true,
  modifiedBy: true,
  modifiedAt: true,
};

describe('applyAuditColumns', () => {
  it('sets created and modified audit values on insert', () => {
    const now = new Date('2026-05-15T12:00:00.000Z');
    const row: {
      createdBy?: string | null;
      createdAt?: Date | null;
      modifiedBy?: string | null;
      modifiedAt?: Date | null;
    } = {};

    applyAuditColumns(row, allAuditColumns, 'insert', 'user-oid-123', now);

    expect(row).toEqual({
      createdBy: 'user-oid-123',
      createdAt: now,
      modifiedBy: 'user-oid-123',
      modifiedAt: now,
    });
  });

  it('only updates modified audit values on update', () => {
    const createdAt = new Date('2026-05-01T12:00:00.000Z');
    const modifiedAt = new Date('2026-05-15T12:00:00.000Z');
    const row = {
      createdBy: 'creator-oid',
      createdAt,
      modifiedBy: 'old-oid',
      modifiedAt: new Date('2026-05-02T12:00:00.000Z'),
    };

    applyAuditColumns(row, allAuditColumns, 'update', 'modifier-oid', modifiedAt);

    expect(row).toEqual({
      createdBy: 'creator-oid',
      createdAt,
      modifiedBy: 'modifier-oid',
      modifiedAt,
    });
  });
});
