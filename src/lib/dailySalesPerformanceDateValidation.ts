/** Result of validating Daily Sales performance-date filters (YYYY-MM-DD). */
export type DailySalesPerfDateValidation = {
  ok: boolean;
  messages: string[];
  highlightAsOf: boolean;
  highlightPerf: boolean;
  highlightStart: boolean;
  highlightEnd: boolean;
};

function isYmd(s: string): boolean {
  const t = s.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const [y, m, d] = t.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Lexicographic compare works for ISO calendar dates. */
function ymdCompare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Validates performance single-day + range filters against each other and “Reporting as of”.
 * Mirrors server rules in `DailySalesService.findByPerformancePage`.
 */
export function validateDailySalesPerformanceDates(params: {
  asOfDate: string;
  performanceDate: string;
  startDate: string;
  endDate: string;
}): DailySalesPerfDateValidation {
  const asOf = params.asOfDate.trim();
  const perf = params.performanceDate.trim();
  const start = params.startDate.trim();
  const end = params.endDate.trim();

  const messages: string[] = [];
  let highlightAsOf = false;
  let highlightPerf = false;
  let highlightStart = false;
  let highlightEnd = false;

  if (!asOf || !isYmd(asOf)) {
    messages.push('Reporting as of must be a valid calendar date (YYYY-MM-DD).');
    highlightAsOf = true;
    return {
      ok: false,
      messages,
      highlightAsOf,
      highlightPerf,
      highlightStart,
      highlightEnd,
    };
  }

  if (perf) {
    if (!isYmd(perf)) {
      messages.push('Single performance day must be a valid calendar date.');
      highlightPerf = true;
    } else if (ymdCompare(perf, asOf) > 0) {
      messages.push('Single performance day cannot be after Reporting as of.');
      highlightPerf = true;
    }
  }

  if (start) {
    if (!isYmd(start)) {
      messages.push('Range start must be a valid calendar date.');
      highlightStart = true;
    } else if (ymdCompare(start, asOf) > 0) {
      messages.push('Range start cannot be after Reporting as of.');
      highlightStart = true;
    }
  }

  if (end) {
    if (!isYmd(end)) {
      messages.push('Range end must be a valid calendar date.');
      highlightEnd = true;
    } else if (ymdCompare(end, asOf) > 0) {
      messages.push('Range end cannot be after Reporting as of.');
      highlightEnd = true;
    }
  }

  if (start && end && isYmd(start) && isYmd(end) && ymdCompare(end, start) < 0) {
    messages.push('Range end cannot be before range start.');
    highlightStart = true;
    highlightEnd = true;
  }

  if (
    perf &&
    start &&
    end &&
    isYmd(perf) &&
    isYmd(start) &&
    isYmd(end) &&
    ymdCompare(end, start) >= 0 &&
    (ymdCompare(perf, start) < 0 || ymdCompare(perf, end) > 0)
  ) {
    messages.push('Single performance day must fall within the selected start and end range.');
    highlightPerf = true;
    highlightStart = true;
    highlightEnd = true;
  }

  return {
    ok: messages.length === 0,
    messages,
    highlightAsOf,
    highlightPerf,
    highlightStart,
    highlightEnd,
  };
}
