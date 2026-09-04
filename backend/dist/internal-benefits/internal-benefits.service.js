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
var InternalBenefitsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalBenefitsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_request_context_service_1 = require("../audit/audit-request-context.service");
const PAY_PERIODS_PER_YEAR = 26;
function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function nullableNumber(value) {
    if (value === null || value === undefined || value === '')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function normalizeTenureTier(raw) {
    const tier = String(raw ?? '').trim().toLowerCase();
    if (!tier || tier === 'unknown')
        return null;
    if (tier.startsWith('1+'))
        return '1+ yr';
    if (tier.startsWith('<1') || tier.includes('under 1') || tier.includes('less than 1')) {
        return '<1 yr';
    }
    return null;
}
function matchContributionPct(rules, tenureTier) {
    if (!tenureTier || rules.length === 0)
        return null;
    const match = rules.find((rule) => {
        const tier = rule.tenureTier.trim().toLowerCase();
        if (tenureTier === '1+ yr')
            return tier.startsWith('1+');
        return tier.includes('less than') || tier.includes('under') || tier.startsWith('<1');
    });
    return match ? match.employerContributionPct : null;
}
let InternalBenefitsService = class InternalBenefitsService {
    static { InternalBenefitsService_1 = this; }
    dataSource;
    auditContext;
    constructor(dataSource, auditContext) {
        this.dataSource = dataSource;
        this.auditContext = auditContext;
    }
    async resolveContactIdForSignedInUser() {
        const email = this.auditContext.getUserEmail()?.trim().toLowerCase();
        if (!email)
            return null;
        const rows = (await this.dataSource.query(`
      SELECT MIN(c.ContactID) AS contactId
      FROM dbo.Contact c
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      INNER JOIN dbo.ContactAssignment ca ON ca.ContactID = c.ContactID
      INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
      WHERE LOWER(LTRIM(RTRIM(ci.Email))) = @0
      `, [email]));
        const id = Number(rows?.[0]?.contactId);
        return Number.isFinite(id) && id >= 1 ? id : null;
    }
    async loadCurrentPricing(healthPlanIds) {
        const byPlan = new Map();
        if (healthPlanIds.length === 0)
            return byPlan;
        const rows = (await this.dataSource.query(`
      SELECT hpp.HealthPlanID AS healthPlanId,
             hpp.CoverageType AS coverageType,
             hpp.MonthlyPremium AS monthlyPremium
      FROM dbo.HealthPlanPricing hpp
      WHERE hpp.HealthPlanID IN (${healthPlanIds.map((_, i) => `@${i}`).join(', ')})
        AND hpp.EffectiveDate <= GETDATE()
        AND (hpp.EndDate IS NULL OR hpp.EndDate >= GETDATE())
      ORDER BY hpp.HealthPlanID, hpp.CoverageType
      `, healthPlanIds));
        const seen = new Set();
        for (const row of rows) {
            const planId = Number(row.healthPlanId);
            const coverageType = String(row.coverageType ?? '').trim();
            const monthlyPremium = toNumber(row.monthlyPremium);
            const key = `${planId}|${coverageType.toLowerCase()}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            const list = byPlan.get(planId) ?? [];
            list.push({ coverageType, monthlyPremium });
            byPlan.set(planId, list);
        }
        return byPlan;
    }
    async loadContributionRules(healthPlanIds) {
        const byPlan = new Map();
        if (healthPlanIds.length === 0)
            return byPlan;
        const rows = (await this.dataSource.query(`
      SELECT hpcr.HealthPlanID AS healthPlanId,
             hpcr.TenureTier AS tenureTier,
             hpcr.EmployerContributionPct AS employerContributionPct
      FROM dbo.HealthPlanContributionRule hpcr
      WHERE hpcr.HealthPlanID IN (${healthPlanIds.map((_, i) => `@${i}`).join(', ')})
        AND (hpcr.EndDate IS NULL OR hpcr.EndDate >= CAST(GETDATE() AS date))
      ORDER BY hpcr.HealthPlanID, hpcr.TenureTier
      `, healthPlanIds));
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
    matchPremium(pricing, coverageTier, tenureTier) {
        const raw = (coverageTier ?? '').trim();
        const tier = (raw === 'Employee Only' ? 'Employee' : raw).toLowerCase();
        if (!tier)
            return null;
        let tierRows = pricing.filter((row) => {
            const base = row.coverageType.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase();
            return base === tier;
        });
        if (tierRows.length === 0) {
            const alternates = InternalBenefitsService_1.buildAlternateTiers(tier);
            for (const alt of alternates) {
                tierRows = pricing.filter((row) => {
                    const base = row.coverageType.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase();
                    return base === alt;
                });
                if (tierRows.length > 0)
                    break;
            }
        }
        if (tierRows.length === 0)
            return null;
        if (tierRows.length === 1)
            return tierRows[0].monthlyPremium;
        const marker = tenureTier === '<1 yr' ? '<1' : '1+';
        const matched = tierRows.find((row) => row.coverageType.includes(marker));
        return (matched ?? tierRows[0]).monthlyPremium;
    }
    static buildAlternateTiers(base) {
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
    static TYPE_COLUMNS = [
        { apiType: 'Medical', prefix: 'Medical' },
        { apiType: 'Dental', prefix: 'Dental' },
        { apiType: 'Vision', prefix: 'Vision' },
    ];
    async getMyInsurance() {
        const contactId = await this.resolveContactIdForSignedInUser();
        if (contactId == null)
            return { noProfile: true, tenureTier: null, elections: [] };
        const electionRows = (await this.dataSource.query(`SELECT TOP 1 * FROM dbo.EmployeeHealthInsurance WHERE ContactID = @0 ORDER BY EffectiveDate DESC`, [contactId]));
        const electionRow = electionRows?.[0];
        if (!electionRow)
            return { noProfile: false, tenureTier: null, elections: [] };
        const tenureTier = normalizeTenureTier(electionRow.TenureTier);
        const planIds = [
            ...new Set(InternalBenefitsService_1.TYPE_COLUMNS.map(({ prefix }) => Number(electionRow[`${prefix}HealthPlanID`])).filter((id) => Number.isFinite(id) && id >= 1)),
        ];
        const [pricingByPlan, contributionsByPlan, planById] = await Promise.all([
            this.loadCurrentPricing(planIds),
            this.loadContributionRules(planIds),
            this.loadPlanDetails(planIds),
        ]);
        const elections = InternalBenefitsService_1.TYPE_COLUMNS.map(({ apiType, prefix }) => {
            const rawPlanId = Number(electionRow[`${prefix}HealthPlanID`]);
            const healthPlanId = Number.isFinite(rawPlanId) && rawPlanId >= 1 ? rawPlanId : null;
            const rawTier = electionRow[`${prefix}CoverageTier`];
            const coverageTier = rawTier != null ? String(rawTier).trim() : null;
            const rawStatus = String(electionRow[`${prefix}ElectionStatus`] ?? '').trim().toLowerCase();
            const optInStatus = (rawStatus === 'enrolled' || rawStatus === 'opt-in') ? 'Opt-In' : 'Opt-Out';
            const pricing = healthPlanId != null ? pricingByPlan.get(healthPlanId) ?? [] : [];
            const plan = healthPlanId != null ? planById.get(healthPlanId) : undefined;
            const monthlyPremium = this.matchPremium(pricing, coverageTier, tenureTier);
            const deductionPerPayPeriod = healthPlanId != null
                ? nullableNumber(electionRow[`${prefix}DeductionPerPayPeriod`])
                : null;
            const employerContributionPct = healthPlanId != null
                ? matchContributionPct(contributionsByPlan.get(healthPlanId) ?? [], tenureTier)
                : null;
            let employerContributionPerPayPeriod = null;
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
        });
        return { noProfile: false, tenureTier, elections };
    }
    async loadPlanDetails(healthPlanIds) {
        const byPlan = new Map();
        if (healthPlanIds.length === 0)
            return byPlan;
        const rows = (await this.dataSource.query(`SELECT HealthPlanID AS healthPlanId, PlanName AS planName, CarrierName AS carrierName
       FROM dbo.HealthPlan
       WHERE HealthPlanID IN (${healthPlanIds.map((_, i) => `@${i}`).join(', ')})`, healthPlanIds));
        for (const row of rows) {
            byPlan.set(Number(row.healthPlanId), {
                planName: String(row.planName ?? '').trim(),
                carrierName: String(row.carrierName ?? '').trim(),
            });
        }
        return byPlan;
    }
    async listPlans() {
        const planRows = (await this.dataSource.query(`SELECT hp.HealthPlanID AS healthPlanId, hp.PlanName AS planName, hp.PlanType AS planType,
              hp.CarrierName AS carrierName, hp.PlanCode AS planCode
       FROM dbo.HealthPlan hp
       WHERE (hp.EndDate IS NULL OR hp.EndDate >= CAST(GETDATE() AS date))
       ORDER BY hp.PlanType, hp.PlanName`));
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
};
exports.InternalBenefitsService = InternalBenefitsService;
exports.InternalBenefitsService = InternalBenefitsService = InternalBenefitsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        audit_request_context_service_1.AuditRequestContext])
], InternalBenefitsService);
//# sourceMappingURL=internal-benefits.service.js.map