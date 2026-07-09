import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';

export type BenefitPlanPricingRow = {
  coverageType: string;
  monthlyPremium: number;
};

export type BenefitPlanRow = {
  healthPlanId: number;
  planName: string;
  planType: string;
  benefits: string[];
  pricing: BenefitPlanPricingRow[];
};

export type MyInsuranceElection = {
  insuranceType: string;
  optInStatus: string | null;
  /** Coverage tier as elected, e.g. "Employee + Family". */
  additionalInsureds: string | null;
  healthPlanId: number | null;
  planName: string | null;
  /** Premium matched to the elected tier + tenure bucket; null when no confident match. */
  monthlyPremium: number | null;
  /** All current pricing rows for the elected plan (fallback when no premium match). */
  pricing: BenefitPlanPricingRow[];
};

export type MyInsuranceResponse = {
  /** True when the signed-in user has no linked internal contact. */
  noProfile: boolean;
  /** Employment start date used for tenure-based pricing, when known. */
  startDate: string | null;
  elections: MyInsuranceElection[];
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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

  /**
   * Pick the pricing row for an elected tier + tenure. CoverageType strings look like
   * "Employee (1+ yr)" / "Employee + Spouse (<1 yr)"; AdditionalInsureds holds the tier
   * ("Employee + Family"). Matching is defensive — null when nothing lines up.
   */
  private matchPremium(
    pricing: BenefitPlanPricingRow[],
    additionalInsureds: string | null,
    tenureYears: number | null,
  ): number | null {
    const raw = (additionalInsureds ?? '').trim();
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

    const wantSenior = tenureYears == null || tenureYears >= 1;
    const marker = wantSenior ? '1+' : '<1';
    const matched = tierRows.find((row) => row.coverageType.includes(marker));
    return (matched ?? tierRows[0]).monthlyPremium;
  }

  /**
   * dbo.EmployeeHealthInsurance is a wide table: one row per employee with a
   * Medical/Dental/Vision column triplet (HealthPlanID/CoverageTier/ElectionStatus)
   * per insurance type, not one row per election. 'Health' (the API/UI label) maps to
   * the 'Medical' column prefix. Mirrors the equivalent unpivot in
   * employee-health-insurance.service.ts.
   */
  private static readonly TYPE_COLUMNS = [
    { apiType: 'Health', prefix: 'Medical' },
    { apiType: 'Dental', prefix: 'Dental' },
    { apiType: 'Vision', prefix: 'Vision' },
  ] as const;

  private async tableExists(tableName: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT 1 AS found FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @0`,
      [tableName],
    );
    return rows.length > 0;
  }

  async getMyInsurance(): Promise<MyInsuranceResponse> {
    const contactId = await this.resolveContactIdForSignedInUser();
    if (contactId == null) return { noProfile: true, startDate: null, elections: [] };

    const [profileRows, electionRows] = await Promise.all([
      this.dataSource.query(
        `SELECT TOP 1 CONVERT(varchar(10), ep.StartDate, 120) AS startDate
         FROM dbo.EmployeeProfile ep WHERE ep.ContactID = @0
         ORDER BY ep.EmployeeProfileID DESC`,
        [contactId],
      ) as Promise<Array<{ startDate: string | null }>>,
      this.dataSource.query(
        `SELECT TOP 1 * FROM dbo.EmployeeHealthInsurance WHERE ContactID = @0 ORDER BY EffectiveDate DESC`,
        [contactId],
      ) as Promise<Array<Record<string, unknown>>>,
    ]);

    const startDate = profileRows?.[0]?.startDate ?? null;
    const tenureYears = startDate
      ? (Date.now() - new Date(startDate).getTime()) / (365.25 * 86_400_000)
      : null;

    const electionRow = electionRows?.[0];
    if (!electionRow) return { noProfile: false, startDate, elections: [] };

    const planIds = [
      ...new Set(
        InternalBenefitsService.TYPE_COLUMNS.map(({ prefix }) =>
          Number(electionRow[`${prefix}HealthPlanID`]),
        ).filter((id) => Number.isFinite(id) && id >= 1),
      ),
    ];

    const [pricingByPlan, planNameById] = await Promise.all([
      this.loadCurrentPricing(planIds),
      this.loadPlanNames(planIds),
    ]);

    const elections: MyInsuranceElection[] = InternalBenefitsService.TYPE_COLUMNS.map(
      ({ apiType, prefix }) => {
        const rawPlanId = Number(electionRow[`${prefix}HealthPlanID`]);
        const healthPlanId = Number.isFinite(rawPlanId) && rawPlanId >= 1 ? rawPlanId : null;
        const coverageTier = electionRow[`${prefix}CoverageTier`];
        const additionalInsureds = coverageTier != null ? String(coverageTier).trim() : null;
        const status = electionRow[`${prefix}ElectionStatus`];
        const statusText = status != null ? String(status).trim() : '';
        const optInStatus =
          statusText.toLowerCase() === 'enrolled'
            ? 'Opt-In'
            : statusText
              ? 'Opt-Out'
              : null;
        const pricing = healthPlanId != null ? pricingByPlan.get(healthPlanId) ?? [] : [];
        return {
          insuranceType: apiType,
          optInStatus,
          additionalInsureds,
          healthPlanId,
          planName: healthPlanId != null ? planNameById.get(healthPlanId) ?? null : null,
          monthlyPremium: this.matchPremium(pricing, additionalInsureds, tenureYears),
          pricing,
        };
      },
    );

    return { noProfile: false, startDate, elections };
  }

  private async loadPlanNames(healthPlanIds: number[]): Promise<Map<number, string>> {
    const byPlan = new Map<number, string>();
    if (healthPlanIds.length === 0) return byPlan;
    const rows = (await this.dataSource.query(
      `SELECT HealthPlanID AS healthPlanId, PlanName AS planName FROM dbo.HealthPlan
       WHERE HealthPlanID IN (${healthPlanIds.map((_, i) => `@${i}`).join(', ')})`,
      healthPlanIds,
    )) as Array<{ healthPlanId: number; planName: string }>;
    for (const row of rows) {
      byPlan.set(Number(row.healthPlanId), String(row.planName ?? '').trim());
    }
    return byPlan;
  }

  async listPlans(): Promise<BenefitPlanRow[]> {
    const hasBenefitTable = await this.tableExists('HealthPlanBenefit');

    const [planRows, benefitRows] = await Promise.all([
      this.dataSource.query(
        `SELECT hp.HealthPlanID AS healthPlanId, hp.PlanName AS planName, hp.PlanType AS planType
         FROM dbo.HealthPlan hp
         WHERE (hp.EndDate IS NULL OR hp.EndDate >= CAST(GETDATE() AS date))
         ORDER BY hp.PlanType, hp.PlanName`,
      ) as Promise<Array<{ healthPlanId: number; planName: string; planType: string }>>,
      hasBenefitTable
        ? (this.dataSource.query(
            `SELECT hpb.HealthPlanID AS healthPlanId, hpb.BenefitDescription AS benefitDescription
             FROM dbo.HealthPlanBenefit hpb
             INNER JOIN dbo.HealthPlan hp ON hp.HealthPlanID = hpb.HealthPlanID
               AND (hp.EndDate IS NULL OR hp.EndDate >= CAST(GETDATE() AS date))
             ORDER BY hpb.HealthPlanID, hpb.SortOrder`,
          ) as Promise<Array<{ healthPlanId: number; benefitDescription: string }>>)
        : Promise.resolve([]),
    ]);

    const pricingByPlan = await this.loadCurrentPricing(
      planRows.map((row) => Number(row.healthPlanId)),
    );

    const benefitsByPlan = new Map<number, string[]>();
    for (const row of benefitRows) {
      const list = benefitsByPlan.get(Number(row.healthPlanId)) ?? [];
      const description = String(row.benefitDescription ?? '').trim();
      if (description) list.push(description);
      benefitsByPlan.set(Number(row.healthPlanId), list);
    }

    return planRows.map((row) => {
      const healthPlanId = Number(row.healthPlanId);
      // Fallback: derive a benefits list from pricing when no dedicated benefit rows exist
      // (e.g. dbo.HealthPlanBenefit isn't provisioned yet), so plan cards still show something.
      const benefits =
        benefitsByPlan.get(healthPlanId) ??
        (pricingByPlan.get(healthPlanId) ?? []).map(
          (price) => `${price.coverageType}: $${price.monthlyPremium.toFixed(2)}/mo`,
        );
      return {
        healthPlanId,
        planName: String(row.planName ?? '').trim(),
        planType: String(row.planType ?? '').trim(),
        benefits,
        pricing: pricingByPlan.get(healthPlanId) ?? [],
      };
    });
  }
}
