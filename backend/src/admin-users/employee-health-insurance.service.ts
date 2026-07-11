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

export type HealthPlanContributionRuleInfo = {
  tenureTier: string;
  employerContributionPct: number;
};

export type HealthPlanOption = {
  healthPlanId: number;
  planName: string;
  planType: string;
  carrierName: string;
  planCode: string | null;
  benefits: string[];
  pricing: HealthPlanPricingInfo[];
  contributionRules: HealthPlanContributionRuleInfo[];
};

export type EmployeeHealthInsuranceResponse = {
  contactId: number;
  insuranceEligibility: string;
  tenureTier: '<1 yr' | '1+ yr' | null;
  companyContributionPerPayPeriod: number;
  benchmarkBiweekly: number;
  elections: InsuranceElection[];
  plans: HealthPlanOption[];
};

export class UpdateEmployeeHealthInsuranceDto {
  @IsString()
  insuranceType!: string;   // 'Medical' | 'Dental' | 'Vision'
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
    if (!dto.insuranceType || !['Medical', 'Dental', 'Vision'].includes(dto.insuranceType)) {
      throw new BadRequestException('insuranceType must be Medical, Dental, or Vision.');
    }

    const contactId = await this.resolveContactIdByEmail(email);

    const hasTable = await this.tableExists('EmployeeHealthInsurance');
    if (!hasTable) {
      throw new BadRequestException(
        'EmployeeHealthInsurance table does not exist yet. Run the migration SQL first.',
      );
    }

    // EmployeeHealthInsurance is a wide table: one row per employee with a
    // Medical/Dental/Vision column triplet per insurance type.
    // No ElectionStatus column — enrollment is derived from HealthPlanID being non-null.
    const prefix = dto.insuranceType;
    const planId = (dto.optInStatus ?? '').toLowerCase().includes('opt-in')
      ? (dto.healthPlanId ?? null)
      : null; // Opt-Out → clear the plan

    // Compute deduction per pay period for the elected plan
    let deductionPP: number | null = null;
    if (planId != null) {
      const hasPricingTable = await this.tableExists('HealthPlanPricing');
      if (hasPricingTable) {
        const coverageTier = nullableText(dto.additionalInsureds) || 'Employee';
        // Determine tenure tier from EmployeeProfile
        let empTenureTier: '<1 yr' | '1+ yr' | null = null;
        const hasEpTable = await this.tableExists('EmployeeProfile');
        if (hasEpTable) {
          const profileRows = await this.dataSource.query(
            `SELECT StartDate FROM dbo.EmployeeProfile WHERE ContactID = @0`,
            [contactId],
          );
          if (profileRows.length > 0 && profileRows[0].StartDate) {
            const start = new Date(profileRows[0].StartDate);
            if (!isNaN(start.getTime())) {
              const diffDays = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
              empTenureTier = diffDays >= 365 ? '1+ yr' : '<1 yr';
            }
          }
        }

        // Get elected plan's monthly premium
        const pricingRows = await this.dataSource.query(
          `SELECT CoverageType, MonthlyPremium FROM dbo.HealthPlanPricing
           WHERE HealthPlanID = @0
             AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))`,
          [planId],
        ) as Record<string, unknown>[];
        const monthly = matchPricingForTier(pricingRows, coverageTier, empTenureTier);

        if (monthly != null) {
          const planPriceBiweekly = (monthly * 12) / 26;
          // Benchmark = cheapest Medical "Employee" tier
          const benchmarkRows = await this.dataSource.query(
            `SELECT TOP 1 hpp.MonthlyPremium
             FROM dbo.HealthPlanPricing hpp
             INNER JOIN dbo.HealthPlan hp ON hp.HealthPlanID = hpp.HealthPlanID
             WHERE hp.PlanType = 'Medical'
               AND hpp.CoverageType = 'Employee'
               AND (hp.EndDate IS NULL OR hp.EndDate >= CAST(GETUTCDATE() AS date))
               AND (hpp.EndDate IS NULL OR hpp.EndDate >= CAST(GETUTCDATE() AS date))
             ORDER BY hpp.MonthlyPremium ASC`,
          );
          const benchmarkBiweekly = benchmarkRows.length > 0
            ? (Number(benchmarkRows[0].MonthlyPremium ?? 0) * 12) / 26
            : 0;

          // Get employer contribution % (only Medical plans have rules; Dental/Vision → 0)
          const hasRuleTable = await this.tableExists('HealthPlanContributionRule');
          let employerPct = 0;
          if (hasRuleTable && empTenureTier) {
            const ruleRows = await this.dataSource.query(
              `SELECT TenureTier, EmployerContributionPct FROM dbo.HealthPlanContributionRule
               WHERE HealthPlanID = @0
                 AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))`,
              [planId],
            );
            for (const rr of ruleRows as Record<string, unknown>[]) {
              const t = readString(rr, 'TenureTier').toLowerCase();
              if (empTenureTier === '1+ yr' && t.startsWith('1+')) {
                employerPct = Number(rr['EmployerContributionPct'] ?? 0);
                break;
              }
              if (empTenureTier === '<1 yr' && t.includes('less than')) {
                employerPct = Number(rr['EmployerContributionPct'] ?? 0);
                break;
              }
            }
          }
          const employerPerPP = employerPct * benchmarkBiweekly;
          // Step 4: employer can't contribute more than the plan costs
          const employerApplied = Math.min(employerPerPP, planPriceBiweekly);
          // Step 5: round only at the end
          deductionPP = Math.round((planPriceBiweekly - employerApplied) * 100) / 100;
        }
      }
    }

    // Determine tenure tier string for storage
    let tenureTierStr = 'Unknown';
    const hasEpTable2 = await this.tableExists('EmployeeProfile');
    if (hasEpTable2) {
      const profileRows = await this.dataSource.query(
        `SELECT StartDate FROM dbo.EmployeeProfile WHERE ContactID = @0`,
        [contactId],
      );
      if (profileRows.length > 0 && profileRows[0].StartDate) {
        const start = new Date(profileRows[0].StartDate);
        if (!isNaN(start.getTime())) {
          const diffDays = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
          tenureTierStr = diffDays >= 365 ? '1+ Years' : 'Under 1 Year';
        }
      }
    }

    await this.dataSource.transaction(async (manager) => {
      const existing = await manager.query(
        `SELECT EmployeeHealthInsuranceID FROM dbo.EmployeeHealthInsurance WHERE ContactID = @0`,
        [contactId],
      );

      if (existing.length > 0) {
        await manager.query(
          `
          UPDATE dbo.EmployeeHealthInsurance
          SET ${prefix}HealthPlanID            = @0,
              ${prefix}CoverageTier            = @1,
              ${prefix}DeductionPerPayPeriod   = @2,
              TenureTier                       = @3
          WHERE ContactID = @4
          `,
          [planId, nullableText(dto.additionalInsureds), deductionPP, tenureTierStr, contactId],
        );
      } else {
        await manager.query(
          `
          INSERT INTO dbo.EmployeeHealthInsurance
            (ContactID, ${prefix}HealthPlanID, ${prefix}CoverageTier,
             ${prefix}DeductionPerPayPeriod, TenureTier, EffectiveDate, CreatedAt)
          VALUES
            (@0, @1, @2, @3, @4, CAST(GETUTCDATE() AS date), SYSUTCDATETIME())
          `,
          [contactId, planId, nullableText(dto.additionalInsureds), deductionPP, tenureTierStr],
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
    const hasContributionRuleTable = await this.tableExists(
      'HealthPlanContributionRule',
    );

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

    // Benchmark: the lowest-cost active Medical plan's "Employee" tier premium.
    // Employer contribution = benchmarkBiweekly × EmployerContributionPct (a fixed $).
    let benchmarkBiweekly = 0;
    if (hasPricingTable) {
      const benchmarkRows = await this.dataSource.query(
        `SELECT TOP 1 hpp.MonthlyPremium
         FROM dbo.HealthPlanPricing hpp
         INNER JOIN dbo.HealthPlan hp ON hp.HealthPlanID = hpp.HealthPlanID
         WHERE hp.PlanType = 'Medical'
           AND hpp.CoverageType = 'Employee'
           AND (hp.EndDate IS NULL OR hp.EndDate >= CAST(GETUTCDATE() AS date))
           AND (hpp.EndDate IS NULL OR hpp.EndDate >= CAST(GETUTCDATE() AS date))
         ORDER BY hpp.MonthlyPremium ASC`,
      );
      if (benchmarkRows.length > 0) {
        benchmarkBiweekly = (Number(benchmarkRows[0].MonthlyPremium ?? 0) * 12) / 26;
      }
    }

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

        // Employer contribution % per plan, keyed by tenure tier
        // (dbo.HealthPlanContributionRule: 1+ year of service = 100%, <1 year = 50%).
        // This is what lets us COMPUTE the employee's payroll deduction and the company's
        // contribution instead of relying on a manually-entered DeductionPerPayPeriod.
        const contributionByPlan = new Map<
          number,
          { tierRaw: string; pct: number }[]
        >();
        if (hasContributionRuleTable && planIds.length > 0) {
          const placeholders = planIds.map((_, i) => `@${i}`).join(', ');
          const ruleRows = await this.dataSource.query(
            `SELECT HealthPlanID, TenureTier, EmployerContributionPct
             FROM dbo.HealthPlanContributionRule
             WHERE HealthPlanID IN (${placeholders})
               AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))`,
            planIds,
          );
          for (const rr of ruleRows as Record<string, unknown>[]) {
            const pid = readNumber(rr, 'HealthPlanID');
            if (pid == null) continue;
            const list = contributionByPlan.get(pid) ?? [];
            list.push({
              tierRaw: readString(rr, 'TenureTier'),
              pct: Number(rr['EmployerContributionPct'] ?? 0),
            });
            contributionByPlan.set(pid, list);
          }
        }
        const employerPctFor = (planId: number): number | null => {
          const list = contributionByPlan.get(planId);
          if (!list || list.length === 0) return null;
          const match = list.find((r) => {
            const t = r.tierRaw.toLowerCase();
            if (tenureTier === '1+ yr') return t.startsWith('1+');
            if (tenureTier === '<1 yr') return t.includes('less than');
            return false;
          });
          return match ? match.pct : null;
        };

        // API label 'Health' matches what the frontend (EMS + Hub) already expects for
        // the medical election, even though the DB column prefix/PlanType is 'Medical'.
        const TYPE_COLUMNS = [
          { apiType: 'Medical', prefix: 'Medical' },
          { apiType: 'Dental', prefix: 'Dental' },
          { apiType: 'Vision', prefix: 'Vision' },
        ] as const;

        for (const { apiType, prefix } of TYPE_COLUMNS) {
          const healthPlanId = readNumber(row, `${prefix}HealthPlanID`);
          const coverageTier = readString(row, `${prefix}CoverageTier`);
          const deduction = Number(row[`${prefix}DeductionPerPayPeriod`] ?? 0);
          // No ElectionStatus column — derive from whether PlanID is set
          const isEnrolled = healthPlanId != null;

          const election: InsuranceElection = {
            insuranceType: apiType,
            optInStatus: isEnrolled ? 'Opt-In' : 'Opt-Out',
            healthPlanId,
            planName: healthPlanId != null ? planInfo.get(healthPlanId)?.planName ?? '' : '',
            additionalInsureds: coverageTier,
            planPrice: '',
            planBenefits: '',
            monthlyRate: '',
            payrollDeduction:
              isEnrolled ? `$${deduction.toFixed(2)}/pay period` : '',
          };

          if (healthPlanId != null && hasPricingTable) {
            const monthly = matchPricingForTier(
              await this.dataSource.query(
                `SELECT CoverageType, MonthlyPremium FROM dbo.HealthPlanPricing
                 WHERE HealthPlanID = @0
                   AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
                 ORDER BY EffectiveDate DESC`,
                [healthPlanId],
              ) as Record<string, unknown>[],
              coverageTier,
              tenureTier === 'ineligible' ? null : tenureTier,
            );
            if (monthly != null) {
              election.planPrice = `$${monthly.toFixed(2)}/mo`;
              election.monthlyRate = `$${monthly.toFixed(2)}/mo`;
              // Payroll deduction = electedBiweekly − employerPerPayPeriod
              // where employerPerPayPeriod = benchmarkBiweekly × EmployerContributionPct
              // (employer contributes a fixed $ based on cheapest Medical "Employee" tier)
              if (election.optInStatus === 'Opt-In') {
                const employerPct = employerPctFor(healthPlanId);
                const planPriceBiweekly = (monthly * 12) / 26;
                // employerPerPP based on benchmark; Dental/Vision have no rules → pct is null → 0
                const employerPerPP = (employerPct ?? 0) * benchmarkBiweekly;
                // Step 4: employer can't contribute more than the plan costs
                const employerApplied = Math.min(employerPerPP, planPriceBiweekly);
                // Step 5: round only at the end
                const payrollDed = Math.round((planPriceBiweekly - employerApplied) * 100) / 100;
                election.payrollDeduction = `$${payrollDed.toFixed(2)}/pay period`;
                companyContribPP += employerApplied;
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

            // Fallback: use static benefits if no DB table
            if (!election.planBenefits) {
              const staticBenefits = STATIC_PLAN_BENEFITS.get(healthPlanId!);
              if (staticBenefits) {
                election.planBenefits = staticBenefits.join('; ');
              }
            }
          }

          elections.push(election);
        }
      }
    }

    // 4. Load available plans with benefits, pricing, and contribution rules
    let plans: HealthPlanOption[] = [];
    if (hasPlanTable) {
      const planRows = await this.dataSource.query(
        `SELECT HealthPlanID AS healthPlanId, PlanName AS planName, PlanType AS planType,
                CarrierName AS carrierName, PlanCode AS planCode
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
      // Fallback: static benefits when HealthPlanBenefit table doesn't exist
      if (benefitsByPlan.size === 0) {
        benefitsByPlan = STATIC_PLAN_BENEFITS;
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

      // Load contribution rules per plan
      let contributionsByPlan = new Map<number, HealthPlanContributionRuleInfo[]>();
      if (hasContributionRuleTable) {
        const ruleRows = await this.dataSource.query(
          `SELECT HealthPlanID, TenureTier, EmployerContributionPct
           FROM dbo.HealthPlanContributionRule
           WHERE (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
           ORDER BY HealthPlanID, TenureTier`,
        );
        for (const rr of ruleRows as Record<string, unknown>[]) {
          const pid = readNumber(rr, 'HealthPlanID') ?? 0;
          const tier = readString(rr, 'TenureTier');
          const pct = Number(rr['EmployerContributionPct'] ?? 0);
          if (!contributionsByPlan.has(pid)) contributionsByPlan.set(pid, []);
          contributionsByPlan.get(pid)!.push({ tenureTier: tier, employerContributionPct: pct });
        }
      }

      plans = planRows.map((r: Record<string, unknown>) => {
        const pid = readNumber(r, 'healthPlanId', 'HealthPlanID') ?? 0;
        const benefits = benefitsByPlan.get(pid) ?? [];
        return {
          healthPlanId: pid,
          planName: readString(r, 'planName', 'PlanName'),
          planType: readString(r, 'planType', 'PlanType'),
          carrierName: readString(r, 'carrierName', 'CarrierName'),
          planCode: readString(r, 'planCode', 'PlanCode') || null,
          benefits,
          pricing: pricingByPlan.get(pid) ?? [],
          contributionRules: contributionsByPlan.get(pid) ?? [],
        };
      });
    }

    return {
      contactId,
      insuranceEligibility,
      tenureTier: tenureTier === 'ineligible' ? null : tenureTier,
      companyContributionPerPayPeriod: companyContribPP,
      benchmarkBiweekly,
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
 * Tenure-aware pricing match. HealthPlanPricing.CoverageType may store values
 * like "Employee (1+ yr)" or plain "Employee". This function handles both:
 *  1. Normalises the elected CoverageTier ("Employee Only" → "Employee").
 *  2. Finds rows whose base (ignoring parenthetical suffix) matches.
 *  3. When multiple rows exist, picks the one matching the employee's tenure.
 */
function matchPricingForTier(
  rows: Record<string, unknown>[],
  coverageTier: string,
  tenureTier: '<1 yr' | '1+ yr' | null,
): number | null {
  if (rows.length === 0) return null;
  const base = mapToPricingCoverageType(coverageTier).toLowerCase();

  // Filter to rows whose base coverage matches
  const matched = rows.filter((r) => {
    const ct = String(r.CoverageType ?? r['coverageType'] ?? '').trim();
    const ctBase = ct.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase();
    return ctBase === base;
  });

  if (matched.length === 0) return null;
  if (matched.length === 1) return Number(matched[0].MonthlyPremium ?? matched[0]['monthlyPremium'] ?? 0);

  // Multiple rows — disambiguate by tenure marker
  const marker = tenureTier === '<1 yr' ? '<1' : '1+';
  const tenureMatch = matched.find((r) => {
    const ct = String(r.CoverageType ?? r['coverageType'] ?? '');
    return ct.includes(marker);
  });
  return Number((tenureMatch ?? matched[0]).MonthlyPremium ?? (tenureMatch ?? matched[0])['monthlyPremium'] ?? 0);
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

// ─── Static Plan Benefits (used when HealthPlanBenefit table doesn't exist) ───

const STATIC_PLAN_BENEFITS = new Map<number, string[]>([
  [1, [
    '$0 deductible',
    '$5,000 individual / $15,000 family OOP max',
    'PCP $50, Specialist $70',
    'Preventive no charge',
    'ER $500',
    'Referral required',
    'No out-of-network coverage except emergency',
  ]],
  [2, [
    '$1,600 individual / $3,200 family deductible',
    '$6,500 / $13,000 OOP max',
    'PCP $45, Specialist $70',
    'Preventive no charge',
    'ER $400 + 20%',
    'No referral',
    'Out-of-network covered at 50%, unlimited OOP',
  ]],
  [3, [
    '$1,500 individual / $3,000 family deductible',
    '$3,000 / $6,000 OOP max',
    'PCP $15, Specialist $30',
    'Labs, imaging & hospital 100% after deductible',
    'ER $200',
    'No referral',
    'Out-of-network 20%',
  ]],
  [4, [
    '$50 deductible (basic + major combined, waived on preventive)',
    '$150 family deductible',
    '$2,000 annual maximum per person',
    'Preventive 100%',
    'Basic 80%',
    'Major 50%',
    'Orthodontia not covered',
    'No waiting periods',
    'Maximum accumulation rollover included',
  ]],
  [5, [
    'Exam $10 copay (12 mo)',
    'Lenses $25 copay (12 mo)',
    'Frames $150 allowance, 20% off overage (24 mo)',
    'Standard progressives $0',
    'Elective contacts $150 allowance',
    'Necessary contacts $25 copay',
    'Contact fitting up to $60',
  ]],
]);
