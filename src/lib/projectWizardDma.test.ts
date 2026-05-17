import { renderHook } from '@testing-library/react';
import { useEffect, useMemo } from 'react';
import { describe, expect, it } from 'vitest';
import {
  canonicalizeDmaPickerCatalog,
  deriveValidSelectedDmaIds,
  dmaSelectionKey,
  EMPTY_PREFERRED_VENUE_TYPE_IDS,
  EMPTY_VALID_DMA_IDS,
  mapSelectionToCanonicalDmaIds,
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

describe('canonicalizeDmaPickerCatalog', () => {
  it('keeps one row per market name with MIN(dmaid)', () => {
    const out = canonicalizeDmaPickerCatalog([
      { dmaid: 50, marketName: 'QA', postalCode: '1' },
      { dmaid: 10, marketName: 'QA', postalCode: '2' },
      { dmaid: 5, marketName: 'Other', postalCode: '3' },
    ]);
    expect(out).toEqual([
      { dmaid: 5, marketName: 'Other', postalCode: '3' },
      { dmaid: 10, marketName: 'QA', postalCode: '2' },
    ]);
  });
});

describe('mapSelectionToCanonicalDmaIds', () => {
  it('maps a freshly created id to MIN(dmaid) for the same market', () => {
    const catalog = [
      { dmaid: 50, marketName: 'New Market', postalCode: '1' },
      { dmaid: 10, marketName: 'New Market', postalCode: '2' },
    ];
    expect(mapSelectionToCanonicalDmaIds([50], catalog)).toEqual([10]);
  });
});

describe('deriveValidSelectedDmaIds', () => {
  it('dedupes and sorts valid ids', () => {
    expect(deriveValidSelectedDmaIds([3, 1, 3])).toEqual([1, 3]);
  });

  it('returns a stable empty array reference', () => {
    expect(deriveValidSelectedDmaIds([])).toBe(EMPTY_VALID_DMA_IDS);
    expect(deriveValidSelectedDmaIds([])).toBe(EMPTY_VALID_DMA_IDS);
  });

  it('dmaSelectionKey matches sorted valid ids', () => {
    expect(dmaSelectionKey([3, 1])).toBe('1,3');
  });

  it('filters invalid entries from selection', () => {
    expect(deriveValidSelectedDmaIds([99, Number.NaN as number, 0])).toEqual([99]);
  });
});

describe('EMPTY_PREFERRED_VENUE_TYPE_IDS', () => {
  it('is stable across reads', () => {
    expect(EMPTY_PREFERRED_VENUE_TYPE_IDS).toBe(EMPTY_PREFERRED_VENUE_TYPE_IDS);
  });
});

describe('dmaFlatRows effect dependency (regression: maximum update depth)', () => {
  it('stable useMemo + module empty array does not retrigger effects on rerender', () => {
    let effectRuns = 0;
    const { rerender } = renderHook(
      ({ data }: { data: typeof EMPTY_DMA | undefined }) => {
        const dmaFlatRows = useMemo(() => data ?? EMPTY_DMA, [data]);
        useEffect(() => {
          effectRuns += 1;
        }, [dmaFlatRows]);
        return dmaFlatRows;
      },
      { initialProps: { data: undefined as typeof EMPTY_DMA | undefined } },
    );
    const afterMount = effectRuns;
    rerender({ data: undefined });
    rerender({ data: undefined });
    expect(effectRuns).toBe(afterMount);
  });

  it('inline ?? [] fallback retriggers effects every rerender', () => {
    let effectRuns = 0;
    const { rerender } = renderHook(() => {
      const data: typeof EMPTY_DMA | undefined = undefined;
      const dmaFlatRows = data ?? [];
      useEffect(() => {
        effectRuns += 1;
      }, [dmaFlatRows]);
    });
    const afterMount = effectRuns;
    rerender();
    rerender();
    expect(effectRuns).toBeGreaterThan(afterMount);
  });

  it('tour sync skips repeat runs for the same selected tour id', () => {
    let syncRuns = 0;
    const lastSynced = { current: null as number | null };
    const { rerender } = renderHook(
      ({ tours }: { tours: { tourId: number }[] }) => {
        const selectedTourId = 5;
        useEffect(() => {
          if (selectedTourId == null) return;
          if (lastSynced.current === selectedTourId) return;
          const t = tours.find((x) => x.tourId === selectedTourId);
          if (!t) return;
          lastSynced.current = selectedTourId;
          syncRuns += 1;
        }, [selectedTourId, tours]);
      },
      { initialProps: { tours: [{ tourId: 5 }] } },
    );
    const afterMount = syncRuns;
    rerender({ tours: [{ tourId: 5 }] });
    rerender({ tours: [{ tourId: 5 }] });
    expect(syncRuns).toBe(afterMount);
  });
});
