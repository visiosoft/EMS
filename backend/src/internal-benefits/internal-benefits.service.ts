import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';

/** Pay periods per year — biweekly payroll. */
const PAY_PERIODS_PER_YEAR = 26;

export type TenureTier = '<1 yr' | '1+ yr';

export type BenefitPlanPricingRow = {
  coverageType: string;
  monthlyPremium: number;
};

export type BenefitPlanContributionRow = {
  tenureTier: string;
  employerContributionPct: number;
};

export type BenefitPlanRow = {
  healthPlanId: number;
  planName: string;
  planType: string;
  carrierName: string;
  planCode: string | null;
  pricing: BenefitPlanPricingRow[];
  contributionRules: BenefitPlanContributionRow[];
};

export type MyInsuranceElection = {
  insuranceType: string;
  optInStatus: string | null;
  /** Coverage tier as elected, e.g. "Employee + Family". */
  coverageTier: string | null;
  healthPlanId: number | null;
  planName: string | null;
  carrierName: string | null;
  /** Premium matched to the elected tier + tenure bucket; null when no confident match. */
  monthlyPremium: number | null;
  /** As stored on dbo.EmployeeHealthInsurance — the authoritative payroll figure. */
  deductionPerPayPeriod: number | null;
  /** Employer share for this plan at the employee's tenure, from dbo.HealthPlanContributionRule. */
  employerContributionPct: number | null;
  /** Derived: what the premium costs per pay period, less what the employee is deducted. */
  employerContributionPerPayPeriod: number | null;
  /** All current pricing rows for the elected plan (fallback when no premium match). */
  pricing: BenefitPlanPricingRow[];
};

export type MyInsuranceResponse = {
  /** True when the signed-in user has no linked internal contact. */
  noProfile: boolean;
  /** Tenure bucket recorded on the election row; drives tenure-based pricing. */
  tenureTier: TenureTier | null;
  elections: MyInsuranceElection[];
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * dbo.EmployeeHealthInsurance.TenureTier is written as "1+ Years" / "Under 1 Year" /
 * "Unknown"; dbo.HealthPlanContributionRule.TenureTier uses "1+ Year" / "Less than 1 year".
 * Both collapse onto the same two buckets. Returns null when the tier is Unknown/unset.
 */
function normalizeTenureTier(raw: unknown): TenureTier | null {
  const tier = String(raw ?? '').trim().toLowerCase();
  if (!tier || tier === 'unknown') return null;
  if (tier.startsWith('1+')) return '1+ yr';
  if (tier.startsWith('<1') || tier.includes('under 1') || tier.includes('less than 1')) {
    return '<1 yr';
  }
  return null;
}

/** Pick the employer-contribution rule row matching the employee's tenure bucket. */
function matchContributionPct(
  rules: BenefitPlanContributionRow[],
  tenureTier: TenureTier | null,
): number | null {
  if (!tenureTier || rules.length === 0) return null;
  const match = rules.find((rule) => {
    const tier = rule.tenureTier.trim().toLowerCase();
    if (tenureTier === '1+ yr') return tier.startsWith('1+');
    return tier.includes('less than') || tier.includes('under') || tier.startsWith('<1');
  });
  return match ? match.employerContributionPct : null;
}

@Injectable()
export class InternalBenefitsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditContext: AuditRequestContext,
  ) {}

  private async resolveContactIdForSignedInUser(): Promise<number | null> {
    const email = this.auditContext.getUserEmail()?.trim().toLowerCase();
    if (!email) return null;
    const rows = (await this.dataSource.query(
      `
      SELECT MIN(c.ContactID) AS contactId
      FROM dbo.Contact c
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      INNER JOIN dbo.ContactAssignment ca ON ca.ContactID = c.ContactID
      INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
      WHERE LOWER(LTRIM(RTRIM(ci.Email))) = @0
      `,
      [email],
    )) as Array<{ contactId: number | null }>;
    const id = Number(rows?.[0]?.contactId);
    return Number.isFinite(id) && id >= 1 ? id : null;
  }

  private async loadCurrentPricing(healthPlanIds: number[]): Promise<Map<number, BenefitPlanPricingRow[]>> {
    const byPlan = new Map<number, BenefitPlanPricingRow[]>();
    if (healthPlanIds.length === 0) return byPlan;
    const rows = (await this.dataSource.query(
      `
      SELECT hpp.HealthPlanID AS healthPlanId,
             hpp.CoverageType AS coverageType,
             hpp.MonthlyPremium AS monthlyPremium
      FROM dbo.HealthPlanPricing hpp
      WHERE hpp.HealthPlanID IN (${healthPlanIds.map((_, i) => `@${i}`).join(', ')})
        AND hpp.EffectiveDate <= GETDATE()
        AND (hpp.EndDate IS NULL OR hpp.EndDate >= GETDATE())
      ORDER BY hpp.HealthPlanID, hpp.CoverageType
      `,
      healthPlanIds,
    )) as Array<{ healthPlanId: number; coverageType: string; monthlyPremium: unknown }>;
    const seen = new Set<string>();
    for (const row of rows) {
      const planId = Number(row.healthPlanId);
      const coverageType = String(row.coverageType ?? '').trim();
      const monthlyPremium = toNumber(row.monthlyPremium);
      // Seed data contains duplicated pricing rows — keep one per plan+tier.
      const key = `${planId}|${coverageType.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const list = byPlan.get(planId) ?? [];
      list.push({ coverageType, monthlyPremium });
      byPlan.set(planId, list);
    }
    return byPlan;
  }

  private async loadContributionRules(
    healthPlanIds: number[],
  ): Promise<Map<number, BenefitPlanContributionRow[]>> {
    const byPlan = new Map<number, BenefitPlanContributionRow[]>();
    if (healthPlanIds.length === 0) return byPlan;
    const rows = (await this.dataSource.query(
      `
      SELECT hpcr.HealthPlanID AS healthPlanId,
             hpcr.TenureTier AS tenureTier,
             hpcr.EmployerContributionPct AS employerContributionPct
      FROM dbo.HealthPlanContributionRule hpcr
      WHERE hpcr.HealthPlanID IN (${healthPlanIds.map((_, i) => `@${i}`).join(', ')})
        AND (hpcr.EndDate IS NULL OR hpcr.EndDate >= CAST(GETDATE() AS date))
      ORDER BY hpcr.HealthPlanID, hpcr.TenureTier
      `,
      healthPlanIds,
    )) as Array<{ healthPlanId: number; tenureTier: string; employerContributionPct: unknown }>;
    for (const row of rows) {
      const planId = Number(row.healthPlanId);
      const list = byPlan.get(planId) ?? [];
      list.push({
        tenureTier: String(row.tenureTier ?? '').trim(),
        employerContributionPct: toNumber(row.employerContributionPct),
      });
      byPlan.set(planId, list);
    }
    return byPlan;
  }

  /**
   * Pick the pricing row for an elected tier + tenure. CoverageType strings look like
   * "Employee (1+ yr)" / "Employee + Spouse (<1 yr)"; CoverageTier holds the tier
   * ("Employee + Family"). Matching is defensive — null when nothing lines up.
   */
  private matchPremium(
    pricing: BenefitPlanPricingRow[],
    coverageTier: string | null,
    tenureTier: TenureTier | null,
  ): number | null {
    const raw = (coverageTier ?? '').trim();
    // EmployeeHealthInsurance.*CoverageTier stores "Employee Only" for single coverage,
    // but HealthPlanPricing.CoverageType uses plain "Employee" for the same tier.
    const tier = (raw === 'Employee Only' ? 'Employee' : raw).toLowerCase();
    if (!tier) return null;

    const tierRows = pricing.filter((row) => {
      const base = row.coverageType.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase();
      return base === tier;
    });
    if (tierRows.length === 0) return null;
    if (tierRows.length === 1) return tierRows[0].monthlyPremium;

    // Tenure unknown → assume the fully-vested rate, matching matchPricingForTier.
    const marker = tenureTier === '<1 yr' ? '<1' : '1+';
    const matched = tierRows.find((row) => row.coverageType.includes(marker));
    return (matched ?? tierRows[0]).monthlyPremium;
  }

  /**
   * dbo.EmployeeHealthInsurance is a wide table: one row per employee with a
   * Medical/Dental/Vision column triplet (HealthPlanID/CoverageTier/DeductionPerPayPeriod)
   * per insurance type, not one row per election. Mirrors the equivalent unpivot in
   * employee-health-insurance.service.ts.
   */
  private static readonly TYPE_COLUMNS = [
    { apiType: 'Medical', prefix: 'Medical' },
    { apiType: 'Dental', prefix: 'Dental' },
    { apiType: 'Vision', prefix: 'Vision' },
  ] as const;

  async getMyInsurance(): Promise<MyInsuranceResponse> {
    const contactId = await this.resolveContactIdForSignedInUser();
    if (contactId == null) return { noProfile: true, tenureTier: null, elections: [] };

    const electionRows = (await this.dataSource.query(
      `SELECT TOP 1 * FROM dbo.EmployeeHealthInsurance WHERE ContactID = @0 ORDER BY EffectiveDate DESC`,
      [contactId],
    )) as Array<Record<string, unknown>>;

    const electionRow = electionRows?.[0];
    if (!electionRow) return { noProfile: false, tenureTier: null, elections: [] };

    const tenureTier = normalizeTenureTier(electionRow.TenureTier);

    const planIds = [
      ...new Set(
        InternalBenefitsService.TYPE_COLUMNS.map(({ prefix }) =>
          Number(electionRow[`${prefix}HealthPlanID`]),
        ).filter((id) => Number.isFinite(id) && id >= 1),
      ),
    ];

    const [pricingByPlan, contributionsByPlan, planById] = await Promise.all([
      this.loadCurrentPricing(planIds),
      this.loadContributionRules(planIds),
      this.loadPlanDetails(planIds),
    ]);

    const elections: MyInsuranceElection[] = InternalBenefitsService.TYPE_COLUMNS.map(
      ({ apiType, prefix }) => {
        const rawPlanId = Number(electionRow[`${prefix}HealthPlanID`]);
        const healthPlanId = Number.isFinite(rawPlanId) && rawPlanId >= 1 ? rawPlanId : null;
        const rawTier = electionRow[`${prefix}CoverageTier`];
        const coverageTier = rawTier != null ? String(rawTier).trim() : null;
        // No ElectionStatus column — derive from whether PlanID is set
        const optInStatus = healthPlanId != null ? 'Opt-In' : 'Opt-Out';
        const pricing = healthPlanId != null ? pricingByPlan.get(healthPlanId) ?? [] : [];
        const plan = healthPlanId != null ? planById.get(healthPlanId) : undefined;

        const monthlyPremium = this.matchPremium(pricing, coverageTier, tenureTier);
        const deductionPerPayPeriod =
          healthPlanId != null
            ? nullableNumber(electionRow[`${prefix}DeductionPerPayPeriod`])
            : null;
        const employerContributionPct =
          healthPlanId != null
            ? matchContributionPct(contributionsByPlan.get(healthPlanId) ?? [], tenureTier)
            : null;

        // The employer share is whatever the premium costs per pay period beyond the
        // employee's deduction. Derived rather than recomputed from the benchmark rule so
        // this can never disagree with the payroll figure actually stored on the row.
        let employerContributionPerPayPeriod: number | null = null;
        if (monthlyPremium != null && deductionPerPayPeriod != null) {
          const premiumPerPayPeriod = (monthlyPremium * 12) / PAY_PERIODS_PER_YEAR;
          employerContributionPerPayPeriod =
            Math.round(Math.max(premiumPerPayPeriod - deductionPerPayPeriod, 0) * 100) / 100;
        }

        return {
          insuranceType: apiType,
          optInStatus,
          coverageTier,
          healthPlanId,
          planName: plan?.planName ?? null,
          carrierName: plan?.carrierName ?? null,
          monthlyPremium,
          deductionPerPayPeriod,
          employerContributionPct,
          employerContributionPerPayPeriod,
          pricing,
        };
      },
    );

    return { noProfile: false, tenureTier, elections };
  }

  private async loadPlanDetails(
    healthPlanIds: number[],
  ): Promise<Map<number, { planName: string; carrierName: string }>> {
    const byPlan = new Map<number, { planName: string; carrierName: string }>();
    if (healthPlanIds.length === 0) return byPlan;
    const rows = (await this.dataSource.query(
      `SELECT HealthPlanID AS healthPlanId, PlanName AS planName, CarrierName AS carrierName
       FROM dbo.HealthPlan
       WHERE HealthPlanID IN (${healthPlanIds.map((_, i) => `@${i}`).join(', ')})`,
      healthPlanIds,
    )) as Array<{ healthPlanId: number; planName: string; carrierName: string | null }>;
    for (const row of rows) {
      byPlan.set(Number(row.healthPlanId), {
        planName: String(row.planName ?? '').trim(),
        carrierName: String(row.carrierName ?? '').trim(),
      });
    }
    return byPlan;
  }

  async listPlans(): Promise<BenefitPlanRow[]> {
    const planRows = (await this.dataSource.query(
      `SELECT hp.HealthPlanID AS healthPlanId, hp.PlanName AS planName, hp.PlanType AS planType,
              hp.CarrierName AS carrierName, hp.PlanCode AS planCode
       FROM dbo.HealthPlan hp
       WHERE (hp.EndDate IS NULL OR hp.EndDate >= CAST(GETDATE() AS date))
       ORDER BY hp.PlanType, hp.PlanName`,
    )) as Array<{
      healthPlanId: number;
      planName: string;
      planType: string;
      carrierName: string | null;
      planCode: string | null;
    }>;

    const planIds = planRows.map((row) => Number(row.healthPlanId));
    const [pricingByPlan, contributionsByPlan] = await Promise.all([
      this.loadCurrentPricing(planIds),
      this.loadContributionRules(planIds),
    ]);

    return planRows.map((row) => {
      const healthPlanId = Number(row.healthPlanId);
      return {
        healthPlanId,
        planName: String(row.planName ?? '').trim(),
        planType: String(row.planType ?? '').trim(),
        carrierName: String(row.carrierName ?? '').trim(),
        planCode: String(row.planCode ?? '').trim() || null,
        pricing: pricingByPlan.get(healthPlanId) ?? [],
        contributionRules: contributionsByPlan.get(healthPlanId) ?? [],
      };
    });
  }
}
