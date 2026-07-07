/** Per-PRO royalty calculation result. */
export type RoyaltyLineResult = {
  /** false when not registered with this PRO, a required input is missing, or not calculated (GMR). */
  applicable: boolean;
  /** Rounded to 2 decimals; null when not applicable. */
  amount: number | null;
  /** Rate/tier explanation for audit purposes; null when not applicable. */
  tierLabel: string | null;
  /** Human-readable formula showing the arithmetic (e.g. "0.40% × $212,884.00 = $851.54"); null when not applicable. */
  formula: string | null;
};

export type RoyaltiesCalculationInput = {
  /** Sum of sellable seating capacity across all performances in the engagement. */
  totalSeatingCapacity: number | null;
  /** Total gross potential revenue for the engagement. */
  grossPotential: number | null;
  /** ticketsSold from the most recent daily sales entry (by salesDate) for the engagement. */
  mostRecentPaidTicketQuantity: number | null;
  /** dbo.Tour registration flags. */
  tourAscap: boolean | null;
  tourBmi: boolean | null;
  tourSesac: boolean | null;
  tourGmr: boolean | null;
};

export type RoyaltiesCalculationResult = {
  ascap: RoyaltyLineResult;
  bmi: RoyaltyLineResult;
  sesac: RoyaltyLineResult;
  gmr: RoyaltyLineResult;
  /** Sum of applicable ASCAP/BMI/SESAC amounts. GMR is always excluded. Null when none are applicable. */
  totalRoyalties: number | null;
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function fmtPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

const GMR_TIER_LABEL = 'Not calculated — GMR royalty determined outside the portal';

export function getAscapRate(totalSeatingCapacity: number): { rate: number; tierLabel: string } {
  if (totalSeatingCapacity <= 2500) return { rate: 0.008, tierLabel: '0.80% tier applied (capacity ≤ 2,500)' };
  if (totalSeatingCapacity <= 5000) return { rate: 0.004, tierLabel: '0.40% tier applied (capacity 2,501–5,000)' };
  if (totalSeatingCapacity <= 10000) return { rate: 0.0025, tierLabel: '0.25% tier applied (capacity 5,001–10,000)' };
  if (totalSeatingCapacity <= 25000) return { rate: 0.002, tierLabel: '0.20% tier applied (capacity 10,001–25,000)' };
  return { rate: 0.001, tierLabel: '0.10% tier applied (capacity > 25,000)' };
}

export function calculateRoyalties(input: RoyaltiesCalculationInput): RoyaltiesCalculationResult {
  const { totalSeatingCapacity, grossPotential, mostRecentPaidTicketQuantity, tourAscap, tourBmi, tourSesac } = input;

  let ascap: RoyaltyLineResult = { applicable: false, amount: null, tierLabel: null, formula: null };
  if (tourAscap === true && totalSeatingCapacity != null && grossPotential != null) {
    const { rate, tierLabel } = getAscapRate(totalSeatingCapacity);
    const amount = round2(rate * grossPotential);
    ascap = {
      applicable: true,
      amount,
      tierLabel,
      formula: `Calculation = Sellable Capacity × Gross Potential × ${fmtPercent(rate)}`,
    };
  }

  let bmi: RoyaltyLineResult = { applicable: false, amount: null, tierLabel: null, formula: null };
  if (tourBmi === true && grossPotential != null) {
    const amount = round2(0.008 * grossPotential);
    bmi = {
      applicable: true,
      amount,
      tierLabel: '0.80% flat rate applied',
      formula: 'Calculation = Gross Potential × 0.8%',
    };
  }

  let sesac: RoyaltyLineResult = { applicable: false, amount: null, tierLabel: null, formula: null };
  if (tourSesac === true && mostRecentPaidTicketQuantity != null) {
    const amount = round2(0.0327 * mostRecentPaidTicketQuantity);
    sesac = {
      applicable: true,
      amount,
      tierLabel: '$0.0327 per paid ticket applied',
      formula: 'Calculation = Paid Ticket Quantity (based on the most recent daily sales entry) × $0.0327',
    };
  }

  const gmr: RoyaltyLineResult = { applicable: false, amount: null, tierLabel: GMR_TIER_LABEL, formula: null };

  const applicableAmounts = [ascap, bmi, sesac].filter((r) => r.applicable && r.amount != null).map((r) => r.amount as number);
  const totalRoyalties = applicableAmounts.length > 0 ? round2(applicableAmounts.reduce((sum, n) => sum + n, 0)) : null;

  return { ascap, bmi, sesac, gmr, totalRoyalties };
}
