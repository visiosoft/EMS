export function cleanDmaMarketLabel(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .replace(/[.,:;]+$/g, '')
    .trim();
}
