import { describe, expect, it } from 'vitest';
import { validateDailySalesPerformanceDates } from './dailySalesPerformanceDateValidation';

describe('validateDailySalesPerformanceDates', () => {
  it('accepts empty performance filters with valid as-of', () => {
    const r = validateDailySalesPerformanceDates({
      asOfDate: '2026-05-14',
      performanceDate: '',
      startDate: '',
      endDate: '',
    });
    expect(r.ok).toBe(true);
    expect(r.messages).toHaveLength(0);
  });

  it('rejects range end before range start', () => {
    const r = validateDailySalesPerformanceDates({
      asOfDate: '2026-05-14',
      performanceDate: '',
      startDate: '2026-05-08',
      endDate: '2026-05-01',
    });
    expect(r.ok).toBe(false);
    expect(r.messages.some((m) => m.includes('before range start'))).toBe(true);
    expect(r.highlightStart && r.highlightEnd).toBe(true);
  });

  it('accepts performance day after as-of (future show date)', () => {
    const r = validateDailySalesPerformanceDates({
      asOfDate: '2026-05-09',
      performanceDate: '2026-05-10',
      startDate: '',
      endDate: '',
    });
    expect(r.ok).toBe(true);
  });

  it('rejects single day outside inclusive range', () => {
    const r = validateDailySalesPerformanceDates({
      asOfDate: '2026-05-14',
      performanceDate: '2026-05-02',
      startDate: '2026-05-05',
      endDate: '2026-05-10',
    });
    expect(r.ok).toBe(false);
    expect(r.messages.some((m) => m.includes('within'))).toBe(true);
  });

  it('accepts single day on range boundary', () => {
    const r = validateDailySalesPerformanceDates({
      asOfDate: '2026-05-14',
      performanceDate: '2026-05-05',
      startDate: '2026-05-05',
      endDate: '2026-05-10',
    });
    expect(r.ok).toBe(true);
  });
});
