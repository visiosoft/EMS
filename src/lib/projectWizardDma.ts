import type { QueryClient } from '@tanstack/react-query';
import type { ApiDmaMarket } from '@/api/companyApi';
import { fetchDmaMarketsPaged } from '@/api/companyApi';

/** Stable empty selection — avoids new `[]` references in memoized keys/effects. */
export const EMPTY_VALID_DMA_IDS: number[] = [];

/** Stable empty preferred-venue-type selection (tour sync must not use inline `[]`). */
export const EMPTY_PREFERRED_VENUE_TYPE_IDS: number[] = [];

const WIZARD_DMA_PAGE_SIZE = 500;

export const PROJECT_WIZARD_DMA_QUERY_KEY = ['dma-markets', 'project-wizard', 'all-v2'] as const;

export function normalizePositiveIntId(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

export function normalizeDmaMarketRows(rows: ApiDmaMarket[]): ApiDmaMarket[] {
  const out: ApiDmaMarket[] = [];
  for (const r of rows) {
    const dmaid = normalizePositiveIntId(r.dmaid);
    if (dmaid == null) continue;
    out.push({
      ...r,
      dmaid,
      marketName: String(r.marketName ?? '').trim(),
      postalCode: String(r.postalCode ?? '').trim(),
    });
  }
  return out;
}

/**
 * Match `/lookups/dma-markets` grouped semantics: one row per market name, MIN(dmaid).
 */
export function canonicalizeDmaPickerCatalog(rows: ApiDmaMarket[]): ApiDmaMarket[] {
  const byMarket = new Map<string, ApiDmaMarket>();
  for (const r of normalizeDmaMarketRows(rows)) {
    const key = r.marketName.trim().toLowerCase();
    if (!key) continue;
    const existing = byMarket.get(key);
    if (!existing || r.dmaid < existing.dmaid) {
      byMarket.set(key, r);
    }
  }
  return [...byMarket.values()].sort((a, b) =>
    a.marketName.localeCompare(b.marketName, undefined, { sensitivity: 'base' }),
  );
}

/** Load every DMA market for the wizard (API caps page size at 500). */
export async function fetchAllDmaMarketsForWizard(): Promise<ApiDmaMarket[]> {
  const limit = WIZARD_DMA_PAGE_SIZE;
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  const raw: ApiDmaMarket[] = [];
  while (offset < total) {
    const page = await fetchDmaMarketsPaged(offset, limit);
    total = Math.max(0, page.total ?? 0);
    const batch = normalizeDmaMarketRows(page.data ?? []);
    raw.push(...batch);
    if (batch.length < limit || raw.length >= total) break;
    offset += limit;
  }
  return canonicalizeDmaPickerCatalog(raw);
}

export function deriveValidSelectedDmaIds(selected: number[]): number[] {
  if (!selected.length) return EMPTY_VALID_DMA_IDS;
  return [
    ...new Set(
      selected.map((id) => normalizePositiveIntId(id)).filter((id): id is number => id != null),
    ),
  ].sort((a, b) => a - b);
}

export function dmaSelectionKey(ids: number[]): string {
  return deriveValidSelectedDmaIds(ids).join(',');
}

/** Map raw selection ids to canonical picker ids (same market name → MIN dmaid). */
export function mapSelectionToCanonicalDmaIds(
  selected: number[],
  catalog: ApiDmaMarket[],
): number[] {
  const canon = canonicalizeDmaPickerCatalog(catalog);
  const idToMarket = new Map<number, string>();
  for (const r of normalizeDmaMarketRows(catalog)) {
    idToMarket.set(r.dmaid, r.marketName.trim().toLowerCase());
  }
  const marketToCanonId = new Map<string, number>();
  for (const r of canon) {
    marketToMarketSet(marketToCanonId, r);
  }
  const out = new Set<number>();
  for (const id of deriveValidSelectedDmaIds(selected)) {
    const market = idToMarket.get(id);
    if (market) {
      const canonId = marketToCanonId.get(market);
      if (canonId != null) {
        out.add(canonId);
        continue;
      }
    }
    out.add(id);
  }
  return [...out].sort((a, b) => a - b);
}

function marketToMarketSet(map: Map<string, number>, r: ApiDmaMarket) {
  map.set(r.marketName.trim().toLowerCase(), r.dmaid);
}

/** Insert or replace a market row in the project-wizard DMA picker cache (after Settings create). */
export function patchWizardDmaMarketsCache(qc: QueryClient, raw: ApiDmaMarket): void {
  const normalized = normalizeDmaMarketRows([raw]);
  if (!normalized.length) return;
  const added = normalized[0];
  qc.setQueryData<ApiDmaMarket[]>(PROJECT_WIZARD_DMA_QUERY_KEY, (old) => {
    const prev = old ?? [];
    const merged = canonicalizeDmaPickerCatalog([
      ...prev.filter(
        (d) => d.marketName.trim().toLowerCase() !== added.marketName.trim().toLowerCase(),
      ),
      added,
    ]);
    return merged;
  });
}
