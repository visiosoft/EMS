"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeHealthInsuranceService = exports.UpdateEmployeeHealthInsuranceDto = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const class_validator_1 = require("class-validator");
const audit_request_context_service_1 = require("../audit/audit-request-context.service");
class UpdateEmployeeHealthInsuranceDto {
    insuranceType;
    optInStatus;
    healthPlanId;
    additionalInsureds;
}
exports.UpdateEmployeeHealthInsuranceDto = UpdateEmployeeHealthInsuranceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateEmployeeHealthInsuranceDto.prototype, "insuranceType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEmployeeHealthInsuranceDto.prototype, "optInStatus", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Object)
], UpdateEmployeeHealthInsuranceDto.prototype, "healthPlanId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEmployeeHealthInsuranceDto.prototype, "additionalInsureds", void 0);
let EmployeeHealthInsuranceService = class EmployeeHealthInsuranceService {
    dataSource;
    auditContext;
    constructor(dataSource, auditContext) {
        this.dataSource = dataSource;
        this.auditContext = auditContext;
    }
    async getHealthInsurance(userEmail) {
        const email = normalizeEmail(userEmail);
        if (!email) {
            throw new common_1.BadRequestException('A valid email address is required.');
        }
        return this.loadHealthInsurance(email);
    }
    async updateHealthInsurance(userEmail, dto) {
        const email = normalizeEmail(userEmail);
        if (!email) {
            throw new common_1.BadRequestException('A valid email address is required.');
        }
        if (!dto.insuranceType || !['Health', 'Dental', 'Vision'].includes(dto.insuranceType)) {
            throw new common_1.BadRequestException('insuranceType must be Health, Dental, or Vision.');
        }
        const current = await this.loadHealthInsurance(email);
        const modifiedBy = this.auditContext.getUserEmail() ?? 'health-insurance';
        const hasTable = await this.tableExists('EmployeeHealthInsurance');
        if (!hasTable) {
            throw new common_1.BadRequestException('EmployeeHealthInsurance table does not exist yet. Run the migration SQL first.');
        }
        await this.dataSource.transaction(async (manager) => {
            const existing = await manager.query(`SELECT 1 AS found FROM dbo.EmployeeHealthInsurance
         WHERE ContactID = @0 AND InsuranceType = @1`, [current.contactId, dto.insuranceType]);
            if (existing.length > 0) {
                await manager.query(`
          UPDATE dbo.EmployeeHealthInsurance
          SET OptInStatus        = @0,
              HealthPlanID       = @1,
              AdditionalInsureds = @2,
              UpdatedBy          = @3,
              UpdatedAt          = SYSUTCDATETIME()
          WHERE ContactID = @4 AND InsuranceType = @5
          `, [
                    nullableText(dto.optInStatus),
                    dto.healthPlanId ?? null,
                    nullableText(dto.additionalInsureds),
                    modifiedBy,
                    current.contactId,
                    dto.insuranceType,
                ]);
            }
            else {
                await manager.query(`
          INSERT INTO dbo.EmployeeHealthInsurance
            (ContactID, InsuranceType, OptInStatus, HealthPlanID, AdditionalInsureds,
             CreatedBy, CreatedAt, UpdatedBy, UpdatedAt)
          VALUES
            (@0, @1, @2, @3, @4, @5, SYSUTCDATETIME(), @5, SYSUTCDATETIME())
          `, [
                    current.contactId,
                    dto.insuranceType,
                    nullableText(dto.optInStatus),
                    dto.healthPlanId ?? null,
                    nullableText(dto.additionalInsureds),
                    modifiedBy,
                ]);
            }
        });
        return this.loadHealthInsurance(email);
    }
    async loadHealthInsurance(email) {
        const contactRows = await this.dataSource.query(`
      SELECT TOP 1 c.ContactID AS contactId
      FROM dbo.Contact c
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      INNER JOIN dbo.ContactAssignment ca ON ca.ContactID = c.ContactID
      INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
      WHERE LOWER(LTRIM(RTRIM(ci.Email))) = LOWER(LTRIM(RTRIM(@0)))
      `, [email]);
        if (contactRows.length === 0) {
            throw new common_1.NotFoundException(`No internal employee profile found for ${email}. Run Entra → EMS sync first.`);
        }
        const contactId = readNumber(contactRows[0], 'contactId', 'ContactID') ?? 0;
        const hasElectionTable = await this.tableExists('EmployeeHealthInsurance');
        const hasPlanTable = await this.tableExists('HealthPlan');
        const hasPricingTable = await this.tableExists('HealthPlanPricing');
        const hasBenefitTable = await this.tableExists('HealthPlanBenefit');
        let insuranceEligibility = 'Ineligible';
        let tenureTier = 'ineligible';
        const hasEpTable = await this.tableExists('EmployeeProfile');
        if (hasEpTable) {
            const profileRows = await this.dataSource.query(`SELECT StartDate FROM dbo.EmployeeProfile WHERE ContactID = @0`, [contactId]);
            if (profileRows.length > 0 && profileRows[0].StartDate) {
                const start = new Date(profileRows[0].StartDate);
                if (!isNaN(start.getTime())) {
                    const today = new Date();
                    const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays >= 365) {
                        insuranceEligibility = 'Eligible – Full Coverage';
                        tenureTier = '1+ yr';
                    }
                    else if (diffDays >= 90) {
                        insuranceEligibility = 'Eligible – 50% Coverage';
                        tenureTier = '<1 yr';
                    }
                }
            }
        }
        let companyContribPP = 0;
        if (tenureTier !== 'ineligible' && hasPricingTable && hasPlanTable) {
            const hmoRows = await this.dataSource.query(`SELECT TOP 1 hpp.MonthlyPremium
         FROM dbo.HealthPlanPricing hpp
         INNER JOIN dbo.HealthPlan hp ON hp.HealthPlanID = hpp.HealthPlanID
         WHERE hp.PlanType = 'Health'
           AND hp.PlanName LIKE '%HMO%'
           AND hp.PlanName NOT LIKE '%PPO%'
           AND hpp.CoverageType = 'Employee (<1 yr)'
           AND hp.IsActive = 1
           AND (hpp.EndDate IS NULL OR hpp.EndDate >= CAST(GETUTCDATE() AS date))
         ORDER BY hpp.EffectiveDate DESC`);
            if (hmoRows.length > 0) {
                const hmoBase = Number(hmoRows[0].MonthlyPremium ?? 0);
                companyContribPP = tenureTier === '1+ yr'
                    ? (hmoBase * 2 * 12) / 26
                    : (hmoBase * 12) / 26;
            }
        }
        let elections = [];
        if (hasElectionTable) {
            const electionRows = await this.dataSource.query(`
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
        `, [contactId]);
            elections = electionRows.map((r) => {
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
                if (!election.healthPlanId)
                    continue;
                if (hasPricingTable) {
                    const isHealth = election.insuranceType === 'Health';
                    const coverageType = mapToCoverageType(election.additionalInsureds, isHealth ? tenureTier : null);
                    const priceRows = await this.dataSource.query(`SELECT TOP 1 MonthlyPremium FROM dbo.HealthPlanPricing
             WHERE HealthPlanID = @0
               AND CoverageType = @1
               AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
             ORDER BY EffectiveDate DESC`, [election.healthPlanId, coverageType]);
                    if (priceRows.length > 0) {
                        const empMonthly = Number(priceRows[0].MonthlyPremium ?? 0);
                        const empPP = (empMonthly * 12) / 26;
                        election.planPrice = `$${empMonthly.toFixed(2)}/mo`;
                        election.monthlyRate = `$${empMonthly.toFixed(2)}/mo`;
                        election.payrollDeduction = `$${empPP.toFixed(2)}/pay period`;
                    }
                }
                if (hasBenefitTable) {
                    const benefitRows = await this.dataSource.query(`SELECT BenefitDescription FROM dbo.HealthPlanBenefit
             WHERE HealthPlanID = @0 ORDER BY SortOrder`, [election.healthPlanId]);
                    election.planBenefits = benefitRows
                        .map((b) => String(b.BenefitDescription ?? '').trim())
                        .filter(Boolean)
                        .join('; ');
                }
                if (!election.planBenefits && hasPricingTable) {
                    const pricingBenefitRows = await this.dataSource.query(`SELECT CoverageType, MonthlyPremium FROM dbo.HealthPlanPricing
             WHERE HealthPlanID = @0
               AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
             ORDER BY CoverageType`, [election.healthPlanId]);
                    const seen = new Set();
                    const items = [];
                    for (const row of pricingBenefitRows) {
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
        let plans = [];
        if (hasPlanTable) {
            const planRows = await this.dataSource.query(`SELECT HealthPlanID AS healthPlanId, PlanName AS planName, PlanType AS planType
         FROM dbo.HealthPlan WHERE IsActive = 1 ORDER BY PlanType, PlanName`);
            let benefitsByPlan = new Map();
            if (hasBenefitTable) {
                const benefitRows = await this.dataSource.query(`SELECT HealthPlanID, BenefitDescription FROM dbo.HealthPlanBenefit ORDER BY HealthPlanID, SortOrder`);
                for (const b of benefitRows) {
                    const pid = readNumber(b, 'HealthPlanID') ?? 0;
                    const desc = String(b.BenefitDescription ?? '').trim();
                    if (!benefitsByPlan.has(pid))
                        benefitsByPlan.set(pid, []);
                    if (desc)
                        benefitsByPlan.get(pid).push(desc);
                }
            }
            let pricingByPlan = new Map();
            if (hasPricingTable) {
                const pricingRows = await this.dataSource.query(`SELECT DISTINCT HealthPlanID, CoverageType, MonthlyPremium
           FROM dbo.HealthPlanPricing
           WHERE (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
           ORDER BY HealthPlanID, CoverageType`);
                for (const p of pricingRows) {
                    const pid = readNumber(p, 'HealthPlanID') ?? 0;
                    const ct = String(p.CoverageType ?? '').trim();
                    const mp = Number(p.MonthlyPremium ?? 0);
                    if (!pricingByPlan.has(pid))
                        pricingByPlan.set(pid, []);
                    pricingByPlan.get(pid).push({ coverageType: ct, monthlyPremium: mp });
                }
            }
            plans = planRows.map((r) => {
                const pid = readNumber(r, 'healthPlanId', 'HealthPlanID') ?? 0;
                let benefits = benefitsByPlan.get(pid) ?? [];
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
    async tableExists(tableName) {
        const rows = await this.dataSource.query(`SELECT 1 AS found FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @0`, [tableName]);
        return rows.length > 0;
    }
};
exports.EmployeeHealthInsuranceService = EmployeeHealthInsuranceService;
exports.EmployeeHealthInsuranceService = EmployeeHealthInsuranceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        audit_request_context_service_1.AuditRequestContext])
], EmployeeHealthInsuranceService);
function normalizeEmail(value) {
    const email = cleanText(value).toLowerCase();
    return email.includes('@') ? email : '';
}
function cleanText(value) {
    return String(value ?? '').trim().replace(/\s+/g, ' ');
}
function nullableText(value) {
    const cleaned = cleanText(value);
    return cleaned || null;
}
function readString(row, ...keys) {
    if (!row)
        return '';
    for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null)
            return cleanText(String(value));
    }
    return '';
}
function readNumber(row, ...keys) {
    if (!row)
        return null;
    for (const key of keys) {
        const value = row[key];
        const numberValue = Number(value);
        if (Number.isFinite(numberValue))
            return numberValue;
    }
    return null;
}
function mapToCoverageType(additionalInsureds, tenureTier) {
    let base;
    switch (additionalInsureds) {
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
            base = additionalInsureds;
            break;
    }
    if (tenureTier && tenureTier !== 'ineligible') {
        return `${base} (${tenureTier})`;
    }
    return base;
}
//# sourceMappingURL=employee-health-insurance.service.js.map