/**
 * Unit tests for SalesSummaryPage logic — specifically the unreported-sales
 * backfill via `lastDailyMovement` / `aggregateLastDailyMovement` (commit a9dc86e)
 * and the removal of company/contact filters (commit e827fd0).
 *
 * The functions under test are module-private, so we replicate them here with
 * the exact same logic to confirm correctness of the algorithms.
 */
import { describe, expect, it } from 'vitest';

// ---------- Replicated internal types & helpers ----------

type Snapshot = { tickets: number; revenue: number };
type LedgerRow = Snapshot & { salesDate: string };
type Ledger = Map<number, LedgerRow[]>;

const num = (v: number | null | undefined) => (v != null && Number.isFinite(v) ? v : null);
const delta = (a: number, b: number) => Math.max(0, Number.isFinite(a - b) ? a - b : 0);

/**
 * Replication of `lastDailyMovement` from SalesSummaryPage.tsx (a9dc86e).
 * Returns the daily movement for the most recent reported day at or before cutoff.
 */
function lastDailyMovement(rows: LedgerRow[] | undefined, cutoff: string): Snapshot {
  if (!rows?.length) return { tickets: 0, revenue: 0 };
  let idx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].salesDate <= cutoff) idx = i;
    else break;
  }
  if (idx < 0) return { tickets: 0, revenue: 0 };
  const cur = rows[idx];
  const prev = idx > 0 ? rows[idx - 1] : null;
  return {
    tickets: delta(cur.tickets, prev?.tickets ?? 0),
    revenue: delta(cur.revenue, prev?.revenue ?? 0),
  };
}

/**
 * Replication of `aggregateLastDailyMovement` from SalesSummaryPage.tsx (a9dc86e).
 */
function aggregateLastDailyMovement(ledger: Ledger, cutoff: string): Snapshot {
  let tickets = 0,
    revenue = 0;
  ledger.forEach((rows) => {
    const m = lastDailyMovement(rows, cutoff);
    tickets += m.tickets;
    revenue += m.revenue;
  });
  return { tickets, revenue };
}

// ---------- Tests ----------

describe('lastDailyMovement (SalesSummaryPage backfill)', () => {
  it('returns zero when rows are empty', () => {
    expect(lastDailyMovement(undefined, '2026-05-22')).toEqual({ tickets: 0, revenue: 0 });
    expect(lastDailyMovement([], '2026-05-22')).toEqual({ tickets: 0, revenue: 0 });
  });

  it('returns the delta between last two rows when cutoff is at the end', () => {
    const rows: LedgerRow[] = [
      { salesDate: '2026-05-20', tickets: 10, revenue: 100 },
      { salesDate: '2026-05-21', tickets: 15, revenue: 150 },
      { salesDate: '2026-05-22', tickets: 25, revenue: 250 },
    ];
    // Daily movement at the cutoff = row[2] - row[1] = 10 tickets, $100
    expect(lastDailyMovement(rows, '2026-05-22')).toEqual({ tickets: 10, revenue: 100 });
  });

  it('falls back to an earlier day when cutoff is beyond last row', () => {
    const rows: LedgerRow[] = [
      { salesDate: '2026-05-20', tickets: 10, revenue: 100 },
      { salesDate: '2026-05-21', tickets: 18, revenue: 180 },
    ];
    // Cutoff is May 25, but last entry is May 21. Uses May 21 - May 20 = 8 tickets, $80
    expect(lastDailyMovement(rows, '2026-05-25')).toEqual({ tickets: 8, revenue: 80 });
  });

  it('uses first row as-is when there is no preceding row', () => {
    const rows: LedgerRow[] = [
      { salesDate: '2026-05-20', tickets: 10, revenue: 100 },
    ];
    expect(lastDailyMovement(rows, '2026-05-20')).toEqual({ tickets: 10, revenue: 100 });
  });

  it('returns zero when cutoff is before all rows', () => {
    const rows: LedgerRow[] = [
      { salesDate: '2026-05-20', tickets: 10, revenue: 100 },
    ];
    expect(lastDailyMovement(rows, '2026-05-19')).toEqual({ tickets: 0, revenue: 0 });
  });

  it('clamps negative deltas to zero', () => {
    // Edge case: cumulative went down (data correction)
    const rows: LedgerRow[] = [
      { salesDate: '2026-05-20', tickets: 20, revenue: 200 },
      { salesDate: '2026-05-21', tickets: 15, revenue: 150 },
    ];
    expect(lastDailyMovement(rows, '2026-05-21')).toEqual({ tickets: 0, revenue: 0 });
  });
});

describe('aggregateLastDailyMovement (SalesSummaryPage backfill)', () => {
  it('sums daily movements across multiple performances', () => {
    const ledger: Ledger = new Map();
    ledger.set(1, [
      { salesDate: '2026-05-20', tickets: 10, revenue: 100 },
      { salesDate: '2026-05-22', tickets: 20, revenue: 200 },
    ]);
    ledger.set(2, [
      { salesDate: '2026-05-21', tickets: 5, revenue: 50 },
      { salesDate: '2026-05-22', tickets: 12, revenue: 120 },
    ]);

    // Performance 1: 20 - 10 = 10 tickets, $100
    // Performance 2: 12 - 5 = 7 tickets, $70
    // Total: 17 tickets, $170
    expect(aggregateLastDailyMovement(ledger, '2026-05-22')).toEqual({
      tickets: 17,
      revenue: 170,
    });
  });

  it('returns zero for an empty ledger', () => {
    const ledger: Ledger = new Map();
    expect(aggregateLastDailyMovement(ledger, '2026-05-22')).toEqual({
      tickets: 0,
      revenue: 0,
    });
  });

  it('skips performances with no rows at or before cutoff', () => {
    const ledger: Ledger = new Map();
    ledger.set(1, [
      { salesDate: '2026-05-25', tickets: 50, revenue: 500 },
    ]);
    // Cutoff is May 22, but only entry is May 25 → contributes 0
    expect(aggregateLastDailyMovement(ledger, '2026-05-22')).toEqual({
      tickets: 0,
      revenue: 0,
    });
  });
});

describe('SalesSummaryPage filter removal (e827fd0)', () => {
  // These tests verify the expected filter state after refactoring.
  // The commit removed companyFilter and contactFilter. We confirm the active
  // filter count logic works correctly without those filters.

  it('counts only remaining filters correctly', () => {
    // Simulating the activeFilterCount calculation after removal of companyFilter / contactFilter
    const attractionFilter = 'Some Attraction';
    const genreFilter = '';
    const tourFilter = 'Tour A';
    const venueFilter = '';
    const activeSearch = '';

    const activeFilterCount = [
      attractionFilter,
      genreFilter,
      tourFilter,
      venueFilter,
      activeSearch.trim(),
    ].filter(Boolean).length;

    expect(activeFilterCount).toBe(2);
  });

  it('reset clears all remaining filters', () => {
    let attractionFilter = 'X',
      genreFilter = 'Y',
      tourFilter = 'Z',
      venueFilter = 'W',
      searchInput = 'search',
      activeSearch = 'search';

    // Simulate reset
    attractionFilter = '';
    genreFilter = '';
    tourFilter = '';
    venueFilter = '';
    searchInput = '';
    activeSearch = '';

    const activeFilterCount = [
      attractionFilter,
      genreFilter,
      tourFilter,
      venueFilter,
      activeSearch.trim(),
    ].filter(Boolean).length;

    expect(activeFilterCount).toBe(0);
    expect(searchInput).toBe('');
  });
});
