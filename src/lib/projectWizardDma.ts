import type { ApiDmaMarket } from '@/api/companyApi';

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

export function deriveValidSelectedDmaIds(selected: number[]): number[] {
  return [
    ...new Set(
      selected.map((id) => normalizePositiveIntId(id)).filter((id): id is number => id != null),
    ),
  ].sort((a, b) => a - b);
}
