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

export type HealthPlanAgeRateInfo = {
  ageMin: number;
  ageMax: number;
  monthlyRate: number;
};

export type HealthPlanOption = {
  healthPlanId: number;
  planName: string;
  planType: string;
  benefits: string[];
  pricing: HealthPlanPricingInfo[];
  ageRates: HealthPlanAgeRateInfo[];
};

export type EmployeeHealthInsuranceResponse = {
  contactId: number;
  employeeAge: number | null;
  insuranceEligibility: string;
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

    // 2. Load elections
    let elections: InsuranceElection[] = [];
    const hasElectionTable = await this.tableExists('EmployeeHealthInsurance');
    const hasPlanTable = await this.tableExists('HealthPlan');
    const hasPricingTable = await this.tableExists('HealthPlanPricing');
    const hasBenefitTable = await this.tableExists('HealthPlanBenefit');

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

      // Enrich with pricing and benefits if tables exist
      for (const election of elections) {
        if (!election.healthPlanId) continue;

        if (hasPricingTable) {
          // Map additionalInsureds to coverage type for pricing lookup
          const coverageType = mapToCoverageType(election.additionalInsureds);
          const priceRows = await this.dataSource.query(
            `SELECT TOP 1 MonthlyPremium FROM dbo.HealthPlanPricing
             WHERE HealthPlanID = @0
               AND CoverageType = @1
               AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
             ORDER BY EffectiveDate DESC`,
            [election.healthPlanId, coverageType],
          );
          if (priceRows.length > 0) {
            const monthly = Number(priceRows[0].MonthlyPremium ?? 0);
            election.planPrice = `$${monthly.toFixed(2)}/mo`;
            // Biweekly payroll deduction = monthly premium * 12 / 26
            const biweekly = (monthly * 12) / 26;
            election.payrollDeduction = `$${biweekly.toFixed(2)}/pay period`;
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
      }
    }

    // 3. Load available plans with benefits and pricing
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
          `SELECT HealthPlanID, CoverageType, MonthlyPremium FROM dbo.HealthPlanPricing
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

      // Load age rates per plan
      const hasAgeRateTable = await this.tableExists('HealthPlanAgeRate');
      let ageRatesByPlan = new Map<number, { ageMin: number; ageMax: number; monthlyRate: number }[]>();
      if (hasAgeRateTable) {
        const ageRateRows = await this.dataSource.query(
          `SELECT HealthPlanID, AgeMin, AgeMax, MonthlyRate FROM dbo.HealthPlanAgeRate
           WHERE (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
           ORDER BY HealthPlanID, AgeMin`,
        );
        for (const ar of ageRateRows as Record<string, unknown>[]) {
          const pid = readNumber(ar, 'HealthPlanID') ?? 0;
          const ageMin = Number(ar.AgeMin ?? 0);
          const ageMax = Number(ar.AgeMax ?? 999);
          const mr = Number(ar.MonthlyRate ?? 0);
          if (!ageRatesByPlan.has(pid)) ageRatesByPlan.set(pid, []);
          ageRatesByPlan.get(pid)!.push({ ageMin, ageMax, monthlyRate: mr });
        }
      }

      plans = planRows.map((r: Record<string, unknown>) => {
        const pid = readNumber(r, 'healthPlanId', 'HealthPlanID') ?? 0;
        return {
          healthPlanId: pid,
          planName: readString(r, 'planName', 'PlanName'),
          planType: readString(r, 'planType', 'PlanType'),
          benefits: benefitsByPlan.get(pid) ?? [],
          pricing: pricingByPlan.get(pid) ?? [],
          ageRates: ageRatesByPlan.get(pid) ?? [],
        };
      });
    }

    // 4. Calculate employee age from EmployeeProfile.DateOfBirth and insurance eligibility from StartDate
    let employeeAge: number | null = null;
    let insuranceEligibility = 'Ineligible';
    const hasEpTable = await this.tableExists('EmployeeProfile');
    if (hasEpTable) {
      const profileRows = await this.dataSource.query(
        `SELECT DateOfBirth, StartDate FROM dbo.EmployeeProfile WHERE ContactID = @0`,
        [contactId],
      );
      if (profileRows.length > 0) {
        const row = profileRows[0];
        // Age
        if (row.DateOfBirth) {
          const dob = new Date(row.DateOfBirth);
          if (!isNaN(dob.getTime())) {
            const today = new Date();
            employeeAge = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
              employeeAge--;
            }
          }
        }
        // Insurance eligibility based on months since StartDate
        if (row.StartDate) {
          const start = new Date(row.StartDate);
          if (!isNaN(start.getTime())) {
            const today = new Date();
            const monthsSinceStart =
              (today.getFullYear() - start.getFullYear()) * 12 +
              (today.getMonth() - start.getMonth()) +
              (today.getDate() >= start.getDate() ? 0 : -1);
            if (monthsSinceStart >= 12) {
              insuranceEligibility = 'Eligible – Full Coverage';
            } else if (monthsSinceStart >= 3) {
              insuranceEligibility = 'Eligible – 50% Coverage';
            } else {
              insuranceEligibility = 'Ineligible';
            }
          }
        }
      }
    }

    // 5. Enrich monthlyRate on Health elections using age rates
    if (employeeAge !== null) {
      for (const election of elections) {
        if (election.insuranceType !== 'Health' || !election.healthPlanId) continue;
        const plan = plans.find((p) => p.healthPlanId === election.healthPlanId);
        if (!plan) continue;
        const ageRate = plan.ageRates.find(
          (ar) => employeeAge! >= ar.ageMin && employeeAge! <= ar.ageMax,
        );
        if (ageRate) {
          election.monthlyRate = `$${ageRate.monthlyRate.toFixed(2)}/mo`;
        }
      }
    }

    return { contactId, employeeAge, insuranceEligibility, elections, plans };
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

function mapToCoverageType(additionalInsureds: string): string {
  switch (additionalInsureds) {
    case 'Spouse':
      return 'Employee + Spouse';
    case 'Family':
    case 'Child':
      return 'Employee + Family';
    default:
      return 'Employee Only';
  }
}
