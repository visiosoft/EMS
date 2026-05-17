import { renderHook } from '@testing-library/react';
import { useEffect, useMemo } from 'react';
import { describe, expect, it } from 'vitest';
import {
  deriveValidSelectedDmaIds,
  normalizeDmaMarketRows,
  normalizePositiveIntId,
} from './projectWizardDma';

const EMPTY_DMA: { dmaid: number; marketName: string; postalCode: string }[] = [];

describe('normalizePositiveIntId', () => {
  it('accepts positive integers', () => {
    expect(normalizePositiveIntId(42)).toBe(42);
    expect(normalizePositiveIntId('7')).toBe(7);
  });

  it('rejects invalid values', () => {
    expect(normalizePositiveIntId(0)).toBeNull();
    expect(normalizePositiveIntId(-1)).toBeNull();
    expect(normalizePositiveIntId(NaN)).toBeNull();
    expect(normalizePositiveIntId(undefined)).toBeNull();
    expect(normalizePositiveIntId('QA')).toBeNull();
  });
});

describe('normalizeDmaMarketRows', () => {
  it('drops rows without a valid dmaid', () => {
    expect(
      normalizeDmaMarketRows([
        { dmaid: 1, marketName: 'QA', postalCode: '12345' },
        { dmaid: undefined as unknown as number, marketName: 'Bad', postalCode: '1' },
      ]),
    ).toEqual([{ dmaid: 1, marketName: 'QA', postalCode: '12345' }]);
  });
});

describe('deriveValidSelectedDmaIds', () => {
  it('dedupes and sorts valid ids', () => {
    expect(deriveValidSelectedDmaIds([3, 1, 3])).toEqual([1, 3]);
  });

  it('filters invalid entries from selection', () => {
    expect(deriveValidSelectedDmaIds([99, Number.NaN as number, 0])).toEqual([99]);
  });
});

describe('dmaFlatRows effect dependency (regression: maximum update depth)', () => {
  it('stable useMemo + module empty array does not retrigger effects on rerender', () => {
    let effectRuns = 0;
    const { rerender } = renderHook(
      ({ data }: { data: { data: typeof EMPTY_DMA } | undefined }) => {
        const dmaFlatRows = useMemo(() => data?.data ?? EMPTY_DMA, [data]);
        useEffect(() => {
          effectRuns += 1;
        }, [dmaFlatRows]);
        return dmaFlatRows;
      },
      { initialProps: { data: undefined as { data: typeof EMPTY_DMA } | undefined } },
    );
    const afterMount = effectRuns;
    rerender({ data: undefined });
    rerender({ data: undefined });
    expect(effectRuns).toBe(afterMount);
  });

  it('inline ?? [] fallback retriggers effects every rerender', () => {
    let effectRuns = 0;
    const { rerender } = renderHook(() => {
      const data: { data: typeof EMPTY_DMA } | undefined = undefined;
      const dmaFlatRows = data?.data ?? [];
      useEffect(() => {
        effectRuns += 1;
      }, [dmaFlatRows]);
    });
    const afterMount = effectRuns;
    rerender();
    rerender();
    expect(effectRuns).toBeGreaterThan(afterMount);
  });

  it('tour reset effect must not depend on unstable tours array while loading', () => {
    let resetRuns = 0;
    const { rerender } = renderHook(
      ({ tours }: { tours: typeof EMPTY_DMA }) => {
        const selectedTourId: number | null = null;
        useEffect(() => {
          if (selectedTourId != null) return;
          resetRuns += 1;
        }, [selectedTourId]);
        useEffect(() => {
          if (selectedTourId == null) return;
          void tours;
        }, [selectedTourId, tours]);
      },
      { initialProps: { tours: [] as typeof EMPTY_DMA } },
    );
    const afterMount = resetRuns;
    rerender({ tours: [] });
    rerender({ tours: [] });
    expect(resetRuns).toBe(afterMount);
  });
});
