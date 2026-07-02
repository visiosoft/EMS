import { describe, expect, it } from 'vitest';
import { calculateRoyalties, getAscapRate, type RoyaltiesCalculationInput } from './royaltiesCalculation';

function baseInput(overrides: Partial<RoyaltiesCalculationInput> = {}): RoyaltiesCalculationInput {
  return {
    totalSeatingCapacity: 10000,
    grossPotential: 100000,
    mostRecentPaidTicketQuantity: 5000,
    tourAscap: true,
    tourBmi: true,
    tourSesac: true,
    tourGmr: true,
    ...overrides,
  };
}

describe('getAscapRate', () => {
  it('applies 0.80% at exactly 2,500', () => {
    expect(getAscapRate(2500).rate).toBe(0.008);
  });

  it('drops to 0.40% at 2,501', () => {
    expect(getAscapRate(2501).rate).toBe(0.004);
  });

  it('applies 0.40% at exactly 5,000', () => {
    expect(getAscapRate(5000).rate).toBe(0.004);
  });

  it('drops to 0.25% at 5,001', () => {
    expect(getAscapRate(5001).rate).toBe(0.0025);
  });

  it('applies 0.25% at exactly 10,000', () => {
    expect(getAscapRate(10000).rate).toBe(0.0025);
  });

  it('drops to 0.20% at 10,001', () => {
    expect(getAscapRate(10001).rate).toBe(0.002);
  });

  it('applies 0.20% at exactly 25,000', () => {
    expect(getAscapRate(25000).rate).toBe(0.002);
  });

  it('drops to 0.10% at 25,001', () => {
    expect(getAscapRate(25001).rate).toBe(0.001);
  });

  it('applies 0.10% for a very large capacity', () => {
    expect(getAscapRate(100000).rate).toBe(0.001);
  });
});

describe('calculateRoyalties — ASCAP', () => {
  it('calculates using the correct tier and rounds to 2 decimals', () => {
    const r = calculateRoyalties(baseInput({ totalSeatingCapacity: 5001, grossPotential: 123456.789 }));
    expect(r.ascap.applicable).toBe(true);
    expect(r.ascap.amount).toBe(308.64); // 0.0025 * 123456.789 = 308.641975 -> 308.64
    expect(r.ascap.tierLabel).toContain('0.25%');
  });

  it('is not applicable when tourAscap is false', () => {
    const r = calculateRoyalties(baseInput({ tourAscap: false }));
    expect(r.ascap).toEqual({ applicable: false, amount: null, tierLabel: null, formula: null });
  });

  it('is not applicable when tourAscap is null', () => {
    const r = calculateRoyalties(baseInput({ tourAscap: null }));
    expect(r.ascap.applicable).toBe(false);
  });

  it('is not applicable when grossPotential is missing', () => {
    const r = calculateRoyalties(baseInput({ grossPotential: null }));
    expect(r.ascap.applicable).toBe(false);
  });

  it('is not applicable when totalSeatingCapacity is missing', () => {
    const r = calculateRoyalties(baseInput({ totalSeatingCapacity: null }));
    expect(r.ascap.applicable).toBe(false);
  });
});

describe('calculateRoyalties — formula strings', () => {
  it('shows a generic ASCAP formula label with the applied tier percentage', () => {
    const r = calculateRoyalties(baseInput({ totalSeatingCapacity: 5000, grossPotential: 212884 }));
    expect(r.ascap.formula).toBe('Calculation = Sellable Capacity × Gross Potential × 0.40%');
  });

  it('shows a different ASCAP tier percentage for a different capacity band', () => {
    const r = calculateRoyalties(baseInput({ totalSeatingCapacity: 2500 }));
    expect(r.ascap.formula).toBe('Calculation = Sellable Capacity × Gross Potential × 0.80%');
  });

  it('shows a generic BMI formula label', () => {
    const r = calculateRoyalties(baseInput({ grossPotential: 212884 }));
    expect(r.bmi.formula).toBe('Calculation = Gross Potential × 0.8%');
  });

  it('shows a generic SESAC formula label', () => {
    const r = calculateRoyalties(baseInput({ mostRecentPaidTicketQuantity: 1324 }));
    expect(r.sesac.formula).toBe('Calculation = Paid Ticket Quantity × $0.0327');
  });

  it('has no formula when a line is not applicable', () => {
    const r = calculateRoyalties(baseInput({ tourBmi: false }));
    expect(r.bmi.formula).toBeNull();
  });

  it('has no formula for GMR', () => {
    const r = calculateRoyalties(baseInput({ tourGmr: true }));
    expect(r.gmr.formula).toBeNull();
  });
});

describe('calculateRoyalties — BMI', () => {
  it('applies a flat 0.8% of gross potential', () => {
    const r = calculateRoyalties(baseInput({ grossPotential: 50000 }));
    expect(r.bmi.applicable).toBe(true);
    expect(r.bmi.amount).toBe(400); // 0.008 * 50000
  });

  it('is not applicable when tourBmi is false', () => {
    const r = calculateRoyalties(baseInput({ tourBmi: false }));
    expect(r.bmi.applicable).toBe(false);
    expect(r.bmi.amount).toBeNull();
  });
});

describe('calculateRoyalties — SESAC', () => {
  it('calculates per paid ticket from the most recent daily sales entry', () => {
    const r = calculateRoyalties(baseInput({ mostRecentPaidTicketQuantity: 1000 }));
    expect(r.sesac.applicable).toBe(true);
    expect(r.sesac.amount).toBe(32.7); // 0.0327 * 1000
  });

  it('is not applicable when tourSesac is false', () => {
    const r = calculateRoyalties(baseInput({ tourSesac: false }));
    expect(r.sesac.applicable).toBe(false);
  });

  it('is not applicable when there is no daily sales entry', () => {
    const r = calculateRoyalties(baseInput({ mostRecentPaidTicketQuantity: null }));
    expect(r.sesac.applicable).toBe(false);
  });
});

describe('calculateRoyalties — GMR', () => {
  it('is never calculated, even when registered', () => {
    const r = calculateRoyalties(baseInput({ tourGmr: true }));
    expect(r.gmr.applicable).toBe(false);
    expect(r.gmr.amount).toBeNull();
    expect(r.gmr.tierLabel).toMatch(/not calculated/i);
  });

  it('is never calculated when not registered', () => {
    const r = calculateRoyalties(baseInput({ tourGmr: false }));
    expect(r.gmr.applicable).toBe(false);
    expect(r.gmr.amount).toBeNull();
  });
});

describe('calculateRoyalties — totalRoyalties', () => {
  it('sums only applicable ASCAP/BMI/SESAC amounts and excludes GMR', () => {
    const r = calculateRoyalties(baseInput({
      totalSeatingCapacity: 2500,
      grossPotential: 100000,
      mostRecentPaidTicketQuantity: 2000,
    }));
    // ASCAP: 0.008 * 100000 = 800; BMI: 0.008 * 100000 = 800; SESAC: 0.0327 * 2000 = 65.4
    expect(r.totalRoyalties).toBe(1665.4);
  });

  it('excludes non-applicable lines from the total', () => {
    const r = calculateRoyalties(baseInput({ tourAscap: false, tourGmr: true }));
    // BMI: 800; SESAC: 0.0327 * 5000 = 163.5
    expect(r.totalRoyalties).toBe(963.5);
  });

  it('is null when nothing is applicable', () => {
    const r = calculateRoyalties(baseInput({ tourAscap: false, tourBmi: false, tourSesac: false }));
    expect(r.totalRoyalties).toBeNull();
  });
});
