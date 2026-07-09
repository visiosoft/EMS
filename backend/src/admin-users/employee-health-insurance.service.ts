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
    const contactId = await this.resolveContactIdByEmail(email);
    return this.loadHealthInsuranceForContact(contactId);
  }

  /**
   * Same data as {@link getHealthInsurance}, but resolved from an already-known
   * ContactID instead of re-deriving it from email. Callers that already resolved the
   * contact (e.g. the Company Hub profile, which looks contacts up by ContactID) should
   * use this so a blank/stale ContactInfo.Email never masks otherwise-available data.
   */
  async getHealthInsuranceByContactId(
    contactId: number,
  ): Promise<EmployeeHealthInsuranceResponse> {
    return this.loadHealthInsuranceForContact(contactId);
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

    const contactId = await this.resolveContactIdByEmail(email);

    const hasTable = await this.tableExists('EmployeeHealthInsurance');
    if (!hasTable) {
      throw new BadRequestException(
        'EmployeeHealthInsurance table does not exist yet. Run the migration SQL first.',
      );
    }

    // EmployeeHealthInsurance is a wide table: one row per employee with a
    // Medical/Dental/Vision column triplet per insurance type. 'Health' (the API/UI
    // label) maps to the 'Medical' column prefix.
    const prefix = dto.insuranceType === 'Health' ? 'Medical' : dto.insuranceType;
    const electionStatus = (dto.optInStatus ?? '').toLowerCase().includes('opt-in')
      ? 'Enrolled'
      : 'Waived';

    await this.dataSource.transaction(async (manager) => {
      const existing = await manager.query(
        `SELECT EmployeeHealthInsuranceID FROM dbo.EmployeeHealthInsurance WHERE ContactID = @0`,
        [contactId],
      );

      if (existing.length > 0) {
        await manager.query(
          `
          UPDATE dbo.EmployeeHealthInsurance
          SET ${prefix}HealthPlanID   = @0,
              ${prefix}CoverageTier   = @1,
              ${prefix}ElectionStatus = @2
          WHERE ContactID = @3
          `,
          [dto.healthPlanId ?? null, nullableText(dto.additionalInsureds), electionStatus, contactId],
        );
      } else {
        await manager.query(
          `
          INSERT INTO dbo.EmployeeHealthInsurance
            (ContactID, ${prefix}HealthPlanID, ${prefix}CoverageTier, ${prefix}ElectionStatus,
             TenureTier, EffectiveDate, CreatedAt)
          VALUES
            (@0, @1, @2, @3, 'Unknown', CAST(GETUTCDATE() AS date), SYSUTCDATETIME())
          `,
          [contactId, dto.healthPlanId ?? null, nullableText(dto.additionalInsureds), electionStatus],
        );
      }
    });

    return this.loadHealthInsuranceForContact(contactId);
  }

  // ─── Private Loaders ────────────────────────────────────────────────────────

  private async resolveContactIdByEmail(email: string): Promise<number> {
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

    return readNumber(contactRows[0], 'contactId', 'ContactID') ?? 0;
  }

  private async loadHealthInsuranceForContact(
    contactId: number,
  ): Promise<EmployeeHealthInsuranceResponse> {
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

    // 3. Load the employee's current election row. EmployeeHealthInsurance is a wide
    //    table: one row per employee with Medical/Dental/Vision column triplets
    //    (HealthPlanID, CoverageTier, ElectionStatus, DeductionPerPayPeriod) rather than
    //    one row per insurance type — mirror that shape when building `elections`.
    let elections: InsuranceElection[] = [];
    let companyContribPP = 0;
    if (hasElectionTable) {
      const rows = await this.dataSource.query(
        `SELECT TOP 1 * FROM dbo.EmployeeHealthInsurance WHERE ContactID = @0 ORDER BY EffectiveDate DESC`,
        [contactId],
      );
      const row = rows[0] as Record<string, unknown> | undefined;

      if (row) {
        const planIds = [
          readNumber(row, 'MedicalHealthPlanID'),
          readNumber(row, 'DentalHealthPlanID'),
          readNumber(row, 'VisionHealthPlanID'),
        ].filter((id): id is number => id != null);

        const planInfo = new Map<number, { planName: string }>();
        if (hasPlanTable && planIds.length > 0) {
          const placeholders = planIds.map((_, i) => `@${i}`).join(', ');
          const planRows = await this.dataSource.query(
            `SELECT HealthPlanID, PlanName FROM dbo.HealthPlan WHERE HealthPlanID IN (${placeholders})`,
            planIds,
          );
          for (const p of planRows as Record<string, unknown>[]) {
            const pid = readNumber(p, 'HealthPlanID');
            if (pid != null) planInfo.set(pid, { planName: readString(p, 'PlanName') });
          }
        }

        // API label 'Health' matches what the frontend (EMS + Hub) already expects for
        // the medical election, even though the DB column prefix/PlanType is 'Medical'.
        const TYPE_COLUMNS = [
          { apiType: 'Health', prefix: 'Medical' },
          { apiType: 'Dental', prefix: 'Dental' },
          { apiType: 'Vision', prefix: 'Vision' },
        ] as const;

        for (const { apiType, prefix } of TYPE_COLUMNS) {
          const healthPlanId = readNumber(row, `${prefix}HealthPlanID`);
          const coverageTier = readString(row, `${prefix}CoverageTier`);
          const status = readString(row, `${prefix}ElectionStatus`);
          const deduction = Number(row[`${prefix}DeductionPerPayPeriod`] ?? 0);

          const election: InsuranceElection = {
            insuranceType: apiType,
            optInStatus: status.toLowerCase() === 'enrolled' ? 'Opt-In' : status ? 'Opt-Out' : '',
            healthPlanId,
            planName: healthPlanId != null ? planInfo.get(healthPlanId)?.planName ?? '' : '',
            additionalInsureds: coverageTier,
            planPrice: '',
            planBenefits: '',
            monthlyRate: '',
            payrollDeduction:
              status.toLowerCase() === 'enrolled' ? `$${deduction.toFixed(2)}/pay period` : '',
          };

          if (healthPlanId != null && hasPricingTable) {
            const pricingCoverageType = mapToPricingCoverageType(coverageTier);
            const priceRows = await this.dataSource.query(
              `SELECT TOP 1 MonthlyPremium FROM dbo.HealthPlanPricing
               WHERE HealthPlanID = @0
                 AND CoverageType = @1
                 AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
               ORDER BY EffectiveDate DESC`,
              [healthPlanId, pricingCoverageType],
            );
            if (priceRows.length > 0) {
              const monthly = Number(priceRows[0].MonthlyPremium ?? 0);
              election.planPrice = `$${monthly.toFixed(2)}/mo`;
              election.monthlyRate = `$${monthly.toFixed(2)}/mo`;
              // Company's share of the monthly premium, per pay period (26/yr).
              const empPP = (monthly * 12) / 26;
              if (election.optInStatus === 'Opt-In' && empPP > deduction) {
                companyContribPP += empPP - deduction;
              }
            }

            if (hasBenefitTable) {
              const benefitRows = await this.dataSource.query(
                `SELECT BenefitDescription FROM dbo.HealthPlanBenefit
                 WHERE HealthPlanID = @0 ORDER BY SortOrder`,
                [healthPlanId],
              );
              election.planBenefits = benefitRows
                .map((b: Record<string, unknown>) => String(b.BenefitDescription ?? '').trim())
                .filter(Boolean)
                .join('; ');
            }

            // Fallback: derive benefits from pricing table if no dedicated benefits exist
            if (!election.planBenefits) {
              const pricingBenefitRows = await this.dataSource.query(
                `SELECT CoverageType, MonthlyPremium FROM dbo.HealthPlanPricing
                 WHERE HealthPlanID = @0
                   AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
                 ORDER BY CoverageType`,
                [healthPlanId],
              );
              const seen = new Set<string>();
              const items: string[] = [];
              for (const r of pricingBenefitRows as Record<string, unknown>[]) {
                const ct = String(r.CoverageType ?? '').trim();
                const mp = Number(r.MonthlyPremium ?? 0);
                const key = `${ct}|${mp}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  items.push(`${ct}: $${mp.toFixed(2)}/mo`);
                }
              }
              election.planBenefits = items.join('; ');
            }
          }

          elections.push(election);
        }
      }
    }

    // 4. Load available plans with benefits and pricing
    let plans: HealthPlanOption[] = [];
    if (hasPlanTable) {
      const planRows = await this.dataSource.query(
        `SELECT HealthPlanID AS healthPlanId, PlanName AS planName, PlanType AS planType
         FROM dbo.HealthPlan
         WHERE (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
         ORDER BY PlanType, PlanName`,
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

/**
 * EmployeeHealthInsurance.*CoverageTier stores "Employee Only" for single coverage,
 * but HealthPlanPricing.CoverageType uses plain "Employee" for the same tier — every
 * other tier ("Employee + Spouse", "Employee + Children", "Family") matches as-is.
 */
function mapToPricingCoverageType(coverageTier: string): string {
  const tier = coverageTier.trim();
  return tier === 'Employee Only' ? 'Employee' : tier || 'Employee';
}
