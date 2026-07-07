import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { AuditRequestContext } from '../audit/audit-request-context.service';

// ─── Response / DTO Types ─────────────────────────────────────────────────────

export type InsuranceElection = {
  insuranceType: string;
  optInStatus: string;
  healthPlanId: number | null;
  planName: string;
  additionalInsureds: string;
  planPrice: string;
  planBenefits: string;
  monthlyRate: string;
  payrollDeduction: string;
};

export type HealthPlanPricingInfo = {
  coverageType: string;
  monthlyPremium: number;
};

export type HealthPlanOption = {
  healthPlanId: number;
  planName: string;
  planType: string;
  benefits: string[];
  pricing: HealthPlanPricingInfo[];
};

export type EmployeeHealthInsuranceResponse = {
  contactId: number;
  insuranceEligibility: string;
  tenureTier: '<1 yr' | '1+ yr' | null;
  companyContributionPerPayPeriod: number;
  elections: InsuranceElection[];
  plans: HealthPlanOption[];
};

export class UpdateEmployeeHealthInsuranceDto {
  @IsString()
  insuranceType!: string;   // 'Health' | 'Dental' | 'Vision'
  @IsOptional() @IsString()
  optInStatus?: string | null;         // 'Opt-In' | 'Opt-Out'
  @IsOptional() @IsNumber()
  healthPlanId?: number | null;
  @IsOptional() @IsString()
  additionalInsureds?: string | null;  // 'Spouse' | 'Child' | 'Family' | 'N/A' (Health only)
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class EmployeeHealthInsuranceService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditContext: AuditRequestContext,
  ) {}

  async getHealthInsurance(
    userEmail: string,
  ): Promise<EmployeeHealthInsuranceResponse> {
    const email = normalizeEmail(userEmail);
    if (!email) {
      throw new BadRequestException('A valid email address is required.');
    }
    return this.loadHealthInsurance(email);
  }

  async updateHealthInsurance(
    userEmail: string,
    dto: UpdateEmployeeHealthInsuranceDto,
  ): Promise<EmployeeHealthInsuranceResponse> {
    const email = normalizeEmail(userEmail);
    if (!email) {
      throw new BadRequestException('A valid email address is required.');
    }
    if (!dto.insuranceType || !['Health', 'Dental', 'Vision'].includes(dto.insuranceType)) {
      throw new BadRequestException('insuranceType must be Health, Dental, or Vision.');
    }

    const current = await this.loadHealthInsurance(email);
    const modifiedBy = this.auditContext.getUserEmail() ?? 'health-insurance';

    const hasTable = await this.tableExists('EmployeeHealthInsurance');
    if (!hasTable) {
      throw new BadRequestException(
        'EmployeeHealthInsurance table does not exist yet. Run the migration SQL first.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const existing = await manager.query(
        `SELECT 1 AS found FROM dbo.EmployeeHealthInsurance
         WHERE ContactID = @0 AND InsuranceType = @1`,
        [current.contactId, dto.insuranceType],
      );

      if (existing.length > 0) {
        await manager.query(
          `
          UPDATE dbo.EmployeeHealthInsurance
          SET OptInStatus        = @0,
              HealthPlanID       = @1,
              AdditionalInsureds = @2,
              UpdatedBy          = @3,
              UpdatedAt          = SYSUTCDATETIME()
          WHERE ContactID = @4 AND InsuranceType = @5
          `,
          [
            nullableText(dto.optInStatus),
            dto.healthPlanId ?? null,
            nullableText(dto.additionalInsureds),
            modifiedBy,
            current.contactId,
            dto.insuranceType,
          ],
        );
      } else {
        await manager.query(
          `
          INSERT INTO dbo.EmployeeHealthInsurance
            (ContactID, InsuranceType, OptInStatus, HealthPlanID, AdditionalInsureds,
             CreatedBy, CreatedAt, UpdatedBy, UpdatedAt)
          VALUES
            (@0, @1, @2, @3, @4, @5, SYSUTCDATETIME(), @5, SYSUTCDATETIME())
          `,
          [
            current.contactId,
            dto.insuranceType,
            nullableText(dto.optInStatus),
            dto.healthPlanId ?? null,
            nullableText(dto.additionalInsureds),
            modifiedBy,
          ],
        );
      }
    });

    return this.loadHealthInsurance(email);
  }

  // ─── Private Loaders ────────────────────────────────────────────────────────

  private async loadHealthInsurance(
    email: string,
  ): Promise<EmployeeHealthInsuranceResponse> {
    // 1. Resolve ContactID
    const contactRows = await this.dataSource.query(
      `
      SELECT TOP 1 c.ContactID AS contactId
      FROM dbo.Contact c
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      INNER JOIN dbo.ContactAssignment ca ON ca.ContactID = c.ContactID
      INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
      WHERE LOWER(LTRIM(RTRIM(ci.Email))) = LOWER(LTRIM(RTRIM(@0)))
      `,
      [email],
    );

    if (contactRows.length === 0) {
      throw new NotFoundException(
        `No internal employee profile found for ${email}. Run Entra → EMS sync first.`,
      );
    }

    const contactId = readNumber(contactRows[0], 'contactId', 'ContactID') ?? 0;

    const hasElectionTable = await this.tableExists('EmployeeHealthInsurance');
    const hasPlanTable = await this.tableExists('HealthPlan');
    const hasPricingTable = await this.tableExists('HealthPlanPricing');
    const hasBenefitTable = await this.tableExists('HealthPlanBenefit');

    // 2. Determine tenure tier and insurance eligibility from StartDate
    let insuranceEligibility = 'Ineligible';
    let tenureTier: '<1 yr' | '1+ yr' | 'ineligible' = 'ineligible';
    const hasEpTable = await this.tableExists('EmployeeProfile');
    if (hasEpTable) {
      const profileRows = await this.dataSource.query(
        `SELECT StartDate FROM dbo.EmployeeProfile WHERE ContactID = @0`,
        [contactId],
      );
      if (profileRows.length > 0 && profileRows[0].StartDate) {
        const start = new Date(profileRows[0].StartDate);
        if (!isNaN(start.getTime())) {
          const today = new Date();
          const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 365) {
            insuranceEligibility = 'Eligible – Full Coverage';
            tenureTier = '1+ yr';
          } else if (diffDays >= 90) {
            insuranceEligibility = 'Eligible – 50% Coverage';
            tenureTier = '<1 yr';
          }
        }
      }
    }

    // 3. Compute company contribution per pay period from HMO Employee base.
    //    Pricing table stores the employee cost AFTER company contribution.
    //    HMO "Employee (<1 yr)" monthly = 50% of full HMO Employee premium.
    //    Company at  50% = that value * 12/26  (per pay period).
    //    Company at 100% = that value * 2 * 12/26 (per pay period).
    let companyContribPP = 0;
    if (tenureTier !== 'ineligible' && hasPricingTable && hasPlanTable) {
      const hmoRows = await this.dataSource.query(
        `SELECT TOP 1 hpp.MonthlyPremium
         FROM dbo.HealthPlanPricing hpp
         INNER JOIN dbo.HealthPlan hp ON hp.HealthPlanID = hpp.HealthPlanID
         WHERE hp.PlanType = 'Health'
           AND hp.PlanName LIKE '%HMO%'
           AND hp.PlanName NOT LIKE '%PPO%'
           AND hpp.CoverageType = 'Employee (<1 yr)'
           AND hp.IsActive = 1
           AND (hpp.EndDate IS NULL OR hpp.EndDate >= CAST(GETUTCDATE() AS date))
         ORDER BY hpp.EffectiveDate DESC`,
      );
      if (hmoRows.length > 0) {
        const hmoBase = Number(hmoRows[0].MonthlyPremium ?? 0);
        companyContribPP = tenureTier === '1+ yr'
          ? (hmoBase * 2 * 12) / 26   // 100% of full HMO Employee
          : (hmoBase * 12) / 26;       // 50% of full HMO Employee
      }
    }

    // 4. Load elections and enrich with pricing / benefits
    let elections: InsuranceElection[] = [];
    if (hasElectionTable) {
      const electionRows = await this.dataSource.query(
        `
        SELECT
          ehi.InsuranceType AS insuranceType,
          COALESCE(ehi.OptInStatus, '') AS optInStatus,
          ehi.HealthPlanID AS healthPlanId,
          COALESCE(hp.PlanName, '') AS planName,
          COALESCE(ehi.AdditionalInsureds, '') AS additionalInsureds
        FROM dbo.EmployeeHealthInsurance ehi
        ${hasPlanTable ? 'LEFT JOIN dbo.HealthPlan hp ON hp.HealthPlanID = ehi.HealthPlanID' : ''}
        WHERE ehi.ContactID = @0
        ORDER BY ehi.InsuranceType
        `,
        [contactId],
      );

      elections = electionRows.map((r: Record<string, unknown>) => {
        const planId = readNumber(r, 'healthPlanId', 'HealthPlanID');
        return {
          insuranceType: readString(r, 'insuranceType', 'InsuranceType'),
          optInStatus: readString(r, 'optInStatus', 'OptInStatus'),
          healthPlanId: planId,
          planName: readString(r, 'planName', 'PlanName'),
          additionalInsureds: readString(r, 'additionalInsureds', 'AdditionalInsureds'),
          planPrice: '',
          planBenefits: '',
          monthlyRate: '',
          payrollDeduction: '',
        };
      });

      for (const election of elections) {
        if (!election.healthPlanId) continue;

        if (hasPricingTable) {
          const isHealth = election.insuranceType === 'Health';
          const coverageType = mapToCoverageType(
            election.additionalInsureds,
            isHealth ? tenureTier : null,
          );
          const priceRows = await this.dataSource.query(
            `SELECT TOP 1 MonthlyPremium FROM dbo.HealthPlanPricing
             WHERE HealthPlanID = @0
               AND CoverageType = @1
               AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
             ORDER BY EffectiveDate DESC`,
            [election.healthPlanId, coverageType],
          );
          if (priceRows.length > 0) {
            const empMonthly = Number(priceRows[0].MonthlyPremium ?? 0);
            const empPP = (empMonthly * 12) / 26;

            // Plan Price and Monthly Rate both show MonthlyPremium from pricing table
            election.planPrice = `$${empMonthly.toFixed(2)}/mo`;
            election.monthlyRate = `$${empMonthly.toFixed(2)}/mo`;
            // Payroll Deduction = per pay period cost
            election.payrollDeduction = `$${empPP.toFixed(2)}/pay period`;
          }
        }

        if (hasBenefitTable) {
          const benefitRows = await this.dataSource.query(
            `SELECT BenefitDescription FROM dbo.HealthPlanBenefit
             WHERE HealthPlanID = @0 ORDER BY SortOrder`,
            [election.healthPlanId],
          );
          election.planBenefits = benefitRows
            .map((b: Record<string, unknown>) => String(b.BenefitDescription ?? '').trim())
            .filter(Boolean)
            .join('; ');
        }

        // Fallback: derive benefits from pricing table if no dedicated benefits exist
        if (!election.planBenefits && hasPricingTable) {
          const pricingBenefitRows = await this.dataSource.query(
            `SELECT CoverageType, MonthlyPremium FROM dbo.HealthPlanPricing
             WHERE HealthPlanID = @0
               AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
             ORDER BY CoverageType`,
            [election.healthPlanId],
          );
          const seen = new Set<string>();
          const items: string[] = [];
          for (const row of pricingBenefitRows as Record<string, unknown>[]) {
            const ct = String(row.CoverageType ?? '').trim();
            const mp = Number(row.MonthlyPremium ?? 0);
            const key = `${ct}|${mp}`;
            if (!seen.has(key)) {
              seen.add(key);
              items.push(`${ct}: $${mp.toFixed(2)}/mo`);
            }
          }
          election.planBenefits = items.join('; ');
        }
      }
    }

    // 5. Load available plans with benefits and pricing
    let plans: HealthPlanOption[] = [];
    if (hasPlanTable) {
      const planRows = await this.dataSource.query(
        `SELECT HealthPlanID AS healthPlanId, PlanName AS planName, PlanType AS planType
         FROM dbo.HealthPlan WHERE IsActive = 1 ORDER BY PlanType, PlanName`,
      );

      // Load benefits per plan
      let benefitsByPlan = new Map<number, string[]>();
      if (hasBenefitTable) {
        const benefitRows = await this.dataSource.query(
          `SELECT HealthPlanID, BenefitDescription FROM dbo.HealthPlanBenefit ORDER BY HealthPlanID, SortOrder`,
        );
        for (const b of benefitRows as Record<string, unknown>[]) {
          const pid = readNumber(b, 'HealthPlanID') ?? 0;
          const desc = String(b.BenefitDescription ?? '').trim();
          if (!benefitsByPlan.has(pid)) benefitsByPlan.set(pid, []);
          if (desc) benefitsByPlan.get(pid)!.push(desc);
        }
      }

      // Load pricing per plan
      let pricingByPlan = new Map<number, { coverageType: string; monthlyPremium: number }[]>();
      if (hasPricingTable) {
        const pricingRows = await this.dataSource.query(
          `SELECT DISTINCT HealthPlanID, CoverageType, MonthlyPremium
           FROM dbo.HealthPlanPricing
           WHERE (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
           ORDER BY HealthPlanID, CoverageType`,
        );
        for (const p of pricingRows as Record<string, unknown>[]) {
          const pid = readNumber(p, 'HealthPlanID') ?? 0;
          const ct = String(p.CoverageType ?? '').trim();
          const mp = Number(p.MonthlyPremium ?? 0);
          if (!pricingByPlan.has(pid)) pricingByPlan.set(pid, []);
          pricingByPlan.get(pid)!.push({ coverageType: ct, monthlyPremium: mp });
        }
      }

      plans = planRows.map((r: Record<string, unknown>) => {
        const pid = readNumber(r, 'healthPlanId', 'HealthPlanID') ?? 0;
        let benefits = benefitsByPlan.get(pid) ?? [];
        // Fallback: derive benefits from pricing if no dedicated benefit rows exist
        if (benefits.length === 0) {
          const pricing = pricingByPlan.get(pid) ?? [];
          benefits = pricing.map((p) => `${p.coverageType}: $${p.monthlyPremium.toFixed(2)}/mo`);
        }
        return {
          healthPlanId: pid,
          planName: readString(r, 'planName', 'PlanName'),
          planType: readString(r, 'planType', 'PlanType'),
          benefits,
          pricing: pricingByPlan.get(pid) ?? [],
        };
      });
    }

    return {
      contactId,
      insuranceEligibility,
      tenureTier: tenureTier === 'ineligible' ? null : tenureTier,
      companyContributionPerPayPeriod: companyContribPP,
      elections,
      plans,
    };
  }

  private async tableExists(tableName: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT 1 AS found FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @0`,
      [tableName],
    );
    return rows.length > 0;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeEmail(value: string | null | undefined): string {
  const email = cleanText(value).toLowerCase();
  return email.includes('@') ? email : '';
}

function cleanText(value: string | null | undefined): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function nullableText(value: string | null | undefined): string | null {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function readString(
  row: Record<string, unknown> | undefined,
  ...keys: string[]
): string {
  if (!row) return '';
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return cleanText(String(value));
  }
  return '';
}

function readNumber(
  row: Record<string, unknown> | undefined,
  ...keys: string[]
): number | null {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }
  return null;
}

function mapToCoverageType(
  additionalInsureds: string,
  tenureTier: '<1 yr' | '1+ yr' | 'ineligible' | null,
): string {
  let base: string;
  switch (additionalInsureds) {
    // Legacy stored values (backward compat)
    case 'Spouse':
      base = 'Employee + Spouse';
      break;
    case 'Child':
    case 'Children':
      base = 'Employee + Child(ren)';
      break;
    case 'Family':
      base = 'Employee + Family';
      break;
    case 'N/A':
    case '':
      base = 'Employee';
      break;
    default:
      // New: base coverage type stored directly from pricing table
      // e.g. "Employee", "Employee + Spouse", "Employee + Child(ren)",
      //      "Family", "Employee + Family"
      base = additionalInsureds;
      break;
  }
  // Health plans use tenure-suffixed coverage types; Dental/Vision do not
  if (tenureTier && tenureTier !== 'ineligible') {
    return `${base} (${tenureTier})`;
  }
  return base;
}
