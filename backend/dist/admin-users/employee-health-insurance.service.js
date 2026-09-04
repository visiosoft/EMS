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
exports.EmployeeHealthInsuranceService = exports.BulkUpdateHealthInsuranceDto = exports.UpdateEmployeeHealthInsuranceDto = void 0;
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
class BulkUpdateHealthInsuranceDto {
    medical;
    dental;
    vision;
}
exports.BulkUpdateHealthInsuranceDto = BulkUpdateHealthInsuranceDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], BulkUpdateHealthInsuranceDto.prototype, "medical", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], BulkUpdateHealthInsuranceDto.prototype, "dental", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], BulkUpdateHealthInsuranceDto.prototype, "vision", void 0);
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
        const contactId = await this.resolveContactIdByEmail(email);
        return this.loadHealthInsuranceForContact(contactId);
    }
    async getHealthInsuranceByContactId(contactId) {
        return this.loadHealthInsuranceForContact(contactId);
    }
    async updateHealthInsurance(userEmail, dto) {
        const email = normalizeEmail(userEmail);
        if (!email) {
            throw new common_1.BadRequestException('A valid email address is required.');
        }
        if (!dto.insuranceType || !['Medical', 'Dental', 'Vision'].includes(dto.insuranceType)) {
            throw new common_1.BadRequestException('insuranceType must be Medical, Dental, or Vision.');
        }
        const contactId = await this.resolveContactIdByEmail(email);
        const hasTable = await this.tableExists('EmployeeHealthInsurance');
        if (!hasTable) {
            throw new common_1.BadRequestException('EmployeeHealthInsurance table does not exist yet. Run the migration SQL first.');
        }
        const prefix = dto.insuranceType;
        let planId;
        let isEnrolling;
        if (dto.optInStatus == null) {
            planId = dto.healthPlanId ?? null;
            isEnrolling = planId != null;
        }
        else {
            const status = dto.optInStatus.toLowerCase().trim();
            isEnrolling = status.includes('opt-in') || status === 'enrolled';
            if (isEnrolling) {
                planId = dto.healthPlanId ?? null;
            }
            else {
                planId = null;
            }
        }
        let deductionPP = null;
        if (planId != null) {
            const hasPricingTable = await this.tableExists('HealthPlanPricing');
            if (hasPricingTable) {
                const coverageTier = nullableText(dto.additionalInsureds) || 'Employee';
                let empTenureTier = null;
                const hasEpTable = await this.tableExists('EmployeeProfile');
                if (hasEpTable) {
                    const profileRows = await this.dataSource.query(`SELECT StartDate FROM dbo.EmployeeProfile WHERE ContactID = @0`, [contactId]);
                    if (profileRows.length > 0 && profileRows[0].StartDate) {
                        const start = new Date(profileRows[0].StartDate);
                        if (!isNaN(start.getTime())) {
                            const diffDays = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
                            empTenureTier = diffDays >= 365 ? '1+ yr' : '<1 yr';
                        }
                    }
                }
                const pricingRows = await this.dataSource.query(`SELECT CoverageType, MonthlyPremium FROM dbo.HealthPlanPricing
           WHERE HealthPlanID = @0
             AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))`, [planId]);
                const monthly = matchPricingForTier(pricingRows, coverageTier, empTenureTier);
                if (monthly != null) {
                    const planPriceBiweekly = (monthly * 12) / 26;
                    const benchmarkRows = await this.dataSource.query(`SELECT TOP 1 hpp.MonthlyPremium
             FROM dbo.HealthPlanPricing hpp
             INNER JOIN dbo.HealthPlan hp ON hp.HealthPlanID = hpp.HealthPlanID
             WHERE hp.PlanType = 'Medical'
               AND hpp.CoverageType = 'Employee'
               AND (hp.EndDate IS NULL OR hp.EndDate >= CAST(GETUTCDATE() AS date))
               AND (hpp.EndDate IS NULL OR hpp.EndDate >= CAST(GETUTCDATE() AS date))
             ORDER BY hpp.MonthlyPremium ASC`);
                    const benchmarkBiweekly = benchmarkRows.length > 0
                        ? (Number(benchmarkRows[0].MonthlyPremium ?? 0) * 12) / 26
                        : 0;
                    const hasRuleTable = await this.tableExists('HealthPlanContributionRule');
                    let employerPct = 0;
                    if (hasRuleTable && empTenureTier) {
                        const ruleRows = await this.dataSource.query(`SELECT TenureTier, EmployerContributionPct FROM dbo.HealthPlanContributionRule
               WHERE HealthPlanID = @0
                 AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))`, [planId]);
                        for (const rr of ruleRows) {
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
                    const employerApplied = Math.min(employerPerPP, planPriceBiweekly);
                    deductionPP = Math.round((planPriceBiweekly - employerApplied) * 100) / 100;
                }
            }
        }
        let tenureTierStr = 'Unknown';
        const hasEpTable2 = await this.tableExists('EmployeeProfile');
        if (hasEpTable2) {
            const profileRows = await this.dataSource.query(`SELECT StartDate FROM dbo.EmployeeProfile WHERE ContactID = @0`, [contactId]);
            if (profileRows.length > 0 && profileRows[0].StartDate) {
                const start = new Date(profileRows[0].StartDate);
                if (!isNaN(start.getTime())) {
                    const diffDays = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
                    tenureTierStr = diffDays >= 365 ? '1+ Years' : 'Under 1 Year';
                }
            }
        }
        await this.dataSource.transaction(async (manager) => {
            const existing = await manager.query(`SELECT EmployeeHealthInsuranceID FROM dbo.EmployeeHealthInsurance WHERE ContactID = @0`, [contactId]);
            const electionStatusValue = isEnrolling ? 'Enrolled' : 'Waived';
            if (existing.length > 0) {
                await manager.query(`
          UPDATE dbo.EmployeeHealthInsurance
          SET ${prefix}HealthPlanID            = @0,
              ${prefix}CoverageTier            = @1,
              ${prefix}DeductionPerPayPeriod   = @2,
              ${prefix}ElectionStatus          = @3,
              TenureTier                       = @4
          WHERE ContactID = @5
          `, [planId, nullableText(dto.additionalInsureds), deductionPP, electionStatusValue, tenureTierStr, contactId]);
            }
            else {
                const medStatus = prefix === 'Medical' ? electionStatusValue : 'Waived';
                const denStatus = prefix === 'Dental' ? electionStatusValue : 'Waived';
                const visStatus = prefix === 'Vision' ? electionStatusValue : 'Waived';
                await manager.query(`
          INSERT INTO dbo.EmployeeHealthInsurance
            (ContactID,
             ${prefix}HealthPlanID, ${prefix}CoverageTier, ${prefix}DeductionPerPayPeriod,
             MedicalElectionStatus, DentalElectionStatus, VisionElectionStatus,
             TenureTier, EffectiveDate, CreatedAt)
          VALUES
            (@0, @1, @2, @3, @4, @5, @6, @7, CAST(GETUTCDATE() AS date), SYSUTCDATETIME())
          `, [contactId, planId, nullableText(dto.additionalInsureds), deductionPP,
                    medStatus, denStatus, visStatus, tenureTierStr]);
            }
        });
        return this.loadHealthInsuranceForContact(contactId);
    }
    async bulkUpdateHealthInsurance(userEmail, dto) {
        const email = normalizeEmail(userEmail);
        if (!email) {
            throw new common_1.BadRequestException('A valid email address is required.');
        }
        const contactId = await this.resolveContactIdByEmail(email);
        const hasTable = await this.tableExists('EmployeeHealthInsurance');
        if (!hasTable) {
            throw new common_1.BadRequestException('EmployeeHealthInsurance table does not exist yet. Run the migration SQL first.');
        }
        let empTenureTier = null;
        const hasEpTable = await this.tableExists('EmployeeProfile');
        if (hasEpTable) {
            const profileRows = await this.dataSource.query(`SELECT StartDate FROM dbo.EmployeeProfile WHERE ContactID = @0`, [contactId]);
            if (profileRows.length > 0 && profileRows[0].StartDate) {
                const start = new Date(profileRows[0].StartDate);
                if (!isNaN(start.getTime())) {
                    const diffDays = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
                    empTenureTier = diffDays >= 365 ? '1+ yr' : '<1 yr';
                }
            }
        }
        let benchmarkBiweekly = 0;
        const hasPricingTable = await this.tableExists('HealthPlanPricing');
        if (hasPricingTable) {
            const benchmarkRows = await this.dataSource.query(`SELECT TOP 1 hpp.MonthlyPremium
         FROM dbo.HealthPlanPricing hpp
         INNER JOIN dbo.HealthPlan hp ON hp.HealthPlanID = hpp.HealthPlanID
         WHERE hp.PlanType = 'Medical'
           AND hpp.CoverageType = 'Employee'
           AND (hp.EndDate IS NULL OR hp.EndDate >= CAST(GETUTCDATE() AS date))
           AND (hpp.EndDate IS NULL OR hpp.EndDate >= CAST(GETUTCDATE() AS date))
         ORDER BY hpp.MonthlyPremium ASC`);
            if (benchmarkRows.length > 0) {
                benchmarkBiweekly = (Number(benchmarkRows[0].MonthlyPremium ?? 0) * 12) / 26;
            }
        }
        const hasRuleTable = await this.tableExists('HealthPlanContributionRule');
        const types = [
            { prefix: 'Medical', election: dto.medical },
            { prefix: 'Dental', election: dto.dental },
            { prefix: 'Vision', election: dto.vision },
        ];
        const setClauses = [];
        const setParams = [];
        let paramIdx = 0;
        const insertCols = ['ContactID'];
        const insertPlaceholders = ['@0'];
        const insertParams = [contactId];
        let insertParamIdx = 1;
        const electionStatuses = {
            Medical: 'Waived',
            Dental: 'Waived',
            Vision: 'Waived',
        };
        for (const { prefix, election } of types) {
            if (!election)
                continue;
            let planId;
            let isEnrolling;
            if (election.optInStatus == null) {
                planId = election.healthPlanId ?? null;
                isEnrolling = planId != null;
            }
            else {
                const status = election.optInStatus.toLowerCase().trim();
                isEnrolling = status.includes('opt-in') || status === 'enrolled';
                planId = isEnrolling ? (election.healthPlanId ?? null) : null;
            }
            const electionStatusValue = isEnrolling ? 'Enrolled' : 'Waived';
            electionStatuses[prefix] = electionStatusValue;
            let deductionPP = null;
            if (planId != null && hasPricingTable) {
                const coverageTier = nullableText(election.additionalInsureds) || 'Employee';
                const pricingRows = await this.dataSource.query(`SELECT CoverageType, MonthlyPremium FROM dbo.HealthPlanPricing
           WHERE HealthPlanID = @0
             AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))`, [planId]);
                const monthly = matchPricingForTier(pricingRows, coverageTier, empTenureTier);
                if (monthly != null) {
                    const planPriceBiweekly = (monthly * 12) / 26;
                    let employerPct = 0;
                    if (hasRuleTable && empTenureTier) {
                        const ruleRows = await this.dataSource.query(`SELECT TenureTier, EmployerContributionPct FROM dbo.HealthPlanContributionRule
               WHERE HealthPlanID = @0
                 AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))`, [planId]);
                        for (const rr of ruleRows) {
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
                    const employerApplied = Math.min(employerPerPP, planPriceBiweekly);
                    deductionPP = Math.round((planPriceBiweekly - employerApplied) * 100) / 100;
                }
            }
            setClauses.push(`${prefix}HealthPlanID = @${paramIdx}`);
            setParams.push(planId);
            paramIdx++;
            setClauses.push(`${prefix}CoverageTier = @${paramIdx}`);
            setParams.push(nullableText(election.additionalInsureds));
            paramIdx++;
            setClauses.push(`${prefix}DeductionPerPayPeriod = @${paramIdx}`);
            setParams.push(deductionPP);
            paramIdx++;
            setClauses.push(`${prefix}ElectionStatus = @${paramIdx}`);
            setParams.push(electionStatusValue);
            paramIdx++;
            insertCols.push(`${prefix}HealthPlanID`, `${prefix}CoverageTier`, `${prefix}DeductionPerPayPeriod`);
            insertPlaceholders.push(`@${insertParamIdx}`, `@${insertParamIdx + 1}`, `@${insertParamIdx + 2}`);
            insertParams.push(planId, nullableText(election.additionalInsureds), deductionPP);
            insertParamIdx += 3;
        }
        let tenureTierStr = 'Unknown';
        if (empTenureTier === '1+ yr')
            tenureTierStr = '1+ Years';
        else if (empTenureTier === '<1 yr')
            tenureTierStr = 'Under 1 Year';
        setClauses.push(`TenureTier = @${paramIdx}`);
        setParams.push(tenureTierStr);
        paramIdx++;
        await this.dataSource.transaction(async (manager) => {
            const existing = await manager.query(`SELECT EmployeeHealthInsuranceID FROM dbo.EmployeeHealthInsurance WHERE ContactID = @0`, [contactId]);
            if (existing.length > 0) {
                await manager.query(`UPDATE dbo.EmployeeHealthInsurance SET ${setClauses.join(', ')} WHERE ContactID = @${paramIdx}`, [...setParams, contactId]);
            }
            else {
                insertCols.push('MedicalElectionStatus', 'DentalElectionStatus', 'VisionElectionStatus');
                insertPlaceholders.push(`@${insertParamIdx}`, `@${insertParamIdx + 1}`, `@${insertParamIdx + 2}`);
                insertParams.push(electionStatuses.Medical, electionStatuses.Dental, electionStatuses.Vision);
                insertParamIdx += 3;
                insertCols.push('TenureTier', 'EffectiveDate', 'CreatedAt');
                insertPlaceholders.push(`@${insertParamIdx}`, 'CAST(GETUTCDATE() AS date)', 'SYSUTCDATETIME()');
                insertParams.push(tenureTierStr);
                await manager.query(`INSERT INTO dbo.EmployeeHealthInsurance (${insertCols.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`, insertParams);
            }
        });
        return this.loadHealthInsuranceForContact(contactId);
    }
    async resolveContactIdByEmail(email) {
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
        return readNumber(contactRows[0], 'contactId', 'ContactID') ?? 0;
    }
    async loadHealthInsuranceForContact(contactId) {
        const hasElectionTable = await this.tableExists('EmployeeHealthInsurance');
        const hasPlanTable = await this.tableExists('HealthPlan');
        const hasPricingTable = await this.tableExists('HealthPlanPricing');
        const hasBenefitTable = await this.tableExists('HealthPlanBenefit');
        const hasContributionRuleTable = await this.tableExists('HealthPlanContributionRule');
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
        let elections = [];
        let companyContribPP = 0;
        let benchmarkBiweekly = 0;
        if (hasPricingTable) {
            const benchmarkRows = await this.dataSource.query(`SELECT TOP 1 hpp.MonthlyPremium
         FROM dbo.HealthPlanPricing hpp
         INNER JOIN dbo.HealthPlan hp ON hp.HealthPlanID = hpp.HealthPlanID
         WHERE hp.PlanType = 'Medical'
           AND hpp.CoverageType = 'Employee'
           AND (hp.EndDate IS NULL OR hp.EndDate >= CAST(GETUTCDATE() AS date))
           AND (hpp.EndDate IS NULL OR hpp.EndDate >= CAST(GETUTCDATE() AS date))
         ORDER BY hpp.MonthlyPremium ASC`);
            if (benchmarkRows.length > 0) {
                benchmarkBiweekly = (Number(benchmarkRows[0].MonthlyPremium ?? 0) * 12) / 26;
            }
        }
        if (hasElectionTable) {
            const rows = await this.dataSource.query(`SELECT TOP 1 * FROM dbo.EmployeeHealthInsurance WHERE ContactID = @0 ORDER BY EffectiveDate DESC`, [contactId]);
            const row = rows[0];
            if (row) {
                const planIds = [
                    readNumber(row, 'MedicalHealthPlanID'),
                    readNumber(row, 'DentalHealthPlanID'),
                    readNumber(row, 'VisionHealthPlanID'),
                ].filter((id) => id != null);
                const planInfo = new Map();
                if (hasPlanTable && planIds.length > 0) {
                    const placeholders = planIds.map((_, i) => `@${i}`).join(', ');
                    const planRows = await this.dataSource.query(`SELECT HealthPlanID, PlanName FROM dbo.HealthPlan WHERE HealthPlanID IN (${placeholders})`, planIds);
                    for (const p of planRows) {
                        const pid = readNumber(p, 'HealthPlanID');
                        if (pid != null)
                            planInfo.set(pid, { planName: readString(p, 'PlanName') });
                    }
                }
                const contributionByPlan = new Map();
                if (hasContributionRuleTable && planIds.length > 0) {
                    const placeholders = planIds.map((_, i) => `@${i}`).join(', ');
                    const ruleRows = await this.dataSource.query(`SELECT HealthPlanID, TenureTier, EmployerContributionPct
             FROM dbo.HealthPlanContributionRule
             WHERE HealthPlanID IN (${placeholders})
               AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))`, planIds);
                    for (const rr of ruleRows) {
                        const pid = readNumber(rr, 'HealthPlanID');
                        if (pid == null)
                            continue;
                        const list = contributionByPlan.get(pid) ?? [];
                        list.push({
                            tierRaw: readString(rr, 'TenureTier'),
                            pct: Number(rr['EmployerContributionPct'] ?? 0),
                        });
                        contributionByPlan.set(pid, list);
                    }
                }
                const employerPctFor = (planId) => {
                    const list = contributionByPlan.get(planId);
                    if (!list || list.length === 0)
                        return null;
                    const match = list.find((r) => {
                        const t = r.tierRaw.toLowerCase();
                        if (tenureTier === '1+ yr')
                            return t.startsWith('1+');
                        if (tenureTier === '<1 yr')
                            return t.includes('less than');
                        return false;
                    });
                    return match ? match.pct : null;
                };
                const TYPE_COLUMNS = [
                    { apiType: 'Medical', prefix: 'Medical' },
                    { apiType: 'Dental', prefix: 'Dental' },
                    { apiType: 'Vision', prefix: 'Vision' },
                ];
                for (const { apiType, prefix } of TYPE_COLUMNS) {
                    const healthPlanId = readNumber(row, `${prefix}HealthPlanID`);
                    const coverageTier = readString(row, `${prefix}CoverageTier`);
                    const deduction = Number(row[`${prefix}DeductionPerPayPeriod`] ?? 0);
                    const electionStatus = readString(row, `${prefix}ElectionStatus`).toLowerCase();
                    const isEnrolled = electionStatus === 'enrolled' || electionStatus === 'opt-in';
                    const election = {
                        insuranceType: apiType,
                        optInStatus: isEnrolled ? 'Opt-In' : 'Opt-Out',
                        healthPlanId,
                        planName: healthPlanId != null ? planInfo.get(healthPlanId)?.planName ?? '' : '',
                        additionalInsureds: coverageTier,
                        planPrice: '',
                        planBenefits: '',
                        monthlyRate: '',
                        payrollDeduction: isEnrolled ? `$${deduction.toFixed(2)}/pay period` : '',
                    };
                    if (healthPlanId != null && hasPricingTable) {
                        const monthly = matchPricingForTier(await this.dataSource.query(`SELECT CoverageType, MonthlyPremium FROM dbo.HealthPlanPricing
                 WHERE HealthPlanID = @0
                   AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
                 ORDER BY EffectiveDate DESC`, [healthPlanId]), coverageTier, tenureTier === 'ineligible' ? null : tenureTier);
                        if (monthly != null) {
                            election.planPrice = `$${monthly.toFixed(2)}/mo`;
                            election.monthlyRate = `$${monthly.toFixed(2)}/mo`;
                            if (election.optInStatus === 'Opt-In') {
                                const employerPct = employerPctFor(healthPlanId);
                                const planPriceBiweekly = (monthly * 12) / 26;
                                const employerPerPP = (employerPct ?? 0) * benchmarkBiweekly;
                                const employerApplied = Math.min(employerPerPP, planPriceBiweekly);
                                const payrollDed = Math.round((planPriceBiweekly - employerApplied) * 100) / 100;
                                election.payrollDeduction = `$${payrollDed.toFixed(2)}/pay period`;
                                companyContribPP += employerApplied;
                            }
                        }
                        if (hasBenefitTable) {
                            const benefitRows = await this.dataSource.query(`SELECT BenefitDescription FROM dbo.HealthPlanBenefit
                 WHERE HealthPlanID = @0 ORDER BY SortOrder`, [healthPlanId]);
                            election.planBenefits = benefitRows
                                .map((b) => String(b.BenefitDescription ?? '').trim())
                                .filter(Boolean)
                                .join('; ');
                        }
                        if (!election.planBenefits) {
                            const staticBenefits = STATIC_PLAN_BENEFITS.get(healthPlanId);
                            if (staticBenefits) {
                                election.planBenefits = staticBenefits.join('; ');
                            }
                        }
                    }
                    elections.push(election);
                }
            }
        }
        let plans = [];
        if (hasPlanTable) {
            const planRows = await this.dataSource.query(`SELECT HealthPlanID AS healthPlanId, PlanName AS planName, PlanType AS planType,
                CarrierName AS carrierName, PlanCode AS planCode
         FROM dbo.HealthPlan
         WHERE (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
         ORDER BY PlanType, PlanName`);
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
            if (benefitsByPlan.size === 0) {
                benefitsByPlan = STATIC_PLAN_BENEFITS;
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
            let contributionsByPlan = new Map();
            if (hasContributionRuleTable) {
                const ruleRows = await this.dataSource.query(`SELECT HealthPlanID, TenureTier, EmployerContributionPct
           FROM dbo.HealthPlanContributionRule
           WHERE (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))
           ORDER BY HealthPlanID, TenureTier`);
                for (const rr of ruleRows) {
                    const pid = readNumber(rr, 'HealthPlanID') ?? 0;
                    const tier = readString(rr, 'TenureTier');
                    const pct = Number(rr['EmployerContributionPct'] ?? 0);
                    if (!contributionsByPlan.has(pid))
                        contributionsByPlan.set(pid, []);
                    contributionsByPlan.get(pid).push({ tenureTier: tier, employerContributionPct: pct });
                }
            }
            plans = planRows.map((r) => {
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
    async recalculateDeductionsForContact(contactId) {
        const hasElectionTable = await this.tableExists('EmployeeHealthInsurance');
        const hasPricingTable = await this.tableExists('HealthPlanPricing');
        const hasRuleTable = await this.tableExists('HealthPlanContributionRule');
        if (!hasElectionTable || !hasPricingTable)
            return;
        const rows = await this.dataSource.query(`SELECT TOP 1 * FROM dbo.EmployeeHealthInsurance WHERE ContactID = @0 ORDER BY EffectiveDate DESC`, [contactId]);
        const row = rows[0];
        if (!row)
            return;
        const hasEpTable = await this.tableExists('EmployeeProfile');
        let empTenureTier = null;
        if (hasEpTable) {
            const profileRows = await this.dataSource.query(`SELECT StartDate FROM dbo.EmployeeProfile WHERE ContactID = @0`, [contactId]);
            if (profileRows.length > 0 && profileRows[0].StartDate) {
                const start = new Date(profileRows[0].StartDate);
                if (!isNaN(start.getTime())) {
                    const diffDays = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
                    empTenureTier = diffDays >= 365 ? '1+ yr' : '<1 yr';
                }
            }
        }
        const benchmarkRows = await this.dataSource.query(`SELECT TOP 1 hpp.MonthlyPremium
       FROM dbo.HealthPlanPricing hpp
       INNER JOIN dbo.HealthPlan hp ON hp.HealthPlanID = hpp.HealthPlanID
       WHERE hp.PlanType = 'Medical'
         AND hpp.CoverageType = 'Employee'
         AND (hp.EndDate IS NULL OR hp.EndDate >= CAST(GETUTCDATE() AS date))
         AND (hpp.EndDate IS NULL OR hpp.EndDate >= CAST(GETUTCDATE() AS date))
       ORDER BY hpp.MonthlyPremium ASC`);
        const benchmarkBiweekly = benchmarkRows.length > 0
            ? (Number(benchmarkRows[0].MonthlyPremium ?? 0) * 12) / 26
            : 0;
        const TYPE_PREFIXES = ['Medical', 'Dental', 'Vision'];
        const setClauses = [];
        const params = [];
        let paramIdx = 0;
        for (const prefix of TYPE_PREFIXES) {
            const planId = readNumber(row, `${prefix}HealthPlanID`);
            if (planId == null)
                continue;
            const coverageTier = readString(row, `${prefix}CoverageTier`) || 'Employee';
            const pricingRows = await this.dataSource.query(`SELECT CoverageType, MonthlyPremium FROM dbo.HealthPlanPricing
         WHERE HealthPlanID = @0
           AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))`, [planId]);
            const monthly = matchPricingForTier(pricingRows, coverageTier, empTenureTier);
            let deductionPP = null;
            if (monthly != null) {
                const planPriceBiweekly = (monthly * 12) / 26;
                let employerPct = 0;
                if (hasRuleTable && empTenureTier) {
                    const ruleRows = await this.dataSource.query(`SELECT TenureTier, EmployerContributionPct FROM dbo.HealthPlanContributionRule
             WHERE HealthPlanID = @0
               AND (EndDate IS NULL OR EndDate >= CAST(GETUTCDATE() AS date))`, [planId]);
                    for (const rr of ruleRows) {
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
                const employerApplied = Math.min(employerPerPP, planPriceBiweekly);
                deductionPP = Math.round((planPriceBiweekly - employerApplied) * 100) / 100;
            }
            setClauses.push(`${prefix}DeductionPerPayPeriod = @${paramIdx}`);
            params.push(deductionPP);
            paramIdx++;
        }
        if (setClauses.length === 0)
            return;
        let tenureTierStr = 'Unknown';
        if (empTenureTier === '1+ yr')
            tenureTierStr = '1+ Years';
        else if (empTenureTier === '<1 yr')
            tenureTierStr = 'Under 1 Year';
        setClauses.push(`TenureTier = @${paramIdx}`);
        params.push(tenureTierStr);
        paramIdx++;
        await this.dataSource.query(`UPDATE dbo.EmployeeHealthInsurance SET ${setClauses.join(', ')} WHERE ContactID = @${paramIdx}`, [...params, contactId]);
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
function matchPricingForTier(rows, coverageTier, tenureTier) {
    if (rows.length === 0)
        return null;
    const base = mapToPricingCoverageType(coverageTier).toLowerCase();
    let matched = rows.filter((r) => {
        const ct = String(r.CoverageType ?? r['coverageType'] ?? '').trim();
        const ctBase = ct.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase();
        return ctBase === base;
    });
    if (matched.length === 0) {
        const alternates = buildAlternateTiers(base);
        for (const alt of alternates) {
            matched = rows.filter((r) => {
                const ct = String(r.CoverageType ?? r['coverageType'] ?? '').trim();
                const ctBase = ct.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase();
                return ctBase === alt;
            });
            if (matched.length > 0)
                break;
        }
    }
    if (matched.length === 0)
        return null;
    if (matched.length === 1)
        return Number(matched[0].MonthlyPremium ?? matched[0]['monthlyPremium'] ?? 0);
    const marker = tenureTier === '<1 yr' ? '<1' : '1+';
    const tenureMatch = matched.find((r) => {
        const ct = String(r.CoverageType ?? r['coverageType'] ?? '');
        return ct.includes(marker);
    });
    return Number((tenureMatch ?? matched[0]).MonthlyPremium ?? (tenureMatch ?? matched[0])['monthlyPremium'] ?? 0);
}
function buildAlternateTiers(base) {
    const alts = [];
    if (base === 'family')
        alts.push('employee + family');
    if (base === 'employee + family')
        alts.push('family');
    if (base === 'children')
        alts.push('employee + children');
    if (base === 'employee + children')
        alts.push('children');
    if (base === 'child')
        alts.push('employee + child');
    if (base === 'employee + child')
        alts.push('child');
    return alts;
}
function mapToPricingCoverageType(coverageTier) {
    const tier = coverageTier.trim();
    return tier === 'Employee Only' ? 'Employee' : tier || 'Employee';
}
const STATIC_PLAN_BENEFITS = new Map([
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
//# sourceMappingURL=employee-health-insurance.service.js.map