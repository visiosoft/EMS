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
var EngagementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngagementService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const address_entity_1 = require("../entities/address.entity");
const attraction_entity_1 = require("../entities/attraction.entity");
const company_entity_1 = require("../entities/company.entity");
const contact_entity_1 = require("../entities/contact.entity");
const contact_assignment_entity_1 = require("../entities/contact-assignment.entity");
const contact_info_entity_1 = require("../entities/contact-info.entity");
const department_entity_1 = require("../entities/department.entity");
const dma_entity_1 = require("../entities/dma.entity");
const link_entity_1 = require("../entities/link.entity");
const engagement_link_entity_1 = require("../entities/engagement-link.entity");
const engagement_entity_1 = require("../entities/engagement.entity");
const engagement_iae_contact_entity_1 = require("../entities/engagement-iae-contact.entity");
const engagement_finance_entity_1 = require("../entities/engagement-finance.entity");
const engagement_production_entity_1 = require("../entities/engagement-production.entity");
const engagement_venue_entity_1 = require("../entities/engagement-venue.entity");
const engagement_xref_entity_1 = require("../entities/engagement-xref.entity");
const venue_service_provider_entity_1 = require("../entities/venue-service-provider.entity");
const company_service_entity_1 = require("../entities/company-service.entity");
const service_provided_entity_1 = require("../entities/service-provided.entity");
const non_resident_withholding_entity_1 = require("../entities/non-resident-withholding.entity");
const artist_finance_entity_1 = require("../entities/artist-finance.entity");
const settlement_finance_entity_1 = require("../entities/settlement-finance.entity");
const performance_entity_1 = require("../entities/performance.entity");
const performance_ticketing_entity_1 = require("../entities/performance-ticketing.entity");
const role_entity_1 = require("../entities/role.entity");
const ticketing_sales_entity_1 = require("../entities/ticketing-sales.entity");
const tour_entity_1 = require("../entities/tour.entity");
const venue_entity_1 = require("../entities/venue.entity");
const ems_app_created_store_1 = require("../attraction-tours/ems-app-created.store");
const document_library_service_1 = require("../document-library/document-library.service");
const engagement_folder_structure_1 = require("./engagement-folder-structure");
const engagement_travel_entity_1 = require("../entities/engagement-travel.entity");
const engagement_travel_car_service_entity_1 = require("../entities/engagement-travel-car-service.entity");
const engagement_travel_hotel_entity_1 = require("../entities/engagement-travel-hotel.entity");
const engagement_partner_entity_1 = require("../entities/engagement-partner.entity");
const performance_contract_entity_1 = require("../entities/performance-contract.entity");
const audit_request_context_service_1 = require("../audit/audit-request-context.service");
const engagement_display_util_1 = require("./engagement-display.util");
const engagement_status_util_1 = require("./engagement-status.util");
const iae_waiver_status_constants_1 = require("./iae-waiver-status.constants");
function pickRaw(r, key) {
    if (key in r)
        return r[key];
    const lower = key.toLowerCase();
    const found = Object.keys(r).find((x) => x.toLowerCase() === lower);
    return found ? r[found] : undefined;
}
let EngagementService = EngagementService_1 = class EngagementService {
    engagementRepo;
    engagementFinancesRepo;
    engagementVenueRepo;
    engagementProductionRepo;
    tourRepo;
    venueRepo;
    companyRepo;
    venueServiceProviderRepo;
    companyServiceRepo;
    serviceProvidedRepo;
    performanceRepo;
    performanceTicketingRepo;
    linkRepo;
    engagementIaeContactRepo;
    contactRepo;
    contactInfoRepo;
    roleRepo;
    departmentRepo;
    nonResidentWithholdingRepo;
    artistFinanceRepo;
    settlementFinanceRepo;
    engagementTravelRepo;
    engagementTravelCarServiceRepo;
    engagementTravelHotelRepo;
    engagementLinkRepo;
    emsCreated;
    dataSource;
    auditContext;
    documentLibrary;
    logger = new common_1.Logger(EngagementService_1.name);
    folderJobs = new Map();
    engagementFinanceSharePointLinkColsPresent = null;
    engagementFinanceMarketingBudgetColsPresent = null;
    engagementFinanceDealStructureColsPresent = null;
    performanceTicketingAdvancedColsPresent = null;
    performanceTicketingExtendedColsPresent = null;
    performanceTicketingPasswordColsPresent = null;
    engagementFinancesIaeTicketingManagerColPresent = null;
    nonResidentWithholdingHasDmaIdColumn = null;
    engagementProductionTimeColsPresent = null;
    engagementVenueOptionalColsPresent = null;
    venueOptionalTechPackColPresent = null;
    engagementVenueMarketingColsPresent = null;
    engagementVenueProductionManagerColPresent = null;
    engagementVenueVenueProductionManagerColPresent = null;
    engagementVenueStagehandContactColPresent = null;
    engagementVenueTicketingAdminColPresent = null;
    venueSeatingChartUrlColPresent = null;
    engagementIaeMarketingColsPresent = null;
    tourMarketingColsPresent = null;
    engagementFinanceAnnouncementDatePresent = null;
    engagementFinanceBookingColsPresent = null;
    engagementFinanceContractLinkColsPresent = null;
    engagementFinanceEventBusinessColsPresent = null;
    constructor(engagementRepo, engagementFinancesRepo, engagementVenueRepo, engagementProductionRepo, tourRepo, venueRepo, companyRepo, venueServiceProviderRepo, companyServiceRepo, serviceProvidedRepo, performanceRepo, performanceTicketingRepo, linkRepo, engagementIaeContactRepo, contactRepo, contactInfoRepo, roleRepo, departmentRepo, nonResidentWithholdingRepo, artistFinanceRepo, settlementFinanceRepo, engagementTravelRepo, engagementTravelCarServiceRepo, engagementTravelHotelRepo, engagementLinkRepo, emsCreated, dataSource, auditContext, documentLibrary) {
        this.engagementRepo = engagementRepo;
        this.engagementFinancesRepo = engagementFinancesRepo;
        this.engagementVenueRepo = engagementVenueRepo;
        this.engagementProductionRepo = engagementProductionRepo;
        this.tourRepo = tourRepo;
        this.venueRepo = venueRepo;
        this.companyRepo = companyRepo;
        this.venueServiceProviderRepo = venueServiceProviderRepo;
        this.companyServiceRepo = companyServiceRepo;
        this.serviceProvidedRepo = serviceProvidedRepo;
        this.performanceRepo = performanceRepo;
        this.performanceTicketingRepo = performanceTicketingRepo;
        this.linkRepo = linkRepo;
        this.engagementIaeContactRepo = engagementIaeContactRepo;
        this.contactRepo = contactRepo;
        this.contactInfoRepo = contactInfoRepo;
        this.roleRepo = roleRepo;
        this.departmentRepo = departmentRepo;
        this.nonResidentWithholdingRepo = nonResidentWithholdingRepo;
        this.artistFinanceRepo = artistFinanceRepo;
        this.settlementFinanceRepo = settlementFinanceRepo;
        this.engagementTravelRepo = engagementTravelRepo;
        this.engagementTravelCarServiceRepo = engagementTravelCarServiceRepo;
        this.engagementTravelHotelRepo = engagementTravelHotelRepo;
        this.engagementLinkRepo = engagementLinkRepo;
        this.emsCreated = emsCreated;
        this.dataSource = dataSource;
        this.auditContext = auditContext;
        this.documentLibrary = documentLibrary;
    }
    async getPrimaryVenueCompanyIdForEngagement(engagementId) {
        const row = await this.engagementVenueRepo.findOne({
            where: { engagementId, isPrimary: true },
        });
        const id = row?.venueCompanyId ?? null;
        if (id == null || !Number.isInteger(id) || id < 1) {
            throw new common_1.BadRequestException({
                message: 'This engagement has no primary venue, so service providers cannot be managed.',
            });
        }
        return id;
    }
    async loadCompanyServices(companyId) {
        const rows = await this.companyServiceRepo.find({
            where: { companyId },
            relations: { serviceProvided: true },
        });
        const list = rows
            .map((r) => r.serviceProvided)
            .filter((s) => !!s);
        const deduped = new Map();
        for (const s of list)
            deduped.set(s.serviceProvidedId, s);
        return [...deduped.values()].sort((a, b) => a.serviceName.localeCompare(b.serviceName, undefined, {
            sensitivity: 'base',
        }));
    }
    normalizeTime(t) {
        const parts = t.trim().split(':');
        if (parts.length === 2)
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
        if (parts.length === 3)
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0').slice(0, 2)}`;
        throw new common_1.BadRequestException({
            message: 'Invalid performance time format. Expected HH:mm or HH:mm:ss.',
        });
    }
    async assertPerformanceSlotAvailable(engagementId, performanceDate, performanceTime, excludePerformanceId) {
        const qb = this.performanceRepo
            .createQueryBuilder('p')
            .where('p.engagementId = :engagementId', { engagementId })
            .andWhere('p.performanceDate = :performanceDate', { performanceDate })
            .andWhere('p.performanceTime = :performanceTime', { performanceTime });
        if (excludePerformanceId != null) {
            qb.andWhere('p.performanceId <> :excludePerformanceId', {
                excludePerformanceId,
            });
        }
        const existing = await qb.getOne();
        if (existing) {
            throw new common_1.ConflictException({
                message: 'A show already exists for this engagement at the exact same date and time.',
            });
        }
    }
    async assertVenueCompany(venueCompanyId) {
        const company = await this.companyRepo.findOne({
            where: { companyId: venueCompanyId },
        });
        if (!company) {
            throw new common_1.BadRequestException({
                message: `Company with ID ${venueCompanyId} does not exist.`,
            });
        }
        const venue = await this.venueRepo.findOne({
            where: { companyId: venueCompanyId },
        });
        if (!venue) {
            throw new common_1.BadRequestException({
                message: `Company #${venueCompanyId} exists but is not registered as a venue.`,
            });
        }
    }
    async assertEngagementExists(id) {
        const e = await this.engagementRepo.findOne({
            where: { engagementId: id },
        });
        if (!e)
            throw new common_1.NotFoundException({ message: `Engagement #${id} not found.` });
        return e;
    }
    mapFinanceNumber(v) {
        if (v == null || v === '')
            return null;
        const x = typeof v === 'string' ? parseFloat(v) : v;
        return Number.isFinite(x) ? x : null;
    }
    mapFinanceYmd(v) {
        if (v == null || v === '')
            return null;
        if (v instanceof Date) {
            if (Number.isNaN(v.getTime()))
                return null;
            const y = v.getUTCFullYear();
            const m = String(v.getUTCMonth() + 1).padStart(2, '0');
            const d = String(v.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        const s = String(v).trim();
        const t = s.match(/^(\d{4}-\d{2}-\d{2})/);
        return t ? t[1] : null;
    }
    assertYmdOrNull(value) {
        if (value == null || value === '')
            return null;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            throw new common_1.BadRequestException({
                message: 'Invalid date. Use YYYY-MM-DD.',
            });
        }
        return value;
    }
    escapeSqlNVarCharLiteral(value) {
        return `N'${String(value).replace(/'/g, "''")}'`;
    }
    escapeLikePattern(value) {
        return String(value)
            .replace(/\\/g, '\\\\')
            .replace(/%/g, '\\%')
            .replace(/_/g, '\\_')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]');
    }
    searchTokens(value) {
        return [
            ...new Set(String(value ?? '')
                .trim()
                .split(/[^a-zA-Z0-9]+/)
                .map((token) => token.trim())
                .filter(Boolean)),
        ].slice(0, 8);
    }
    async engagementFinancesHasSharePointLinkColumns() {
        if (this.engagementFinanceSharePointLinkColsPresent !== null) {
            return this.engagementFinanceSharePointLinkColsPresent;
        }
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'FinalAcceptedOfferLink'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'SettlementFileSharePointLink'
          )
        THEN 1 ELSE 0 END AS ok
      `);
            const row0 = r?.[0];
            const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
            const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
            this.engagementFinanceSharePointLinkColsPresent = ok;
            return ok;
        }
        catch {
            this.engagementFinanceSharePointLinkColsPresent = false;
            return false;
        }
    }
    async mergeFinanceSharePointLinksFromDb(financeId, base) {
        if (!(await this.engagementFinancesHasSharePointLinkColumns())) {
            return base;
        }
        try {
            const fid = Math.floor(Number(financeId));
            if (!Number.isFinite(fid) || fid < 1)
                return base;
            const r = await this.dataSource.query(`SELECT [FinalAcceptedOfferLink] AS fl, [SettlementFileSharePointLink] AS sl
         FROM dbo.EngagementFinances WHERE [FinanceID] = ${fid}`);
            const lr = r?.[0];
            if (!lr)
                return base;
            const fl = pickRaw(lr, 'fl');
            const sl = pickRaw(lr, 'sl');
            return {
                ...base,
                finalAcceptedOfferLink: fl == null || fl === '' ? null : String(fl).slice(0, 500),
                settlementFileSharePointLink: sl == null || sl === '' ? null : String(sl).slice(0, 500),
            };
        }
        catch {
            return base;
        }
    }
    async tryPersistFinanceSharePointLinks(financeId, dto) {
        const fid = financeId == null ? NaN : Math.floor(Number(financeId));
        if (!Number.isFinite(fid) || fid < 1)
            return;
        if (!(await this.engagementFinancesHasSharePointLinkColumns()))
            return;
        const wantF = dto.finalAcceptedOfferLink !== undefined;
        const wantS = dto.settlementFileSharePointLink !== undefined;
        if (!wantF && !wantS)
            return;
        const fSql = wantF &&
            (dto.finalAcceptedOfferLink == null ||
                String(dto.finalAcceptedOfferLink).trim() === '')
            ? 'NULL'
            : wantF
                ? this.escapeSqlNVarCharLiteral(String(dto.finalAcceptedOfferLink).trim().slice(0, 500))
                : null;
        const sSql = wantS &&
            (dto.settlementFileSharePointLink == null ||
                String(dto.settlementFileSharePointLink).trim() === '')
            ? 'NULL'
            : wantS
                ? this.escapeSqlNVarCharLiteral(String(dto.settlementFileSharePointLink).trim().slice(0, 500))
                : null;
        const sets = [];
        if (wantF && fSql != null)
            sets.push(`[FinalAcceptedOfferLink] = ${fSql}`);
        if (wantS && sSql != null)
            sets.push(`[SettlementFileSharePointLink] = ${sSql}`);
        if (!sets.length)
            return;
        await this.dataSource.query(`UPDATE dbo.EngagementFinances SET ${sets.join(', ')} WHERE [FinanceID] = ${fid}`);
    }
    async engagementFinancesHasMarketingBudgetColumns() {
        if (this.engagementFinanceMarketingBudgetColsPresent !== null) {
            return this.engagementFinanceMarketingBudgetColsPresent;
        }
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'GrossMarketingBudget'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'NetMarketingBudget'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'SalesRevenueGoal'
          )
        THEN 1 ELSE 0 END AS ok
      `);
            const row0 = r?.[0];
            const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
            const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
            this.engagementFinanceMarketingBudgetColsPresent = ok;
            return ok;
        }
        catch {
            this.engagementFinanceMarketingBudgetColsPresent = false;
            return false;
        }
    }
    async mergeFinanceMarketingBudgetFromDb(financeId, base) {
        if (!(await this.engagementFinancesHasMarketingBudgetColumns())) {
            return base;
        }
        try {
            const fid = Math.floor(Number(financeId));
            if (!Number.isFinite(fid) || fid < 1)
                return base;
            const r = await this.dataSource.query(`SELECT
          [GrossMarketingBudget] AS gmb,
          [NetMarketingBudget] AS nmb,
          [SalesRevenueGoal] AS srg,
          [TourSplitPoint] AS tsp
         FROM dbo.EngagementFinances WHERE [FinanceID] = ${fid}`);
            const row0 = r?.[0];
            if (!row0)
                return base;
            const gmb = pickRaw(row0, 'gmb');
            const nmb = pickRaw(row0, 'nmb');
            const srg = pickRaw(row0, 'srg');
            const tsp = pickRaw(row0, 'tsp');
            const merged = {
                ...base,
                grossMarketingBudget: this.mapFinanceNumber(gmb),
                netMarketingBudget: this.mapFinanceNumber(nmb),
                salesRevenueGoal: this.mapFinanceNumber(srg),
                tourSplitPoint: this.mapFinanceNumber(tsp),
            };
            return merged;
        }
        catch {
            return base;
        }
    }
    async engagementFinancesHasAnnouncementDateColumn() {
        if (this.engagementFinanceAnnouncementDatePresent !== null)
            return this.engagementFinanceAnnouncementDatePresent;
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM sys.columns c
          INNER JOIN sys.tables t ON c.object_id = t.object_id
          INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
          WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'AnnouncementDate'
        ) THEN 1 ELSE 0 END AS ok`);
            const raw = pickRaw(r?.[0] ?? {}, 'ok');
            this.engagementFinanceAnnouncementDatePresent =
                raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
            return this.engagementFinanceAnnouncementDatePresent;
        }
        catch {
            this.engagementFinanceAnnouncementDatePresent = false;
            return false;
        }
    }
    async mergeFinanceAnnouncementDateFromDb(financeId, base) {
        if (!(await this.engagementFinancesHasAnnouncementDateColumn()))
            return base;
        try {
            const fid = Math.floor(Number(financeId));
            if (!Number.isFinite(fid) || fid < 1)
                return base;
            const r = await this.dataSource.query(`SELECT CONVERT(varchar(10), [AnnouncementDate], 120) AS ad
         FROM dbo.EngagementFinances WHERE [FinanceID] = ${fid}`);
            const row0 = r?.[0];
            if (!row0)
                return base;
            const ad = pickRaw(row0, 'ad');
            return {
                ...base,
                announcementDate: ad != null && ad !== '' ? String(ad).slice(0, 10) : null,
            };
        }
        catch {
            return base;
        }
    }
    async mergeAnnouncementDateFromProduction(engagementId, base) {
        try {
            const rows = await this.engagementProductionRepo.find({
                where: { engagementId },
                order: { productionId: 'DESC' },
                take: 1,
            });
            const prod = rows[0];
            if (!prod)
                return base;
            const ad = prod.announcementDate;
            return {
                ...base,
                announcementDate: ad != null && String(ad).trim() !== '' ? String(ad).slice(0, 10) : null,
            };
        }
        catch {
            return base;
        }
    }
    async tryPersistFinanceMarketingBudget(financeId, dto) {
        const fid = financeId == null ? NaN : Math.floor(Number(financeId));
        if (!Number.isFinite(fid) || fid < 1)
            return;
        if (!(await this.engagementFinancesHasMarketingBudgetColumns()))
            return;
        const wantG = dto.grossMarketingBudget !== undefined;
        const wantN = dto.netMarketingBudget !== undefined;
        const wantS = dto.salesRevenueGoal !== undefined;
        const wantT = dto.tourSplitPoint !== undefined;
        if (!wantG && !wantN && !wantS && !wantT) {
            return;
        }
        const sets = [];
        if (wantG) {
            sets.push(`[GrossMarketingBudget] = ${dto.grossMarketingBudget == null ? 'NULL' : Number(dto.grossMarketingBudget)}`);
        }
        if (wantN) {
            sets.push(`[NetMarketingBudget] = ${dto.netMarketingBudget == null ? 'NULL' : Number(dto.netMarketingBudget)}`);
        }
        if (wantS) {
            sets.push(`[SalesRevenueGoal] = ${dto.salesRevenueGoal == null ? 'NULL' : Number(dto.salesRevenueGoal)}`);
        }
        if (wantT) {
            sets.push(`[TourSplitPoint] = ${dto.tourSplitPoint == null ? 'NULL' : Number(dto.tourSplitPoint)}`);
        }
        if (sets.length > 0) {
            await this.dataSource.query(`UPDATE dbo.EngagementFinances SET ${sets.join(', ')} WHERE [FinanceID] = ${fid}`);
        }
    }
    async tryPersistFinanceAnnouncementDate(financeId, dto) {
        if (dto.announcementDate === undefined)
            return;
        if (!(await this.engagementFinancesHasAnnouncementDateColumn()))
            return;
        const val = dto.announcementDate == null || dto.announcementDate === ''
            ? 'NULL'
            : this.escapeSqlNVarCharLiteral(String(dto.announcementDate).slice(0, 10));
        await this.dataSource.query(`UPDATE dbo.EngagementFinances SET [AnnouncementDate] = ${val} WHERE [FinanceID] = ${financeId}`);
    }
    async tryPersistAnnouncementDateToProduction(engagementId, dto) {
        if (dto.announcementDate === undefined)
            return;
        const rows = await this.engagementProductionRepo.find({
            where: { engagementId },
            order: { productionId: 'DESC' },
            take: 1,
        });
        let prod = rows[0] ?? null;
        if (!prod) {
            prod = this.engagementProductionRepo.create({
                engagementId,
                rehearsalDate: null,
                loadInDate: null,
                announcementDate: null,
            });
        }
        prod.announcementDate =
            dto.announcementDate == null || dto.announcementDate === ''
                ? null
                : this.assertYmdOrNull(dto.announcementDate);
        await this.engagementProductionRepo.save(prod);
    }
    normalizeVenueDealType(value) {
        const t = String(value ?? '').trim().toLowerCase();
        if (!t)
            return null;
        if (t === 'rental')
            return 'Rental';
        if (t === 'copro')
            return 'CoPro';
        if (t === '3rd party renting venue')
            return '3rd Party Renting Venue';
        if (t === 'silent copro with venue')
            return 'Silent CoPro with Venue';
        return null;
    }
    normalizeThirdPartyPartnerDealStructure(value) {
        const t = String(value ?? '').trim().toLowerCase();
        if (!t)
            return null;
        if (t === 'copro with 3rd party')
            return 'CoPro with 3rd Party';
        if (t === 'copro with 3rd party, 3rd party renting venue') {
            return 'CoPro with 3rd Party, 3rd Party Renting Venue';
        }
        if (t === 'silent copro with 3rd party, 3rd party renting venue') {
            return 'Silent CoPro with 3rd Party, 3rd Party Renting Venue';
        }
        return null;
    }
    async engagementFinancesGetDealStructureColumns() {
        if (this.engagementFinanceDealStructureColsPresent !== null) {
            return this.engagementFinanceDealStructureColsPresent;
        }
        try {
            const r = await this.dataSource.query(`
        SELECT
          CASE WHEN EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'VenueDealType'
          ) THEN 1 ELSE 0 END AS venueDealType,
          CASE WHEN EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'ThirdPartyPartnerDealStructure'
          ) THEN 1 ELSE 0 END AS thirdPartyPartnerDealStructure,
          CASE WHEN EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'VenueDealTypeID'
          ) THEN 1 ELSE 0 END AS venueDealTypeId
      `);
            const row0 = r?.[0];
            const venueDealTypeRaw = row0 ? pickRaw(row0, 'venueDealType') : undefined;
            const thirdPartyRaw = row0
                ? pickRaw(row0, 'thirdPartyPartnerDealStructure')
                : undefined;
            const venueDealTypeIdRaw = row0
                ? pickRaw(row0, 'venueDealTypeId')
                : undefined;
            const truthy = (v) => v === 1 || v === true || v === '1' || Number(v) === 1;
            const present = {
                venueDealType: truthy(venueDealTypeRaw),
                thirdPartyPartnerDealStructure: truthy(thirdPartyRaw),
                venueDealTypeId: truthy(venueDealTypeIdRaw),
            };
            this.engagementFinanceDealStructureColsPresent = present;
            return present;
        }
        catch {
            const missing = {
                venueDealType: false,
                thirdPartyPartnerDealStructure: false,
                venueDealTypeId: false,
            };
            this.engagementFinanceDealStructureColsPresent = missing;
            return missing;
        }
    }
    async mergeFinanceDealStructuresFromDb(financeId, base) {
        const cols = await this.engagementFinancesGetDealStructureColumns();
        if (!cols.venueDealType &&
            !cols.thirdPartyPartnerDealStructure &&
            !cols.venueDealTypeId) {
            return base;
        }
        try {
            const fid = Math.floor(Number(financeId));
            if (!Number.isFinite(fid) || fid < 1)
                return base;
            const sets = [];
            if (cols.venueDealType)
                sets.push('ef.[VenueDealType] AS vdt');
            if (cols.thirdPartyPartnerDealStructure) {
                sets.push('ef.[ThirdPartyPartnerDealStructure] AS tppds');
            }
            if (cols.venueDealTypeId) {
                sets.push('ef.[VenueDealTypeID] AS vdtid');
                sets.push('vdt_lk.[VenueDealTypeName] AS vdtname');
            }
            if (!sets.length)
                return base;
            const join = cols.venueDealTypeId
                ? 'LEFT JOIN dbo.VenueDealType vdt_lk ON vdt_lk.VenueDealTypeID = ef.VenueDealTypeID'
                : '';
            const r = await this.dataSource.query(`SELECT ${sets.join(', ')} FROM dbo.EngagementFinances ef ${join} WHERE ef.[FinanceID] = ${fid}`);
            const row0 = r?.[0];
            if (!row0)
                return base;
            const vdtidRaw = cols.venueDealTypeId ? pickRaw(row0, 'vdtid') : null;
            const vdtid = vdtidRaw == null || vdtidRaw === '' ? null : Math.floor(Number(vdtidRaw));
            return {
                ...base,
                venueDealType: cols.venueDealType
                    ? this.normalizeVenueDealType(pickRaw(row0, 'vdt'))
                    : base.venueDealType,
                thirdPartyPartnerDealStructure: cols.thirdPartyPartnerDealStructure
                    ? this.normalizeThirdPartyPartnerDealStructure(pickRaw(row0, 'tppds'))
                    : base.thirdPartyPartnerDealStructure,
                venueDealTypeId: cols.venueDealTypeId
                    ? Number.isFinite(vdtid) && vdtid > 0
                        ? vdtid
                        : null
                    : base.venueDealTypeId,
                venueDealTypeName: cols.venueDealTypeId
                    ? (() => {
                        const n = String(pickRaw(row0, 'vdtname') ?? '').trim();
                        return n || null;
                    })()
                    : base.venueDealTypeName,
            };
        }
        catch {
            return base;
        }
    }
    async tryPersistFinanceDealStructures(financeId, dto) {
        const fid = financeId == null ? NaN : Math.floor(Number(financeId));
        if (!Number.isFinite(fid) || fid < 1)
            return;
        const cols = await this.engagementFinancesGetDealStructureColumns();
        if (!cols.venueDealType &&
            !cols.thirdPartyPartnerDealStructure &&
            !cols.venueDealTypeId) {
            return;
        }
        const sets = [];
        if (cols.venueDealType && dto.venueDealType !== undefined) {
            const v = this.normalizeVenueDealType(dto.venueDealType);
            sets.push(`[VenueDealType] = ${v == null ? 'NULL' : this.escapeSqlNVarCharLiteral(v)}`);
        }
        if (cols.thirdPartyPartnerDealStructure &&
            dto.thirdPartyPartnerDealStructure !== undefined) {
            const v = this.normalizeThirdPartyPartnerDealStructure(dto.thirdPartyPartnerDealStructure);
            sets.push(`[ThirdPartyPartnerDealStructure] = ${v == null ? 'NULL' : this.escapeSqlNVarCharLiteral(v)}`);
        }
        if (cols.venueDealTypeId && dto.venueDealTypeId !== undefined) {
            const id = dto.venueDealTypeId == null
                ? null
                : Math.floor(Number(dto.venueDealTypeId));
            sets.push(`[VenueDealTypeID] = ${id == null || !Number.isFinite(id) || id < 1 ? 'NULL' : id}`);
        }
        if (!sets.length)
            return;
        await this.dataSource.query(`UPDATE dbo.EngagementFinances SET ${sets.join(', ')} WHERE [FinanceID] = ${fid}`);
    }
    async engagementFinancesHasBookingColumns() {
        if (this.engagementFinanceBookingColsPresent !== null) {
            return this.engagementFinanceBookingColsPresent;
        }
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'PromoterPartnerContactID') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'TourManagerContactID')
        THEN 1 ELSE 0 END AS ok
      `);
            const row0 = r?.[0];
            const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
            const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
            this.engagementFinanceBookingColsPresent = ok;
            return ok;
        }
        catch {
            this.engagementFinanceBookingColsPresent = false;
            return false;
        }
    }
    async engagementFinancesHasContractLinkColumns() {
        if (this.engagementFinanceContractLinkColsPresent !== null) {
            return this.engagementFinanceContractLinkColsPresent;
        }
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'AttractionContractSharePointLink') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'PartiallyExecutedAttractionContractSharePointLink') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'FullyExecutedAttractionContractSharePointLink')
        THEN 1 ELSE 0 END AS ok
      `);
            const row0 = r?.[0];
            const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
            const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
            this.engagementFinanceContractLinkColsPresent = ok;
            return ok;
        }
        catch {
            this.engagementFinanceContractLinkColsPresent = false;
            return false;
        }
    }
    async mergeFinanceBookingFieldsFromDb(financeId, base) {
        const hasContactCols = await this.engagementFinancesHasBookingColumns();
        const hasLinkCols = await this.engagementFinancesHasContractLinkColumns();
        if (!hasContactCols && !hasLinkCols)
            return base;
        try {
            const fid = Math.floor(Number(financeId));
            if (!Number.isFinite(fid) || fid < 1)
                return base;
            const selects = [];
            const joins = [];
            if (hasContactCols) {
                selects.push('ef.[PromoterPartnerContactID] AS ppContactId', 'ef.[TourManagerContactID] AS tmContactId', "ppc.FirstName + ' ' + ppc.LastName AS ppContactName", "tmc.FirstName + ' ' + tmc.LastName AS tmContactName");
                joins.push('LEFT JOIN dbo.Contact ppc ON ppc.ContactID = ef.[PromoterPartnerContactID]', 'LEFT JOIN dbo.Contact tmc ON tmc.ContactID = ef.[TourManagerContactID]');
            }
            if (hasLinkCols) {
                selects.push('ef.[AttractionContractSharePointLink] AS acLink', 'ef.[PartiallyExecutedAttractionContractSharePointLink] AS peLink', 'ef.[FullyExecutedAttractionContractSharePointLink] AS feLink');
            }
            if (!selects.length)
                return base;
            const r = await this.dataSource.query(`SELECT ${selects.join(', ')} FROM dbo.EngagementFinances ef ${joins.join(' ')} WHERE ef.[FinanceID] = ${fid}`);
            const row0 = r?.[0];
            if (!row0)
                return base;
            const merged = { ...base };
            if (hasContactCols) {
                const ppId = pickRaw(row0, 'ppContactId');
                const tmId = pickRaw(row0, 'tmContactId');
                const ppName = pickRaw(row0, 'ppContactName');
                const tmName = pickRaw(row0, 'tmContactName');
                merged.promoterPartnerContactId = ppId == null ? null : Math.trunc(Number(ppId)) || null;
                merged.promoterPartnerContactName = ppName == null || ppName === '' ? null : String(ppName).trim();
                merged.tourManagerContactId = tmId == null ? null : Math.trunc(Number(tmId)) || null;
                merged.tourManagerContactName = tmName == null || tmName === '' ? null : String(tmName).trim();
            }
            if (hasLinkCols) {
                const acLink = pickRaw(row0, 'acLink');
                const peLink = pickRaw(row0, 'peLink');
                const feLink = pickRaw(row0, 'feLink');
                merged.attractionContractSharePointLink = acLink == null || acLink === '' ? null : String(acLink).slice(0, 2048);
                merged.partiallyExecutedAttractionContractSharePointLink = peLink == null || peLink === '' ? null : String(peLink).slice(0, 2048);
                merged.fullyExecutedAttractionContractSharePointLink = feLink == null || feLink === '' ? null : String(feLink).slice(0, 2048);
            }
            return merged;
        }
        catch {
            return base;
        }
    }
    async tryPersistFinanceBookingFields(financeId, dto) {
        const fid = financeId == null ? NaN : Math.floor(Number(financeId));
        if (!Number.isFinite(fid) || fid < 1)
            return;
        const hasContactCols = await this.engagementFinancesHasBookingColumns();
        const hasLinkCols = await this.engagementFinancesHasContractLinkColumns();
        if (!hasContactCols && !hasLinkCols)
            return;
        const sets = [];
        if (hasContactCols) {
            if (dto.promoterPartnerContactId !== undefined) {
                sets.push(`[PromoterPartnerContactID] = ${dto.promoterPartnerContactId == null ? 'NULL' : Math.trunc(Number(dto.promoterPartnerContactId))}`);
            }
            if (dto.tourManagerContactId !== undefined) {
                sets.push(`[TourManagerContactID] = ${dto.tourManagerContactId == null ? 'NULL' : Math.trunc(Number(dto.tourManagerContactId))}`);
            }
        }
        if (hasLinkCols) {
            if (dto.attractionContractSharePointLink !== undefined) {
                const v = dto.attractionContractSharePointLink;
                sets.push(`[AttractionContractSharePointLink] = ${v == null || String(v).trim() === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(v).trim().slice(0, 2048))}`);
            }
            if (dto.partiallyExecutedAttractionContractSharePointLink !== undefined) {
                const v = dto.partiallyExecutedAttractionContractSharePointLink;
                sets.push(`[PartiallyExecutedAttractionContractSharePointLink] = ${v == null || String(v).trim() === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(v).trim().slice(0, 2048))}`);
            }
            if (dto.fullyExecutedAttractionContractSharePointLink !== undefined) {
                const v = dto.fullyExecutedAttractionContractSharePointLink;
                sets.push(`[FullyExecutedAttractionContractSharePointLink] = ${v == null || String(v).trim() === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(v).trim().slice(0, 2048))}`);
            }
        }
        if (!sets.length)
            return;
        await this.dataSource.query(`UPDATE dbo.EngagementFinances SET ${sets.join(', ')} WHERE [FinanceID] = ${fid}`);
    }
    async engagementFinancesHasEventBusinessColumns() {
        if (this.engagementFinanceEventBusinessColsPresent !== null) {
            return this.engagementFinanceEventBusinessColsPresent;
        }
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'EventBusinessManagerContactID') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'VenueSettlementFileSharePointLink') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'CompensationRoyaltyAmount')
        THEN 1 ELSE 0 END AS ok
      `);
            const row0 = r?.[0];
            const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
            const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
            this.engagementFinanceEventBusinessColsPresent = ok;
            return ok;
        }
        catch {
            this.engagementFinanceEventBusinessColsPresent = false;
            return false;
        }
    }
    async mergeFinanceEventBusinessFieldsFromDb(financeId, base) {
        if (!(await this.engagementFinancesHasEventBusinessColumns()))
            return base;
        try {
            const fid = Math.floor(Number(financeId));
            if (!Number.isFinite(fid) || fid < 1)
                return base;
            const r = await this.dataSource.query(`
        SELECT
          ef.[EventBusinessManagerContactID]            AS ebmId,
          ebmc.FirstName + ' ' + ebmc.LastName          AS ebmName,
          ef.[EventBusinessAssistantManagerContactID]   AS ebamId,
          ebamc.FirstName + ' ' + ebamc.LastName        AS ebamName,
          ef.[VenueSettlementContactID]                 AS vscId,
          vscc.FirstName + ' ' + vscc.LastName          AS vscName,
          ef.[VenueSettlementFileSharePointLink]        AS vsLink,
          ef.[PartnerSettlementFileSharePointLink]      AS psLink,
          ef.[SalesTaxRemittedBy]                       AS stRemittedBy,
          ef.[FexVenueAgreementLink]                    AS fexVenueLink,
          ef.[VenueDepositRequired]                     AS venueDeposit,
          ef.[WithholdingPayee]                         AS whPayee,
          ef.[WithholdingPaymentMethod]                 AS whPayMethod,
          ef.[WithholdingFormToAttractionLink]          AS whAttrLink,
          ef.[WithholdingFormToMunicipalityLink]        AS whMuniLink,
          ef.[WithholdingQuickbooksNumber]              AS whQb,
          ef.[WithholdingWaiver]                        AS whWaiver,
          ef.[WithholdingCompletedWaiverLink]           AS whCompleted,
          ef.[TourWaiverLink]                           AS tourWaiver,
          ef.[WithholdingExceptions]                    AS whExceptions,
          ef.[CompensationRoyaltyAmount]                AS compRoyalty,
          ef.[CompensationOverageAmount]                AS compOverage,
          ef.[CompensationBuyouts]                      AS compBuyouts,
          ef.[CompensationDirectCharges]                AS compDirect,
          ef.[CompensationReimbursibles]                AS compReimb,
          ef.[FinanceJob]                               AS finJob
        FROM dbo.EngagementFinances ef
        LEFT JOIN dbo.Contact ebmc  ON ebmc.ContactID  = ef.[EventBusinessManagerContactID]
        LEFT JOIN dbo.Contact ebamc ON ebamc.ContactID = ef.[EventBusinessAssistantManagerContactID]
        LEFT JOIN dbo.Contact vscc  ON vscc.ContactID  = ef.[VenueSettlementContactID]
        WHERE ef.[FinanceID] = ${fid}
      `);
            const row0 = r?.[0];
            if (!row0)
                return base;
            const toStr = (k, max = 2048) => {
                const v = pickRaw(row0, k);
                return v == null || v === '' ? null : String(v).trim().slice(0, max) || null;
            };
            const toContactId = (k) => {
                const v = pickRaw(row0, k);
                return v == null ? null : Math.trunc(Number(v)) || null;
            };
            const toContactName = (k) => {
                const v = pickRaw(row0, k);
                return v == null || v === '' ? null : String(v).trim() || null;
            };
            const toNum = (k) => {
                const v = pickRaw(row0, k);
                if (v == null)
                    return null;
                const n = Number(v);
                return Number.isFinite(n) ? n : null;
            };
            const toBit = (k) => {
                const v = pickRaw(row0, k);
                if (v == null)
                    return null;
                return v === 1 || v === true || v === '1' || v === 'true';
            };
            return {
                ...base,
                eventBusinessManagerContactId: toContactId('ebmId'),
                eventBusinessManagerContactName: toContactName('ebmName'),
                eventBusinessAssistantManagerContactId: toContactId('ebamId'),
                eventBusinessAssistantManagerContactName: toContactName('ebamName'),
                venueSettlementContactId: toContactId('vscId'),
                venueSettlementContactName: toContactName('vscName'),
                venueSettlementFileSharePointLink: toStr('vsLink'),
                partnerSettlementFileSharePointLink: toStr('psLink'),
                salesTaxRemittedBy: toStr('stRemittedBy', 100),
                fexVenueAgreementLink: toStr('fexVenueLink'),
                venueDepositRequired: toBit('venueDeposit'),
                withholdingPayee: toStr('whPayee', 255),
                withholdingPaymentMethod: toStr('whPayMethod', 255),
                withholdingFormToAttractionLink: toStr('whAttrLink'),
                withholdingFormToMunicipalityLink: toStr('whMuniLink'),
                withholdingQuickbooksNumber: toStr('whQb', 100),
                withholdingWaiver: toStr('whWaiver', 10),
                withholdingCompletedWaiverLink: toStr('whCompleted'),
                tourWaiverLink: toStr('tourWaiver'),
                withholdingExceptions: toStr('whExceptions', 4000),
                compensationRoyaltyAmount: toNum('compRoyalty'),
                compensationOverageAmount: toNum('compOverage'),
                compensationBuyouts: toNum('compBuyouts'),
                compensationDirectCharges: toNum('compDirect'),
                compensationReimbursibles: toNum('compReimb'),
                financeJob: toStr('finJob', 255),
            };
        }
        catch {
            return base;
        }
    }
    async tryPersistFinanceEventBusinessFields(financeId, dto) {
        const fid = financeId == null ? NaN : Math.floor(Number(financeId));
        if (!Number.isFinite(fid) || fid < 1)
            return;
        if (!(await this.engagementFinancesHasEventBusinessColumns()))
            return;
        const sets = [];
        const intField = (col, v) => {
            if (v !== undefined)
                sets.push(`[${col}] = ${v == null ? 'NULL' : Math.trunc(Number(v))}`);
        };
        const strField = (col, v, max) => {
            if (v !== undefined)
                sets.push(`[${col}] = ${v == null || String(v).trim() === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(v).trim().slice(0, max))}`);
        };
        const numField = (col, v) => {
            if (v !== undefined)
                sets.push(`[${col}] = ${v == null ? 'NULL' : Number(v)}`);
        };
        const bitField = (col, v) => {
            if (v !== undefined)
                sets.push(`[${col}] = ${v == null ? 'NULL' : v ? '1' : '0'}`);
        };
        intField('EventBusinessManagerContactID', dto.eventBusinessManagerContactId);
        intField('EventBusinessAssistantManagerContactID', dto.eventBusinessAssistantManagerContactId);
        intField('VenueSettlementContactID', dto.venueSettlementContactId);
        strField('FexVenueAgreementLink', dto.fexVenueAgreementLink, 2048);
        bitField('VenueDepositRequired', dto.venueDepositRequired);
        strField('WithholdingPayee', dto.withholdingPayee, 255);
        strField('WithholdingPaymentMethod', dto.withholdingPaymentMethod, 255);
        strField('WithholdingFormToAttractionLink', dto.withholdingFormToAttractionLink, 2048);
        strField('WithholdingFormToMunicipalityLink', dto.withholdingFormToMunicipalityLink, 2048);
        strField('WithholdingQuickbooksNumber', dto.withholdingQuickbooksNumber, 100);
        strField('WithholdingWaiver', dto.withholdingWaiver, 10);
        strField('WithholdingCompletedWaiverLink', dto.withholdingCompletedWaiverLink, 2048);
        strField('TourWaiverLink', dto.tourWaiverLink, 2048);
        strField('WithholdingExceptions', dto.withholdingExceptions, 4000);
        numField('CompensationRoyaltyAmount', dto.compensationRoyaltyAmount);
        numField('CompensationOverageAmount', dto.compensationOverageAmount);
        numField('CompensationBuyouts', dto.compensationBuyouts);
        numField('CompensationDirectCharges', dto.compensationDirectCharges);
        numField('CompensationReimbursibles', dto.compensationReimbursibles);
        strField('FinanceJob', dto.financeJob, 255);
        if (!sets.length)
            return;
        await this.dataSource.query(`UPDATE dbo.EngagementFinances SET ${sets.join(', ')} WHERE [FinanceID] = ${fid}`);
        await this.tryPersistFinanceCustomer(fid, dto);
        await this.tryPersistFinancePromoterPartnerCompany(fid, dto);
    }
    engagementFinanceCustomerColPresent = null;
    async engagementFinancesHasCustomerColumn() {
        if (this.engagementFinanceCustomerColPresent !== null)
            return this.engagementFinanceCustomerColPresent;
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM sys.columns c
          INNER JOIN sys.tables t ON c.object_id = t.object_id
          INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
          WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'FinanceCustomer'
        ) THEN 1 ELSE 0 END AS ok`);
            const raw = pickRaw(r?.[0] ?? {}, 'ok');
            this.engagementFinanceCustomerColPresent =
                raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
            return this.engagementFinanceCustomerColPresent;
        }
        catch {
            this.engagementFinanceCustomerColPresent = false;
            return false;
        }
    }
    async mergeFinanceCustomerFromDb(financeId, base) {
        if (!(await this.engagementFinancesHasCustomerColumn()))
            return base;
        try {
            const fid = Math.floor(Number(financeId));
            if (!Number.isFinite(fid) || fid < 1)
                return base;
            const r = await this.dataSource.query(`SELECT [FinanceCustomer] AS fc FROM dbo.EngagementFinances WHERE [FinanceID] = ${fid}`);
            const row0 = r?.[0];
            if (!row0)
                return base;
            const fc = pickRaw(row0, 'fc');
            return {
                ...base,
                financeCustomer: fc == null || fc === '' ? null : String(fc).trim().slice(0, 255) || null,
            };
        }
        catch {
            return base;
        }
    }
    async tryPersistFinanceCustomer(financeId, dto) {
        if (dto.financeCustomer === undefined)
            return;
        if (!(await this.engagementFinancesHasCustomerColumn()))
            return;
        const fid = Math.floor(Number(financeId));
        if (!Number.isFinite(fid) || fid < 1)
            return;
        const val = dto.financeCustomer == null || String(dto.financeCustomer).trim() === ''
            ? 'NULL'
            : this.escapeSqlNVarCharLiteral(String(dto.financeCustomer).trim().slice(0, 255));
        await this.dataSource.query(`UPDATE dbo.EngagementFinances SET [FinanceCustomer] = ${val} WHERE [FinanceID] = ${fid}`);
    }
    engagementFinancePromoterPartnerCompanyColPresent = null;
    async engagementFinancesHasPromoterPartnerCompanyColumn() {
        if (this.engagementFinancePromoterPartnerCompanyColPresent !== null)
            return this.engagementFinancePromoterPartnerCompanyColPresent;
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM sys.columns c
          INNER JOIN sys.tables t ON c.object_id = t.object_id
          INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
          WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'PromoterPartnerCompanyID'
        ) THEN 1 ELSE 0 END AS ok`);
            const raw = pickRaw(r?.[0] ?? {}, 'ok');
            this.engagementFinancePromoterPartnerCompanyColPresent =
                raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
            return this.engagementFinancePromoterPartnerCompanyColPresent;
        }
        catch {
            this.engagementFinancePromoterPartnerCompanyColPresent = false;
            return false;
        }
    }
    async mergeFinancePromoterPartnerCompanyFromDb(financeId, base) {
        if (!(await this.engagementFinancesHasPromoterPartnerCompanyColumn()))
            return base;
        try {
            const fid = Math.floor(Number(financeId));
            if (!Number.isFinite(fid) || fid < 1)
                return base;
            const r = await this.dataSource.query(`SELECT ef.[PromoterPartnerCompanyID] AS cid, c.CompanyName AS cname
         FROM dbo.EngagementFinances ef
         LEFT JOIN dbo.Company c ON c.CompanyID = ef.[PromoterPartnerCompanyID]
         WHERE ef.[FinanceID] = ${fid}`);
            const row0 = r?.[0];
            if (!row0)
                return base;
            const cid = pickRaw(row0, 'cid');
            const cname = pickRaw(row0, 'cname');
            return {
                ...base,
                promoterPartnerCompanyId: cid == null ? null : Math.trunc(Number(cid)) || null,
                promoterPartnerCompanyName: cname == null || cname === '' ? null : String(cname).trim() || null,
            };
        }
        catch {
            return base;
        }
    }
    async tryPersistFinancePromoterPartnerCompany(financeId, dto) {
        if (dto.promoterPartnerCompanyId === undefined)
            return;
        if (!(await this.engagementFinancesHasPromoterPartnerCompanyColumn()))
            return;
        const fid = Math.floor(Number(financeId));
        if (!Number.isFinite(fid) || fid < 1)
            return;
        const val = dto.promoterPartnerCompanyId == null
            ? 'NULL'
            : Math.trunc(Number(dto.promoterPartnerCompanyId));
        await this.dataSource.query(`UPDATE dbo.EngagementFinances SET [PromoterPartnerCompanyID] = ${val} WHERE [FinanceID] = ${fid}`);
    }
    async engagementProductionHasTimeColumns() {
        if (this.engagementProductionTimeColsPresent !== null) {
            return this.engagementProductionTimeColsPresent;
        }
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementProduction' AND c.name = N'RehearsalTime'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementProduction' AND c.name = N'LoadInTime'
          )
        THEN 1 ELSE 0 END AS ok
      `);
            const row0 = r?.[0];
            const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
            const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
            this.engagementProductionTimeColsPresent = ok;
            return ok;
        }
        catch {
            this.engagementProductionTimeColsPresent = false;
            return false;
        }
    }
    normalizeTicketingAdmin(value) {
        const t = String(value ?? '').trim().toLowerCase();
        if (!t)
            return null;
        if (t === 'venue')
            return 'Venue';
        if (t === 'partner')
            return 'Partner';
        if (t === 'iae contract')
            return 'IAE Contract';
        return null;
    }
    normalizeTicketingPick(value, a, b) {
        const t = String(value ?? '').trim().toLowerCase();
        if (!t)
            return null;
        if (t === a.toLowerCase())
            return a;
        if (t === b.toLowerCase())
            return b;
        return null;
    }
    async performanceTicketingHasAdvancedColumns() {
        if (this.performanceTicketingAdvancedColsPresent !== null) {
            return this.performanceTicketingAdvancedColsPresent;
        }
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'SellableCapacity'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'GrossPotentialRevenue'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'TicketingCompanyID'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'TicketingAdministrator'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'BoxOfficeLaborRequired'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'FacilityFeePlacement'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'FacilityFeeAmount'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'DynamicPricingType'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'ServiceChargeRebateAmount'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'ServiceChargeBumpAmount'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'CreditCardFeePlacement'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'CreditCardFeePercent'
          )
        THEN 1 ELSE 0 END AS ok
      `);
            const row0 = r?.[0];
            const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
            const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
            this.performanceTicketingAdvancedColsPresent = ok;
            return ok;
        }
        catch {
            this.performanceTicketingAdvancedColsPresent = false;
            return false;
        }
    }
    async performanceTicketingHasExtendedColumns() {
        if (this.performanceTicketingExtendedColsPresent !== null) {
            return this.performanceTicketingExtendedColsPresent;
        }
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'PerformanceTicketing' AND c.name=N'TicketingAdminContactID') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'PerformanceTicketing' AND c.name=N'TicketingAdminCompanyID') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'PerformanceTicketing' AND c.name=N'PublicSaleLinkID') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'PerformanceTicketing' AND c.name=N'IsIAETMDeal') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'PerformanceTicketing' AND c.name=N'PreSaleEndDate')
        THEN 1 ELSE 0 END AS ok
      `);
            const row0 = r?.[0];
            const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
            const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
            this.performanceTicketingExtendedColsPresent = ok;
            return ok;
        }
        catch {
            this.performanceTicketingExtendedColsPresent = false;
            return false;
        }
    }
    async performanceTicketingHasPasswordColumns() {
        if (this.performanceTicketingPasswordColsPresent !== null) {
            return this.performanceTicketingPasswordColsPresent;
        }
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.tables t INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'PerformancePromoPassword')
        THEN 1 ELSE 0 END AS ok
      `);
            const row0 = r?.[0];
            const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
            const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
            this.performanceTicketingPasswordColsPresent = ok;
            return ok;
        }
        catch {
            this.performanceTicketingPasswordColsPresent = false;
            return false;
        }
    }
    async engagementFinancesHasIaeTicketingManagerCol() {
        if (this.engagementFinancesIaeTicketingManagerColPresent !== null) {
            return this.engagementFinancesIaeTicketingManagerColPresent;
        }
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'IAETicketingManagerContactID')
        THEN 1 ELSE 0 END AS ok
      `);
            const row0 = r?.[0];
            const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
            const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
            this.engagementFinancesIaeTicketingManagerColPresent = ok;
            return ok;
        }
        catch {
            this.engagementFinancesIaeTicketingManagerColPresent = false;
            return false;
        }
    }
    async mergePerformanceTicketingAdvancedFromDb(ticketingId, base) {
        if (!(await this.performanceTicketingHasAdvancedColumns()))
            return base;
        try {
            const tid = Math.floor(Number(ticketingId));
            if (!Number.isFinite(tid) || tid < 1)
                return base;
            const r = await this.dataSource.query(`SELECT
          [SellableCapacity] AS sc,
          [GrossPotentialRevenue] AS gpr,
          [TicketingCompanyID] AS tsc,
          [TicketingAdministrator] AS ta,
          [BoxOfficeLaborRequired] AS bol,
          [FacilityFeePlacement] AS fft,
          [FacilityFeeAmount] AS ffa,
          [DynamicPricingType] AS dpm,
          [ServiceChargeRebateAmount] AS ra,
          [ServiceChargeBumpAmount] AS ba,
          [CreditCardFeePlacement] AS ccft,
          [CreditCardFeePercent] AS ccfap,
          [CompTicketForm] AS ctf,
          [CompTicketExcelSheet] AS ctes
         FROM dbo.PerformanceTicketing WHERE [TicketingID] = ${tid}`);
            const row0 = r?.[0];
            if (!row0)
                return base;
            const sc = pickRaw(row0, 'sc');
            const tsc = pickRaw(row0, 'tsc');
            const merged = {
                ...base,
                sellableCapacity: sc == null || sc === '' ? null : Number.isFinite(Number(sc)) ? Math.trunc(Number(sc)) : null,
                grossPotentialRevenue: this.mapFinanceNumber(pickRaw(row0, 'gpr')),
                ticketingSystemCompanyId: tsc == null || tsc === ''
                    ? null
                    : Number.isFinite(Number(tsc))
                        ? Math.trunc(Number(tsc))
                        : null,
                ticketingAdministrator: this.normalizeTicketingAdmin(pickRaw(row0, 'ta')),
                boxOfficeLaborStaffingRequired: this.mapBit(pickRaw(row0, 'bol')),
                facilityFeeType: this.normalizeTicketingPick(pickRaw(row0, 'fft'), 'Inside Face Value', 'Outside Face Value'),
                facilityFeeAmount: this.mapFinanceNumber(pickRaw(row0, 'ffa')),
                dynamicPricingMode: this.normalizeTicketingPick(pickRaw(row0, 'dpm'), 'Self Managed', '3rd Party Managed'),
                serviceChargeRevenueShare: null,
                rebateAmount: this.mapFinanceNumber(pickRaw(row0, 'ra')),
                bumpAmount: this.mapFinanceNumber(pickRaw(row0, 'ba')),
                creditCardFeesType: this.normalizeTicketingPick(pickRaw(row0, 'ccft'), 'Inside Service Charge', 'Budget Line Item'),
                creditCardFeesAmountPercent: this.mapFinanceNumber(pickRaw(row0, 'ccfap')),
                compTicketForm: pickRaw(row0, 'ctf') != null && pickRaw(row0, 'ctf') !== '' ? String(pickRaw(row0, 'ctf')).trim() : null,
                compTicketExcelSheet: pickRaw(row0, 'ctes') != null && pickRaw(row0, 'ctes') !== '' ? String(pickRaw(row0, 'ctes')).trim() : null,
                salesTaxType: null,
                salesTaxAmountPercent: null,
            };
            return this.mergePerformanceTicketingExtendedFromDb(ticketingId, await this.mergePerformanceTicketingPasswordFromDb(ticketingId, merged));
        }
        catch {
            return base;
        }
    }
    async mergePerformanceTicketingExtendedFromDb(ticketingId, base) {
        if (!(await this.performanceTicketingHasExtendedColumns()))
            return base;
        try {
            const tid = Math.floor(Number(ticketingId));
            if (!Number.isFinite(tid) || tid < 1)
                return base;
            const r = await this.dataSource.query(`SELECT
          [TicketingAdminContactID] AS tacid,
          [TicketingAdminCompanyID] AS taccid,
          [PublicSaleLinkID] AS pslid,
          [IsIAETMDeal] AS iatm,
          CONVERT(varchar(10), [PreSaleEndDate], 120) AS psed,
          CONVERT(varchar(10), [PreSaleRegistrationStartDate], 120) AS psrsd,
          CONVERT(varchar(10), [PreSaleRegistrationEndDate], 120) AS psred
         FROM dbo.PerformanceTicketing WHERE [TicketingID] = ${tid}`);
            const row0 = r?.[0];
            if (!row0)
                return base;
            const tacid = pickRaw(row0, 'tacid');
            const taccid = pickRaw(row0, 'taccid');
            const pslid = pickRaw(row0, 'pslid');
            const taContactId = tacid != null && tacid !== '' && Number.isFinite(Number(tacid)) ? Math.trunc(Number(tacid)) : null;
            const taCompanyId = taccid != null && taccid !== '' && Number.isFinite(Number(taccid)) ? Math.trunc(Number(taccid)) : null;
            const pubSaleLinkId = pslid != null && pslid !== '' && Number.isFinite(Number(pslid)) ? Math.trunc(Number(pslid)) : null;
            const [taContactName, taCompanyName, pubSaleLinkUrl] = await Promise.all([
                this.lookupContactName(taContactId),
                taCompanyId != null ? this.lookupCompanyName(taCompanyId) : Promise.resolve(null),
                pubSaleLinkId != null
                    ? this.linkRepo.findOne({ where: { linkId: pubSaleLinkId } }).then((l) => l?.linkUrl ?? null)
                    : Promise.resolve(null),
            ]);
            const psed = pickRaw(row0, 'psed');
            const psrsd = pickRaw(row0, 'psrsd');
            const psred = pickRaw(row0, 'psred');
            return {
                ...base,
                ticketingAdminContactId: taContactId,
                ticketingAdminContactName: taContactName,
                ticketingAdminCompanyId: taCompanyId,
                ticketingAdminCompanyName: taCompanyName,
                publicSaleLinkId: pubSaleLinkId,
                publicSaleLinkUrl: pubSaleLinkUrl,
                preSaleEndDate: psed != null && psed !== '' ? String(psed).slice(0, 10) : null,
                preSaleRegistrationStartDate: psrsd != null && psrsd !== '' ? String(psrsd).slice(0, 10) : null,
                preSaleRegistrationEndDate: psred != null && psred !== '' ? String(psred).slice(0, 10) : null,
                isIAETMDeal: this.mapBit(pickRaw(row0, 'iatm')),
            };
        }
        catch {
            return base;
        }
    }
    async mergePerformanceTicketingPasswordFromDb(ticketingId, base) {
        if (!(await this.performanceTicketingHasPasswordColumns()))
            return base;
        try {
            const pid = base.performanceId;
            if (!Number.isFinite(pid) || pid < 1)
                return base;
            const pwRows = await this.dataSource.query(`SELECT
          [PasswordType] AS ptype,
          [Password] AS pw,
          CONVERT(varchar(10),[ActiveDateStart],120) AS ds,
          CONVERT(varchar(10),[ActiveDateEnd],120) AS de,
          [DiscountType] AS dt,
          [DiscountAmount] AS da
         FROM dbo.PerformancePromoPassword WHERE [PerformanceID] = ${pid}`);
            const strOrNull = (v) => v == null || v === '' ? null : String(v).trim();
            const dateOrNull = (v) => v == null || v === '' ? null : String(v).slice(0, 10);
            let presalePassword = null;
            let presalePasswordDateStart = null;
            let presalePasswordDateEnd = null;
            let presaleSpecialPricePassword = null;
            let presaleSpecialPricePasswordDateStart = null;
            let presaleSpecialPricePasswordDateEnd = null;
            let presaleSpecialPriceDiscountType = null;
            let presaleSpecialPriceDiscountAmount = null;
            let publicSaleSpecialPricePassword = null;
            let publicSaleSpecialPricePasswordDateStart = null;
            let publicSaleSpecialPricePasswordDateEnd = null;
            let publicSaleSpecialPriceDiscountType = null;
            let publicSaleSpecialPriceDiscountAmount = null;
            for (const row of pwRows) {
                const ptype = strOrNull(pickRaw(row, 'ptype'))?.toLowerCase();
                if (ptype === 'presale') {
                    presalePassword = strOrNull(pickRaw(row, 'pw'));
                    presalePasswordDateStart = dateOrNull(pickRaw(row, 'ds'));
                    presalePasswordDateEnd = dateOrNull(pickRaw(row, 'de'));
                }
                else if (ptype === 'presalespecialprice') {
                    presaleSpecialPricePassword = strOrNull(pickRaw(row, 'pw'));
                    presaleSpecialPricePasswordDateStart = dateOrNull(pickRaw(row, 'ds'));
                    presaleSpecialPricePasswordDateEnd = dateOrNull(pickRaw(row, 'de'));
                    presaleSpecialPriceDiscountType = strOrNull(pickRaw(row, 'dt'));
                    presaleSpecialPriceDiscountAmount = this.mapFinanceNumber(pickRaw(row, 'da'));
                }
                else if (ptype === 'publicsalespecialprice') {
                    publicSaleSpecialPricePassword = strOrNull(pickRaw(row, 'pw'));
                    publicSaleSpecialPricePasswordDateStart = dateOrNull(pickRaw(row, 'ds'));
                    publicSaleSpecialPricePasswordDateEnd = dateOrNull(pickRaw(row, 'de'));
                    publicSaleSpecialPriceDiscountType = strOrNull(pickRaw(row, 'dt'));
                    publicSaleSpecialPriceDiscountAmount = this.mapFinanceNumber(pickRaw(row, 'da'));
                }
            }
            let vipPackageOffered = null;
            let vipPackageName = null;
            let vipPackageBenefits = null;
            const vipRows = await this.dataSource.query(`SELECT [VIPPackageID] AS vpid, [IsOffered] AS iso, [PackageName] AS pn
         FROM dbo.VIPPackage WHERE [PerformanceID] = ${pid}`);
            if (vipRows.length > 0) {
                const vipRow = vipRows[0];
                vipPackageOffered = this.mapBit(pickRaw(vipRow, 'iso'));
                vipPackageName = strOrNull(pickRaw(vipRow, 'pn'));
                const vpid = pickRaw(vipRow, 'vpid');
                if (vpid != null && Number.isFinite(Number(vpid))) {
                    const benefitRows = await this.dataSource.query(`SELECT [VIPBenefitID] AS bid FROM dbo.VIPPackageBenefit WHERE [VIPPackageID] = ${Math.trunc(Number(vpid))}`);
                    if (benefitRows.length > 0) {
                        vipPackageBenefits = benefitRows.map((br) => String(pickRaw(br, 'bid')));
                    }
                }
            }
            return {
                ...base,
                presalePassword,
                presalePasswordDateStart,
                presalePasswordDateEnd,
                presaleSpecialPricePassword,
                presaleSpecialPricePasswordDateStart,
                presaleSpecialPricePasswordDateEnd,
                presaleSpecialPriceDiscountType,
                presaleSpecialPriceDiscountAmount,
                publicSaleSpecialPricePassword,
                publicSaleSpecialPricePasswordDateStart,
                publicSaleSpecialPricePasswordDateEnd,
                publicSaleSpecialPriceDiscountType,
                publicSaleSpecialPriceDiscountAmount,
                vipPackageOffered,
                vipPackageName,
                vipPackageBenefits,
                compTicketForm: null,
                compTicketExcelSheet: null,
            };
        }
        catch {
            return base;
        }
    }
    async tryPersistPerformanceTicketingAdvanced(ticketingId, dto, performanceId) {
        const tid = ticketingId == null ? NaN : Math.floor(Number(ticketingId));
        if (!Number.isFinite(tid) || tid < 1)
            return;
        if (!(await this.performanceTicketingHasAdvancedColumns()))
            return;
        const sets = [];
        if (dto.sellableCapacity !== undefined) {
            sets.push(`[SellableCapacity] = ${dto.sellableCapacity == null ? 'NULL' : Math.trunc(Number(dto.sellableCapacity))}`);
        }
        if (dto.grossPotentialRevenue !== undefined) {
            sets.push(`[GrossPotentialRevenue] = ${dto.grossPotentialRevenue == null ? 'NULL' : Number(dto.grossPotentialRevenue)}`);
        }
        if (dto.ticketingSystemCompanyId !== undefined) {
            sets.push(`[TicketingCompanyID] = ${dto.ticketingSystemCompanyId == null ? 'NULL' : Math.trunc(Number(dto.ticketingSystemCompanyId))}`);
        }
        if (dto.ticketingAdministrator !== undefined) {
            const v = this.normalizeTicketingAdmin(dto.ticketingAdministrator);
            sets.push(`[TicketingAdministrator] = ${v == null ? 'NULL' : this.escapeSqlNVarCharLiteral(v)}`);
        }
        if (dto.boxOfficeLaborStaffingRequired !== undefined) {
            sets.push(`[BoxOfficeLaborRequired] = ${dto.boxOfficeLaborStaffingRequired == null ? 'NULL' : dto.boxOfficeLaborStaffingRequired ? 1 : 0}`);
        }
        if (dto.facilityFeeType !== undefined) {
            const v = this.normalizeTicketingPick(dto.facilityFeeType, 'Inside Face Value', 'Outside Face Value');
            sets.push(`[FacilityFeePlacement] = ${v == null ? 'NULL' : this.escapeSqlNVarCharLiteral(v)}`);
        }
        if (dto.facilityFeeAmount !== undefined) {
            sets.push(`[FacilityFeeAmount] = ${dto.facilityFeeAmount == null ? 'NULL' : Number(dto.facilityFeeAmount)}`);
        }
        if (dto.dynamicPricingMode !== undefined) {
            const v = this.normalizeTicketingPick(dto.dynamicPricingMode, 'Self Managed', '3rd Party Managed');
            sets.push(`[DynamicPricingType] = ${v == null ? 'NULL' : this.escapeSqlNVarCharLiteral(v)}`);
        }
        if (dto.rebateAmount !== undefined) {
            sets.push(`[ServiceChargeRebateAmount] = ${dto.rebateAmount == null ? 'NULL' : Number(dto.rebateAmount)}`);
        }
        if (dto.bumpAmount !== undefined) {
            sets.push(`[ServiceChargeBumpAmount] = ${dto.bumpAmount == null ? 'NULL' : Number(dto.bumpAmount)}`);
        }
        if (dto.creditCardFeesType !== undefined) {
            const v = this.normalizeTicketingPick(dto.creditCardFeesType, 'Inside Service Charge', 'Budget Line Item');
            sets.push(`[CreditCardFeePlacement] = ${v == null ? 'NULL' : this.escapeSqlNVarCharLiteral(v)}`);
        }
        if (dto.creditCardFeesAmountPercent !== undefined) {
            sets.push(`[CreditCardFeePercent] = ${dto.creditCardFeesAmountPercent == null ? 'NULL' : Number(dto.creditCardFeesAmountPercent)}`);
        }
        if (dto.compTicketForm !== undefined) {
            sets.push(`[CompTicketForm] = ${dto.compTicketForm == null ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dto.compTicketForm).trim())}`);
        }
        if (dto.compTicketExcelSheet !== undefined) {
            sets.push(`[CompTicketExcelSheet] = ${dto.compTicketExcelSheet == null ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dto.compTicketExcelSheet).trim())}`);
        }
        if (sets.length) {
            await this.dataSource.query(`UPDATE dbo.PerformanceTicketing SET ${sets.join(', ')} WHERE [TicketingID] = ${tid}`);
        }
        await Promise.all([
            this.tryPersistPerformanceTicketingExtended(tid, dto),
            this.tryPersistPerformanceTicketingPassword(tid, dto, performanceId),
        ]);
    }
    async tryPersistPerformanceTicketingExtended(ticketingId, dto) {
        if (!(await this.performanceTicketingHasExtendedColumns()))
            return;
        const sets = [];
        if (dto.ticketingAdminContactId !== undefined) {
            sets.push(`[TicketingAdminContactID] = ${dto.ticketingAdminContactId == null ? 'NULL' : Math.trunc(Number(dto.ticketingAdminContactId))}`);
        }
        if (dto.ticketingAdminCompanyId !== undefined) {
            sets.push(`[TicketingAdminCompanyID] = ${dto.ticketingAdminCompanyId == null ? 'NULL' : Math.trunc(Number(dto.ticketingAdminCompanyId))}`);
        }
        if (dto.publicSaleLinkUrl !== undefined) {
            if (dto.publicSaleLinkUrl == null || String(dto.publicSaleLinkUrl).trim() === '') {
                sets.push(`[PublicSaleLinkID] = NULL`);
            }
            else {
                const urlVal = String(dto.publicSaleLinkUrl).trim().slice(0, 2048);
                const escaped = this.escapeSqlNVarCharLiteral(urlVal);
                const linkR = await this.dataSource.query(`DECLARE @lnkId INT;
           SELECT @lnkId = [LinkID] FROM dbo.Link WHERE [LinkURL] = ${escaped};
           IF @lnkId IS NULL
           BEGIN INSERT INTO dbo.Link ([LinkType], [LinkURL], [LinkName], [LinkPath]) VALUES (N'URL', ${escaped}, N'Public Sale Link', ${escaped}); SET @lnkId = SCOPE_IDENTITY(); END
           UPDATE dbo.PerformanceTicketing SET [PublicSaleLinkID] = @lnkId WHERE [TicketingID] = ${ticketingId};
           SELECT @lnkId AS lid`);
            }
        }
        if (dto.preSaleEndDate !== undefined) {
            sets.push(`[PreSaleEndDate] = ${dto.preSaleEndDate == null || dto.preSaleEndDate === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dto.preSaleEndDate).slice(0, 10))}`);
        }
        if (dto.preSaleRegistrationStartDate !== undefined) {
            sets.push(`[PreSaleRegistrationStartDate] = ${dto.preSaleRegistrationStartDate == null || dto.preSaleRegistrationStartDate === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dto.preSaleRegistrationStartDate).slice(0, 10))}`);
        }
        if (dto.preSaleRegistrationEndDate !== undefined) {
            sets.push(`[PreSaleRegistrationEndDate] = ${dto.preSaleRegistrationEndDate == null || dto.preSaleRegistrationEndDate === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dto.preSaleRegistrationEndDate).slice(0, 10))}`);
        }
        if (dto.isIAETMDeal !== undefined) {
            sets.push(`[IsIAETMDeal] = ${dto.isIAETMDeal == null ? 'NULL' : dto.isIAETMDeal ? 1 : 0}`);
        }
        if (!sets.length)
            return;
        await this.dataSource.query(`UPDATE dbo.PerformanceTicketing SET ${sets.join(', ')} WHERE [TicketingID] = ${ticketingId}`);
    }
    async tryPersistPerformanceTicketingPassword(ticketingId, dto, performanceId) {
        if (!(await this.performanceTicketingHasPasswordColumns()))
            return;
        const pid = performanceId ?? (ticketingId > 0 ? await this.getPerformanceIdFromTicketingId(ticketingId) : null);
        if (pid == null || !Number.isFinite(pid) || pid < 1)
            return;
        const upsertPromoPassword = async (passwordType, password, dateStart, dateEnd, discountType, discountAmount) => {
            if (password === undefined && dateStart === undefined && dateEnd === undefined && discountType === undefined && discountAmount === undefined)
                return;
            const escapedType = this.escapeSqlNVarCharLiteral(passwordType);
            if (password === null || password === '') {
                await this.dataSource.query(`DELETE FROM dbo.PerformancePromoPassword WHERE [PerformanceID] = ${pid} AND [PasswordType] = ${escapedType}`);
                return;
            }
            const pwSql = this.escapeSqlNVarCharLiteral(String(password).slice(0, 500));
            const dsSql = dateStart == null || dateStart === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dateStart).slice(0, 10));
            const deSql = dateEnd == null || dateEnd === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dateEnd).slice(0, 10));
            const dtSql = discountType == null || discountType === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(discountType).slice(0, 10));
            const daSql = discountAmount == null ? 'NULL' : String(Number(discountAmount));
            await this.dataSource.query(`IF EXISTS (SELECT 1 FROM dbo.PerformancePromoPassword WHERE [PerformanceID] = ${pid} AND [PasswordType] = ${escapedType})
           UPDATE dbo.PerformancePromoPassword SET [Password] = ${pwSql}, [ActiveDateStart] = ${dsSql}, [ActiveDateEnd] = ${deSql}, [DiscountType] = ${dtSql}, [DiscountAmount] = ${daSql} WHERE [PerformanceID] = ${pid} AND [PasswordType] = ${escapedType}
         ELSE
           INSERT INTO dbo.PerformancePromoPassword ([PerformanceID],[PasswordType],[Password],[ActiveDateStart],[ActiveDateEnd],[DiscountType],[DiscountAmount]) VALUES (${pid}, ${escapedType}, ${pwSql}, ${dsSql}, ${deSql}, ${dtSql}, ${daSql})`);
        };
        await Promise.all([
            upsertPromoPassword('PreSale', dto.presalePassword, dto.presalePasswordDateStart, dto.presalePasswordDateEnd),
            upsertPromoPassword('PreSaleSpecialPrice', dto.presaleSpecialPricePassword, dto.presaleSpecialPricePasswordDateStart, dto.presaleSpecialPricePasswordDateEnd, dto.presaleSpecialPriceDiscountType, dto.presaleSpecialPriceDiscountAmount),
            upsertPromoPassword('PublicSaleSpecialPrice', dto.publicSaleSpecialPricePassword, dto.publicSaleSpecialPricePasswordDateStart, dto.publicSaleSpecialPricePasswordDateEnd, dto.publicSaleSpecialPriceDiscountType, dto.publicSaleSpecialPriceDiscountAmount),
        ]);
        if (dto.vipPackageOffered !== undefined || dto.vipPackageName !== undefined || dto.vipPackageBenefits !== undefined) {
            const offeredSql = dto.vipPackageOffered == null ? '0' : dto.vipPackageOffered ? '1' : '0';
            const nameSql = dto.vipPackageName == null || dto.vipPackageName === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dto.vipPackageName).slice(0, 255));
            const vpResult = await this.dataSource.query(`DECLARE @vpid INT;
         SELECT @vpid = [VIPPackageID] FROM dbo.VIPPackage WHERE [PerformanceID] = ${pid};
         IF @vpid IS NULL
         BEGIN INSERT INTO dbo.VIPPackage ([PerformanceID],[IsOffered],[PackageName]) VALUES (${pid}, ${offeredSql}, ${nameSql}); SET @vpid = SCOPE_IDENTITY(); END
         ELSE
         BEGIN UPDATE dbo.VIPPackage SET [IsOffered] = ${offeredSql}, [PackageName] = ${nameSql} WHERE [VIPPackageID] = @vpid; END
         SELECT @vpid AS vpid`);
            const vpid = pickRaw(vpResult?.[0] ?? {}, 'vpid');
            if (dto.vipPackageBenefits !== undefined && vpid != null && Number.isFinite(Number(vpid))) {
                const vipPkgId = Math.trunc(Number(vpid));
                await this.dataSource.query(`DELETE FROM dbo.VIPPackageBenefit WHERE [VIPPackageID] = ${vipPkgId}`);
                if (Array.isArray(dto.vipPackageBenefits) && dto.vipPackageBenefits.length > 0) {
                    const values = dto.vipPackageBenefits
                        .filter((b) => b != null && String(b).trim() !== '' && Number.isFinite(Number(b)))
                        .map((b) => `(${vipPkgId}, ${Math.trunc(Number(b))})`)
                        .filter((_, i, arr) => arr.indexOf(_) === i);
                    if (values.length > 0) {
                        await this.dataSource.query(`INSERT INTO dbo.VIPPackageBenefit ([VIPPackageID],[VIPBenefitID]) VALUES ${values.join(', ')}`);
                    }
                }
            }
        }
    }
    async getPerformanceIdFromTicketingId(ticketingId) {
        try {
            const r = await this.dataSource.query(`SELECT [PerformanceID] AS pid FROM dbo.PerformanceTicketing WHERE [TicketingID] = ${Math.trunc(ticketingId)}`);
            const row0 = r?.[0];
            const pid = row0 ? pickRaw(row0, 'pid') : null;
            return pid != null && Number.isFinite(Number(pid)) ? Math.trunc(Number(pid)) : null;
        }
        catch {
            return null;
        }
    }
    async mergeEngagementProductionTimesFromDb(engagementId, base) {
        if (!(await this.engagementProductionHasTimeColumns()))
            return base;
        try {
            const eid = Math.floor(Number(engagementId));
            if (!Number.isFinite(eid) || eid < 1)
                return base;
            const r = await this.dataSource.query(`
        SELECT TOP 1
          CONVERT(varchar(8), ep.RehearsalTime, 108) AS rehearsalTime,
          CONVERT(varchar(8), ep.LoadInTime, 108) AS loadInTime
        FROM dbo.EngagementProduction ep
        WHERE ep.EngagementID = ${eid}
        ORDER BY ep.ProductionID DESC
      `);
            const row0 = r?.[0];
            if (!row0)
                return base;
            return {
                ...base,
                rehearsalTime: this.parseOpeningTimeOnly(pickRaw(row0, 'rehearsalTime')),
                loadInTime: this.parseOpeningTimeOnly(pickRaw(row0, 'loadInTime')),
            };
        }
        catch {
            return base;
        }
    }
    async tryPersistEngagementProductionTimes(productionId, dto) {
        const pid = productionId == null ? NaN : Math.floor(Number(productionId));
        if (!Number.isFinite(pid) || pid < 1)
            return;
        if (!(await this.engagementProductionHasTimeColumns()))
            return;
        const wantRehearsalTime = dto.rehearsalTime !== undefined;
        const wantLoadInTime = dto.loadInTime !== undefined;
        if (!wantRehearsalTime && !wantLoadInTime)
            return;
        const rtSql = wantRehearsalTime &&
            (dto.rehearsalTime == null || String(dto.rehearsalTime).trim() === '')
            ? 'NULL'
            : wantRehearsalTime
                ? this.escapeSqlNVarCharLiteral(this.normalizeTime(String(dto.rehearsalTime)).slice(0, 8))
                : null;
        const ltSql = wantLoadInTime &&
            (dto.loadInTime == null || String(dto.loadInTime).trim() === '')
            ? 'NULL'
            : wantLoadInTime
                ? this.escapeSqlNVarCharLiteral(this.normalizeTime(String(dto.loadInTime)).slice(0, 8))
                : null;
        const sets = [];
        if (wantRehearsalTime && rtSql != null)
            sets.push(`[RehearsalTime] = ${rtSql}`);
        if (wantLoadInTime && ltSql != null)
            sets.push(`[LoadInTime] = ${ltSql}`);
        if (!sets.length)
            return;
        await this.dataSource.query(`UPDATE dbo.EngagementProduction SET ${sets.join(', ')} WHERE [ProductionID] = ${pid}`);
    }
    async enforceOpeningPerformancePublic(engagementId) {
        const opening = await this.performanceRepo.findOne({
            where: { engagementId },
            order: {
                performanceDate: 'ASC',
                performanceTime: 'ASC',
                performanceId: 'ASC',
            },
        });
        if (!opening)
            return;
        const status = opening.performanceStatus?.trim() ?? '';
        if (status.toLowerCase().startsWith('public'))
            return;
        opening.performanceStatus = 'Public (Not On Sale)';
        await this.performanceRepo.save(opening);
    }
    mapBit(v) {
        if (v == null)
            return null;
        if (typeof v === 'boolean')
            return v;
        if (typeof v === 'number')
            return v !== 0;
        if (Buffer.isBuffer(v))
            return v[0] === 1;
        return null;
    }
    mapFinanceLink(link) {
        if (!link)
            return null;
        return {
            linkId: link.linkId,
            linkType: link.linkType,
            linkUrl: link.linkUrl,
            linkName: link.linkName,
            linkPath: link.linkPath,
        };
    }
    async dboTableHasColumn(tableName, columnName) {
        try {
            const rows = await this.dataSource.query(`
          SELECT TOP 1 1 AS ok
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo'
            AND TABLE_NAME = @0
            AND COLUMN_NAME = @1
        `, [tableName, columnName]);
            return rows.length > 0;
        }
        catch {
            return false;
        }
    }
    async nonResidentWithholdingHasDmaId() {
        if (this.nonResidentWithholdingHasDmaIdColumn != null) {
            return this.nonResidentWithholdingHasDmaIdColumn;
        }
        const hasColumn = await this.dboTableHasColumn('NonResidentWithholding', 'DMAID');
        this.nonResidentWithholdingHasDmaIdColumn = hasColumn;
        return hasColumn;
    }
    async listNonResidentWithholdingRowsSafe(em) {
        const manager = em ?? this.dataSource.manager;
        const hasDmaId = await this.nonResidentWithholdingHasDmaId();
        let rows = [];
        const extraCols = `
            ,w.WithholdingArea AS withholdingArea
            ,w.WithholdingAgencyName AS withholdingAgencyName
            ,w.WithholdingPayee AS withholdingPayee
            ,w.PaymentMethod AS paymentMethod
            ,w.FormToAttractionURL AS formToAttractionUrl
            ,w.FormToMunicipalityURL AS formToMunicipalityUrl
            ,w.QuickBooksNumber AS quickBooksNumber
            ,w.CanApplyForWaiver AS canApplyForWaiver
            ,w.IAEWaiverInstructions AS iaeWaiverInstructionsText
            ,w.CompletedWaiverURL AS completedWaiverUrl
            ,w.IAEWaiverSubmissionDate AS iaeWaiverSubmissionDate
            ,w.IAEWaiverAppNumber AS iaeWaiverAppNumber
            ,w.IAEWaiverURL AS iaeWaiverUrl
            ,w.TourWaiverURL AS tourWaiverUrl
            ,w.ExceptionsNotes AS exceptionsNotes`;
        try {
            rows = await manager.query(`
          SELECT
            w.WithholdingID AS withholdingId,
            w.WithholdingTaxRate AS withholdingTaxRate,
            ${hasDmaId ? 'w.DMAID' : 'CAST(NULL AS int)'} AS dmaid,
            w.TaxAgencyID AS taxAgencyId,
            w.WithholdingLinkID AS withholdingLinkId,
            w.ArtistWaiverInstructionsID AS artistWaiverInstructionsId,
            w.IAEWaiverInstructionsID AS iaeWaiverInstructionsId
            ${extraCols}
          FROM [dbo].[NonResidentWithholding] w
          ORDER BY w.WithholdingID ASC
        `);
        }
        catch (error) {
            this.nonResidentWithholdingHasDmaIdColumn = false;
            rows = await manager.query(`
          SELECT
            w.WithholdingID AS withholdingId,
            w.WithholdingTaxRate AS withholdingTaxRate,
            CAST(NULL AS int) AS dmaid,
            w.TaxAgencyID AS taxAgencyId,
            w.WithholdingLinkID AS withholdingLinkId,
            w.ArtistWaiverInstructionsID AS artistWaiverInstructionsId,
            w.IAEWaiverInstructionsID AS iaeWaiverInstructionsId
            ${extraCols}
          FROM [dbo].[NonResidentWithholding] w
          ORDER BY w.WithholdingID ASC
        `);
        }
        return rows
            .map((row) => {
            const withholdingId = Number(row.withholdingId ?? 0);
            if (!Number.isInteger(withholdingId) || withholdingId < 1)
                return null;
            return {
                withholdingId,
                withholdingTaxRate: String(row.withholdingTaxRate ?? ''),
                dmaid: row.dmaid == null ? null : Number(row.dmaid),
                taxAgencyId: row.taxAgencyId == null ? null : Number(row.taxAgencyId),
                withholdingLinkId: row.withholdingLinkId == null ? null : Number(row.withholdingLinkId),
                artistWaiverInstructionsId: row.artistWaiverInstructionsId == null ? null : Number(row.artistWaiverInstructionsId),
                iaeWaiverInstructionsId: row.iaeWaiverInstructionsId == null ? null : Number(row.iaeWaiverInstructionsId),
                withholdingArea: row.withholdingArea == null ? null : String(row.withholdingArea),
                withholdingAgencyName: row.withholdingAgencyName == null ? null : String(row.withholdingAgencyName),
                withholdingPayee: row.withholdingPayee == null ? null : String(row.withholdingPayee),
                paymentMethod: row.paymentMethod == null ? null : String(row.paymentMethod),
                formToAttractionUrl: row.formToAttractionUrl == null ? null : String(row.formToAttractionUrl),
                formToMunicipalityUrl: row.formToMunicipalityUrl == null ? null : String(row.formToMunicipalityUrl),
                quickBooksNumber: row.quickBooksNumber == null ? null : String(row.quickBooksNumber),
                canApplyForWaiver: row.canApplyForWaiver == null ? null : Boolean(row.canApplyForWaiver),
                iaeWaiverInstructionsText: row.iaeWaiverInstructionsText == null ? null : String(row.iaeWaiverInstructionsText),
                completedWaiverUrl: row.completedWaiverUrl == null ? null : String(row.completedWaiverUrl),
                iaeWaiverSubmissionDate: row.iaeWaiverSubmissionDate == null ? null : String(row.iaeWaiverSubmissionDate),
                iaeWaiverAppNumber: row.iaeWaiverAppNumber == null ? null : String(row.iaeWaiverAppNumber),
                iaeWaiverUrl: row.iaeWaiverUrl == null ? null : String(row.iaeWaiverUrl),
                tourWaiverUrl: row.tourWaiverUrl == null ? null : String(row.tourWaiverUrl),
                exceptionsNotes: row.exceptionsNotes == null ? null : String(row.exceptionsNotes),
            };
        })
            .filter((row) => row != null);
    }
    async updateNonResidentWithholding(withholdingId, dto) {
        const id = Math.floor(Number(withholdingId));
        if (!Number.isInteger(id) || id < 1)
            return;
        const sets = [];
        const strField = (col, v, max) => {
            if (v !== undefined)
                sets.push(`[${col}] = ${v == null || String(v).trim() === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(v).trim().slice(0, max))}`);
        };
        const numField = (col, v) => {
            if (v !== undefined)
                sets.push(`[${col}] = ${v == null ? 'NULL' : Number(v)}`);
        };
        strField('WithholdingArea', dto.withholdingArea, 100);
        numField('WithholdingTaxRate', dto.withholdingTaxRate);
        strField('WithholdingAgencyName', dto.withholdingAgencyName, 200);
        strField('IAEWaiverSubmissionDate', dto.iaeWaiverSubmissionDate, 10);
        strField('IAEWaiverAppNumber', dto.iaeWaiverAppNumber, 100);
        if (sets.length === 0)
            return;
        await this.dataSource.query(`UPDATE dbo.NonResidentWithholding SET ${sets.join(', ')} WHERE [WithholdingID] = ${id}`);
    }
    async findNonResidentWithholdingByIdSafe(withholdingId, em) {
        const id = Math.floor(Number(withholdingId));
        if (!Number.isInteger(id) || id < 1)
            return null;
        const manager = em ?? this.dataSource.manager;
        const hasDmaId = await this.nonResidentWithholdingHasDmaId();
        let rows = [];
        try {
            rows = await manager.query(`
          SELECT TOP 1
            w.WithholdingID AS withholdingId,
            w.WithholdingTaxRate AS withholdingTaxRate,
            ${hasDmaId ? 'w.DMAID' : 'CAST(NULL AS int)'} AS dmaid,
            w.TaxAgencyID AS taxAgencyId,
            w.WithholdingLinkID AS withholdingLinkId,
            w.ArtistWaiverInstructionsID AS artistWaiverInstructionsId,
            w.IAEWaiverInstructionsID AS iaeWaiverInstructionsId
          FROM [dbo].[NonResidentWithholding] w
          WHERE w.WithholdingID = @0
        `, [id]);
        }
        catch (error) {
            this.nonResidentWithholdingHasDmaIdColumn = false;
            rows = await manager.query(`
          SELECT TOP 1
            w.WithholdingID AS withholdingId,
            w.WithholdingTaxRate AS withholdingTaxRate,
            CAST(NULL AS int) AS dmaid,
            w.TaxAgencyID AS taxAgencyId,
            w.WithholdingLinkID AS withholdingLinkId,
            w.ArtistWaiverInstructionsID AS artistWaiverInstructionsId,
            w.IAEWaiverInstructionsID AS iaeWaiverInstructionsId
          FROM [dbo].[NonResidentWithholding] w
          WHERE w.WithholdingID = @0
        `, [id]);
        }
        const row = rows[0];
        if (!row)
            return null;
        const parsedId = Number(row.withholdingId ?? NaN);
        if (!Number.isInteger(parsedId) || parsedId < 1)
            return null;
        return {
            withholdingId: parsedId,
            withholdingTaxRate: String(row.withholdingTaxRate ?? ''),
            dmaid: row.dmaid == null ? null : Number(row.dmaid),
            taxAgencyId: row.taxAgencyId == null ? null : Number(row.taxAgencyId),
            withholdingLinkId: row.withholdingLinkId == null ? null : Number(row.withholdingLinkId),
            artistWaiverInstructionsId: row.artistWaiverInstructionsId == null
                ? null
                : Number(row.artistWaiverInstructionsId),
            iaeWaiverInstructionsId: row.iaeWaiverInstructionsId == null
                ? null
                : Number(row.iaeWaiverInstructionsId),
        };
    }
    async assertNonResidentWithholdingExists(id) {
        const found = await this.findNonResidentWithholdingByIdSafe(id);
        if (!found) {
            throw new common_1.BadRequestException({
                message: `Non-resident withholding #${id} was not found.`,
            });
        }
    }
    normalizeHttpOrHttpsUrl(raw, label) {
        const trimmed = String(raw ?? '').trim();
        if (!trimmed)
            return null;
        let parsed;
        try {
            parsed = new URL(trimmed);
        }
        catch {
            throw new common_1.BadRequestException({
                message: `${label} must be a valid http(s) URL.`,
            });
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new common_1.BadRequestException({
                message: `${label} must start with http:// or https://.`,
            });
        }
        return trimmed.slice(0, 2048);
    }
    async upsertUrlLink(rawUrl, existingLinkId, label) {
        const url = this.normalizeHttpOrHttpsUrl(rawUrl, label);
        if (!url)
            return null;
        const existing = existingLinkId != null && existingLinkId > 0
            ? await this.linkRepo.findOne({ where: { linkId: existingLinkId } })
            : null;
        const link = existing ??
            this.linkRepo.create({
                linkType: 'URL',
                linkName: label,
            });
        link.linkType = 'URL';
        link.linkUrl = url;
        link.linkPath = url.slice(0, 1024);
        link.linkName = (link.linkName?.trim() || label).slice(0, 255);
        const saved = await this.linkRepo.save(link);
        return saved.linkId;
    }
    async upsertTicketingUrlLink(rawUrl, existingLinkId) {
        return this.upsertUrlLink(rawUrl, existingLinkId, 'Ticketing link');
    }
    toPercentOrNull(v) {
        if (v == null || v === '')
            return null;
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || n > 100)
            return null;
        return n;
    }
    toDecimalOrNull(v) {
        if (v == null || v === '')
            return null;
        const n = Number(v);
        if (!Number.isFinite(n))
            return null;
        return n;
    }
    normalizeRoyaltyBasis(v) {
        const t = String(v ?? '').trim().toLowerCase();
        if (!t)
            return null;
        if (t === 'net' || t === 'based on net')
            return 'Net';
        if (t === 'nagbor' || t === 'based on nagbor')
            return 'NAGBOR';
        return null;
    }
    parseArtistRoyaltyVariableFee(raw) {
        const t = String(raw ?? '').trim();
        if (!t)
            return { ratePercent: null, basedOn: null };
        try {
            const parsed = JSON.parse(t);
            if (parsed && typeof parsed === 'object') {
                return {
                    ratePercent: this.toPercentOrNull(parsed.ratePercent),
                    basedOn: this.normalizeRoyaltyBasis(parsed.basedOn),
                };
            }
        }
        catch {
        }
        const rateMatch = /(-?\d+(?:\.\d+)?)/.exec(t);
        return {
            ratePercent: rateMatch ? this.toPercentOrNull(rateMatch[1]) : null,
            basedOn: this.normalizeRoyaltyBasis(t),
        };
    }
    parseArtistBackEndTerms(raw) {
        const t = String(raw ?? '').trim();
        const empty = {
            versusPercent: null,
            promoterProfitPercent: null,
            artistBackendPercent: null,
            depositRequired: null,
            partOfCollateralizedDeal: null,
            fexPerformanceAgreementLink: null,
            tourOfferLink: null,
            overageAmount: null,
            buyouts: null,
        };
        if (!t)
            return empty;
        try {
            const parsed = JSON.parse(t);
            if (parsed && typeof parsed === 'object') {
                const toOptBool = (v) => {
                    if (v === true || v === 1 || v === '1' || v === 'true')
                        return true;
                    if (v === false || v === 0 || v === '0' || v === 'false')
                        return false;
                    return null;
                };
                const toOptStr = (v) => {
                    if (v == null || v === '')
                        return null;
                    return String(v).trim().slice(0, 2048) || null;
                };
                return {
                    versusPercent: this.toPercentOrNull(parsed.versusPercent),
                    promoterProfitPercent: this.toPercentOrNull(parsed.promoterProfitPercent),
                    artistBackendPercent: this.toPercentOrNull(parsed.artistBackendPercent),
                    depositRequired: toOptBool(parsed.depositRequired),
                    partOfCollateralizedDeal: toOptBool(parsed.partOfCollateralizedDeal),
                    fexPerformanceAgreementLink: toOptStr(parsed.fexPerformanceAgreementLink),
                    tourOfferLink: toOptStr(parsed.tourOfferLink),
                    overageAmount: this.toDecimalOrNull(parsed.overageAmount),
                    buyouts: this.toDecimalOrNull(parsed.buyouts),
                };
            }
        }
        catch {
        }
        return empty;
    }
    nextArtistRoyaltyVariableFee(currentRaw, dto) {
        const hasStructuredInput = dto.artistRoyaltyRatePercent !== undefined ||
            dto.artistRoyaltyBasedOn !== undefined;
        if (!hasStructuredInput) {
            const t = dto.artistRoyaltyVariableFee;
            return t == null || t.trim() === '' ? null : t.trim().slice(0, 255);
        }
        const parsed = this.parseArtistRoyaltyVariableFee(currentRaw);
        const ratePercent = dto.artistRoyaltyRatePercent !== undefined
            ? this.toPercentOrNull(dto.artistRoyaltyRatePercent)
            : parsed.ratePercent;
        const basedOn = dto.artistRoyaltyBasedOn !== undefined
            ? this.normalizeRoyaltyBasis(dto.artistRoyaltyBasedOn)
            : parsed.basedOn;
        if (ratePercent == null && basedOn == null)
            return null;
        return JSON.stringify({ ratePercent, basedOn });
    }
    nextArtistBackEndTerms(currentRaw, dto) {
        const hasStructuredInput = dto.artistVersusPercent !== undefined ||
            dto.artistPromoterProfitPercent !== undefined ||
            dto.artistBackendPercent !== undefined ||
            dto.artistDepositRequired !== undefined ||
            dto.artistPartOfCollateralizedDeal !== undefined ||
            dto.artistFexPerformanceAgreementLink !== undefined ||
            dto.artistTourOfferLink !== undefined ||
            dto.artistOverageAmount !== undefined ||
            dto.artistBuyouts !== undefined;
        if (!hasStructuredInput) {
            const t = dto.artistBackEndTerms;
            return t == null || t.trim() === '' ? null : t.trim();
        }
        const parsed = this.parseArtistBackEndTerms(currentRaw);
        const toOptBool = (v, fallback) => {
            if (v === undefined)
                return fallback;
            return v ?? null;
        };
        const toOptStr = (v, fallback) => {
            if (v === undefined)
                return fallback;
            return v == null || String(v).trim() === '' ? null : String(v).trim().slice(0, 2048);
        };
        const versusPercent = dto.artistVersusPercent !== undefined
            ? this.toPercentOrNull(dto.artistVersusPercent)
            : parsed.versusPercent;
        const promoterProfitPercent = dto.artistPromoterProfitPercent !== undefined
            ? this.toPercentOrNull(dto.artistPromoterProfitPercent)
            : parsed.promoterProfitPercent;
        const artistBackendPercent = dto.artistBackendPercent !== undefined
            ? this.toPercentOrNull(dto.artistBackendPercent)
            : parsed.artistBackendPercent;
        const depositRequired = toOptBool(dto.artistDepositRequired, parsed.depositRequired);
        const partOfCollateralizedDeal = toOptBool(dto.artistPartOfCollateralizedDeal, parsed.partOfCollateralizedDeal);
        const fexPerformanceAgreementLink = toOptStr(dto.artistFexPerformanceAgreementLink, parsed.fexPerformanceAgreementLink);
        const tourOfferLink = toOptStr(dto.artistTourOfferLink, parsed.tourOfferLink);
        const overageAmount = dto.artistOverageAmount !== undefined
            ? this.toDecimalOrNull(dto.artistOverageAmount)
            : parsed.overageAmount;
        const buyouts = dto.artistBuyouts !== undefined
            ? this.toDecimalOrNull(dto.artistBuyouts)
            : parsed.buyouts;
        if (versusPercent == null &&
            promoterProfitPercent == null &&
            artistBackendPercent == null &&
            depositRequired == null &&
            partOfCollateralizedDeal == null &&
            fexPerformanceAgreementLink == null &&
            tourOfferLink == null &&
            overageAmount == null &&
            buyouts == null) {
            return null;
        }
        return JSON.stringify({
            versusPercent,
            promoterProfitPercent,
            artistBackendPercent,
            depositRequired,
            partOfCollateralizedDeal,
            fexPerformanceAgreementLink,
            tourOfferLink,
            overageAmount,
            buyouts,
        });
    }
    settlementFinanceResponseSlice(settlementRow) {
        if (!settlementRow) {
            return {
                artistSettlementStatus: null,
                venueSettlementStatus: null,
                subscriptionSalesRevenueTotal: null,
                seasonTicketSalesByIae: null,
                seasonTicketFundsTransferred: null,
                netBoxOfficeFundsDepositedAccount: null,
                hstCollectedFromTicketSales: null,
                hstPaidOnTourPayments: null,
                hstPaidOnShowExpenses: null,
                hstPaidOnVenueExpenses: null,
                artistGrossTaxableCompensation: null,
                amountDueToDeptOfRevenue: null,
                checkNumberOrConfOfWithholdingPayment: null,
                finalGuaranteeAmount: null,
                finalRoyaltyAmount: null,
                finalOverageAmount: null,
                finalBuyoutAmount: null,
                finalDirectCompanyCharges: null,
                finalReimbursables: null,
            };
        }
        return {
            artistSettlementStatus: settlementRow.artistSettlementStatus ?? null,
            venueSettlementStatus: settlementRow.venueSettlementStatus ?? null,
            subscriptionSalesRevenueTotal: this.mapFinanceNumber(settlementRow.subscriptionSalesRevenueTotal),
            seasonTicketSalesByIae: this.mapFinanceNumber(settlementRow.seasonTicketSalesByIae),
            seasonTicketFundsTransferred: this.mapFinanceNumber(settlementRow.seasonTicketFundsTransferred),
            netBoxOfficeFundsDepositedAccount: settlementRow.netBoxOfficeFundsDepositedAccount ?? null,
            hstCollectedFromTicketSales: this.mapFinanceNumber(settlementRow.hstCollectedFromTicketSales),
            hstPaidOnTourPayments: this.mapFinanceNumber(settlementRow.hstPaidOnTourPayments),
            hstPaidOnShowExpenses: this.mapFinanceNumber(settlementRow.hstPaidOnShowExpenses),
            hstPaidOnVenueExpenses: this.mapFinanceNumber(settlementRow.hstPaidOnVenueExpenses),
            artistGrossTaxableCompensation: this.mapFinanceNumber(settlementRow.artistGrossTaxableCompensation),
            amountDueToDeptOfRevenue: this.mapFinanceNumber(settlementRow.amountDueToDeptOfRevenue),
            checkNumberOrConfOfWithholdingPayment: settlementRow.checkNumberOrConfOfWithholdingPayment ?? null,
            finalGuaranteeAmount: this.mapFinanceNumber(settlementRow.finalGuaranteeAmount),
            finalRoyaltyAmount: this.mapFinanceNumber(settlementRow.finalRoyaltyAmount),
            finalOverageAmount: this.mapFinanceNumber(settlementRow.finalOverageAmount),
            finalBuyoutAmount: this.mapFinanceNumber(settlementRow.finalBuyoutAmount),
            finalDirectCompanyCharges: this.mapFinanceNumber(settlementRow.directCompanyCharges),
            finalReimbursables: this.mapFinanceNumber(settlementRow.reimbursables),
        };
    }
    toFinanceResponse(engagementId, row, engagement, artistRow, settlementRow, payableEntity) {
        const grossPotential = this.mapFinanceNumber(engagement.grossPotential);
        const sellableCapacity = engagement.sellableCapacity != null
            ? Number(engagement.sellableCapacity)
            : null;
        const artistDealType = artistRow?.artistDealType ?? null;
        const artistGuarantee = artistRow
            ? this.mapFinanceNumber(artistRow.artistGuarantee)
            : null;
        const artistMiddleMoney = artistRow
            ? this.mapFinanceNumber(artistRow.artistMiddleMoney)
            : null;
        const artistRoyaltyVariableFee = artistRow?.artistRoyaltyVariableFee ?? null;
        const artistBackEndTerms = artistRow?.artistBackEndTerms ?? null;
        const artistVersusPercent = artistRoyaltyVariableFee != null
            ? this.toPercentOrNull(parseFloat(artistRoyaltyVariableFee))
            : null;
        const overagePercent = artistRow
            ? this.mapFinanceNumber(artistRow.overagePercent)
            : null;
        const artistBackendPercent = artistBackEndTerms != null
            ? this.toPercentOrNull(parseFloat(artistBackEndTerms))
            : null;
        const promoterProfitPercent = row
            ? this.mapFinanceNumber(row.promoterProfit)
            : null;
        if (!row) {
            return {
                financeId: null,
                engagementId,
                payableEntityCompanyId: payableEntity?.companyId ?? null,
                payableEntityCompanyName: payableEntity?.companyName ?? null,
                estimatedBreakeven: null,
                grossPotential,
                sellableCapacity,
                grossMarketingBudget: null,
                netMarketingBudget: null,
                salesRevenueGoal: null,
                promoterProfit: null,
                venueDealType: null,
                thirdPartyPartnerDealStructure: null,
                venueDealTypeId: null,
                venueDealTypeName: null,
                venueTerms: null,
                confirmationPacketApproved: null,
                iaeWaiverApplicationConfirmationNumber: null,
                iaeWaiverApplicationSubmissionDate: null,
                iaeApplicationWaiverStatus: null,
                dateFundsReceived: null,
                fundsDue: null,
                fundsWithheld: null,
                fundsOwed: null,
                receivableBankAccount: null,
                requiredNonResidentWithholdingId: null,
                isCanadaEngagement: null,
                artistFinanceId: null,
                settlementFinanceId: null,
                artistDealType,
                artistGuarantee,
                artistMiddleMoney,
                artistRoyaltyVariableFee,
                artistBackEndTerms,
                artistVersusPercent,
                overagePercent: null,
                artistPromoterProfitPercent: promoterProfitPercent,
                artistBackendPercent,
                artistRoyaltyRatePercent: artistRow ? this.mapFinanceNumber(artistRow.royaltyRate) : null,
                artistRoyaltyBasedOn: artistRow?.royaltyBasis ?? null,
                ...this.settlementFinanceResponseSlice(settlementRow),
                finalAcceptedOfferLink: null,
                settlementFileSharePointLink: null,
                tourSplitPoint: null,
                announcementDate: null,
                promoterPartnerCompanyId: null,
                promoterPartnerCompanyName: null,
                promoterPartnerContactId: null,
                promoterPartnerContactName: null,
                tourManagerContactId: null,
                tourManagerContactName: null,
                attractionContractSharePointLink: null,
                partiallyExecutedAttractionContractSharePointLink: null,
                fullyExecutedAttractionContractSharePointLink: null,
                eventBusinessManagerContactId: null,
                eventBusinessManagerContactName: null,
                eventBusinessAssistantManagerContactId: null,
                eventBusinessAssistantManagerContactName: null,
                venueSettlementContactId: null,
                venueSettlementContactName: null,
                venueSettlementFileSharePointLink: null,
                partnerSettlementFileSharePointLink: null,
                salesTaxRemittedBy: null,
                fexVenueAgreementLink: null,
                venueDepositRequired: null,
                withholdingPayee: null,
                withholdingPaymentMethod: null,
                withholdingFormToAttractionLink: null,
                withholdingFormToMunicipalityLink: null,
                withholdingQuickbooksNumber: null,
                withholdingWaiver: null,
                withholdingCompletedWaiverLink: null,
                tourWaiverLink: null,
                withholdingExceptions: null,
                compensationRoyaltyAmount: null,
                compensationOverageAmount: null,
                compensationBuyouts: null,
                compensationDirectCharges: null,
                compensationReimbursibles: null,
                financeJob: null,
                financeCustomer: null,
                tourAscap: null,
                tourBmi: null,
                tourSesac: null,
                tourGmr: null,
                artistDepositRequired: null,
                artistPartOfCollateralizedDeal: artistRow?.isCollateralizedDeal ?? null,
                artistFexPerformanceAgreementLink: null,
                artistTourOfferLink: null,
                artistOverageAmount: null,
                artistBuyouts: artistRow ? this.mapFinanceNumber(artistRow.buyoutAmount) : null,
            };
        }
        return {
            financeId: row.financeId,
            engagementId: row.engagementId,
            payableEntityCompanyId: payableEntity?.companyId ?? null,
            payableEntityCompanyName: payableEntity?.companyName ?? null,
            estimatedBreakeven: this.mapFinanceNumber(row.estimatedBreakeven),
            grossPotential,
            sellableCapacity,
            grossMarketingBudget: null,
            netMarketingBudget: null,
            salesRevenueGoal: null,
            promoterProfit: this.mapFinanceNumber(row.promoterProfit),
            venueDealType: null,
            thirdPartyPartnerDealStructure: null,
            venueDealTypeId: null,
            venueDealTypeName: null,
            venueTerms: row.venueTerms,
            confirmationPacketApproved: this.mapBit(row.confirmationPacketApproved),
            iaeWaiverApplicationConfirmationNumber: row.iaeWaiverApplicationConfirmationNumber,
            iaeWaiverApplicationSubmissionDate: this.mapFinanceYmd(row.iaeWaiverApplicationSubmissionDate),
            iaeApplicationWaiverStatus: row.iaeApplicationWaiverStatus,
            dateFundsReceived: this.mapFinanceYmd(row.dateFundsReceived),
            fundsDue: this.mapFinanceNumber(row.fundsDue),
            fundsWithheld: this.mapFinanceNumber(row.fundsWithheld),
            fundsOwed: this.mapFinanceNumber(row.fundsOwed),
            receivableBankAccount: row.receivableBankAccount,
            requiredNonResidentWithholdingId: row.requiredNonResidentWithholdingId,
            isCanadaEngagement: row.isCanadaEngagement ?? null,
            artistFinanceId: row.artistFinanceId,
            settlementFinanceId: row.settlementFinanceId,
            artistDealType,
            artistGuarantee,
            artistMiddleMoney,
            artistRoyaltyVariableFee,
            artistBackEndTerms,
            artistVersusPercent,
            overagePercent,
            artistPromoterProfitPercent: promoterProfitPercent,
            artistBackendPercent,
            artistRoyaltyRatePercent: artistRow ? this.mapFinanceNumber(artistRow.royaltyRate) : null,
            artistRoyaltyBasedOn: artistRow?.royaltyBasis ?? null,
            ...this.settlementFinanceResponseSlice(settlementRow),
            finalAcceptedOfferLink: null,
            settlementFileSharePointLink: null,
            tourSplitPoint: null,
            announcementDate: null,
            promoterPartnerCompanyId: null,
            promoterPartnerCompanyName: null,
            promoterPartnerContactId: null,
            promoterPartnerContactName: null,
            tourManagerContactId: null,
            tourManagerContactName: null,
            attractionContractSharePointLink: null,
            partiallyExecutedAttractionContractSharePointLink: null,
            fullyExecutedAttractionContractSharePointLink: null,
            eventBusinessManagerContactId: null,
            eventBusinessManagerContactName: null,
            eventBusinessAssistantManagerContactId: null,
            eventBusinessAssistantManagerContactName: null,
            venueSettlementContactId: null,
            venueSettlementContactName: null,
            venueSettlementFileSharePointLink: row.venueSettlementFileSharePointLink ?? null,
            partnerSettlementFileSharePointLink: row.partnerSettlementFileSharePointLink ?? null,
            salesTaxRemittedBy: row.salesTaxRemittedBy ?? null,
            fexVenueAgreementLink: null,
            venueDepositRequired: null,
            withholdingPayee: null,
            withholdingPaymentMethod: null,
            withholdingFormToAttractionLink: null,
            withholdingFormToMunicipalityLink: null,
            withholdingQuickbooksNumber: null,
            withholdingWaiver: null,
            withholdingCompletedWaiverLink: null,
            tourWaiverLink: null,
            withholdingExceptions: null,
            compensationRoyaltyAmount: null,
            compensationOverageAmount: null,
            compensationBuyouts: null,
            compensationDirectCharges: null,
            compensationReimbursibles: null,
            financeJob: null,
            financeCustomer: null,
            tourAscap: null,
            tourBmi: null,
            tourSesac: null,
            tourGmr: null,
            artistDepositRequired: null,
            artistPartOfCollateralizedDeal: artistRow?.isCollateralizedDeal ?? null,
            artistFexPerformanceAgreementLink: null,
            artistTourOfferLink: null,
            artistOverageAmount: null,
            artistBuyouts: artistRow ? this.mapFinanceNumber(artistRow.buyoutAmount) : null,
        };
    }
    buildEngagementQuery(whereId) {
        const entertainmentComplexSubquery = `(
          SELECT STRING_AGG(LTRIM(RTRIM(ccx.CompanyName)), N', ') WITHIN GROUP (ORDER BY LTRIM(RTRIM(ccx.CompanyName)))
          FROM dbo.EngagementVenue evx
          INNER JOIN dbo.VenueComplexMember vcmx ON vcmx.VenueCompanyID = evx.VenueCompanyID
          INNER JOIN dbo.Company ccx ON ccx.CompanyID = vcmx.ComplexCompanyID
          WHERE evx.EngagementID = e.engagementId AND evx.IsPrimary = 1
        )`;
        const qb = this.engagementRepo
            .createQueryBuilder('e')
            .innerJoin(tour_entity_1.Tour, 't', 't.tourId = e.tourId')
            .leftJoin(attraction_entity_1.Attraction, 'a', 'a.attractionId = t.attractionId')
            .leftJoin(link_entity_1.Link, 'tourBanner', 'tourBanner.linkId = t.bannerLinkId')
            .leftJoin(engagement_venue_entity_1.EngagementVenue, 'ev', 'ev.engagementId = e.engagementId AND ev.isPrimary = :prim', { prim: true })
            .leftJoin(venue_entity_1.Venue, 'v', 'v.companyId = ev.venueCompanyId')
            .leftJoin(company_entity_1.Company, 'vc', 'vc.companyId = ev.venueCompanyId')
            .leftJoin(address_entity_1.Address, 'addr', 'addr.addressId = vc.physicalAddressId')
            .leftJoin(dma_entity_1.Dma, 'dma', 'dma.dmaid = vc.dmaid')
            .leftJoin(engagement_finance_entity_1.EngagementFinances, 'ef', 'ef.engagementId = e.engagementId')
            .select([
            'e.engagementId         AS engagementId',
            'e.engagementStatus     AS engagementStatus',
            'e.engagementScaling    AS engagementScaling',
            'e.sellableCapacity     AS sellableCapacity',
            'e.grossPotential       AS grossPotential',
            'e.tourId               AS tourId',
            't.tourName             AS tourName',
            't.attractionId         AS attractionId',
            'a.attractionName       AS attractionName',
            'ev.venueCompanyId      AS primaryVenueCompanyId',
            'vc.companyName         AS venueCompanyName',
            'v.venueName            AS venueName',
            'addr.city              AS city',
            'addr.stateProvince     AS stateProvince',
            'dma.marketName         AS dmaMarketName',
            'tourBanner.linkUrl     AS tourBannerImageUrl',
        ])
            .addSelect(entertainmentComplexSubquery, 'entertainmentComplexNames')
            .addSelect(this.openingPerformanceDateSubquery(), 'openingPerformanceDate')
            .addSelect(this.openingPerformanceTimeSubquery(), 'openingPerformanceTime')
            .addSelect(`CASE WHEN ${this.openingPerformanceDateSubquery()} IS NULL THEN 1 ELSE 0 END`, 'openingPerformanceSortNull')
            .addSelect(this.engagementRehearsalDateSubquery(), 'rehearsalDate')
            .addSelect(this.engagementLoadInDateSubquery(), 'loadInDate')
            .addSelect('e.tourManagerContactId', 'tourManagerContactId')
            .addSelect('ef.isCanadaEngagement', 'isCanadaEngagement');
        if (whereId !== undefined) {
            qb.where('e.engagementId = :id', { id: whereId });
        }
        return qb;
    }
    parseOpeningDateOnly(raw) {
        if (raw == null || raw === '')
            return null;
        if (raw instanceof Date) {
            if (Number.isNaN(raw.getTime()))
                return null;
            const y = raw.getUTCFullYear();
            const m = String(raw.getUTCMonth() + 1).padStart(2, '0');
            const d = String(raw.getUTCDate()).padStart(2, '0');
            const ymd = `${y}-${m}-${d}`;
            return ymd === '1970-01-01' ? null : ymd;
        }
        const s = String(raw).trim();
        const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
        if (!m)
            return null;
        return m[1] === '1970-01-01' ? null : m[1];
    }
    parseOpeningTimeOnly(raw) {
        if (raw == null || raw === '')
            return null;
        if (raw instanceof Date) {
            if (Number.isNaN(raw.getTime()))
                return null;
            const h = String(raw.getUTCHours()).padStart(2, '0');
            const min = String(raw.getUTCMinutes()).padStart(2, '0');
            const sec = String(raw.getUTCSeconds()).padStart(2, '0');
            return `${h}:${min}:${sec}`;
        }
        const s = String(raw).trim();
        const t = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (t) {
            const h = String(Math.min(23, Math.max(0, parseInt(t[1], 10)))).padStart(2, '0');
            const min = t[2].padStart(2, '0');
            const sec = (t[3] ?? '00').padStart(2, '0');
            return `${h}:${min}:${sec}`;
        }
        if (s.length > 20 && (s.includes('GMT') || s.includes('1970')))
            return null;
        return null;
    }
    mapRaw(r) {
        const g = (k) => pickRaw(r, k);
        const attractionName = g('attractionName') != null ? String(g('attractionName')) : null;
        const tourName = String(g('tourName') ?? '');
        const venueCompanyName = g('venueCompanyName') != null ? String(g('venueCompanyName')) : null;
        const venueName = g('venueName') != null ? String(g('venueName')) : null;
        const venueLabel = venueCompanyName ?? venueName ?? 'TBD';
        const engagementId = Number(g('engagementId'));
        const openingDate = this.parseOpeningDateOnly(g('openingPerformanceDate'));
        const openingTime = this.parseOpeningTimeOnly(g('openingPerformanceTime'));
        return {
            engagementId,
            engagementStatus: (0, engagement_status_util_1.normalizeEngagementStatus)(String(g('engagementStatus') ?? '')),
            engagementScaling: g('engagementScaling') != null &&
                String(g('engagementScaling')).trim() !== ''
                ? String(g('engagementScaling')).trim()
                : null,
            sellableCapacity: g('sellableCapacity') != null ? Number(g('sellableCapacity')) : null,
            grossPotential: g('grossPotential') != null ? Number(g('grossPotential')) : null,
            openingPerformanceDate: openingDate,
            openingPerformanceTime: openingTime,
            attractionId: g('attractionId') != null ? Number(g('attractionId')) : null,
            attractionName,
            tourId: Number(g('tourId')),
            tourName,
            primaryVenueCompanyId: g('primaryVenueCompanyId') != null
                ? Number(g('primaryVenueCompanyId'))
                : null,
            venueCompanyName,
            venueName,
            city: g('city') != null ? String(g('city')) : null,
            stateProvince: g('stateProvince') != null ? String(g('stateProvince')) : null,
            dmaMarketName: g('dmaMarketName') != null ? String(g('dmaMarketName')) : null,
            tourBannerImageUrl: (() => {
                const u = g('tourBannerImageUrl');
                if (u == null || u === '')
                    return null;
                const s = String(u).trim();
                return s || null;
            })(),
            entertainmentComplexNames: (() => {
                const x = g('entertainmentComplexNames');
                if (x == null || x === '')
                    return null;
                const s = String(x).trim();
                return s || null;
            })(),
            rehearsalDate: this.parseOpeningDateOnly(g('rehearsalDate')),
            rehearsalTime: null,
            loadInDate: this.parseOpeningDateOnly(g('loadInDate')),
            loadInTime: null,
            tourManagerContactId: g('tourManagerContactId') != null ? Number(g('tourManagerContactId')) : null,
            displayTitle: (0, engagement_display_util_1.buildEngagementDisplayTitle)(attractionName, tourName, venueLabel),
            appCreated: this.emsCreated.canDeleteEngagement(engagementId),
            isCanadaEngagement: this.mapBit(g('isCanadaEngagement')),
        };
    }
    async list() {
        const raw = await this.buildEngagementQuery()
            .orderBy('e.engagementId', 'DESC')
            .getRawMany();
        return raw.map((r) => this.mapRaw(r));
    }
    async listByCompany(companyId) {
        const safe = Math.floor(Number(companyId));
        if (!Number.isInteger(safe) || safe < 1) {
            throw new common_1.BadRequestException({
                message: 'Company ID must be a positive integer.',
            });
        }
        const raw = await this.buildEngagementQuery()
            .innerJoin(engagement_venue_entity_1.EngagementVenue, 'ev2', 'ev2.engagementId = e.engagementId AND ev2.venueCompanyId = :cid', { cid: safe })
            .distinct(true)
            .getRawMany();
        return raw.map((r) => this.mapRaw(r));
    }
    async listByTour(tourId) {
        const safeTourId = Math.floor(Number(tourId));
        if (!Number.isInteger(safeTourId) || safeTourId < 1) {
            throw new common_1.BadRequestException({
                message: 'Tour ID must be a positive integer.',
            });
        }
        const raw = await this.buildEngagementQuery()
            .where('e.tourId = :tourId', { tourId: safeTourId })
            .orderBy('openingPerformanceSortNull', 'ASC')
            .addOrderBy('openingPerformanceDate', 'ASC')
            .addOrderBy('openingPerformanceTime', 'ASC')
            .addOrderBy('e.engagementId', 'DESC')
            .getRawMany();
        return raw.map((r) => this.mapRaw(r));
    }
    openingPerformanceDateSubquery() {
        return `(
          SELECT TOP 1 CONVERT(varchar(10), op.PerformanceDate, 23)
          FROM dbo.[Performance] op
          WHERE op.EngagementID = e.engagementId
          ORDER BY op.PerformanceDate ASC, op.PerformanceTime ASC
        )`;
    }
    openingPerformanceTimeSubquery() {
        return `(
          SELECT TOP 1 CONVERT(varchar(8), op.PerformanceTime, 108)
          FROM dbo.[Performance] op
          WHERE op.EngagementID = e.engagementId
          ORDER BY op.PerformanceDate ASC, op.PerformanceTime ASC
        )`;
    }
    engagementRehearsalDateSubquery() {
        return `(
          SELECT TOP 1 CONVERT(varchar(10), ep.RehearsalDate, 23)
          FROM dbo.EngagementProduction ep
          WHERE ep.EngagementID = e.EngagementID
          ORDER BY ep.ProductionID DESC
        )`;
    }
    engagementLoadInDateSubquery() {
        return `(
          SELECT TOP 1 CONVERT(varchar(10), ep.LoadInDate, 23)
          FROM dbo.EngagementProduction ep
          WHERE ep.EngagementID = e.EngagementID
          ORDER BY ep.ProductionID DESC
        )`;
    }
    applyEngagementListFilters(qb, f) {
        const engagementId = Math.floor(Number(f.engagementId));
        if (Number.isInteger(engagementId) && engagementId > 0) {
            qb.andWhere('e.engagementId = :searchEngagementId', {
                searchEngagementId: engagementId,
            });
        }
        const q = (f.q ?? '').trim();
        if (q) {
            this.searchTokens(q).forEach((token, index) => {
                const param = `engagementSearch${index}`;
                const like = `%${this.escapeLikePattern(token)}%`;
                qb.andWhere(`(LOWER(CAST(e.engagementId AS VARCHAR(20))) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(a.attractionName, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(t.tourName) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(vc.companyName, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(v.venueName, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(dma.marketName, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(e.engagementStatus, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(addr.city, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(addr.stateProvince, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(tourBanner.linkUrl, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL((
          SELECT STRING_AGG(LTRIM(RTRIM(ccq.CompanyName)), N', ') WITHIN GROUP (ORDER BY LTRIM(RTRIM(ccq.CompanyName)))
          FROM dbo.EngagementVenue evq
          INNER JOIN dbo.VenueComplexMember vcmq ON vcmq.VenueCompanyID = evq.VenueCompanyID
          INNER JOIN dbo.Company ccq ON ccq.CompanyID = vcmq.ComplexCompanyID
          WHERE evq.EngagementID = e.engagementId AND evq.IsPrimary = 1
        ), '')) LIKE LOWER(:${param}) ESCAPE '\\')`, { [param]: like });
            });
        }
        const st = (f.status ?? '').trim();
        if (st && st !== 'All') {
            if (st === 'Unknown') {
                qb.andWhere(`(e.engagementStatus IS NULL OR LTRIM(RTRIM(e.engagementStatus)) NOT IN ('Private', 'Public'))`);
            }
            else if (st === 'Private' || st === 'Public') {
                qb.andWhere('LTRIM(RTRIM(e.engagementStatus)) = :stExact', {
                    stExact: st,
                });
            }
        }
        const an = (f.attractionName ?? '').trim();
        if (an) {
            qb.andWhere("LOWER(LTRIM(RTRIM(ISNULL(a.attractionName, '')))) = LOWER(:an)", {
                an,
            });
        }
        const dma = (f.dmaMarketName ?? '').trim();
        if (dma) {
            qb.andWhere("LOWER(LTRIM(RTRIM(ISNULL(dma.marketName, '')))) = LOWER(:dma)", {
                dma,
            });
        }
        const vl = (f.venueLabel ?? '').trim();
        if (vl) {
            qb.andWhere(`(LOWER(LTRIM(RTRIM(ISNULL(vc.companyName, '')))) = LOWER(:vl) OR LOWER(LTRIM(RTRIM(ISNULL(v.venueName, '')))) = LOWER(:vl))`, { vl });
        }
        const openingSub = this.openingPerformanceDateSubquery();
        if (f.timing === 'upcoming') {
            qb.andWhere(`(${openingSub} IS NULL OR CAST(${openingSub} AS DATE) >= CAST(GETDATE() AS DATE))`);
        }
        else if (f.timing === 'past') {
            qb.andWhere(`(${openingSub} IS NOT NULL AND CAST(${openingSub} AS DATE) < CAST(GETDATE() AS DATE))`);
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(f.dateFrom ?? '')) && /^\d{4}-\d{2}-\d{2}$/.test(String(f.dateTo ?? ''))) {
            qb.andWhere(`EXISTS (
          SELECT 1
          FROM dbo.Performance hubPerf
          WHERE hubPerf.EngagementID = e.engagementId
            AND CAST(hubPerf.PerformanceDate AS DATE) >= CAST(:dateFrom AS DATE)
            AND CAST(hubPerf.PerformanceDate AS DATE) <= CAST(:dateTo AS DATE)
        )`, { dateFrom: f.dateFrom, dateTo: f.dateTo });
        }
    }
    applyEngagementListSort(qb, sortByRaw, sortDirRaw) {
        const sortBy = (sortByRaw ?? '').trim().toLowerCase();
        const sortDir = (sortDirRaw ?? '').trim().toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        if (sortBy === 'attraction') {
            qb.orderBy('a.attractionName', sortDir).addOrderBy('e.engagementId', 'DESC');
        }
        else if (sortBy === 'tour') {
            qb.orderBy('t.tourName', sortDir).addOrderBy('e.engagementId', 'DESC');
        }
        else if (sortBy === 'venue') {
            qb.orderBy('vc.companyName', sortDir)
                .addOrderBy('v.venueName', sortDir)
                .addOrderBy('e.engagementId', 'DESC');
        }
        else if (sortBy === 'market') {
            qb.orderBy('dma.marketName', sortDir).addOrderBy('e.engagementId', 'DESC');
        }
        else if (sortBy === 'date') {
            qb.orderBy('openingPerformanceSortNull', 'ASC')
                .addOrderBy('openingPerformanceDate', sortDir)
                .addOrderBy('openingPerformanceTime', sortDir)
                .addOrderBy('e.engagementId', 'DESC');
        }
        else {
            qb.orderBy('e.engagementId', 'DESC');
        }
    }
    async resolveIaeContactIdForSignedInUser() {
        const emails = this.auditContext
            .getUserEmailCandidates()
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean);
        if (emails.length === 0)
            return null;
        const row = await this.contactRepo
            .createQueryBuilder('c')
            .innerJoin('c.contactInfo', 'ci')
            .innerJoin(contact_assignment_entity_1.ContactAssignment, 'ca', 'ca.contactId = c.contactId')
            .innerJoin(company_entity_1.Company, 'internalCompany', 'internalCompany.companyId = ca.companyId')
            .where('LOWER(LTRIM(RTRIM(ci.email))) IN (:...emails)', { emails })
            .andWhere('internalCompany.isInternal = :isInternal', {
            isInternal: true,
        })
            .select('c.contactId', 'contactId')
            .getRawOne();
        if (row?.contactId == null)
            return null;
        const id = Number(row.contactId);
        return Number.isFinite(id) && id >= 1 ? id : null;
    }
    async listHubSchedule(startDateRaw, endDateRaw) {
        const userEmail = this.auditContext.getUserEmail()?.trim();
        if (!userEmail) {
            throw new common_1.BadRequestException({
                message: 'Sign in required to load your engagements.',
            });
        }
        const startDate = this.normalizeHubScheduleYmd(startDateRaw);
        const endDate = this.normalizeHubScheduleYmd(endDateRaw);
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException({
                message: 'Query parameters startDate and endDate are required (YYYY-MM-DD).',
            });
        }
        if (endDate < startDate) {
            throw new common_1.BadRequestException({
                message: 'endDate cannot be before startDate.',
            });
        }
        const myIaeContactId = await this.resolveIaeContactIdForSignedInUser();
        if (myIaeContactId == null)
            return [];
        const openingSub = this.openingPerformanceDateSubquery();
        const qb = this.buildEngagementQuery();
        qb.andWhere(`EXISTS (
        SELECT 1
        FROM dbo.EngagementIAEContact eic
        WHERE eic.EngagementID = e.engagementId
          AND eic.ContactID = :myIaeContactId
      )`, { myIaeContactId });
        qb.andWhere(`EXISTS (
        SELECT 1
        FROM dbo.[Performance] hubPerf
        WHERE hubPerf.EngagementID = e.engagementId
          AND CAST(hubPerf.PerformanceDate AS DATE) >= CAST(:startDate AS DATE)
          AND CAST(hubPerf.PerformanceDate AS DATE) <= CAST(:endDate AS DATE)
      )`, { startDate, endDate });
        qb.orderBy(openingSub, 'ASC').addOrderBy('e.engagementId', 'ASC');
        const raw = await qb.getRawMany();
        return raw.map((r) => this.mapRaw(r));
    }
    normalizeHubScheduleYmd(raw) {
        const s = (raw ?? '').trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    }
    async listHubRedAlerts() {
        const userEmail = this.auditContext.getUserEmail()?.trim();
        if (!userEmail) {
            throw new common_1.BadRequestException({
                message: 'Sign in required to load your engagements.',
            });
        }
        const myIaeContactId = await this.resolveIaeContactIdForSignedInUser();
        if (myIaeContactId == null)
            return [];
        if (!(await this.engagementFinancesHasMarketingBudgetColumns()))
            return [];
        const raw = (await this.dataSource.query(`
      SELECT
        e.EngagementID AS engagementId,
        a.AttractionName AS attractionName,
        t.TourName AS tourName,
        COALESCE(NULLIF(LTRIM(RTRIM(ISNULL(vc.CompanyName, ''))), ''), v.VenueName) AS venueName,
        addr.City AS city,
        addr.StateProvince AS stateProvince,
        CONVERT(varchar(10), op.openingDate, 120) AS openingPerformanceDate,
        ef.SalesRevenueGoal AS salesRevenueGoal,
        sales.totalRevenue AS totalRevenue
      FROM dbo.Engagement e
      INNER JOIN dbo.EngagementFinances ef
        ON ef.EngagementID = e.EngagementID
       AND ef.SalesRevenueGoal IS NOT NULL
       AND ef.SalesRevenueGoal > 0
      INNER JOIN dbo.Tour t ON t.TourID = e.TourID
      LEFT JOIN dbo.Attraction a ON a.AttractionID = t.AttractionID
      LEFT JOIN dbo.EngagementVenue ev
        ON ev.EngagementID = e.EngagementID AND ev.IsPrimary = 1
      LEFT JOIN dbo.Venue v ON v.CompanyID = ev.VenueCompanyID
      LEFT JOIN dbo.Company vc ON vc.CompanyID = ev.VenueCompanyID
      LEFT JOIN dbo.Address addr ON addr.AddressID = vc.PhysicalAddressID
      OUTER APPLY (
        SELECT COALESCE(SUM(CAST(ts.PerformanceSalesRevenue AS decimal(18,2))), 0) AS totalRevenue
        FROM dbo.TicketingSales ts
        INNER JOIN dbo.[Performance] p ON p.PerformanceID = ts.PerformanceID
        WHERE p.EngagementID = e.EngagementID
      ) sales
      OUTER APPLY (
        SELECT MIN(CAST(p2.PerformanceDate AS DATE)) AS openingDate
        FROM dbo.[Performance] p2
        WHERE p2.EngagementID = e.EngagementID
      ) op
      WHERE EXISTS (
          SELECT 1 FROM dbo.EngagementIAEContact eic
          WHERE eic.EngagementID = e.EngagementID AND eic.ContactID = @0
        )
        AND LOWER(ISNULL(e.EngagementStatus, '')) NOT LIKE 'cancel%'
        AND sales.totalRevenue < ef.SalesRevenueGoal
      ORDER BY sales.totalRevenue / ef.SalesRevenueGoal ASC, e.EngagementID DESC
      `, [myIaeContactId]));
        return raw.map((r) => {
            const goal = Number(pickRaw(r, 'salesRevenueGoal') ?? 0);
            const revenue = Number(pickRaw(r, 'totalRevenue') ?? 0);
            const pct = goal > 0 ? Math.max(0, Math.min(100, (revenue / goal) * 100)) : 0;
            return {
                engagementId: Number(pickRaw(r, 'engagementId')),
                attractionName: pickRaw(r, 'attractionName') ?? null,
                tourName: pickRaw(r, 'tourName') ?? null,
                venueName: pickRaw(r, 'venueName') ?? null,
                city: pickRaw(r, 'city') ?? null,
                stateProvince: pickRaw(r, 'stateProvince') ?? null,
                openingPerformanceDate: pickRaw(r, 'openingPerformanceDate') ?? null,
                salesRevenueGoal: goal,
                totalRevenue: revenue,
                pctToGoal: Math.round(pct * 10) / 10,
            };
        });
    }
    async listPaginated(offset, limit, filters = {}) {
        const safeLimit = Math.min(10_000, Math.max(1, limit));
        const off = Math.max(0, offset);
        const qb = this.buildEngagementQuery();
        if (filters.mine) {
            const myIaeContactId = await this.resolveIaeContactIdForSignedInUser();
            if (myIaeContactId == null)
                return { data: [], total: 0 };
            qb.andWhere(`EXISTS (
          SELECT 1
          FROM dbo.EngagementIAEContact eic
          WHERE eic.EngagementID = e.engagementId
            AND eic.ContactID = :myIaeContactId
        )`, { myIaeContactId });
        }
        this.applyEngagementListFilters(qb, filters);
        this.applyEngagementListSort(qb, filters.sortBy, filters.sortDir);
        const total = await qb.clone().getCount();
        const raw = await qb.offset(off).limit(safeLimit).getRawMany();
        return {
            data: raw.map((r) => this.mapRaw(r)),
            total,
        };
    }
    async filterOptions() {
        const attractionNames = (await this.engagementRepo
            .createQueryBuilder('e')
            .innerJoin(tour_entity_1.Tour, 't', 't.tourId = e.tourId')
            .leftJoin(attraction_entity_1.Attraction, 'a', 'a.attractionId = t.attractionId')
            .select('a.attractionName', 'name')
            .where('a.attractionName IS NOT NULL')
            .distinct(true)
            .orderBy('a.attractionName', 'ASC')
            .getRawMany()).map((r) => String(r.name ?? ''));
        const dmaMarketNames = (await this.engagementRepo
            .createQueryBuilder('e')
            .innerJoin(tour_entity_1.Tour, 't', 't.tourId = e.tourId')
            .leftJoin(engagement_venue_entity_1.EngagementVenue, 'ev', 'ev.engagementId = e.engagementId AND ev.isPrimary = :prim', { prim: true })
            .leftJoin(company_entity_1.Company, 'vc', 'vc.companyId = ev.venueCompanyId')
            .leftJoin(dma_entity_1.Dma, 'dma', 'dma.dmaid = vc.dmaid')
            .select('dma.marketName', 'name')
            .where('dma.marketName IS NOT NULL')
            .distinct(true)
            .orderBy('dma.marketName', 'ASC')
            .getRawMany()).map((r) => String(r.name ?? ''));
        const venueRows = await this.engagementRepo
            .createQueryBuilder('e')
            .innerJoin(tour_entity_1.Tour, 't', 't.tourId = e.tourId')
            .leftJoin(engagement_venue_entity_1.EngagementVenue, 'ev', 'ev.engagementId = e.engagementId AND ev.isPrimary = :prim', { prim: true })
            .leftJoin(venue_entity_1.Venue, 'v', 'v.companyId = ev.venueCompanyId')
            .leftJoin(company_entity_1.Company, 'vc', 'vc.companyId = ev.venueCompanyId')
            .select(['vc.companyName AS cn', 'v.venueName AS vn'])
            .getRawMany();
        const venueSet = new Set();
        for (const r of venueRows) {
            const label = (r.cn?.trim() || r.vn?.trim() || '').trim();
            if (label)
                venueSet.add(label);
        }
        const venueLabels = [...venueSet].sort((a, b) => a.localeCompare(b));
        return { attractionNames, dmaMarketNames, venueLabels };
    }
    async getOne(id) {
        const raw = await this.buildEngagementQuery(id).getRawOne();
        if (!raw)
            throw new common_1.NotFoundException({ message: `Engagement #${id} not found.` });
        const base = this.mapRaw(raw);
        return this.mergeEngagementProductionTimesFromDb(id, base);
    }
    async getFinance(engagementId) {
        const engagement = await this.assertEngagementExists(engagementId);
        const payableEntity = await this.tourRepo
            .createQueryBuilder('t')
            .leftJoin(company_entity_1.Company, 'pmc', 'pmc.companyId = t.tourManagementCompanyId')
            .select('pmc.companyId', 'companyId')
            .addSelect('pmc.companyName', 'companyName')
            .where('t.tourId = :tourId', { tourId: engagement.tourId })
            .getRawOne()
            .then((raw) => {
            const id = Number(raw?.companyId);
            const name = String(raw?.companyName ?? '').trim();
            return Number.isInteger(id) && id > 0 && name
                ? { companyId: id, companyName: name }
                : null;
        });
        const row = await this.engagementFinancesRepo.findOne({
            where: { engagementId },
        });
        let artistRow = null;
        const afId = row?.artistFinanceId ?? null;
        if (afId != null) {
            artistRow = await this.artistFinanceRepo.findOne({
                where: { artistFinanceId: afId },
            });
        }
        let artistTourOfferLinkUrl = null;
        if (artistRow?.tourOfferLinkId) {
            const linkRow = await this.linkRepo.findOne({ where: { linkId: artistRow.tourOfferLinkId } });
            artistTourOfferLinkUrl = linkRow?.linkUrl ?? null;
        }
        let settlementRow = null;
        const sfId = row?.settlementFinanceId ?? null;
        if (sfId != null) {
            settlementRow = await this.settlementFinanceRepo.findOne({
                where: { settlementFinanceId: sfId },
            });
        }
        const base = this.toFinanceResponse(engagementId, row, engagement, artistRow, settlementRow, payableEntity);
        base.artistTourOfferLink = artistTourOfferLinkUrl;
        if (!row?.financeId)
            return this.mergeAnnouncementDateFromProduction(engagementId, base);
        const withMarketingBudget = await this.mergeFinanceMarketingBudgetFromDb(row.financeId, base);
        const withDealStructures = await this.mergeFinanceDealStructuresFromDb(row.financeId, withMarketingBudget);
        const withSharePointLinks = await this.mergeFinanceSharePointLinksFromDb(row.financeId, withDealStructures);
        const withBooking = await this.mergeFinanceBookingFieldsFromDb(row.financeId, withSharePointLinks);
        const withEventBusiness = await this.mergeFinanceEventBusinessFieldsFromDb(row.financeId, withBooking);
        const withCustomer = await this.mergeFinanceCustomerFromDb(row.financeId, withEventBusiness);
        const withPromoterCompany = await this.mergeFinancePromoterPartnerCompanyFromDb(row.financeId, withCustomer);
        const withTourLicensing = await this.mergeFinanceTourLicensingFromDb(engagementId, withPromoterCompany);
        return this.mergeAnnouncementDateFromProduction(engagementId, withTourLicensing);
    }
    async mergeFinanceTourLicensingFromDb(engagementId, base) {
        try {
            const eid = Math.floor(Number(engagementId));
            if (!Number.isFinite(eid) || eid < 1)
                return base;
            const r = await this.dataSource.query(`
        SELECT t.[ASCAP] AS ascap, t.[BMI] AS bmi, t.[SESAC] AS sesac, t.[GMR] AS gmr
        FROM dbo.Engagement e
        INNER JOIN dbo.Tour t ON t.TourID = e.TourID
        WHERE e.EngagementID = ${eid}
      `);
            const row0 = r?.[0];
            if (!row0)
                return base;
            return {
                ...base,
                tourAscap: this.mapBit(pickRaw(row0, 'ascap')),
                tourBmi: this.mapBit(pickRaw(row0, 'bmi')),
                tourSesac: this.mapBit(pickRaw(row0, 'sesac')),
                tourGmr: this.mapBit(pickRaw(row0, 'gmr')),
            };
        }
        catch {
            return base;
        }
    }
    async getFinanceLookups() {
        const allow = (0, iae_waiver_status_constants_1.getIaeWaiverStatusAllowlist)();
        const iaeApplicationWaiverStatuses = allow.map((v) => ({
            value: v,
            label: v,
        }));
        const nrRows = await this.listNonResidentWithholdingRowsSafe();
        const linkIds = Array.from(new Set(nrRows
            .flatMap((r) => [
            r.withholdingLinkId ?? null,
            r.artistWaiverInstructionsId ?? null,
            r.iaeWaiverInstructionsId ?? null,
        ])
            .filter((id) => id != null && Number.isInteger(id) && id > 0)));
        const links = linkIds.length > 0
            ? await this.linkRepo.find({ where: { linkId: (0, typeorm_2.In)(linkIds) } })
            : [];
        const linksById = new Map(links.map((link) => [link.linkId, link]));
        const dmaIds = Array.from(new Set(nrRows.map((r) => r.dmaid).filter((id) => id != null && id > 0)));
        let dmaAreaById = new Map();
        if (dmaIds.length > 0) {
            try {
                const dmaRows = await this.dataSource.query(`SELECT DMAID AS id, MIN(MarketName) AS marketName FROM dbo.DMA WHERE DMAID IN (${dmaIds.join(',')}) GROUP BY DMAID`);
                dmaAreaById = new Map(dmaRows.map((d) => [Number(d['id']), String(d['marketName'] ?? '')]));
            }
            catch { }
        }
        const nonResidentWithholdings = nrRows.map((r) => ({
            id: r.withholdingId,
            label: `Withholding #${r.withholdingId} (rate ${r.withholdingTaxRate})`,
            withholdingTaxRate: String(r.withholdingTaxRate ?? ''),
            withholdingArea: r.withholdingArea ?? (r.dmaid != null ? (dmaAreaById.get(r.dmaid) ?? null) : null),
            dmaid: r.dmaid ?? null,
            taxAgencyId: r.taxAgencyId ?? null,
            withholdingAgencyName: r.withholdingAgencyName ?? null,
            withholdingPayee: r.withholdingPayee ?? null,
            paymentMethod: r.paymentMethod ?? null,
            formToAttractionUrl: r.formToAttractionUrl ?? null,
            formToMunicipalityUrl: r.formToMunicipalityUrl ?? null,
            quickBooksNumber: r.quickBooksNumber ?? null,
            canApplyForWaiver: r.canApplyForWaiver ?? null,
            iaeWaiverInstructionsText: r.iaeWaiverInstructionsText ?? null,
            completedWaiverUrl: r.completedWaiverUrl ?? null,
            iaeWaiverSubmissionDate: r.iaeWaiverSubmissionDate ?? null,
            iaeWaiverAppNumber: r.iaeWaiverAppNumber ?? null,
            iaeWaiverUrl: r.iaeWaiverUrl ?? null,
            tourWaiverUrl: r.tourWaiverUrl ?? null,
            exceptionsNotes: r.exceptionsNotes ?? null,
            withholdingLink: this.mapFinanceLink(r.withholdingLinkId ? linksById.get(r.withholdingLinkId) : null),
            artistWaiverInstructions: this.mapFinanceLink(r.artistWaiverInstructionsId
                ? linksById.get(r.artistWaiverInstructionsId)
                : null),
            iaeWaiverInstructions: this.mapFinanceLink(r.iaeWaiverInstructionsId
                ? linksById.get(r.iaeWaiverInstructionsId)
                : null),
        }));
        let artistFinances = [];
        try {
            const ar = await this.artistFinanceRepo.find({
                order: { artistFinanceId: 'ASC' },
                take: 5000,
            });
            artistFinances = ar.map((r) => ({
                id: r.artistFinanceId,
                label: (r.artistDealType?.trim() || '').slice(0, 80) ||
                    `Artist finance #${r.artistFinanceId}`,
            }));
        }
        catch {
            try {
                const raw = await this.dataSource.query(`SELECT ArtistFinanceID AS id FROM dbo.ArtistFinance ORDER BY ArtistFinanceID`);
                artistFinances = (raw ?? []).map((r) => ({
                    id: Number(r.id),
                    label: `Artist finance #${Number(r.id)}`,
                }));
            }
            catch {
                artistFinances = [];
            }
        }
        let settlementFinances = [];
        try {
            const sf = await this.settlementFinanceRepo.find({
                order: { settlementFinanceId: 'ASC' },
                take: 5000,
            });
            settlementFinances = sf.map((r) => {
                const parts = [r.artistSettlementStatus, r.venueSettlementStatus]
                    .map((x) => (x ?? '').trim())
                    .filter(Boolean);
                const hint = parts.join(' / ').slice(0, 80);
                return {
                    id: r.settlementFinanceId,
                    label: hint || `Settlement finance #${r.settlementFinanceId}`,
                };
            });
        }
        catch {
            try {
                const raw = await this.dataSource.query(`SELECT SettlementFinanceID AS id FROM dbo.SettlementFinance ORDER BY SettlementFinanceID`);
                settlementFinances = (raw ?? []).map((r) => ({
                    id: Number(r.id),
                    label: `Settlement finance #${Number(r.id)}`,
                }));
            }
            catch {
                settlementFinances = [];
            }
        }
        let venueDealTypes = [];
        try {
            const raw = await this.dataSource.query(`SELECT VenueDealTypeID AS id, VenueDealTypeName AS label FROM dbo.VenueDealType ORDER BY VenueDealTypeName`);
            venueDealTypes = (raw ?? [])
                .map((r) => ({
                id: Number(r['id']),
                label: String(r['label'] ?? '').trim(),
            }))
                .filter((o) => Number.isInteger(o.id) && o.id > 0 && o.label);
        }
        catch {
            venueDealTypes = [];
        }
        return {
            nonResidentWithholdings,
            artistFinances,
            settlementFinances,
            iaeApplicationWaiverStatuses,
            venueDealTypes,
        };
    }
    async updateNonResidentWithholdingLinks(withholdingId, dto) {
        const id = Math.floor(Number(withholdingId));
        if (!Number.isInteger(id) || id < 1) {
            throw new common_1.BadRequestException({ message: 'Invalid withholding id.' });
        }
        const row = await this.findNonResidentWithholdingByIdSafe(id);
        if (!row) {
            throw new common_1.NotFoundException({
                message: `Non-resident withholding #${id} was not found.`,
            });
        }
        let nextIaeWaiverInstructionsId = row.iaeWaiverInstructionsId;
        let nextArtistWaiverInstructionsId = row.artistWaiverInstructionsId;
        if (dto.iaeWaiverInstructionsUrl !== undefined) {
            nextIaeWaiverInstructionsId = await this.upsertUrlLink(dto.iaeWaiverInstructionsUrl, row.iaeWaiverInstructionsId, 'IAE waiver instructions');
        }
        if (dto.artistWaiverInstructionsUrl !== undefined) {
            nextArtistWaiverInstructionsId = await this.upsertUrlLink(dto.artistWaiverInstructionsUrl, row.artistWaiverInstructionsId, 'Artist waiver instructions');
        }
        await this.dataSource.query(`
        UPDATE [dbo].[NonResidentWithholding]
        SET
          [IAEWaiverInstructionsID] = @0,
          [ArtistWaiverInstructionsID] = @1
        WHERE [WithholdingID] = @2
      `, [nextIaeWaiverInstructionsId, nextArtistWaiverInstructionsId, id]);
    }
    async createWithholdingForEngagement(engagementId) {
        const id = Math.floor(Number(engagementId));
        if (!Number.isInteger(id) || id < 1) {
            throw new common_1.BadRequestException({ message: 'Invalid engagement id.' });
        }
        await this.assertEngagementExists(id);
        return this.dataSource.transaction(async (em) => {
            const existingFinance = await em.findOne(engagement_finance_entity_1.EngagementFinances, {
                where: { engagementId: id },
            });
            const existingFinanceWithholdingId = existingFinance?.requiredNonResidentWithholdingId ?? null;
            const primaryEngagementVenue = await em.findOne(engagement_venue_entity_1.EngagementVenue, {
                where: { engagementId: id, isPrimary: true },
            });
            const venueCompanyId = primaryEngagementVenue?.venueCompanyId ?? null;
            const venue = venueCompanyId != null
                ? await em.findOne(venue_entity_1.Venue, { where: { companyId: venueCompanyId } })
                : null;
            if (existingFinanceWithholdingId != null) {
                const existingWithholding = await this.findNonResidentWithholdingByIdSafe(existingFinanceWithholdingId, em);
                if (existingWithholding) {
                    if (venue && venue.nonResidentWithholdingId == null) {
                        venue.nonResidentWithholdingId = existingWithholding.withholdingId;
                        await em.save(venue_entity_1.Venue, venue);
                    }
                    return { withholdingId: existingWithholding.withholdingId };
                }
            }
            const venueWithholdingId = venue?.nonResidentWithholdingId ?? null;
            let venueWithholdingMissing = false;
            if (venueWithholdingId != null) {
                const venueWithholding = await this.findNonResidentWithholdingByIdSafe(venueWithholdingId, em);
                if (venueWithholding) {
                    const finance = existingFinance ??
                        em.create(engagement_finance_entity_1.EngagementFinances, { engagementId: id });
                    finance.requiredNonResidentWithholdingId =
                        venueWithholding.withholdingId;
                    await em.save(engagement_finance_entity_1.EngagementFinances, finance);
                    return { withholdingId: venueWithholding.withholdingId };
                }
                venueWithholdingMissing = true;
            }
            const venueCompany = venueCompanyId != null
                ? await em.findOne(company_entity_1.Company, { where: { companyId: venueCompanyId } })
                : null;
            const hasDmaId = await this.nonResidentWithholdingHasDmaId();
            let savedWithholdingId = null;
            if (hasDmaId) {
                const withholding = em.create(non_resident_withholding_entity_1.NonResidentWithholding, {
                    withholdingTaxRate: '0',
                    dmaid: venueCompany?.dmaid ?? null,
                    taxAgencyId: null,
                    withholdingLinkId: null,
                    artistWaiverInstructionsId: null,
                    iaeWaiverInstructionsId: null,
                });
                const savedWithholding = await em.save(non_resident_withholding_entity_1.NonResidentWithholding, withholding);
                savedWithholdingId = savedWithholding.withholdingId;
            }
            else {
                const inserted = await em.query(`
            INSERT INTO [dbo].[NonResidentWithholding]
              ([WithholdingTaxRate], [TaxAgencyID], [WithholdingLinkID], [ArtistWaiverInstructionsID], [IAEWaiverInstructionsID])
            VALUES (@0, @1, @2, @3, @4);
            SELECT CAST(SCOPE_IDENTITY() AS int) AS withholdingId;
          `, ['0', null, null, null, null]);
                savedWithholdingId = Number(inserted?.[0]?.withholdingId ?? NaN);
            }
            if (!Number.isInteger(savedWithholdingId) || savedWithholdingId < 1) {
                throw new common_1.BadRequestException({
                    message: 'Could not create a withholding record.',
                });
            }
            const finance = existingFinance ?? em.create(engagement_finance_entity_1.EngagementFinances, { engagementId: id });
            finance.requiredNonResidentWithholdingId = savedWithholdingId;
            await em.save(engagement_finance_entity_1.EngagementFinances, finance);
            if (venue &&
                (venue.nonResidentWithholdingId == null || venueWithholdingMissing)) {
                venue.nonResidentWithholdingId = savedWithholdingId;
                await em.save(venue_entity_1.Venue, venue);
            }
            return { withholdingId: savedWithholdingId };
        });
    }
    async assertFinanceFks(dto) {
        if (dto.requiredNonResidentWithholdingId !== undefined) {
            const id = dto.requiredNonResidentWithholdingId;
            if (id != null) {
                await this.assertNonResidentWithholdingExists(id);
            }
        }
        if (dto.artistFinanceId !== undefined) {
            const id = dto.artistFinanceId;
            if (id != null) {
                const found = await this.artistFinanceRepo.findOne({
                    where: { artistFinanceId: id },
                });
                if (!found) {
                    throw new common_1.BadRequestException({
                        message: `Artist finance #${id} was not found.`,
                    });
                }
            }
        }
        if (dto.settlementFinanceId !== undefined) {
            const id = dto.settlementFinanceId;
            if (id != null) {
                const found = await this.settlementFinanceRepo.findOne({
                    where: { settlementFinanceId: id },
                });
                if (!found) {
                    throw new common_1.BadRequestException({
                        message: `Settlement finance #${id} was not found.`,
                    });
                }
            }
        }
    }
    async upsertFinance(engagementId, dto) {
        const engagementRow = await this.assertEngagementExists(engagementId);
        await this.assertFinanceFks(dto);
        let engagementDirty = false;
        if (dto.sellableCapacity !== undefined) {
            engagementRow.sellableCapacity =
                dto.sellableCapacity == null ? null : dto.sellableCapacity;
            engagementDirty = true;
        }
        if (dto.grossPotential !== undefined) {
            engagementRow.grossPotential =
                dto.grossPotential == null ? null : dto.grossPotential;
            engagementDirty = true;
        }
        if (engagementDirty) {
            await this.engagementRepo.save(engagementRow);
        }
        const existing = await this.engagementFinancesRepo.findOne({
            where: { engagementId },
        });
        const row = existing ?? this.engagementFinancesRepo.create({ engagementId });
        if (dto.artistFinanceId !== undefined) {
            row.artistFinanceId = dto.artistFinanceId;
        }
        if (dto.estimatedBreakeven !== undefined) {
            row.estimatedBreakeven =
                dto.estimatedBreakeven == null ? null : dto.estimatedBreakeven;
        }
        const promoterProfitPercentToPersist = dto.promoterProfit !== undefined
            ? dto.promoterProfit
            : dto.artistPromoterProfitPercent;
        if (promoterProfitPercentToPersist !== undefined) {
            row.promoterProfit =
                promoterProfitPercentToPersist == null
                    ? null
                    : promoterProfitPercentToPersist;
        }
        if (dto.venueTerms !== undefined) {
            const t = dto.venueTerms;
            row.venueTerms = t == null || t === '' ? null : t;
        }
        if (dto.confirmationPacketApproved !== undefined) {
            row.confirmationPacketApproved = dto.confirmationPacketApproved;
        }
        if (dto.iaeWaiverApplicationConfirmationNumber !== undefined) {
            const t = dto.iaeWaiverApplicationConfirmationNumber;
            row.iaeWaiverApplicationConfirmationNumber =
                t == null || t.trim() === '' ? null : t.trim().slice(0, 100);
        }
        if (dto.iaeWaiverApplicationSubmissionDate !== undefined) {
            row.iaeWaiverApplicationSubmissionDate = this.assertYmdOrNull(dto.iaeWaiverApplicationSubmissionDate);
        }
        if (dto.iaeApplicationWaiverStatus !== undefined) {
            const t = dto.iaeApplicationWaiverStatus;
            row.iaeApplicationWaiverStatus =
                t == null || t.trim() === '' ? null : t.trim();
        }
        if (dto.dateFundsReceived !== undefined) {
            row.dateFundsReceived = this.assertYmdOrNull(dto.dateFundsReceived);
        }
        if (dto.fundsDue !== undefined) {
            row.fundsDue = dto.fundsDue == null ? null : dto.fundsDue;
        }
        if (dto.fundsWithheld !== undefined) {
            row.fundsWithheld = dto.fundsWithheld == null ? null : dto.fundsWithheld;
        }
        if (dto.fundsOwed !== undefined) {
            row.fundsOwed = dto.fundsOwed == null ? null : dto.fundsOwed;
        }
        if (dto.receivableBankAccount !== undefined) {
            const t = dto.receivableBankAccount;
            row.receivableBankAccount =
                t == null || t.trim() === '' ? null : t.trim();
        }
        if (dto.requiredNonResidentWithholdingId !== undefined) {
            row.requiredNonResidentWithholdingId =
                dto.requiredNonResidentWithholdingId;
        }
        if (dto.settlementFinanceId !== undefined) {
            row.settlementFinanceId = dto.settlementFinanceId;
        }
        if (dto.salesTaxRemittedBy !== undefined) {
            const t = dto.salesTaxRemittedBy;
            row.salesTaxRemittedBy = t == null || t.trim() === '' ? null : t.trim().slice(0, 100);
        }
        if (dto.venueSettlementFileSharePointLink !== undefined) {
            const t = dto.venueSettlementFileSharePointLink;
            row.venueSettlementFileSharePointLink = t == null || t.trim() === '' ? null : t.trim().slice(0, 2048);
        }
        if (dto.partnerSettlementFileSharePointLink !== undefined) {
            const t = dto.partnerSettlementFileSharePointLink;
            row.partnerSettlementFileSharePointLink = t == null || t.trim() === '' ? null : t.trim().slice(0, 2048);
        }
        const touchesArtistMaster = dto.artistDealType !== undefined ||
            dto.artistGuarantee !== undefined ||
            dto.artistMiddleMoney !== undefined ||
            dto.artistRoyaltyVariableFee !== undefined ||
            dto.artistBackEndTerms !== undefined ||
            dto.artistRoyaltyRatePercent !== undefined ||
            dto.artistRoyaltyBasedOn !== undefined ||
            dto.artistVersusPercent !== undefined ||
            dto.artistPromoterProfitPercent !== undefined ||
            dto.artistBackendPercent !== undefined ||
            dto.artistPartOfCollateralizedDeal !== undefined ||
            dto.artistBuyouts !== undefined ||
            dto.artistTourOfferLink !== undefined;
        if (touchesArtistMaster) {
            let afId = row.artistFinanceId;
            if (afId == null) {
                const created = this.artistFinanceRepo.create({
                    artistDealType: dto.artistDealType === undefined
                        ? null
                        : dto.artistDealType == null || dto.artistDealType.trim() === ''
                            ? null
                            : dto.artistDealType.trim().slice(0, 100),
                    artistGuarantee: dto.artistGuarantee === undefined
                        ? null
                        : dto.artistGuarantee == null
                            ? null
                            : dto.artistGuarantee,
                    artistMiddleMoney: dto.artistMiddleMoney === undefined
                        ? null
                        : dto.artistMiddleMoney == null
                            ? null
                            : dto.artistMiddleMoney,
                    artistRoyaltyVariableFee: dto.artistVersusPercent !== undefined
                        ? (dto.artistVersusPercent != null ? String(dto.artistVersusPercent) : null)
                        : null,
                    overagePercent: dto.overagePercent !== undefined
                        ? (dto.overagePercent == null ? null : dto.overagePercent)
                        : null,
                    artistBackEndTerms: dto.artistBackendPercent !== undefined
                        ? (dto.artistBackendPercent != null ? String(dto.artistBackendPercent) : null)
                        : null,
                    royaltyRate: dto.artistRoyaltyRatePercent !== undefined ? dto.artistRoyaltyRatePercent : null,
                    royaltyBasis: dto.artistRoyaltyBasedOn !== undefined ? (dto.artistRoyaltyBasedOn?.trim() || null) : null,
                    isCollateralizedDeal: dto.artistPartOfCollateralizedDeal !== undefined
                        ? (dto.artistPartOfCollateralizedDeal ?? null)
                        : null,
                    buyoutAmount: dto.artistBuyouts !== undefined
                        ? (dto.artistBuyouts == null ? null : dto.artistBuyouts)
                        : null,
                    tourOfferLinkId: null,
                });
                if (dto.artistTourOfferLink !== undefined) {
                    const linkId = await this.upsertUrlLink(dto.artistTourOfferLink, null, 'Tour Offer');
                    created.tourOfferLinkId = linkId;
                }
                const savedAf = await this.artistFinanceRepo.save(created);
                afId = savedAf.artistFinanceId;
                row.artistFinanceId = afId;
            }
            else {
                const af = await this.artistFinanceRepo.findOne({
                    where: { artistFinanceId: afId },
                });
                if (!af) {
                    throw new common_1.BadRequestException({
                        message: `Artist finance #${afId} was not found.`,
                    });
                }
                if (dto.artistDealType !== undefined) {
                    const t = dto.artistDealType;
                    af.artistDealType =
                        t == null || t.trim() === '' ? null : t.trim().slice(0, 100);
                }
                if (dto.artistGuarantee !== undefined) {
                    af.artistGuarantee =
                        dto.artistGuarantee == null ? null : dto.artistGuarantee;
                }
                if (dto.artistMiddleMoney !== undefined) {
                    af.artistMiddleMoney =
                        dto.artistMiddleMoney == null ? null : dto.artistMiddleMoney;
                }
                if (dto.artistVersusPercent !== undefined) {
                    af.artistRoyaltyVariableFee =
                        dto.artistVersusPercent != null ? String(dto.artistVersusPercent) : null;
                }
                if (dto.overagePercent !== undefined) {
                    af.overagePercent =
                        dto.overagePercent == null ? null : dto.overagePercent;
                }
                if (dto.artistBackendPercent !== undefined) {
                    af.artistBackEndTerms =
                        dto.artistBackendPercent != null ? String(dto.artistBackendPercent) : null;
                }
                if (dto.artistRoyaltyRatePercent !== undefined) {
                    af.royaltyRate = dto.artistRoyaltyRatePercent;
                }
                if (dto.artistRoyaltyBasedOn !== undefined) {
                    af.royaltyBasis = dto.artistRoyaltyBasedOn?.trim() || null;
                }
                if (dto.artistPartOfCollateralizedDeal !== undefined) {
                    af.isCollateralizedDeal = dto.artistPartOfCollateralizedDeal ?? null;
                }
                if (dto.artistBuyouts !== undefined) {
                    af.buyoutAmount = dto.artistBuyouts == null ? null : dto.artistBuyouts;
                }
                if (dto.artistTourOfferLink !== undefined) {
                    const linkId = await this.upsertUrlLink(dto.artistTourOfferLink, af.tourOfferLinkId, 'Tour Offer');
                    af.tourOfferLinkId = linkId;
                }
                await this.artistFinanceRepo.save(af);
            }
        }
        const touchesSettlementMaster = dto.artistSettlementStatus !== undefined ||
            dto.venueSettlementStatus !== undefined ||
            dto.subscriptionSalesRevenueTotal !== undefined ||
            dto.seasonTicketSalesByIae !== undefined ||
            dto.seasonTicketFundsTransferred !== undefined ||
            dto.netBoxOfficeFundsDepositedAccount !== undefined ||
            dto.hstCollectedFromTicketSales !== undefined ||
            dto.hstPaidOnTourPayments !== undefined ||
            dto.hstPaidOnShowExpenses !== undefined ||
            dto.hstPaidOnVenueExpenses !== undefined ||
            dto.artistGrossTaxableCompensation !== undefined ||
            dto.amountDueToDeptOfRevenue !== undefined ||
            dto.checkNumberOrConfOfWithholdingPayment !== undefined ||
            dto.finalGuaranteeAmount !== undefined ||
            dto.finalRoyaltyAmount !== undefined ||
            dto.finalOverageAmount !== undefined ||
            dto.finalBuyoutAmount !== undefined ||
            dto.finalDirectCompanyCharges !== undefined ||
            dto.finalReimbursables !== undefined;
        if (touchesSettlementMaster) {
            let sfId = row.settlementFinanceId;
            if (sfId == null) {
                const created = this.settlementFinanceRepo.create({
                    artistSettlementStatus: dto.artistSettlementStatus === undefined
                        ? null
                        : dto.artistSettlementStatus == null ||
                            String(dto.artistSettlementStatus).trim() === ''
                            ? null
                            : String(dto.artistSettlementStatus).trim().slice(0, 50),
                    venueSettlementStatus: dto.venueSettlementStatus === undefined
                        ? null
                        : dto.venueSettlementStatus == null ||
                            String(dto.venueSettlementStatus).trim() === ''
                            ? null
                            : String(dto.venueSettlementStatus).trim().slice(0, 50),
                    subscriptionSalesRevenueTotal: dto.subscriptionSalesRevenueTotal === undefined
                        ? null
                        : dto.subscriptionSalesRevenueTotal == null
                            ? null
                            : dto.subscriptionSalesRevenueTotal,
                    seasonTicketSalesByIae: dto.seasonTicketSalesByIae === undefined
                        ? null
                        : dto.seasonTicketSalesByIae == null
                            ? null
                            : dto.seasonTicketSalesByIae,
                    seasonTicketFundsTransferred: dto.seasonTicketFundsTransferred === undefined
                        ? null
                        : dto.seasonTicketFundsTransferred == null
                            ? null
                            : dto.seasonTicketFundsTransferred,
                    netBoxOfficeFundsDepositedAccount: dto.netBoxOfficeFundsDepositedAccount === undefined
                        ? null
                        : dto.netBoxOfficeFundsDepositedAccount == null ||
                            String(dto.netBoxOfficeFundsDepositedAccount).trim() === ''
                            ? null
                            : String(dto.netBoxOfficeFundsDepositedAccount)
                                .trim()
                                .slice(0, 255),
                    hstCollectedFromTicketSales: dto.hstCollectedFromTicketSales === undefined
                        ? null
                        : dto.hstCollectedFromTicketSales == null
                            ? null
                            : dto.hstCollectedFromTicketSales,
                    hstPaidOnTourPayments: dto.hstPaidOnTourPayments === undefined
                        ? null
                        : dto.hstPaidOnTourPayments == null
                            ? null
                            : dto.hstPaidOnTourPayments,
                    hstPaidOnShowExpenses: dto.hstPaidOnShowExpenses === undefined
                        ? null
                        : dto.hstPaidOnShowExpenses == null
                            ? null
                            : dto.hstPaidOnShowExpenses,
                    hstPaidOnVenueExpenses: dto.hstPaidOnVenueExpenses === undefined
                        ? null
                        : dto.hstPaidOnVenueExpenses == null
                            ? null
                            : dto.hstPaidOnVenueExpenses,
                    artistGrossTaxableCompensation: dto.artistGrossTaxableCompensation === undefined
                        ? null
                        : dto.artistGrossTaxableCompensation == null
                            ? null
                            : dto.artistGrossTaxableCompensation,
                    amountDueToDeptOfRevenue: dto.amountDueToDeptOfRevenue === undefined
                        ? null
                        : dto.amountDueToDeptOfRevenue == null
                            ? null
                            : dto.amountDueToDeptOfRevenue,
                    checkNumberOrConfOfWithholdingPayment: dto.checkNumberOrConfOfWithholdingPayment === undefined
                        ? null
                        : dto.checkNumberOrConfOfWithholdingPayment == null ||
                            String(dto.checkNumberOrConfOfWithholdingPayment).trim() ===
                                ''
                            ? null
                            : String(dto.checkNumberOrConfOfWithholdingPayment)
                                .trim()
                                .slice(0, 100),
                    finalGuaranteeAmount: dto.finalGuaranteeAmount === undefined ? null : dto.finalGuaranteeAmount ?? null,
                    finalRoyaltyAmount: dto.finalRoyaltyAmount === undefined ? null : dto.finalRoyaltyAmount ?? null,
                    finalOverageAmount: dto.finalOverageAmount === undefined ? null : dto.finalOverageAmount ?? null,
                    finalBuyoutAmount: dto.finalBuyoutAmount === undefined ? null : dto.finalBuyoutAmount ?? null,
                    directCompanyCharges: dto.finalDirectCompanyCharges === undefined ? null : dto.finalDirectCompanyCharges ?? null,
                    reimbursables: dto.finalReimbursables === undefined ? null : dto.finalReimbursables ?? null,
                });
                const savedSf = await this.settlementFinanceRepo.save(created);
                sfId = savedSf.settlementFinanceId;
                row.settlementFinanceId = sfId;
            }
            else {
                const sf = await this.settlementFinanceRepo.findOne({
                    where: { settlementFinanceId: sfId },
                });
                if (!sf) {
                    throw new common_1.BadRequestException({
                        message: `Settlement finance #${sfId} was not found.`,
                    });
                }
                if (dto.artistSettlementStatus !== undefined) {
                    const t = dto.artistSettlementStatus;
                    sf.artistSettlementStatus =
                        t == null || String(t).trim() === ''
                            ? null
                            : String(t).trim().slice(0, 50);
                }
                if (dto.venueSettlementStatus !== undefined) {
                    const t = dto.venueSettlementStatus;
                    sf.venueSettlementStatus =
                        t == null || String(t).trim() === ''
                            ? null
                            : String(t).trim().slice(0, 50);
                }
                if (dto.subscriptionSalesRevenueTotal !== undefined) {
                    sf.subscriptionSalesRevenueTotal =
                        dto.subscriptionSalesRevenueTotal == null
                            ? null
                            : dto.subscriptionSalesRevenueTotal;
                }
                if (dto.seasonTicketSalesByIae !== undefined) {
                    sf.seasonTicketSalesByIae =
                        dto.seasonTicketSalesByIae == null
                            ? null
                            : dto.seasonTicketSalesByIae;
                }
                if (dto.seasonTicketFundsTransferred !== undefined) {
                    sf.seasonTicketFundsTransferred =
                        dto.seasonTicketFundsTransferred == null
                            ? null
                            : dto.seasonTicketFundsTransferred;
                }
                if (dto.netBoxOfficeFundsDepositedAccount !== undefined) {
                    const t = dto.netBoxOfficeFundsDepositedAccount;
                    sf.netBoxOfficeFundsDepositedAccount =
                        t == null || String(t).trim() === ''
                            ? null
                            : String(t).trim().slice(0, 255);
                }
                if (dto.hstCollectedFromTicketSales !== undefined) {
                    sf.hstCollectedFromTicketSales =
                        dto.hstCollectedFromTicketSales == null
                            ? null
                            : dto.hstCollectedFromTicketSales;
                }
                if (dto.hstPaidOnTourPayments !== undefined) {
                    sf.hstPaidOnTourPayments =
                        dto.hstPaidOnTourPayments == null
                            ? null
                            : dto.hstPaidOnTourPayments;
                }
                if (dto.hstPaidOnShowExpenses !== undefined) {
                    sf.hstPaidOnShowExpenses =
                        dto.hstPaidOnShowExpenses == null
                            ? null
                            : dto.hstPaidOnShowExpenses;
                }
                if (dto.hstPaidOnVenueExpenses !== undefined) {
                    sf.hstPaidOnVenueExpenses =
                        dto.hstPaidOnVenueExpenses == null
                            ? null
                            : dto.hstPaidOnVenueExpenses;
                }
                if (dto.artistGrossTaxableCompensation !== undefined) {
                    sf.artistGrossTaxableCompensation =
                        dto.artistGrossTaxableCompensation == null
                            ? null
                            : dto.artistGrossTaxableCompensation;
                }
                if (dto.amountDueToDeptOfRevenue !== undefined) {
                    sf.amountDueToDeptOfRevenue =
                        dto.amountDueToDeptOfRevenue == null
                            ? null
                            : dto.amountDueToDeptOfRevenue;
                }
                if (dto.checkNumberOrConfOfWithholdingPayment !== undefined) {
                    const t = dto.checkNumberOrConfOfWithholdingPayment;
                    sf.checkNumberOrConfOfWithholdingPayment =
                        t == null || String(t).trim() === ''
                            ? null
                            : String(t).trim().slice(0, 100);
                }
                if (dto.finalGuaranteeAmount !== undefined) {
                    sf.finalGuaranteeAmount = dto.finalGuaranteeAmount ?? null;
                }
                if (dto.finalRoyaltyAmount !== undefined) {
                    sf.finalRoyaltyAmount = dto.finalRoyaltyAmount ?? null;
                }
                if (dto.finalOverageAmount !== undefined) {
                    sf.finalOverageAmount = dto.finalOverageAmount ?? null;
                }
                if (dto.finalBuyoutAmount !== undefined) {
                    sf.finalBuyoutAmount = dto.finalBuyoutAmount ?? null;
                }
                if (dto.finalDirectCompanyCharges !== undefined) {
                    sf.directCompanyCharges = dto.finalDirectCompanyCharges ?? null;
                }
                if (dto.finalReimbursables !== undefined) {
                    sf.reimbursables = dto.finalReimbursables ?? null;
                }
                await this.settlementFinanceRepo.save(sf);
            }
        }
        await this.engagementFinancesRepo.save(row);
        await this.tryPersistFinanceMarketingBudget(row.financeId, dto);
        await this.tryPersistFinanceDealStructures(row.financeId, dto);
        await this.tryPersistFinanceSharePointLinks(row.financeId, dto);
        await this.tryPersistFinanceBookingFields(row.financeId, dto);
        await this.tryPersistFinanceEventBusinessFields(row.financeId, dto);
        await this.tryPersistAnnouncementDateToProduction(engagementId, dto);
    }
    async create(dto) {
        const tour = await this.tourRepo.findOne({
            where: { tourId: dto.tourId },
            relations: ['attraction'],
        });
        if (!tour) {
            throw new common_1.BadRequestException({
                message: `Tour #${dto.tourId} does not exist.`,
            });
        }
        await this.assertVenueCompany(dto.primaryVenueCompanyId);
        if (dto.secondaryVenueCompanyIds?.length) {
            for (const secId of dto.secondaryVenueCompanyIds) {
                if (secId === dto.primaryVenueCompanyId) {
                    throw new common_1.BadRequestException({
                        message: `Secondary venue #${secId} is the same as the primary venue.`,
                    });
                }
                await this.assertVenueCompany(secId);
            }
        }
        const result = await this.dataSource.transaction(async (manager) => {
            const row = manager.create(engagement_entity_1.Engagement, {
                engagementStatus: dto.engagementStatus.trim(),
                engagementScaling: null,
                tourId: dto.tourId,
            });
            const saved = await manager.save(engagement_entity_1.Engagement, row);
            await manager.save(engagement_venue_entity_1.EngagementVenue, manager.create(engagement_venue_entity_1.EngagementVenue, {
                engagementId: saved.engagementId,
                venueCompanyId: dto.primaryVenueCompanyId,
                isPrimary: true,
            }));
            for (const secId of dto.secondaryVenueCompanyIds ?? []) {
                await manager.save(engagement_venue_entity_1.EngagementVenue, manager.create(engagement_venue_entity_1.EngagementVenue, {
                    engagementId: saved.engagementId,
                    venueCompanyId: secId,
                    isPrimary: false,
                }));
            }
            const perfStatus = dto.engagementStatus === 'Private'
                ? 'Private (Not Announced)'
                : 'Public (Not On Sale)';
            await manager.save(performance_entity_1.Performance, manager.create(performance_entity_1.Performance, {
                engagementId: saved.engagementId,
                performanceDate: dto.openingShowDate,
                performanceTime: this.normalizeTime(dto.openingShowTime),
                performanceStatus: perfStatus,
            }));
            this.emsCreated.recordEngagement(saved.engagementId);
            try {
                const venueCompany = await manager.findOne(company_entity_1.Company, {
                    where: { companyId: dto.primaryVenueCompanyId },
                    relations: ['physicalAddress'],
                });
                const country = venueCompany?.physicalAddress?.country?.trim().toLowerCase() ?? '';
                const finance = manager.create(engagement_finance_entity_1.EngagementFinances, {
                    engagementId: saved.engagementId,
                    isCanadaEngagement: country === 'canada' || country === 'ca' || country === 'can' || country === 'cdn',
                });
                await manager.save(engagement_finance_entity_1.EngagementFinances, finance);
            }
            catch { }
            return { engagementId: saved.engagementId };
        });
        if (dto.engagementStatus === 'Confirmed') {
            this.startFolderProvisioning(result.engagementId);
        }
        return result;
    }
    async getSharePointFolderLink(engagementId) {
        const el = await this.engagementLinkRepo.findOne({
            where: { engagementId, linkPurpose: 'EngagementFolder' },
            relations: ['link'],
        });
        if (!el?.link)
            return { linkUrl: null, linkName: null, linkPath: null, marketFolderPath: null };
        const resolved = await this.resolveEngagementFolderPaths(engagementId);
        const storedPath = el.link.linkPath || null;
        const linkPath = resolved.linkPath ?? storedPath;
        const marketFolderPath = resolved.marketFolderPath ??
            (storedPath ? storedPath.split('/').slice(0, -1).join('/') || null : null);
        return { linkUrl: el.link.linkUrl, linkName: el.link.linkName, linkPath, marketFolderPath };
    }
    async resolveEngagementFolderPaths(engagementId) {
        try {
            const ctx = await this.resolveEngagementFolderContext(engagementId);
            if (!ctx)
                return { linkPath: null, marketFolderPath: null };
            const hierarchies = (0, engagement_folder_structure_1.buildEngagementFolderHierarchies)(ctx.year, ctx.marketName, ctx.attractionName);
            const engSegments = hierarchies[0]?.slice(0, -1) ?? [];
            if (engSegments.length === 0)
                return { linkPath: null, marketFolderPath: null };
            return {
                linkPath: engSegments.join('/'),
                marketFolderPath: engSegments.slice(0, -1).join('/'),
            };
        }
        catch {
            return { linkPath: null, marketFolderPath: null };
        }
    }
    async resolveEngagementFolderContext(engagementId) {
        const engagement = await this.assertEngagementExists(engagementId);
        const tour = await this.tourRepo.findOne({
            where: { tourId: engagement.tourId },
            relations: ['attraction'],
        });
        if (!tour)
            return null;
        const primaryVenue = await this.engagementVenueRepo.findOne({
            where: { engagementId, isPrimary: true },
        });
        let marketName = null;
        if (primaryVenue) {
            const company = await this.companyRepo.findOne({
                where: { companyId: primaryVenue.venueCompanyId },
                relations: ['dma'],
            });
            marketName = company?.dma?.marketName ?? null;
        }
        const openingPerf = await this.performanceRepo.findOne({
            where: { engagementId },
            order: { performanceDate: 'ASC' },
        });
        const year = openingPerf?.performanceDate
            ? String(openingPerf.performanceDate).slice(0, 4)
            : new Date().getFullYear().toString();
        return { year, marketName, attractionName: tour.attraction?.attractionName ?? null };
    }
    async ensureSharePointFolders(engagementId) {
        const ctx = await this.resolveEngagementFolderContext(engagementId);
        if (!ctx) {
            throw new common_1.BadRequestException({
                message: `Engagement ${engagementId} is missing the tour data needed to create SharePoint folders.`,
            });
        }
        const hierarchies = (0, engagement_folder_structure_1.buildEngagementFolderHierarchies)(ctx.year, ctx.marketName, ctx.attractionName);
        const rootSegments = hierarchies[0]?.slice(0, -1) ?? [];
        const { rootWebUrl } = await this.documentLibrary.createFolderTree(rootSegments, engagement_folder_structure_1.ENGAGEMENT_FOLDER_STRUCTURE, this.documentLibrary.getEngagementSource());
        if (rootWebUrl) {
            await this.upsertEngagementLink(engagementId, {
                linkUrl: rootWebUrl,
                linkName: `Engagement #${engagementId} Files`,
                linkPurpose: 'EngagementFolder',
                linkPath: rootSegments.join('/'),
            });
        }
        this.logger.log(`[SharePoint] Folder structure for engagement ${engagementId}: ${rootWebUrl}`);
        return { rootWebUrl };
    }
    startFolderProvisioning(engagementId) {
        const existing = this.folderJobs.get(engagementId);
        if (existing?.status === 'pending')
            return { status: 'pending' };
        this.folderJobs.set(engagementId, { status: 'pending', updatedAt: Date.now() });
        void this.runFolderProvisioning(engagementId);
        return { status: 'pending' };
    }
    async runFolderProvisioning(engagementId) {
        try {
            await this.ensureSharePointFolders(engagementId);
            this.folderJobs.delete(engagementId);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.folderJobs.set(engagementId, { status: 'failed', error: message, updatedAt: Date.now() });
            this.logger.error(`[SharePoint] Background folder provisioning failed for engagement ${engagementId}: ${message}`);
        }
    }
    async getSharePointFolderStatus(engagementId) {
        const source = this.documentLibrary.getEngagementSource();
        const link = await this.getSharePointFolderLink(engagementId);
        if (link.linkUrl) {
            return { status: 'ready', ...link, source, error: null };
        }
        const job = this.folderJobs.get(engagementId);
        if (job?.status === 'pending') {
            return { status: 'pending', ...link, source, error: null };
        }
        if (job?.status === 'failed') {
            return { status: 'failed', ...link, source, error: job.error ?? 'Folder creation failed.' };
        }
        return { status: 'none', ...link, source, error: null };
    }
    async update(id, dto) {
        const existing = await this.assertEngagementExists(id);
        if (dto.tourId !== undefined) {
            const tour = await this.tourRepo.findOne({
                where: { tourId: dto.tourId },
            });
            if (!tour) {
                throw new common_1.BadRequestException({
                    message: `Tour #${dto.tourId} does not exist.`,
                });
            }
            existing.tourId = dto.tourId;
        }
        if (dto.engagementStatus !== undefined) {
            existing.engagementStatus = dto.engagementStatus.trim();
        }
        if (dto.engagementScaling !== undefined) {
            const t = dto.engagementScaling;
            existing.engagementScaling =
                t == null || String(t).trim() === ''
                    ? null
                    : String(t).trim().slice(0, 50);
        }
        if (dto.sellableCapacity !== undefined) {
            existing.sellableCapacity =
                dto.sellableCapacity == null ? null : dto.sellableCapacity;
        }
        if (dto.grossPotential !== undefined) {
            existing.grossPotential =
                dto.grossPotential == null ? null : dto.grossPotential;
        }
        if (dto.tourManagerContactId !== undefined) {
            existing.tourManagerContactId =
                dto.tourManagerContactId == null ? null : dto.tourManagerContactId;
        }
        await this.engagementRepo.save(existing);
        if (dto.primaryVenueCompanyId != null) {
            await this.assertVenueCompany(dto.primaryVenueCompanyId);
            await this.dataSource.transaction(async (manager) => {
                const current = await manager.findOne(engagement_venue_entity_1.EngagementVenue, {
                    where: { engagementId: id, isPrimary: true },
                });
                if (current && current.venueCompanyId !== dto.primaryVenueCompanyId) {
                    current.isPrimary = false;
                    await manager.save(engagement_venue_entity_1.EngagementVenue, current);
                }
                const targetRow = await manager.findOne(engagement_venue_entity_1.EngagementVenue, {
                    where: {
                        engagementId: id,
                        venueCompanyId: dto.primaryVenueCompanyId,
                    },
                });
                if (targetRow) {
                    targetRow.isPrimary = true;
                    await manager.save(engagement_venue_entity_1.EngagementVenue, targetRow);
                }
                else {
                    await manager.save(engagement_venue_entity_1.EngagementVenue, manager.create(engagement_venue_entity_1.EngagementVenue, {
                        engagementId: id,
                        venueCompanyId: dto.primaryVenueCompanyId,
                        isPrimary: true,
                    }));
                }
            });
        }
        try {
            const primaryVenueId = dto.primaryVenueCompanyId
                ?? (await this.dataSource.getRepository(engagement_venue_entity_1.EngagementVenue).findOne({
                    where: { engagementId: id, isPrimary: true },
                }))?.venueCompanyId
                ?? null;
            if (primaryVenueId != null) {
                const venueCompany = await this.dataSource.getRepository(company_entity_1.Company).findOne({
                    where: { companyId: primaryVenueId },
                    relations: ['physicalAddress'],
                });
                const country = venueCompany?.physicalAddress?.country?.trim().toLowerCase() ?? '';
                const isCanada = country === 'canada' || country === 'ca' || country === 'can' || country === 'cdn';
                const existingFinance = await this.engagementFinancesRepo.findOne({ where: { engagementId: id } });
                if (existingFinance) {
                    existingFinance.isCanadaEngagement = isCanada;
                    await this.engagementFinancesRepo.save(existingFinance);
                }
                else {
                    await this.engagementFinancesRepo.save(this.engagementFinancesRepo.create({ engagementId: id, isCanadaEngagement: isCanada }));
                }
            }
        }
        catch { }
        if (dto.rehearsalDate !== undefined ||
            dto.loadInDate !== undefined ||
            dto.rehearsalTime !== undefined ||
            dto.loadInTime !== undefined) {
            const rows = await this.engagementProductionRepo.find({
                where: { engagementId: id },
                order: { productionId: 'DESC' },
                take: 1,
            });
            let prod = rows[0] ?? null;
            if (!prod) {
                prod = this.engagementProductionRepo.create({
                    engagementId: id,
                    rehearsalDate: null,
                    loadInDate: null,
                });
            }
            if (dto.rehearsalDate !== undefined) {
                prod.rehearsalDate =
                    dto.rehearsalDate == null || dto.rehearsalDate === ''
                        ? null
                        : this.assertYmdOrNull(dto.rehearsalDate);
            }
            if (dto.loadInDate !== undefined) {
                prod.loadInDate =
                    dto.loadInDate == null || dto.loadInDate === ''
                        ? null
                        : this.assertYmdOrNull(dto.loadInDate);
            }
            const savedProd = await this.engagementProductionRepo.save(prod);
            await this.tryPersistEngagementProductionTimes(savedProd.productionId, dto);
        }
        if (dto.engagementStatus === 'Confirmed' &&
            existing.engagementStatus !== 'Confirmed') {
            this.startFolderProvisioning(id);
        }
    }
    async assertEngagementDeletableForDelete(engagementId) {
        const impact = await this.getEngagementDeleteImpact(engagementId);
        if (!impact.canDelete) {
            throw new common_1.BadRequestException({ message: impact.blockers[0] });
        }
    }
    async getEngagementDeleteImpact(engagementId) {
        await this.assertEngagementExists(engagementId);
        const blockers = [];
        const sourceLinks = await this.dataSource.manager.find(engagement_xref_entity_1.EngagementXref, {
            where: { engagementId },
        });
        const performanceCount = await this.performanceRepo.count({
            where: { engagementId },
        });
        const eid = Math.trunc(engagementId);
        const [linkCount, partnerCount, travelCount, contractCount, retailPartnerRows] = await Promise.all([
            this.engagementLinkRepo.count({ where: { engagementId } }),
            this.dataSource.manager.count(engagement_partner_entity_1.EngagementPartner, { where: { engagementId } }),
            this.engagementTravelRepo.count({ where: { engagementId } }),
            this.dataSource.manager.count(performance_contract_entity_1.PerformanceContract, { where: { engagementId } }),
            this.dataSource.query(`SELECT COUNT(*) AS cnt FROM dbo.EngagementRetailPartner WHERE [EngagementID] = ${eid}`),
        ]);
        const retailPartnerCount = Number(retailPartnerRows?.[0]?.cnt ?? 0);
        const dependents = [
            {
                label: 'source project link(s) — the originating project will become editable again',
                count: sourceLinks.length,
            },
            { label: 'show date(s) / performance(s)', count: performanceCount },
            { label: 'document link(s)', count: linkCount },
            { label: 'event business partner link(s)', count: partnerCount },
            { label: 'travel booking(s)', count: travelCount },
            { label: 'contract(s)', count: contractCount },
            { label: 'retail partner link(s)', count: retailPartnerCount },
        ].filter((d) => d.count > 0);
        return { canDelete: blockers.length === 0, blockers, dependents };
    }
    async remove(id) {
        await this.assertEngagementDeletableForDelete(id);
        await this.dataSource.transaction(async (manager) => {
            const pids = (await manager.find(performance_entity_1.Performance, {
                where: { engagementId: id },
                select: { performanceId: true },
            })).map((p) => p.performanceId);
            if (pids.length > 0) {
                await manager
                    .createQueryBuilder()
                    .delete()
                    .from(ticketing_sales_entity_1.TicketingSales)
                    .where('performanceId IN (:...pids)', { pids })
                    .execute();
                await manager
                    .createQueryBuilder()
                    .delete()
                    .from(performance_ticketing_entity_1.PerformanceTicketing)
                    .where('performanceId IN (:...pids)', { pids })
                    .execute();
                const pidList = pids.map((p) => Math.trunc(p)).join(',');
                await manager.query(`DELETE FROM dbo.VIPPackageBenefit WHERE [VIPPackageID] IN (SELECT [VIPPackageID] FROM dbo.VIPPackage WHERE [PerformanceID] IN (${pidList}))`);
                await manager.query(`DELETE FROM dbo.VIPPackage WHERE [PerformanceID] IN (${pidList})`);
                await manager.query(`DELETE FROM dbo.PerformancePromoPassword WHERE [PerformanceID] IN (${pidList})`);
            }
            const travelIds = (await manager.find(engagement_travel_entity_1.EngagementTravel, {
                where: { engagementId: id },
                select: { engagementTravelId: true },
            })).map((t) => t.engagementTravelId);
            if (travelIds.length > 0) {
                await manager
                    .createQueryBuilder()
                    .delete()
                    .from(engagement_travel_hotel_entity_1.EngagementTravelHotel)
                    .where('engagementTravelId IN (:...travelIds)', { travelIds })
                    .execute();
                await manager
                    .createQueryBuilder()
                    .delete()
                    .from(engagement_travel_car_service_entity_1.EngagementTravelCarService)
                    .where('engagementTravelId IN (:...travelIds)', { travelIds })
                    .execute();
                await manager.delete(engagement_travel_entity_1.EngagementTravel, { engagementId: id });
            }
            const eid = Math.trunc(id);
            await manager.query(`DELETE FROM dbo.PerformanceContracts WHERE [EngagementID] = ${eid}`);
            await manager.query(`DELETE FROM dbo.EngagementRetailPartner WHERE [EngagementID] = ${eid}`);
            await manager.delete(engagement_partner_entity_1.EngagementPartner, { engagementId: id });
            await manager.delete(engagement_link_entity_1.EngagementLink, { engagementId: id });
            await manager.delete(engagement_xref_entity_1.EngagementXref, { engagementId: id });
            await manager.delete(performance_entity_1.Performance, { engagementId: id });
            await manager.delete(engagement_finance_entity_1.EngagementFinances, { engagementId: id });
            await manager.delete(engagement_production_entity_1.EngagementProduction, { engagementId: id });
            await manager.delete(engagement_venue_entity_1.EngagementVenue, { engagementId: id });
            await manager.delete(engagement_iae_contact_entity_1.EngagementIAEContact, { engagementId: id });
            await manager.delete(engagement_entity_1.Engagement, { engagementId: id });
        });
        this.emsCreated.removeEngagement(id);
    }
    async engagementVenueHasOptionalCols() {
        if (this.engagementVenueOptionalColsPresent !== null)
            return this.engagementVenueOptionalColsPresent;
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'EngagementVenue' AND c.name=N'AttractionTechDirectorContactID')
        THEN 1 ELSE 0 END AS ok`);
            const raw = pickRaw(r?.[0] ?? {}, 'ok');
            this.engagementVenueOptionalColsPresent =
                raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
            return this.engagementVenueOptionalColsPresent;
        }
        catch {
            this.engagementVenueOptionalColsPresent = false;
            return false;
        }
    }
    async engagementVenueHasMarketingCols() {
        if (this.engagementVenueMarketingColsPresent !== null)
            return this.engagementVenueMarketingColsPresent;
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'EngagementVenue' AND c.name=N'VenueMarketingDirectorContactID')
        THEN 1 ELSE 0 END AS ok`);
            const raw = pickRaw(r?.[0] ?? {}, 'ok');
            this.engagementVenueMarketingColsPresent =
                raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
            return this.engagementVenueMarketingColsPresent;
        }
        catch {
            this.engagementVenueMarketingColsPresent = false;
            return false;
        }
    }
    async engagementHasIaeMarketingCols() {
        if (this.engagementIaeMarketingColsPresent !== null)
            return this.engagementIaeMarketingColsPresent;
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'Engagement' AND c.name=N'IAEMarketingDirectorContactID')
        THEN 1 ELSE 0 END AS ok`);
            const raw = pickRaw(r?.[0] ?? {}, 'ok');
            this.engagementIaeMarketingColsPresent =
                raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
            return this.engagementIaeMarketingColsPresent;
        }
        catch {
            this.engagementIaeMarketingColsPresent = false;
            return false;
        }
    }
    async tourHasMarketingCols() {
        if (this.tourMarketingColsPresent !== null)
            return this.tourMarketingColsPresent;
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'Tour' AND c.name=N'TourMarketingDirectorContactID')
        THEN 1 ELSE 0 END AS ok`);
            const raw = pickRaw(r?.[0] ?? {}, 'ok');
            this.tourMarketingColsPresent =
                raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
            return this.tourMarketingColsPresent;
        }
        catch {
            this.tourMarketingColsPresent = false;
            return false;
        }
    }
    async engagementVenueHasProductionManagerCol() {
        if (this.engagementVenueProductionManagerColPresent !== null)
            return this.engagementVenueProductionManagerColPresent;
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'EngagementVenue' AND c.name=N'IaeProductionManagerContactID')
        THEN 1 ELSE 0 END AS ok`);
            const raw = pickRaw(r?.[0] ?? {}, 'ok');
            this.engagementVenueProductionManagerColPresent =
                raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
            return this.engagementVenueProductionManagerColPresent;
        }
        catch {
            this.engagementVenueProductionManagerColPresent = false;
            return false;
        }
    }
    async engagementVenueHasVenueProductionManagerCol() {
        if (this.engagementVenueVenueProductionManagerColPresent !== null)
            return this.engagementVenueVenueProductionManagerColPresent;
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'EngagementVenue' AND c.name=N'VenueProductionManagerContactID')
        THEN 1 ELSE 0 END AS ok`);
            const raw = pickRaw(r?.[0] ?? {}, 'ok');
            this.engagementVenueVenueProductionManagerColPresent =
                raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
            return this.engagementVenueVenueProductionManagerColPresent;
        }
        catch {
            this.engagementVenueVenueProductionManagerColPresent = false;
            return false;
        }
    }
    async readEngagementVenueVenueProductionManagerCol(engagementId, venueCompanyId) {
        if (!(await this.engagementVenueHasVenueProductionManagerCol()))
            return null;
        try {
            const r = await this.dataSource.query(`SELECT [VenueProductionManagerContactID] AS vpm
         FROM dbo.EngagementVenue
         WHERE [EngagementID]=@0 AND [VenueCompanyID]=@1`, [engagementId, venueCompanyId]);
            const row = r?.[0];
            if (!row)
                return null;
            const v = pickRaw(row, 'vpm');
            const n = Number(v);
            return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null;
        }
        catch {
            return null;
        }
    }
    async engagementVenueHasStagehandContactCol() {
        if (this.engagementVenueStagehandContactColPresent !== null)
            return this.engagementVenueStagehandContactColPresent;
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'EngagementVenue' AND c.name=N'StagehandContactID')
        THEN 1 ELSE 0 END AS ok`);
            const raw = pickRaw(r?.[0] ?? {}, 'ok');
            this.engagementVenueStagehandContactColPresent =
                raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
            return this.engagementVenueStagehandContactColPresent;
        }
        catch {
            this.engagementVenueStagehandContactColPresent = false;
            return false;
        }
    }
    async readEngagementVenueStagehandContactCol(engagementId, venueCompanyId) {
        if (!(await this.engagementVenueHasStagehandContactCol()))
            return null;
        try {
            const r = await this.dataSource.query(`SELECT [StagehandContactID] AS shc
         FROM dbo.EngagementVenue
         WHERE [EngagementID]=@0 AND [VenueCompanyID]=@1`, [engagementId, venueCompanyId]);
            const row = r?.[0];
            if (!row)
                return null;
            const v = pickRaw(row, 'shc');
            const n = Number(v);
            return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null;
        }
        catch {
            return null;
        }
    }
    async engagementVenueHasTicketingAdminCol() {
        if (this.engagementVenueTicketingAdminColPresent !== null)
            return this.engagementVenueTicketingAdminColPresent;
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'EngagementVenue' AND c.name=N'TicketingAdminContactID')
        THEN 1 ELSE 0 END AS ok`);
            const raw = pickRaw(r?.[0] ?? {}, 'ok');
            this.engagementVenueTicketingAdminColPresent =
                raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
            return this.engagementVenueTicketingAdminColPresent;
        }
        catch {
            this.engagementVenueTicketingAdminColPresent = false;
            return false;
        }
    }
    async readEngagementVenueTicketingAdminCol(engagementId, venueCompanyId) {
        if (!(await this.engagementVenueHasTicketingAdminCol()))
            return null;
        try {
            const r = await this.dataSource.query(`SELECT [TicketingAdminContactID] AS tac
         FROM dbo.EngagementVenue
         WHERE [EngagementID]=@0 AND [VenueCompanyID]=@1`, [engagementId, venueCompanyId]);
            const row = r?.[0];
            if (!row)
                return null;
            const v = pickRaw(row, 'tac');
            const n = Number(v);
            return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null;
        }
        catch {
            return null;
        }
    }
    async venueHasSeatingChartUrlCol() {
        if (this.venueSeatingChartUrlColPresent !== null)
            return this.venueSeatingChartUrlColPresent;
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'Venue' AND c.name=N'SeatingChartUrl')
        THEN 1 ELSE 0 END AS ok`);
            const raw = pickRaw(r?.[0] ?? {}, 'ok');
            this.venueSeatingChartUrlColPresent =
                raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
            return this.venueSeatingChartUrlColPresent;
        }
        catch {
            this.venueSeatingChartUrlColPresent = false;
            return false;
        }
    }
    async readVenueSeatingChartUrl(venueCompanyId) {
        if (!(await this.venueHasSeatingChartUrlCol()))
            return null;
        try {
            const r = await this.dataSource.query(`SELECT [SeatingChartUrl] AS url FROM dbo.Venue WHERE [CompanyID]=@0`, [venueCompanyId]);
            const v = pickRaw(r?.[0] ?? {}, 'url');
            return v == null || v === '' ? null : String(v);
        }
        catch {
            return null;
        }
    }
    async venueHasTechPackCol() {
        if (this.venueOptionalTechPackColPresent !== null)
            return this.venueOptionalTechPackColPresent;
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'Venue' AND c.name=N'TechPackPdfUrl')
        THEN 1 ELSE 0 END AS ok`);
            const raw = pickRaw(r?.[0] ?? {}, 'ok');
            this.venueOptionalTechPackColPresent =
                raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
            return this.venueOptionalTechPackColPresent;
        }
        catch {
            this.venueOptionalTechPackColPresent = false;
            return false;
        }
    }
    async readEngagementVenueOptionalCols(engagementId, venueCompanyId) {
        const empty = {
            attractionTechDirectorContactId: null,
            venueContractSharePointLink: null,
            partiallyExecutedContractSharePointLink: null,
            fullyExecutedContractSharePointLink: null,
            venueForecastSharePointLink: null,
        };
        if (!(await this.engagementVenueHasOptionalCols()))
            return empty;
        try {
            const r = await this.dataSource.query(`SELECT [AttractionTechDirectorContactID] AS atd,
                [VenueContractSharePointLink] AS vc,
                [PartiallyExecutedContractSharePointLink] AS pec,
                [FullyExecutedContractSharePointLink] AS fec,
                [VenueForecastSharePointLink] AS vf
         FROM dbo.EngagementVenue
         WHERE [EngagementID]=@0 AND [VenueCompanyID]=@1`, [engagementId, venueCompanyId]);
            const row = r?.[0];
            if (!row)
                return empty;
            const toInt = (v) => {
                const n = Number(v);
                return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null;
            };
            const toStr = (v) => v == null || v === '' ? null : String(v).slice(0, 2048);
            return {
                attractionTechDirectorContactId: toInt(pickRaw(row, 'atd')),
                venueContractSharePointLink: toStr(pickRaw(row, 'vc')),
                partiallyExecutedContractSharePointLink: toStr(pickRaw(row, 'pec')),
                fullyExecutedContractSharePointLink: toStr(pickRaw(row, 'fec')),
                venueForecastSharePointLink: toStr(pickRaw(row, 'vf')),
            };
        }
        catch {
            return empty;
        }
    }
    async readEngagementVenueMarketingCols(engagementId, venueCompanyId) {
        const empty = {
            venueMarketingDirectorContactId: null,
            venueMarketingManagerContactId: null,
            venueDigitalMarketingManagerContactId: null,
        };
        if (!(await this.engagementVenueHasMarketingCols()))
            return empty;
        try {
            const r = await this.dataSource.query(`SELECT [VenueMarketingDirectorContactID] AS vmd,
                [VenueMarketingManagerContactID] AS vmm,
                [VenueDigitalMarketingManagerContactID] AS vdmm
         FROM dbo.EngagementVenue
         WHERE [EngagementID]=@0 AND [VenueCompanyID]=@1`, [engagementId, venueCompanyId]);
            const row = r?.[0];
            if (!row)
                return empty;
            const toInt = (v) => {
                const n = Number(v);
                return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null;
            };
            return {
                venueMarketingDirectorContactId: toInt(pickRaw(row, 'vmd')),
                venueMarketingManagerContactId: toInt(pickRaw(row, 'vmm')),
                venueDigitalMarketingManagerContactId: toInt(pickRaw(row, 'vdmm')),
            };
        }
        catch {
            return empty;
        }
    }
    async readEngagementVenueProductionManagerCol(engagementId, venueCompanyId) {
        if (!(await this.engagementVenueHasProductionManagerCol()))
            return null;
        try {
            const r = await this.dataSource.query(`SELECT [IaeProductionManagerContactID] AS ipm
         FROM dbo.EngagementVenue
         WHERE [EngagementID]=@0 AND [VenueCompanyID]=@1`, [engagementId, venueCompanyId]);
            const row = r?.[0];
            if (!row)
                return null;
            const v = pickRaw(row, 'ipm');
            const n = Number(v);
            return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null;
        }
        catch {
            return null;
        }
    }
    async readVenueTechPackUrl(venueCompanyId) {
        if (!(await this.venueHasTechPackCol()))
            return null;
        try {
            const r = await this.dataSource.query(`SELECT [TechPackPdfUrl] AS url FROM dbo.Venue WHERE [CompanyID]=@0`, [venueCompanyId]);
            const v = pickRaw(r?.[0] ?? {}, 'url');
            return v == null || v === '' ? null : String(v).slice(0, 2048);
        }
        catch {
            return null;
        }
    }
    async lookupContactName(contactId) {
        if (contactId == null || contactId < 1)
            return null;
        try {
            const r = await this.dataSource.query(`SELECT ci.FirstName + ' ' + ci.LastName AS fullName
         FROM dbo.Contact c
         INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
         WHERE c.ContactID = @0`, [contactId]);
            const v = pickRaw(r?.[0] ?? {}, 'fullName');
            return v == null || v === '' ? null : String(v).trim();
        }
        catch {
            return null;
        }
    }
    async lookupCompanyName(companyId) {
        if (companyId == null || companyId < 1)
            return null;
        try {
            const company = await this.companyRepo.findOne({ where: { companyId } });
            return company?.companyName?.trim() || null;
        }
        catch {
            return null;
        }
    }
    async getPerformancesWithTicketingSummary(engagementId) {
        await this.assertEngagementExists(engagementId);
        const hasAdv = await this.performanceTicketingHasAdvancedColumns();
        const selectAdv = hasAdv
            ? ', pt.[SellableCapacity] AS sc, pt.[GrossPotentialRevenue] AS gpr'
            : '';
        const joinAdv = hasAdv
            ? 'LEFT JOIN dbo.PerformanceTicketing pt ON pt.[PerformanceID] = p.[PerformanceID]'
            : '';
        const rows = await this.dataSource.query(`SELECT
        p.[PerformanceID] AS pid,
        CONVERT(varchar(10), p.[PerformanceDate], 120) AS pdate,
        p.[PerformanceTime] AS ptime,
        p.[TicketingStatus] AS pstatus
        ${selectAdv}
       FROM dbo.Performance p
       ${joinAdv}
       WHERE p.[EngagementID] = ${engagementId}
       ORDER BY p.[PerformanceDate], p.[PerformanceTime]`);
        return rows.map((r) => {
            const sc = pickRaw(r, 'sc');
            const gpr = pickRaw(r, 'gpr');
            return {
                performanceId: Number(pickRaw(r, 'pid')),
                performanceDate: String(pickRaw(r, 'pdate') ?? '').slice(0, 10),
                performanceTime: String(pickRaw(r, 'ptime') ?? ''),
                performanceStatus: String(pickRaw(r, 'pstatus') ?? ''),
                sellableCapacity: sc != null && sc !== '' ? Math.trunc(Number(sc)) : null,
                grossPotentialRevenue: gpr != null && gpr !== '' ? Number(gpr) : null,
            };
        });
    }
    async getIaeTicketingManager(engagementId) {
        await this.assertEngagementExists(engagementId);
        const blank = {
            iaeTicketingManagerContactId: null,
            iaeTicketingManagerContactName: null,
        };
        if (!(await this.engagementFinancesHasIaeTicketingManagerCol()))
            return blank;
        try {
            const r = await this.dataSource.query(`SELECT [IAETicketingManagerContactID] AS cid FROM dbo.EngagementFinances WHERE [EngagementID] = ${engagementId}`);
            const row0 = r?.[0];
            if (!row0)
                return blank;
            const cidRaw = pickRaw(row0, 'cid');
            const cid = cidRaw != null && cidRaw !== '' && Number.isFinite(Number(cidRaw)) ? Math.trunc(Number(cidRaw)) : null;
            const name = await this.lookupContactName(cid);
            return { iaeTicketingManagerContactId: cid, iaeTicketingManagerContactName: name };
        }
        catch {
            return blank;
        }
    }
    async updateIaeTicketingManager(engagementId, iaeTicketingManagerContactId) {
        await this.assertEngagementExists(engagementId);
        if (!(await this.engagementFinancesHasIaeTicketingManagerCol()))
            return;
        const cidSql = iaeTicketingManagerContactId == null ? 'NULL' : Math.trunc(Number(iaeTicketingManagerContactId));
        await this.dataSource.query(`IF EXISTS (SELECT 1 FROM dbo.EngagementFinances WHERE [EngagementID] = ${engagementId})
         UPDATE dbo.EngagementFinances SET [IAETicketingManagerContactID] = ${cidSql} WHERE [EngagementID] = ${engagementId}
       ELSE
         INSERT INTO dbo.EngagementFinances ([EngagementID],[IAETicketingManagerContactID]) VALUES (${engagementId}, ${cidSql})`);
    }
    async listVenues(engagementId) {
        await this.assertEngagementExists(engagementId);
        const evRows = await this.engagementVenueRepo.find({
            where: { engagementId },
            order: { isPrimary: 'DESC' },
        });
        if (evRows.length === 0)
            return [];
        const venueCompanyIds = evRows.map((ev) => ev.venueCompanyId);
        const [companies, venues] = await Promise.all([
            this.companyRepo.find({
                where: { companyId: (0, typeorm_2.In)(venueCompanyIds) },
                relations: ['physicalAddress', 'dma'],
            }),
            this.venueRepo.find({
                where: { companyId: (0, typeorm_2.In)(venueCompanyIds) },
                relations: ['venueType'],
            }),
        ]);
        const companyMap = new Map(companies.map((c) => [c.companyId, c]));
        const venueMap = new Map(venues.map((v) => [v.companyId, v]));
        const [hasOptional, hasTechPack, hasMarketing, hasProdMgr, hasVenueProdMgr, hasStagehand, hasTicketingAdmin, hasSeatingChartUrl] = await Promise.all([
            this.engagementVenueHasOptionalCols(),
            this.venueHasTechPackCol(),
            this.engagementVenueHasMarketingCols(),
            this.engagementVenueHasProductionManagerCol(),
            this.engagementVenueHasVenueProductionManagerCol(),
            this.engagementVenueHasStagehandContactCol(),
            this.engagementVenueHasTicketingAdminCol(),
            this.venueHasSeatingChartUrlCol(),
        ]);
        const seatingChartIds = venues
            .map((v) => v.seatingChartLinkId)
            .filter((id) => id != null && id > 0);
        const seatingChartLinks = seatingChartIds.length > 0
            ? await this.linkRepo.find({ where: { linkId: (0, typeorm_2.In)(seatingChartIds) } })
            : [];
        const seatingChartLinkMap = new Map(seatingChartLinks.map((l) => [l.linkId, l.linkUrl]));
        const firstPerf = await this.performanceRepo.findOne({
            where: { engagementId },
            order: { performanceDate: 'ASC', performanceTime: 'ASC' },
        });
        let ticketingAdminContactId = null;
        let ticketingAdminContactName = null;
        if (firstPerf) {
            const pt = await this.performanceTicketingRepo.findOne({
                where: { performanceId: firstPerf.performanceId },
            });
            if (pt) {
                const raw = pt['TicketingAdminContactID'] ??
                    pt['ticketingAdminContactId'];
                const id = raw != null && raw !== '' ? Number(raw) : NaN;
                if (Number.isFinite(id) && id > 0) {
                    ticketingAdminContactId = id;
                    ticketingAdminContactName = await this.lookupContactName(id);
                }
            }
        }
        const ticketingSystemMap = new Map();
        for (const vid of venueCompanyIds) {
            try {
                const r = await this.dataSource.query(`SELECT [TicketingSystem] AS ts FROM dbo.Venue WHERE [CompanyID]=@0`, [vid]);
                const v = pickRaw(r?.[0] ?? {}, 'ts');
                ticketingSystemMap.set(vid, v == null || v === '' ? null : String(v));
            }
            catch {
                ticketingSystemMap.set(vid, null);
            }
        }
        const results = [];
        for (const ev of evRows) {
            const company = companyMap.get(ev.venueCompanyId);
            const venue = venueMap.get(ev.venueCompanyId);
            const bmName = await this.lookupContactName(ev.venueBookingManagerContactId ?? null);
            const optCols = hasOptional
                ? await this.readEngagementVenueOptionalCols(engagementId, ev.venueCompanyId)
                : {
                    attractionTechDirectorContactId: null,
                    venueContractSharePointLink: null,
                    partiallyExecutedContractSharePointLink: null,
                    fullyExecutedContractSharePointLink: null,
                    venueForecastSharePointLink: null,
                };
            const attractionTechName = await this.lookupContactName(optCols.attractionTechDirectorContactId);
            const techPackUrl = hasTechPack ? await this.readVenueTechPackUrl(ev.venueCompanyId) : null;
            const mktCols = hasMarketing
                ? await this.readEngagementVenueMarketingCols(engagementId, ev.venueCompanyId)
                : {
                    venueMarketingDirectorContactId: null,
                    venueMarketingManagerContactId: null,
                    venueDigitalMarketingManagerContactId: null,
                };
            const [mktDirName, mktMgrName, digitalMktMgrName] = await Promise.all([
                this.lookupContactName(mktCols.venueMarketingDirectorContactId),
                this.lookupContactName(mktCols.venueMarketingManagerContactId),
                this.lookupContactName(mktCols.venueDigitalMarketingManagerContactId),
            ]);
            const iaeProdMgrId = hasProdMgr
                ? await this.readEngagementVenueProductionManagerCol(engagementId, ev.venueCompanyId)
                : null;
            const iaeProdMgrName = await this.lookupContactName(iaeProdMgrId);
            const venueProdMgrId = hasVenueProdMgr
                ? await this.readEngagementVenueVenueProductionManagerCol(engagementId, ev.venueCompanyId)
                : null;
            const venueProdMgrName = await this.lookupContactName(venueProdMgrId);
            const stagehandId = hasStagehand
                ? await this.readEngagementVenueStagehandContactCol(engagementId, ev.venueCompanyId)
                : null;
            const stagehandName = await this.lookupContactName(stagehandId);
            const seatingChartUrl = hasSeatingChartUrl
                ? await this.readVenueSeatingChartUrl(ev.venueCompanyId)
                : null;
            const venueTicketingAdminId = hasTicketingAdmin
                ? await this.readEngagementVenueTicketingAdminCol(engagementId, ev.venueCompanyId)
                : null;
            const rowTicketingAdminId = venueTicketingAdminId ?? ticketingAdminContactId;
            const rowTicketingAdminName = venueTicketingAdminId != null
                ? await this.lookupContactName(venueTicketingAdminId)
                : ticketingAdminContactName;
            results.push({
                engagementId: ev.engagementId,
                venueCompanyId: ev.venueCompanyId,
                venueCompanyName: company?.companyName ?? null,
                venueName: venue?.venueName ?? null,
                city: company?.physicalAddress?.city ?? null,
                stateProvince: company?.physicalAddress?.stateProvince ?? null,
                dmaMarketName: company?.dma?.marketName ?? null,
                isPrimary: Boolean(ev.isPrimary),
                venueBookingManagerContactId: ev.venueBookingManagerContactId ?? null,
                venueBookingManagerName: bmName,
                venueTypeId: venue?.venueTypeId ?? null,
                venueTypeName: venue?.venueType?.venueTypeName ?? null,
                stageDimensions: venue?.stageDimensions ?? null,
                flySystemSpecs: venue?.flySystemSpecs ?? null,
                stageType: venue?.stageType ?? null,
                seatingChartLinkId: venue?.seatingChartLinkId ?? null,
                seatingChartLinkUrl: venue?.seatingChartLinkId
                    ? (seatingChartLinkMap.get(venue.seatingChartLinkId) ?? null)
                    : null,
                seatingChartUrl,
                ticketingSystem: ticketingSystemMap.get(ev.venueCompanyId) ?? null,
                ticketingAdminContactId: rowTicketingAdminId,
                ticketingAdminContactName: rowTicketingAdminName,
                techPackPdfUrl: techPackUrl,
                attractionTechDirectorContactId: optCols.attractionTechDirectorContactId,
                attractionTechDirectorName: attractionTechName,
                venueContractSharePointLink: optCols.venueContractSharePointLink,
                partiallyExecutedContractSharePointLink: optCols.partiallyExecutedContractSharePointLink,
                fullyExecutedContractSharePointLink: optCols.fullyExecutedContractSharePointLink,
                venueForecastSharePointLink: optCols.venueForecastSharePointLink,
                venueMarketingDirectorContactId: mktCols.venueMarketingDirectorContactId,
                venueMarketingDirectorName: mktDirName,
                venueMarketingManagerContactId: mktCols.venueMarketingManagerContactId,
                venueMarketingManagerName: mktMgrName,
                venueDigitalMarketingManagerContactId: mktCols.venueDigitalMarketingManagerContactId,
                venueDigitalMarketingManagerName: digitalMktMgrName,
                iaeProductionManagerContactId: iaeProdMgrId,
                iaeProductionManagerContactName: iaeProdMgrName,
                venueProductionManagerContactId: venueProdMgrId,
                venueProductionManagerContactName: venueProdMgrName,
                stagehandContactId: stagehandId,
                stagehandContactName: stagehandName,
            });
        }
        return results;
    }
    async getVenueTabData(engagementId) {
        const [venues, finance, engagement] = await Promise.all([
            this.listVenues(engagementId),
            this.engagementFinancesRepo.findOne({ where: { engagementId } }),
            this.engagementRepo.findOne({ where: { engagementId } }),
        ]);
        let venueDealType = null;
        let venueDealTypeId = null;
        if (finance) {
            const cols = await this.engagementFinancesGetDealStructureColumns();
            if (cols.venueDealType) {
                try {
                    const r = await this.dataSource.query(`SELECT [VenueDealType] AS vdt FROM dbo.EngagementFinances WHERE [FinanceID] = ${finance.financeId}`);
                    venueDealType = this.normalizeVenueDealType(pickRaw(r?.[0] ?? {}, 'vdt'));
                }
                catch { }
            }
            if (cols.venueDealTypeId) {
                try {
                    const r = await this.dataSource.query(`SELECT [VenueDealTypeID] AS vdtid FROM dbo.EngagementFinances WHERE [FinanceID] = ${finance.financeId}`);
                    const raw = pickRaw(r?.[0] ?? {}, 'vdtid');
                    const parsed = raw != null ? Number(raw) : NaN;
                    venueDealTypeId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
                }
                catch { }
            }
        }
        let techRiderLinkUrl = null;
        if (engagement?.tourId) {
            const tour = await this.tourRepo.findOne({ where: { tourId: engagement.tourId } });
            if (tour?.techRiderLinkId) {
                const link = await this.linkRepo.findOne({ where: { linkId: tour.techRiderLinkId } });
                techRiderLinkUrl = link?.linkUrl ?? null;
            }
        }
        let engagementLinks = [];
        try {
            const elRows = await this.engagementLinkRepo.find({ where: { engagementId }, relations: ['link'] });
            engagementLinks = elRows.map((el) => ({
                engagementLinkId: el.engagementLinkId,
                linkId: el.linkId,
                linkPurpose: el.linkPurpose,
                linkUrl: el.link?.linkUrl ?? '',
                linkName: el.link?.linkName ?? '',
            }));
        }
        catch { }
        const venueCompanyIds = venues.map((v) => v.venueCompanyId);
        const venueRoleContacts = {};
        const roleNames = [
            'Venue Ticketing Software',
            'Venue Ticketing Administrator',
            'Venue Production Manager',
            'Venue Stage Labor',
            'Attraction Tech Director',
            'Marketing Director',
            'Marketing Manager',
            'Digital Marketing Manager',
        ];
        for (const vid of venueCompanyIds) {
            const contacts = {
                venueTicketingSoftware: [],
                venueTicketingAdministrator: [],
                venueProductionManager: [],
                venueStageLaborCompany: [],
                attractionTechDirector: [],
                marketingDirector: [],
                marketingManager: [],
                digitalMarketingManager: [],
            };
            try {
                const rows = await this.dataSource.query(`SELECT ca.ContactID AS contactId, ci.FirstName AS firstName, ci.LastName AS lastName, r.RoleName AS roleName
           FROM dbo.ContactAssignment ca
           INNER JOIN dbo.Contact ct ON ct.ContactID = ca.ContactID
           INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = ct.ContactInfoID
           INNER JOIN dbo.Role r ON r.RoleID = ca.RoleID
           WHERE ca.CompanyID IN (
             SELECT @0
             UNION
             SELECT vcm.ComplexCompanyID FROM dbo.VenueComplexMember vcm WHERE vcm.VenueCompanyID = @0
           )
             AND LOWER(LTRIM(RTRIM(r.RoleName))) IN (@1, @2, @3, @4, @5, @6, @7, @8)`, [vid, ...roleNames.map((n) => n.toLowerCase())]);
                for (const row of (rows ?? [])) {
                    const contact = {
                        contactId: Number(row['contactId'] ?? row['contactid'] ?? 0),
                        firstName: String(row['firstName'] ?? row['firstname'] ?? ''),
                        lastName: String(row['lastName'] ?? row['lastname'] ?? ''),
                        roleName: String(row['roleName'] ?? row['rolename'] ?? ''),
                    };
                    const rn = contact.roleName.toLowerCase().trim();
                    if (rn === 'venue ticketing software')
                        contacts.venueTicketingSoftware.push(contact);
                    else if (rn === 'venue ticketing administrator')
                        contacts.venueTicketingAdministrator.push(contact);
                    else if (rn === 'venue production manager')
                        contacts.venueProductionManager.push(contact);
                    else if (rn === 'venue stage labor')
                        contacts.venueStageLaborCompany.push(contact);
                    else if (rn === 'attraction tech director')
                        contacts.attractionTechDirector.push(contact);
                    else if (rn === 'marketing director')
                        contacts.marketingDirector.push(contact);
                    else if (rn === 'marketing manager')
                        contacts.marketingManager.push(contact);
                    else if (rn === 'digital marketing manager')
                        contacts.digitalMarketingManager.push(contact);
                }
            }
            catch { }
            venueRoleContacts[vid] = contacts;
        }
        let iaeProductionManagers = [];
        try {
            const pmRows = await this.dataSource.query(`SELECT eic.[ContactID] AS contactId, ci.[FirstName] AS firstName, ci.[LastName] AS lastName, r.[RoleName] AS roleName
         FROM dbo.EngagementIAEContact eic
         INNER JOIN dbo.Contact c ON c.[ContactID] = eic.[ContactID]
         INNER JOIN dbo.ContactInfo ci ON ci.[ContactInfoID] = c.[ContactInfoID]
         INNER JOIN dbo.Role r ON r.[RoleID] = eic.[RoleID]
         WHERE eic.[EngagementID] = @0
           AND LOWER(LTRIM(RTRIM(r.[RoleName]))) = @1`, [engagementId, 'production manager']);
            iaeProductionManagers = (pmRows ?? []).map((row) => ({
                contactId: Number(row['contactId'] ?? row['contactid'] ?? 0),
                firstName: String(row['firstName'] ?? row['firstname'] ?? ''),
                lastName: String(row['lastName'] ?? row['lastname'] ?? ''),
                roleName: String(row['roleName'] ?? row['rolename'] ?? ''),
            }));
        }
        catch { }
        return {
            venues,
            venueDealTypeId,
            venueDealType,
            venueTerms: finance?.venueTerms ?? null,
            techRiderLinkUrl,
            engagementLinks,
            venueRoleContacts,
            iaeProductionManagers,
        };
    }
    async updateVenueTabPerVenue(engagementId, venueCompanyId, dto) {
        await this.assertEngagementExists(engagementId);
        const ev = await this.engagementVenueRepo.findOne({
            where: { engagementId, venueCompanyId },
        });
        if (!ev)
            throw new common_1.NotFoundException({ message: 'Venue not linked to this engagement.' });
        if (dto.venueBookingManagerContactId !== undefined) {
            ev.venueBookingManagerContactId = dto.venueBookingManagerContactId ?? null;
            await this.engagementVenueRepo.save(ev);
        }
        const venuePatch = {};
        if (dto.venueTypeId !== undefined)
            venuePatch.venueTypeId = dto.venueTypeId ?? null;
        if (dto.stageDimensions !== undefined)
            venuePatch.stageDimensions = dto.stageDimensions ?? null;
        if (dto.flySystemSpecs !== undefined)
            venuePatch.flySystemSpecs = dto.flySystemSpecs ?? null;
        if (dto.stageType !== undefined)
            venuePatch.stageType = dto.stageType ?? null;
        if (Object.keys(venuePatch).length > 0) {
            await this.venueRepo.update({ companyId: venueCompanyId }, venuePatch);
        }
        if (dto.venueDealTypeId !== undefined) {
            const cols = await this.engagementFinancesGetDealStructureColumns();
            if (cols.venueDealTypeId) {
                const val = dto.venueDealTypeId == null ? 'NULL' : Math.trunc(Number(dto.venueDealTypeId));
                await this.dataSource.query(`IF EXISTS (SELECT 1 FROM dbo.EngagementFinances WHERE [EngagementID] = ${engagementId})
             UPDATE dbo.EngagementFinances SET [VenueDealTypeID] = ${val} WHERE [EngagementID] = ${engagementId}
           ELSE
             INSERT INTO dbo.EngagementFinances ([EngagementID],[VenueDealTypeID]) VALUES (${engagementId}, ${val})`);
            }
        }
        const toSqlStr = (v, max = 2048) => {
            if (v === undefined)
                return undefined;
            if (v == null || v.trim() === '')
                return 'NULL';
            return this.escapeSqlNVarCharLiteral(v.trim().slice(0, max));
        };
        if (dto.techPackPdfUrl !== undefined && (await this.venueHasTechPackCol())) {
            const sql = toSqlStr(dto.techPackPdfUrl);
            await this.dataSource.query(`UPDATE dbo.Venue SET [TechPackPdfUrl] = ${sql} WHERE [CompanyID] = ${venueCompanyId}`);
        }
        if (dto.ticketingSystem !== undefined) {
            const sql = toSqlStr(dto.ticketingSystem, 200);
            await this.dataSource.query(`UPDATE dbo.Venue SET [TicketingSystem] = ${sql} WHERE [CompanyID] = ${venueCompanyId}`);
        }
        if (dto.seatingChartUrl !== undefined && (await this.venueHasSeatingChartUrlCol())) {
            const sql = toSqlStr(dto.seatingChartUrl);
            await this.dataSource.query(`UPDATE dbo.Venue SET [SeatingChartUrl] = ${sql} WHERE [CompanyID] = ${venueCompanyId}`);
        }
        if (dto.ticketingAdminContactId !== undefined &&
            (await this.engagementVenueHasTicketingAdminCol())) {
            const val = dto.ticketingAdminContactId == null
                ? 'NULL'
                : Math.trunc(Number(dto.ticketingAdminContactId));
            await this.dataSource.query(`UPDATE dbo.EngagementVenue SET [TicketingAdminContactID] = ${val}
         WHERE [EngagementID] = ${engagementId} AND [VenueCompanyID] = ${venueCompanyId}`);
        }
        if (dto.techRiderLinkUrl !== undefined) {
            const engagement = await this.engagementRepo.findOne({ where: { engagementId } });
            if (engagement?.tourId) {
                const tour = await this.tourRepo.findOne({ where: { tourId: engagement.tourId } });
                if (tour) {
                    const urlVal = dto.techRiderLinkUrl?.trim() || null;
                    if (urlVal) {
                        if (tour.techRiderLinkId) {
                            await this.linkRepo.update(tour.techRiderLinkId, { linkUrl: urlVal });
                        }
                        else {
                            const newLink = this.linkRepo.create({
                                linkType: 'URL',
                                linkUrl: urlVal,
                                linkName: 'Tech Rider',
                                linkPath: '',
                            });
                            const saved = await this.linkRepo.save(newLink);
                            tour.techRiderLinkId = saved.linkId;
                            await this.tourRepo.save(tour);
                        }
                    }
                    else {
                        if (tour.techRiderLinkId) {
                            tour.techRiderLinkId = null;
                            await this.tourRepo.save(tour);
                        }
                    }
                }
            }
        }
        if (await this.engagementVenueHasOptionalCols()) {
            const sets = [];
            const addSet = (col, val) => {
                if (val === undefined)
                    return;
                if (val === null) {
                    sets.push(`[${col}] = NULL`);
                    return;
                }
                if (typeof val === 'number') {
                    sets.push(`[${col}] = ${val}`);
                    return;
                }
                sets.push(`[${col}] = ${this.escapeSqlNVarCharLiteral(String(val).slice(0, 2048))}`);
            };
            addSet('AttractionTechDirectorContactID', dto.attractionTechDirectorContactId);
            const vcStr = toSqlStr(dto.venueContractSharePointLink);
            if (vcStr !== undefined)
                sets.push(`[VenueContractSharePointLink] = ${vcStr}`);
            const pecStr = toSqlStr(dto.partiallyExecutedContractSharePointLink);
            if (pecStr !== undefined)
                sets.push(`[PartiallyExecutedContractSharePointLink] = ${pecStr}`);
            const fecStr = toSqlStr(dto.fullyExecutedContractSharePointLink);
            if (fecStr !== undefined)
                sets.push(`[FullyExecutedContractSharePointLink] = ${fecStr}`);
            const vfStr = toSqlStr(dto.venueForecastSharePointLink);
            if (vfStr !== undefined)
                sets.push(`[VenueForecastSharePointLink] = ${vfStr}`);
            if (sets.length > 0) {
                await this.dataSource.query(`UPDATE dbo.EngagementVenue SET ${sets.join(', ')}
           WHERE [EngagementID] = ${engagementId} AND [VenueCompanyID] = ${venueCompanyId}`);
            }
        }
        if (await this.engagementVenueHasMarketingCols()) {
            const mktSets = [];
            if (dto.venueMarketingDirectorContactId !== undefined) {
                mktSets.push(`[VenueMarketingDirectorContactID] = ${dto.venueMarketingDirectorContactId == null ? 'NULL' : Math.trunc(Number(dto.venueMarketingDirectorContactId))}`);
            }
            if (dto.venueMarketingManagerContactId !== undefined) {
                mktSets.push(`[VenueMarketingManagerContactID] = ${dto.venueMarketingManagerContactId == null ? 'NULL' : Math.trunc(Number(dto.venueMarketingManagerContactId))}`);
            }
            if (dto.venueDigitalMarketingManagerContactId !== undefined) {
                mktSets.push(`[VenueDigitalMarketingManagerContactID] = ${dto.venueDigitalMarketingManagerContactId == null ? 'NULL' : Math.trunc(Number(dto.venueDigitalMarketingManagerContactId))}`);
            }
            if (mktSets.length > 0) {
                await this.dataSource.query(`UPDATE dbo.EngagementVenue SET ${mktSets.join(', ')}
           WHERE [EngagementID] = ${engagementId} AND [VenueCompanyID] = ${venueCompanyId}`);
            }
        }
        if (dto.iaeProductionManagerContactId !== undefined &&
            (await this.engagementVenueHasProductionManagerCol())) {
            const val = dto.iaeProductionManagerContactId == null
                ? 'NULL'
                : Math.trunc(Number(dto.iaeProductionManagerContactId));
            await this.dataSource.query(`UPDATE dbo.EngagementVenue SET [IaeProductionManagerContactID] = ${val}
         WHERE [EngagementID] = ${engagementId} AND [VenueCompanyID] = ${venueCompanyId}`);
        }
        if (dto.venueProductionManagerContactId !== undefined &&
            (await this.engagementVenueHasVenueProductionManagerCol())) {
            const val = dto.venueProductionManagerContactId == null
                ? 'NULL'
                : Math.trunc(Number(dto.venueProductionManagerContactId));
            await this.dataSource.query(`UPDATE dbo.EngagementVenue SET [VenueProductionManagerContactID] = ${val}
         WHERE [EngagementID] = ${engagementId} AND [VenueCompanyID] = ${venueCompanyId}`);
        }
        if (dto.stagehandContactId !== undefined &&
            (await this.engagementVenueHasStagehandContactCol())) {
            const val = dto.stagehandContactId == null
                ? 'NULL'
                : Math.trunc(Number(dto.stagehandContactId));
            await this.dataSource.query(`UPDATE dbo.EngagementVenue SET [StagehandContactID] = ${val}
         WHERE [EngagementID] = ${engagementId} AND [VenueCompanyID] = ${venueCompanyId}`);
        }
    }
    async uploadSeatingChart(engagementId, venueCompanyId, file) {
        await this.assertEngagementExists(engagementId);
        const ev = await this.engagementVenueRepo.findOne({
            where: { engagementId, venueCompanyId },
        });
        if (!ev)
            throw new common_1.NotFoundException({ message: 'Venue not linked to this engagement.' });
        if (!file?.filename?.trim()) {
            throw new common_1.BadRequestException({ message: 'Upload did not produce a filename.' });
        }
        const publicPath = `/uploads/seating-charts/${file.filename}`.slice(0, 2048);
        const safeName = (file.originalname || 'Seating Chart')
            .replace(/[\x00-\x1f]/g, '')
            .slice(0, 255);
        const venue = await this.venueRepo.findOne({ where: { companyId: venueCompanyId } });
        if (!venue)
            throw new common_1.NotFoundException({ message: 'Venue not found.' });
        if (venue.seatingChartLinkId) {
            await this.linkRepo.update(venue.seatingChartLinkId, {
                linkUrl: publicPath,
                linkPath: publicPath.slice(0, 1024),
                linkName: safeName || 'Seating Chart',
            });
            return { seatingChartLinkId: venue.seatingChartLinkId, seatingChartLinkUrl: publicPath };
        }
        const newLink = this.linkRepo.create({
            linkType: 'Image',
            linkUrl: publicPath,
            linkPath: publicPath.slice(0, 1024),
            linkName: safeName || 'Seating Chart',
        });
        const savedLink = await this.linkRepo.save(newLink);
        venue.seatingChartLinkId = savedLink.linkId;
        await this.venueRepo.save(venue);
        return { seatingChartLinkId: savedLink.linkId, seatingChartLinkUrl: publicPath };
    }
    async removeSeatingChart(engagementId, venueCompanyId) {
        await this.assertEngagementExists(engagementId);
        const ev = await this.engagementVenueRepo.findOne({
            where: { engagementId, venueCompanyId },
        });
        if (!ev)
            throw new common_1.NotFoundException({ message: 'Venue not linked to this engagement.' });
        const venue = await this.venueRepo.findOne({ where: { companyId: venueCompanyId } });
        if (!venue)
            throw new common_1.NotFoundException({ message: 'Venue not found.' });
        if (venue.seatingChartLinkId) {
            venue.seatingChartLinkId = null;
            await this.venueRepo.save(venue);
        }
    }
    async upsertEngagementLink(engagementId, dto) {
        await this.assertEngagementExists(engagementId);
        const url = (dto.linkUrl ?? '').trim();
        const purpose = (dto.linkPurpose ?? '').trim();
        if (!url)
            throw new common_1.BadRequestException({ message: 'linkUrl is required.' });
        if (!purpose)
            throw new common_1.BadRequestException({ message: 'linkPurpose is required.' });
        let existing = null;
        try {
            existing = await this.engagementLinkRepo.findOne({
                where: { engagementId, linkPurpose: purpose },
            });
        }
        catch { }
        if (existing) {
            await this.linkRepo.update({ linkId: existing.linkId }, {
                linkUrl: url,
                linkName: dto.linkName?.trim() || purpose,
                linkPath: dto.linkPath?.trim() ?? '',
            });
            return { engagementLinkId: existing.engagementLinkId, linkId: existing.linkId };
        }
        const link = this.linkRepo.create({
            linkType: 'SharePoint',
            linkUrl: url,
            linkName: dto.linkName?.trim() || purpose,
            linkPath: dto.linkPath?.trim() ?? '',
        });
        const savedLink = await this.linkRepo.save(link);
        const engagementLink = this.engagementLinkRepo.create({
            engagementId,
            linkId: savedLink.linkId,
            linkPurpose: purpose,
        });
        const savedEl = await this.engagementLinkRepo.save(engagementLink);
        return { engagementLinkId: savedEl.engagementLinkId, linkId: savedLink.linkId };
    }
    async removeEngagementLink(engagementId, engagementLinkId) {
        const el = await this.engagementLinkRepo.findOne({
            where: { engagementLinkId, engagementId },
        });
        if (!el)
            throw new common_1.NotFoundException({ message: 'Engagement link not found.' });
        await this.engagementLinkRepo.remove(el);
    }
    async addVenue(engagementId, dto) {
        await this.assertEngagementExists(engagementId);
        await this.assertVenueCompany(dto.venueCompanyId);
        const existing = await this.engagementVenueRepo.findOne({
            where: { engagementId, venueCompanyId: dto.venueCompanyId },
        });
        if (existing) {
            throw new common_1.ConflictException({
                message: 'This venue is already linked to the engagement.',
            });
        }
        const isPrimary = dto.isPrimary === true;
        await this.dataSource.transaction(async (manager) => {
            if (isPrimary) {
                const cur = await manager.findOne(engagement_venue_entity_1.EngagementVenue, {
                    where: { engagementId, isPrimary: true },
                });
                if (cur) {
                    cur.isPrimary = false;
                    await manager.save(engagement_venue_entity_1.EngagementVenue, cur);
                }
            }
            await manager.save(engagement_venue_entity_1.EngagementVenue, manager.create(engagement_venue_entity_1.EngagementVenue, {
                engagementId,
                venueCompanyId: dto.venueCompanyId,
                isPrimary,
            }));
        });
        return { added: true };
    }
    async removeVenue(engagementId, venueCompanyId) {
        await this.assertEngagementExists(engagementId);
        const row = await this.engagementVenueRepo.findOne({
            where: { engagementId, venueCompanyId },
        });
        if (!row) {
            throw new common_1.NotFoundException({
                message: 'This venue is not linked to the engagement.',
            });
        }
        const allVenues = await this.engagementVenueRepo.find({
            where: { engagementId },
        });
        if (allVenues.length === 1) {
            throw new common_1.ConflictException({
                message: 'Cannot remove the only venue. An engagement must have at least one venue.',
            });
        }
        if (row.isPrimary) {
            const secondaries = allVenues.filter((v) => !v.isPrimary);
            if (secondaries.length === 0) {
                throw new common_1.ConflictException({
                    message: 'Cannot remove the primary venue when no secondary venues exist. Reassign primary first.',
                });
            }
        }
        await this.engagementVenueRepo.delete({ engagementId, venueCompanyId });
    }
    async listServiceProviders(engagementId) {
        await this.assertEngagementExists(engagementId);
        const venueCompanyId = await this.getPrimaryVenueCompanyIdForEngagement(engagementId);
        const rawProviderIds = await this.venueServiceProviderRepo
            .createQueryBuilder('vsp')
            .select('DISTINCT vsp.providerCompanyId', 'providerCompanyId')
            .where('vsp.venueCompanyId = :venueCompanyId', { venueCompanyId })
            .getRawMany();
        const providerCompanyIds = rawProviderIds
            .map((r) => Number(r.providerCompanyId ?? r.ProviderCompanyID))
            .filter((id) => Number.isInteger(id) && id > 0);
        if (providerCompanyIds.length === 0) {
            return { venueCompanyId, providers: [] };
        }
        const companies = await this.companyRepo.find({
            where: { companyId: (0, typeorm_2.In)(providerCompanyIds) },
        });
        const nameMap = new Map(companies.map((c) => [c.companyId, c.companyName]));
        const providers = [];
        for (const providerCompanyId of providerCompanyIds) {
            const services = await this.loadCompanyServices(providerCompanyId);
            providers.push({
                providerCompanyId,
                providerCompanyName: nameMap.get(providerCompanyId) ?? null,
                serviceProvidedIds: services.map((s) => s.serviceProvidedId),
                serviceProvidedNames: services.map((s) => s.serviceName),
            });
        }
        providers.sort((a, b) => (a.providerCompanyName ?? String(a.providerCompanyId)).localeCompare(b.providerCompanyName ?? String(b.providerCompanyId), undefined, { sensitivity: 'base' }));
        return { venueCompanyId, providers };
    }
    async addServiceProvider(engagementId, providerCompanyId) {
        await this.assertEngagementExists(engagementId);
        const venueCompanyId = await this.getPrimaryVenueCompanyIdForEngagement(engagementId);
        const pid = Number(providerCompanyId);
        if (!Number.isInteger(pid) || pid < 1) {
            throw new common_1.BadRequestException({
                message: 'Invalid provider company id.',
            });
        }
        const company = await this.companyRepo.findOne({
            where: { companyId: pid },
        });
        if (!company) {
            throw new common_1.BadRequestException({ message: 'Provider company not found.' });
        }
        const services = await this.loadCompanyServices(pid);
        if (services.length === 0) {
            throw new common_1.BadRequestException({
                message: 'This company has no Company Services assigned. Assign services on the company first, then add it here.',
            });
        }
        await this.dataSource.transaction(async (em) => {
            await em.delete(venue_service_provider_entity_1.VenueServiceProvider, {
                venueCompanyId,
                providerCompanyId: pid,
            });
            const rows = services.map((s) => em.create(venue_service_provider_entity_1.VenueServiceProvider, {
                venueCompanyId,
                providerCompanyId: pid,
                serviceId: s.serviceProvidedId,
            }));
            await em.save(venue_service_provider_entity_1.VenueServiceProvider, rows);
        });
        return { added: true };
    }
    async removeServiceProvider(engagementId, providerCompanyId) {
        await this.assertEngagementExists(engagementId);
        const venueCompanyId = await this.getPrimaryVenueCompanyIdForEngagement(engagementId);
        const pid = Number(providerCompanyId);
        if (!Number.isInteger(pid) || pid < 1) {
            throw new common_1.BadRequestException({
                message: 'Invalid provider company id.',
            });
        }
        await this.venueServiceProviderRepo.delete({
            venueCompanyId,
            providerCompanyId: pid,
        });
    }
    mapIaeCreatedDate(d) {
        if (d == null || d === '')
            return '';
        if (d instanceof Date) {
            if (Number.isNaN(d.getTime()))
                return '';
            return d.toISOString();
        }
        const t = Date.parse(String(d));
        return Number.isNaN(t) ? String(d) : new Date(t).toISOString();
    }
    contactDisplayLabel(first, last, email, contactId) {
        const name = [first, last]
            .map((x) => (x ?? '').trim())
            .filter(Boolean)
            .join(' ')
            .trim();
        if (name)
            return name;
        const em = (email ?? '').trim();
        if (em)
            return em;
        return `Contact #${contactId}`;
    }
    async assertNoDuplicateIaeAssignment(engagementId, contactId, roleId, excludeEicId) {
        const qb = this.engagementIaeContactRepo
            .createQueryBuilder('e')
            .where('e.engagementId = :eid', { eid: engagementId })
            .andWhere('e.contactId = :cid', { cid: contactId });
        if (roleId == null) {
            qb.andWhere('e.roleId IS NULL');
        }
        else {
            qb.andWhere('e.roleId = :rid', { rid: roleId });
        }
        if (excludeEicId != null) {
            qb.andWhere('e.engagementIaeContactId <> :xid', { xid: excludeEicId });
        }
        const n = await qb.getCount();
        if (n > 0) {
            throw new common_1.ConflictException({
                message: 'This person is already assigned for this role on this engagement (including “no role”). Edit or remove the existing row.',
            });
        }
    }
    async clearOtherPrimaryIaeContacts(engagementId, keepEicId) {
        await this.engagementIaeContactRepo
            .createQueryBuilder()
            .update(engagement_iae_contact_entity_1.EngagementIAEContact)
            .set({ isPrimary: false })
            .where('engagementId = :eid', { eid: engagementId })
            .andWhere('engagementIaeContactId <> :kid', { kid: keepEicId })
            .execute();
    }
    async assertInternalContact(contactId) {
        const row = await this.contactRepo
            .createQueryBuilder('c')
            .innerJoin(contact_assignment_entity_1.ContactAssignment, 'ca', 'ca.contactId = c.contactId')
            .innerJoin(company_entity_1.Company, 'company', 'company.companyId = ca.companyId')
            .where('c.contactId = :contactId', { contactId })
            .andWhere('company.isInternal = :isInternal', { isInternal: true })
            .select('c.contactId', 'contactId')
            .getRawOne();
        if (!row) {
            throw new common_1.BadRequestException({
                message: 'Select an internal contact. IAE staff must belong to a company marked Internal.',
            });
        }
    }
    async loadInternalContactIdSet(contactIds) {
        const ids = [
            ...new Set(contactIds.filter((id) => Number.isInteger(id) && id > 0)),
        ];
        if (ids.length === 0)
            return new Set();
        const rows = await this.contactRepo
            .createQueryBuilder('c')
            .innerJoin(contact_assignment_entity_1.ContactAssignment, 'ca', 'ca.contactId = c.contactId')
            .innerJoin(company_entity_1.Company, 'company', 'company.companyId = ca.companyId')
            .where('c.contactId IN (:...ids)', { ids })
            .andWhere('company.isInternal = :isInternal', { isInternal: true })
            .select('DISTINCT c.contactId', 'contactId')
            .getRawMany();
        return new Set(rows
            .map((row) => Number(pickRaw(row, 'contactId')))
            .filter((id) => Number.isInteger(id) && id > 0));
    }
    async getEngagementIaeContactLookups() {
        const [roles, departments, contactRows] = await Promise.all([
            this.roleRepo.find({
                order: { roleId: 'ASC' },
                take: 5000,
            }),
            this.departmentRepo.find({
                order: { departmentId: 'ASC' },
                take: 5000,
            }),
            this.contactRepo
                .createQueryBuilder('c')
                .innerJoin('c.contactInfo', 'ci')
                .innerJoin(contact_assignment_entity_1.ContactAssignment, 'ca', 'ca.contactId = c.contactId')
                .innerJoin(company_entity_1.Company, 'company', 'company.companyId = ca.companyId')
                .where('company.isInternal = :isInternal', { isInternal: true })
                .select([
                'c.contactId AS contactId',
                'ci.firstName AS firstName',
                'ci.lastName AS lastName',
                'ci.email AS email',
            ])
                .distinct(true)
                .orderBy('c.contactId', 'ASC')
                .take(8000)
                .getRawMany(),
        ]);
        const ticketingManagerRole = roles.find((r) => (r.roleName ?? '').trim().toLowerCase() === 'ticketing manager');
        let ticketingManagerContactIds = [];
        if (ticketingManagerRole) {
            try {
                const tmRows = await this.dataSource.query(`SELECT DISTINCT [ContactID] AS cid FROM dbo.EngagementIAEContact WHERE [RoleID] = ${ticketingManagerRole.roleId}`);
                ticketingManagerContactIds = tmRows
                    .map((r) => pickRaw(r, 'cid'))
                    .filter((v) => v != null && Number.isFinite(Number(v)))
                    .map(Number);
            }
            catch { }
        }
        return {
            roles: roles.map((r) => ({
                id: r.roleId,
                label: (r.roleName ?? '').trim() || `Role #${r.roleId}`,
            })),
            departments: departments.map((d) => ({
                id: d.departmentId,
                label: (d.departmentName ?? '').trim() || `Dept #${d.departmentId}`,
            })),
            contacts: contactRows.map((c) => ({
                id: Number(pickRaw(c, 'contactId')),
                label: this.contactDisplayLabel(String(pickRaw(c, 'firstName') ?? ''), String(pickRaw(c, 'lastName') ?? ''), String(pickRaw(c, 'email') ?? ''), Number(pickRaw(c, 'contactId'))),
            })),
            ticketingManagerContactIds,
        };
    }
    async listEngagementIaeContacts(engagementId) {
        await this.assertEngagementExists(engagementId);
        const allRows = await this.engagementIaeContactRepo.find({
            where: { engagementId },
            order: { isPrimary: 'DESC', createdDate: 'DESC' },
        });
        if (allRows.length === 0)
            return [];
        const internalContactIds = await this.loadInternalContactIdSet(allRows.map((r) => r.contactId));
        const rows = allRows.filter((row) => internalContactIds.has(row.contactId));
        if (rows.length === 0)
            return [];
        const contactIds = [...new Set(rows.map((r) => r.contactId))];
        const roleIds = [
            ...new Set(rows.map((r) => r.roleId).filter((x) => x != null)),
        ];
        const deptIds = [
            ...new Set(rows.map((r) => r.departmentId).filter((x) => x != null)),
        ];
        const [contacts, roles, depts] = await Promise.all([
            this.contactRepo.find({
                where: { contactId: (0, typeorm_2.In)(contactIds) },
                relations: { contactInfo: true },
            }),
            roleIds.length
                ? this.roleRepo.find({ where: { roleId: (0, typeorm_2.In)(roleIds) } })
                : [],
            deptIds.length
                ? this.departmentRepo.find({ where: { departmentId: (0, typeorm_2.In)(deptIds) } })
                : [],
        ]);
        const cMap = new Map(contacts.map((c) => [c.contactId, c]));
        const rMap = new Map(roles.map((r) => [r.roleId, r.roleName]));
        const dMap = new Map(depts.map((d) => [d.departmentId, d.departmentName]));
        return rows.map((eic) => {
            const ci = cMap.get(eic.contactId)?.contactInfo;
            return {
                engagementIaeContactId: eic.engagementIaeContactId,
                engagementId: eic.engagementId,
                contactId: eic.contactId,
                contactLabel: this.contactDisplayLabel(ci?.firstName, ci?.lastName, ci?.email, eic.contactId),
                roleId: eic.roleId,
                roleName: eic.roleId != null ? (rMap.get(eic.roleId) ?? null) : null,
                departmentId: eic.departmentId,
                departmentName: eic.departmentId != null
                    ? (dMap.get(eic.departmentId) ?? null)
                    : null,
                isPrimary: this.mapBit(eic.isPrimary) === true,
                notes: eic.notes,
                createdDate: this.mapIaeCreatedDate(eic.createdDate),
            };
        });
    }
    async addEngagementIaeContact(engagementId, dto) {
        await this.assertEngagementExists(engagementId);
        const contact = await this.contactRepo.findOne({
            where: { contactId: dto.contactId },
        });
        if (!contact) {
            throw new common_1.BadRequestException({
                message: `Contact #${dto.contactId} was not found.`,
            });
        }
        await this.assertInternalContact(dto.contactId);
        if (dto.roleId != null && dto.roleId !== undefined) {
            const role = await this.roleRepo.findOne({
                where: { roleId: dto.roleId },
            });
            if (!role) {
                throw new common_1.BadRequestException({
                    message: `Role #${dto.roleId} was not found.`,
                });
            }
        }
        if (dto.departmentId != null && dto.departmentId !== undefined) {
            const dept = await this.departmentRepo.findOne({
                where: { departmentId: dto.departmentId },
            });
            if (!dept) {
                throw new common_1.BadRequestException({
                    message: `Department #${dto.departmentId} was not found.`,
                });
            }
        }
        const roleId = dto.roleId === undefined ? null : (dto.roleId ?? null);
        await this.assertNoDuplicateIaeAssignment(engagementId, dto.contactId, roleId, null);
        const wantPrimary = dto.isPrimary === true;
        const row = this.engagementIaeContactRepo.create({
            engagementId,
            contactId: dto.contactId,
            roleId,
            departmentId: dto.departmentId === undefined ? null : (dto.departmentId ?? null),
            isPrimary: wantPrimary,
            notes: dto.notes === undefined ||
                dto.notes == null ||
                String(dto.notes).trim() === ''
                ? null
                : String(dto.notes).trim().slice(0, 500),
            createdDate: new Date(),
        });
        const saved = await this.engagementIaeContactRepo.save(row);
        if (wantPrimary) {
            await this.clearOtherPrimaryIaeContacts(engagementId, saved.engagementIaeContactId);
        }
        return { engagementIaeContactId: saved.engagementIaeContactId };
    }
    async updateEngagementIaeContact(engagementId, eicId, dto) {
        await this.assertEngagementExists(engagementId);
        const row = await this.engagementIaeContactRepo.findOne({
            where: { engagementIaeContactId: eicId, engagementId },
        });
        if (!row) {
            throw new common_1.NotFoundException({
                message: `IAE assignment #${eicId} was not found for engagement #${engagementId}.`,
            });
        }
        const nextContactId = dto.contactId !== undefined ? dto.contactId : row.contactId;
        const nextRoleId = dto.roleId !== undefined ? (dto.roleId ?? null) : row.roleId;
        const nextDeptId = dto.departmentId !== undefined
            ? (dto.departmentId ?? null)
            : row.departmentId;
        if (dto.contactId !== undefined) {
            const c = await this.contactRepo.findOne({
                where: { contactId: dto.contactId },
            });
            if (!c) {
                throw new common_1.BadRequestException({
                    message: `Contact #${dto.contactId} was not found.`,
                });
            }
            await this.assertInternalContact(dto.contactId);
        }
        if (dto.roleId !== undefined && dto.roleId != null) {
            const role = await this.roleRepo.findOne({
                where: { roleId: dto.roleId },
            });
            if (!role) {
                throw new common_1.BadRequestException({
                    message: `Role #${dto.roleId} was not found.`,
                });
            }
        }
        if (dto.departmentId !== undefined && dto.departmentId != null) {
            const dept = await this.departmentRepo.findOne({
                where: { departmentId: dto.departmentId },
            });
            if (!dept) {
                throw new common_1.BadRequestException({
                    message: `Department #${dto.departmentId} was not found.`,
                });
            }
        }
        if (dto.contactId !== undefined || dto.roleId !== undefined) {
            await this.assertNoDuplicateIaeAssignment(engagementId, nextContactId, nextRoleId, eicId);
        }
        if (dto.contactId !== undefined)
            row.contactId = nextContactId;
        if (dto.roleId !== undefined)
            row.roleId = nextRoleId;
        if (dto.departmentId !== undefined)
            row.departmentId = nextDeptId;
        if (dto.notes !== undefined) {
            const t = dto.notes;
            row.notes =
                t == null || String(t).trim() === ''
                    ? null
                    : String(t).trim().slice(0, 500);
        }
        if (dto.isPrimary !== undefined) {
            row.isPrimary = dto.isPrimary === true;
        }
        await this.engagementIaeContactRepo.save(row);
        if (dto.isPrimary === true) {
            await this.clearOtherPrimaryIaeContacts(engagementId, eicId);
        }
    }
    async removeEngagementIaeContact(engagementId, eicId) {
        await this.assertEngagementExists(engagementId);
        const res = await this.engagementIaeContactRepo.delete({
            engagementIaeContactId: eicId,
            engagementId,
        });
        if (!res.affected) {
            throw new common_1.NotFoundException({
                message: `IAE assignment #${eicId} was not found for engagement #${engagementId}.`,
            });
        }
    }
    async listPerformances(engagementId) {
        await this.assertEngagementExists(engagementId);
        const rows = await this.performanceRepo.find({
            where: { engagementId },
            order: { performanceDate: 'ASC', performanceTime: 'ASC' },
        });
        return rows.map((r) => ({
            performanceId: r.performanceId,
            engagementId: r.engagementId,
            performanceStatus: r.performanceStatus,
            performanceDate: r.performanceDate,
            performanceTime: r.performanceTime,
        }));
    }
    async assertPerformanceForEngagement(engagementId, performanceId) {
        await this.assertEngagementExists(engagementId);
        const perf = await this.performanceRepo.findOne({
            where: { performanceId, engagementId },
        });
        if (!perf) {
            throw new common_1.NotFoundException({
                message: `Performance #${performanceId} was not found for engagement #${engagementId}.`,
            });
        }
        return perf;
    }
    async getPerformanceTicketing(engagementId, performanceId) {
        await this.assertPerformanceForEngagement(engagementId, performanceId);
        const row = await this.performanceTicketingRepo.findOne({
            where: { performanceId },
            order: { ticketingId: 'ASC' },
        });
        if (!row) {
            const blankRow = {
                ticketingId: null,
                performanceId,
                ticketingStatus: null,
                onSaleDate: null,
                preSaleDate: null,
                vipPackagedOffer: null,
                preSaleSpecialPrices: null,
                kidsTicketsPrices: null,
                ticketingLinkId: null,
                ticketingLinkUrl: null,
                grossTicketSales: null,
                totalComps: null,
                totalTickets: null,
                totalAdmissions: null,
                sellableCapacity: null,
                grossPotentialRevenue: null,
                ticketingSystemCompanyId: null,
                ticketingAdministrator: null,
                boxOfficeLaborStaffingRequired: null,
                facilityFeeType: null,
                facilityFeeAmount: null,
                dynamicPricingMode: null,
                serviceChargeRevenueShare: null,
                rebateAmount: null,
                bumpAmount: null,
                creditCardFeesType: null,
                creditCardFeesAmountPercent: null,
                salesTaxType: null,
                salesTaxAmountPercent: null,
                ticketingAdminContactId: null,
                ticketingAdminContactName: null,
                ticketingAdminCompanyId: null,
                ticketingAdminCompanyName: null,
                publicSaleLinkId: null,
                publicSaleLinkUrl: null,
                preSaleEndDate: null,
                preSaleRegistrationStartDate: null,
                preSaleRegistrationEndDate: null,
                isIAETMDeal: null,
                presalePassword: null,
                presalePasswordDateStart: null,
                presalePasswordDateEnd: null,
                presaleSpecialPricePassword: null,
                presaleSpecialPricePasswordDateStart: null,
                presaleSpecialPricePasswordDateEnd: null,
                presaleSpecialPriceDiscountType: null,
                presaleSpecialPriceDiscountAmount: null,
                publicSaleSpecialPricePassword: null,
                publicSaleSpecialPricePasswordDateStart: null,
                publicSaleSpecialPricePasswordDateEnd: null,
                publicSaleSpecialPriceDiscountType: null,
                publicSaleSpecialPriceDiscountAmount: null,
                vipPackageOffered: null,
                vipPackageName: null,
                vipPackageBenefits: null,
                compTicketForm: null,
                compTicketExcelSheet: null,
            };
            return this.mergeSalesTaxFromVenue(engagementId, blankRow);
        }
        const ticketingLink = row.ticketingLinkId != null
            ? await this.linkRepo.findOne({
                where: { linkId: row.ticketingLinkId },
            })
            : null;
        const base = {
            ticketingId: row.ticketingId,
            performanceId,
            ticketingStatus: row.ticketingStatus,
            onSaleDate: this.mapFinanceYmd(row.onSaleDate),
            preSaleDate: this.mapFinanceYmd(row.preSaleDate),
            vipPackagedOffer: row.vipPackagedOffer,
            preSaleSpecialPrices: row.preSaleSpecialPrices,
            kidsTicketsPrices: row.kidsTicketsPrices,
            ticketingLinkId: row.ticketingLinkId,
            ticketingLinkUrl: ticketingLink?.linkUrl ?? null,
            grossTicketSales: this.mapFinanceNumber(row.grossTicketSales),
            totalComps: row.totalComps,
            totalTickets: row.totalTickets,
            totalAdmissions: row.totalAdmissions,
            sellableCapacity: null,
            grossPotentialRevenue: null,
            ticketingSystemCompanyId: null,
            ticketingAdministrator: null,
            boxOfficeLaborStaffingRequired: null,
            facilityFeeType: null,
            facilityFeeAmount: null,
            dynamicPricingMode: null,
            serviceChargeRevenueShare: null,
            rebateAmount: null,
            bumpAmount: null,
            creditCardFeesType: null,
            creditCardFeesAmountPercent: null,
            salesTaxType: null,
            salesTaxAmountPercent: null,
            ticketingAdminContactId: null,
            ticketingAdminContactName: null,
            ticketingAdminCompanyId: null,
            ticketingAdminCompanyName: null,
            publicSaleLinkId: null,
            publicSaleLinkUrl: null,
            preSaleEndDate: null,
            preSaleRegistrationStartDate: null,
            preSaleRegistrationEndDate: null,
            isIAETMDeal: null,
            presalePassword: null,
            presalePasswordDateStart: null,
            presalePasswordDateEnd: null,
            presaleSpecialPricePassword: null,
            presaleSpecialPricePasswordDateStart: null,
            presaleSpecialPricePasswordDateEnd: null,
            presaleSpecialPriceDiscountType: null,
            presaleSpecialPriceDiscountAmount: null,
            publicSaleSpecialPricePassword: null,
            publicSaleSpecialPricePasswordDateStart: null,
            publicSaleSpecialPricePasswordDateEnd: null,
            publicSaleSpecialPriceDiscountType: null,
            publicSaleSpecialPriceDiscountAmount: null,
            vipPackageOffered: null,
            vipPackageName: null,
            vipPackageBenefits: null,
            compTicketForm: null,
            compTicketExcelSheet: null,
        };
        const merged = await this.mergePerformanceTicketingAdvancedFromDb(row.ticketingId, base);
        return this.mergeSalesTaxFromVenue(engagementId, merged);
    }
    async mergeSalesTaxFromVenue(engagementId, base) {
        try {
            const r = await this.dataSource.query(`SELECT v.[SalesTaxType] AS stt, v.[SalesTaxRate] AS str
         FROM dbo.Venue v
         INNER JOIN dbo.EngagementVenue ev ON ev.[VenueCompanyID] = v.[CompanyID]
         WHERE ev.[EngagementID] = ${engagementId} AND ev.[IsPrimary] = 1`);
            const row0 = r?.[0];
            if (!row0)
                return base;
            const stt = pickRaw(row0, 'stt');
            const str = pickRaw(row0, 'str');
            return {
                ...base,
                salesTaxType: stt != null && stt !== '' ? String(stt).trim() : null,
                salesTaxAmountPercent: str != null && str !== '' && Number.isFinite(Number(str)) ? Number(str) : null,
            };
        }
        catch {
            return base;
        }
    }
    async upsertPerformanceTicketing(engagementId, performanceId, dto) {
        await this.assertPerformanceForEngagement(engagementId, performanceId);
        if (dto.ticketingLinkUrl === undefined &&
            dto.ticketingLinkId !== undefined &&
            dto.ticketingLinkId != null) {
            const link = await this.linkRepo.findOne({
                where: { linkId: dto.ticketingLinkId },
            });
            if (!link) {
                throw new common_1.BadRequestException({
                    message: `Link #${dto.ticketingLinkId} was not found.`,
                });
            }
        }
        let row = await this.performanceTicketingRepo.findOne({
            where: { performanceId },
            order: { ticketingId: 'ASC' },
        });
        if (!row) {
            row = this.performanceTicketingRepo.create({ performanceId });
        }
        if (dto.ticketingStatus !== undefined) {
            const t = dto.ticketingStatus;
            row.ticketingStatus =
                t == null || String(t).trim() === ''
                    ? null
                    : String(t).trim().slice(0, 50);
        }
        if (dto.onSaleDate !== undefined) {
            row.onSaleDate = this.assertYmdOrNull(dto.onSaleDate);
        }
        if (dto.preSaleDate !== undefined) {
            row.preSaleDate = this.assertYmdOrNull(dto.preSaleDate);
        }
        if (dto.vipPackagedOffer !== undefined) {
            const t = dto.vipPackagedOffer;
            row.vipPackagedOffer =
                t == null || String(t).trim() === ''
                    ? null
                    : String(t).trim().slice(0, 255);
        }
        if (dto.preSaleSpecialPrices !== undefined) {
            const t = dto.preSaleSpecialPrices;
            row.preSaleSpecialPrices =
                t == null || String(t).trim() === '' ? null : String(t).trim();
        }
        if (dto.kidsTicketsPrices !== undefined) {
            const t = dto.kidsTicketsPrices;
            row.kidsTicketsPrices =
                t == null || String(t).trim() === '' ? null : String(t).trim();
        }
        if (dto.ticketingLinkUrl !== undefined) {
            row.ticketingLinkId = await this.upsertTicketingUrlLink(dto.ticketingLinkUrl, row.ticketingLinkId);
        }
        else if (dto.ticketingLinkId !== undefined) {
            row.ticketingLinkId = dto.ticketingLinkId;
        }
        if (dto.grossTicketSales !== undefined) {
            row.grossTicketSales =
                dto.grossTicketSales == null ? null : dto.grossTicketSales;
        }
        if (dto.totalComps !== undefined) {
            row.totalComps = dto.totalComps;
        }
        if (dto.totalTickets !== undefined) {
            row.totalTickets = dto.totalTickets;
        }
        if (dto.totalAdmissions !== undefined) {
            row.totalAdmissions = dto.totalAdmissions;
        }
        const saved = await this.performanceTicketingRepo.save(row);
        await Promise.all([
            this.tryPersistPerformanceTicketingAdvanced(saved.ticketingId, dto, performanceId),
            this.tryPersistSalesTaxToVenue(engagementId, dto),
            this.tryPersistEngagementScaling(engagementId, dto),
        ]);
    }
    async tryPersistEngagementScaling(engagementId, dto) {
        if (dto.engagementScaling === undefined)
            return;
        const val = dto.engagementScaling == null || String(dto.engagementScaling).trim() === ''
            ? null
            : String(dto.engagementScaling).trim().slice(0, 50);
        await this.engagementRepo.update({ engagementId }, { engagementScaling: val });
    }
    async tryPersistSalesTaxToVenue(engagementId, dto) {
        if (dto.salesTaxType === undefined && dto.salesTaxAmountPercent === undefined)
            return;
        const sets = [];
        if (dto.salesTaxType !== undefined) {
            sets.push(`[SalesTaxType] = ${dto.salesTaxType == null ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dto.salesTaxType).trim().slice(0, 50))}`);
        }
        if (dto.salesTaxAmountPercent !== undefined) {
            sets.push(`[SalesTaxRate] = ${dto.salesTaxAmountPercent == null ? 'NULL' : Number(dto.salesTaxAmountPercent)}`);
        }
        if (!sets.length)
            return;
        try {
            await this.dataSource.query(`UPDATE dbo.Venue SET ${sets.join(', ')}
         WHERE [CompanyID] IN (
           SELECT ev.[VenueCompanyID] FROM dbo.EngagementVenue ev
           WHERE ev.[EngagementID] = ${Math.trunc(engagementId)} AND ev.[IsPrimary] = 1
         )`);
        }
        catch { }
    }
    async createPerformance(engagementId, dto) {
        await this.assertEngagementExists(engagementId);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.performanceDate)) {
            throw new common_1.BadRequestException({
                message: 'Invalid performance date. Expected format: YYYY-MM-DD.',
            });
        }
        const normalizedTime = this.normalizeTime(dto.performanceTime);
        await this.assertPerformanceSlotAvailable(engagementId, dto.performanceDate, normalizedTime);
        const row = this.performanceRepo.create({
            engagementId,
            performanceDate: dto.performanceDate,
            performanceTime: normalizedTime,
            performanceStatus: dto.performanceStatus?.trim() || 'Public (Not On Sale)',
        });
        const saved = await this.performanceRepo.save(row);
        await this.enforceOpeningPerformancePublic(engagementId);
        return { performanceId: saved.performanceId };
    }
    async updatePerformance(engagementId, performanceId, dto) {
        await this.assertEngagementExists(engagementId);
        const perf = await this.performanceRepo.findOne({
            where: { performanceId, engagementId },
        });
        if (!perf) {
            throw new common_1.NotFoundException({
                message: `Performance #${performanceId} not found for engagement #${engagementId}.`,
            });
        }
        if (dto.performanceDate !== undefined) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.performanceDate)) {
                throw new common_1.BadRequestException({
                    message: 'Invalid performance date. Expected format: YYYY-MM-DD.',
                });
            }
            perf.performanceDate = dto.performanceDate;
        }
        if (dto.performanceTime !== undefined) {
            perf.performanceTime = this.normalizeTime(dto.performanceTime);
        }
        if (dto.performanceStatus !== undefined) {
            perf.performanceStatus = dto.performanceStatus.trim() || 'Public (Not On Sale)';
        }
        await this.assertPerformanceSlotAvailable(engagementId, perf.performanceDate, perf.performanceTime, performanceId);
        await this.performanceRepo.save(perf);
        await this.enforceOpeningPerformancePublic(engagementId);
    }
    async deletePerformance(engagementId, performanceId) {
        await this.assertEngagementExists(engagementId);
        const perf = await this.performanceRepo.findOne({
            where: { performanceId, engagementId },
        });
        if (!perf) {
            throw new common_1.NotFoundException({
                message: `Performance #${performanceId} not found for engagement #${engagementId}.`,
            });
        }
        const performanceCount = await this.performanceRepo.count({
            where: { engagementId },
        });
        if (performanceCount <= 1) {
            throw new common_1.BadRequestException({
                message: 'This is the only show for this engagement. Use Delete Engagement to remove the engagement and its show.',
            });
        }
        await this.dataSource.transaction(async (manager) => {
            await manager.delete(performance_ticketing_entity_1.PerformanceTicketing, { performanceId });
            await manager.delete(ticketing_sales_entity_1.TicketingSales, { performanceId });
            await manager.delete(performance_entity_1.Performance, { performanceId, engagementId });
        });
        await this.enforceOpeningPerformancePublic(engagementId);
    }
    async listRetailPartners(engagementId) {
        await this.assertEngagementExists(engagementId);
        try {
            const rows = await this.dataSource.query(`SELECT
          erp.[EngagementRetailPartnerID] AS rpid,
          erp.[CompanyID] AS cid,
          c.[CompanyName] AS cname,
          erp.[CompanyTypeID] AS ctid,
          ct.[CompanyTypeName] AS ctname,
          erp.[ContactID] AS contid,
          ci.[FirstName] + N' ' + ci.[LastName] AS contname
         FROM dbo.EngagementRetailPartner erp
         LEFT JOIN dbo.Company c ON c.[CompanyID] = erp.[CompanyID]
         LEFT JOIN dbo.CompanyType ct ON ct.[CompanyTypeID] = erp.[CompanyTypeID]
         LEFT JOIN dbo.Contact con ON con.[ContactID] = erp.[ContactID]
         LEFT JOIN dbo.ContactInfo ci ON ci.[ContactInfoID] = con.[ContactInfoID]
         WHERE erp.[EngagementID] = ${engagementId}
         ORDER BY erp.[EngagementRetailPartnerID]`);
            const toInt = (v) => { const n = Number(v); return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null; };
            const toStr = (v) => (v == null || v === '' ? null : String(v).trim());
            return rows.map((r) => ({
                retailPartnerId: Number(pickRaw(r, 'rpid')),
                engagementId,
                companyId: toInt(pickRaw(r, 'cid')),
                companyName: toStr(pickRaw(r, 'cname')),
                companyTypeId: toInt(pickRaw(r, 'ctid')),
                companyTypeName: toStr(pickRaw(r, 'ctname')),
                contactId: toInt(pickRaw(r, 'contid')),
                contactName: toStr(pickRaw(r, 'contname')),
            }));
        }
        catch {
            return [];
        }
    }
    async addRetailPartner(engagementId, dto) {
        await this.assertEngagementExists(engagementId);
        const companyId = Math.trunc(Number(dto.companyId));
        const company = await this.companyRepo.findOne({ where: { companyId } });
        if (!company) {
            throw new common_1.BadRequestException({ message: `Company #${companyId} not found.` });
        }
        const companyTypeId = dto.companyTypeId != null ? Math.trunc(Number(dto.companyTypeId)) : null;
        const contactId = dto.contactId != null ? Math.trunc(Number(dto.contactId)) : null;
        const companyTypeIdSql = companyTypeId != null ? String(companyTypeId) : 'NULL';
        const contactIdSql = contactId != null ? String(contactId) : 'NULL';
        const r = await this.dataSource.query(`INSERT INTO dbo.EngagementRetailPartner ([EngagementID],[CompanyID],[CompanyTypeID],[ContactID],[created_by],[created_at],[modified_by],[modified_at])
       OUTPUT INSERTED.[EngagementRetailPartnerID] AS rpid
       VALUES (${engagementId}, ${companyId}, ${companyTypeIdSql}, ${contactIdSql}, N'app', GETDATE(), N'app', GETDATE())`);
        const rpid = Number(pickRaw(r?.[0] ?? {}, 'rpid'));
        return { retailPartnerId: rpid };
    }
    async removeRetailPartner(engagementId, retailPartnerId) {
        await this.assertEngagementExists(engagementId);
        const rid = Math.trunc(Number(retailPartnerId));
        if (!Number.isFinite(rid) || rid < 1) {
            throw new common_1.BadRequestException({ message: 'Invalid retail partner ID.' });
        }
        const r = await this.dataSource.query(`DELETE FROM dbo.EngagementRetailPartner
       WHERE [EngagementRetailPartnerID] = ${rid} AND [EngagementID] = ${engagementId}`);
        const affected = r?.[0] ?? 0;
        if ((typeof affected === 'number' ? affected : 0) === 0 && Array.isArray(r) && r.length === 0) {
        }
    }
    async getMarketingMeta(engagementId) {
        const engagement = await this.assertEngagementExists(engagementId);
        const tourId = engagement.tourId;
        let tourMarketingContacts = [];
        try {
            const tourRows = await this.dataSource.query(`SELECT [TalentAgencyCompanyID] AS agencyId FROM dbo.Tour WHERE [TourID] = @0`, [tourId]);
            const agencyId = tourRows?.[0] ? Number(pickRaw(tourRows[0], 'agencyId')) || null : null;
            if (agencyId) {
                const rows = await this.dataSource.query(`SELECT
            ca.[ContactAssignmentID] AS tcid,
            ca.[ContactID] AS cid,
            ci.[FirstName] + N' ' + ci.[LastName] AS cname,
            ca.[RoleID] AS rid,
            r.[RoleName] AS rname
           FROM dbo.ContactAssignment ca
           INNER JOIN dbo.Contact con ON con.[ContactID] = ca.[ContactID]
           INNER JOIN dbo.ContactInfo ci ON ci.[ContactInfoID] = con.[ContactInfoID]
           INNER JOIN dbo.Role r ON r.[RoleID] = ca.[RoleID]
           WHERE ca.[CompanyID] = @0
             AND LOWER(r.[RoleName]) IN (N'marketing director', N'marketing manager')
           ORDER BY r.[RoleName]`, [agencyId]);
                const toInt = (v) => { const n = Number(v); return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null; };
                const toStr = (v) => (v == null || v === '' ? null : String(v).trim());
                tourMarketingContacts = rows.map((r) => ({
                    tourContactId: Number(pickRaw(r, 'tcid')),
                    contactId: Number(pickRaw(r, 'cid')),
                    contactName: toStr(pickRaw(r, 'cname')),
                    roleId: toInt(pickRaw(r, 'rid')),
                    roleName: toStr(pickRaw(r, 'rname')),
                    isPrimary: false,
                }));
            }
        }
        catch { }
        let audienceGender = null;
        try {
            const genderRows = await this.dataSource.query(`SELECT [AudienceGender] AS g FROM dbo.Tour WHERE [TourID] = ${tourId}`);
            const raw = genderRows?.[0] ? pickRaw(genderRows[0], 'g') : null;
            audienceGender = raw != null && raw !== '' ? String(raw).trim() : null;
        }
        catch { }
        let tourAudienceDemographics = [];
        let tourAudienceAgeRange = null;
        try {
            const demoRows = await this.dataSource.query(`SELECT ar.[AgeRangeID] AS ageRangeId, ar.[AgeRangeLabel] AS label, ar.[SortOrder] AS sortOrder
         FROM dbo.TourAudienceAgeRange tar
         INNER JOIN dbo.AgeRange ar ON ar.[AgeRangeID] = tar.[AgeRangeID]
         WHERE tar.[TourID] = ${tourId}
         ORDER BY ar.[SortOrder], ar.[AgeRangeLabel]`);
            tourAudienceDemographics = demoRows.map((r) => ({
                ageRangeId: Number(pickRaw(r, 'ageRangeId') ?? 0),
                ageRangeLabel: String(pickRaw(r, 'label') ?? '').trim(),
                sortOrder: pickRaw(r, 'sortOrder') != null ? Number(pickRaw(r, 'sortOrder')) : null,
            })).filter((d) => d.ageRangeLabel);
            tourAudienceAgeRange = tourAudienceDemographics.length > 0 ? tourAudienceDemographics.map((d) => d.ageRangeLabel).join(', ') : null;
        }
        catch { }
        let mediaMix = [];
        try {
            const mmRows = await this.dataSource.query(`SELECT
          tmm.[TourMediaMixID] AS mmid,
          tmm.[AdvertisingSubTypeID] AS astid,
          ast.[SubTypeName] AS astn,
          ast.[ParentCategory] AS astpc,
          tmm.[CompanyID] AS cid,
          c.[CompanyName] AS cname
         FROM dbo.TourMediaMix tmm
         LEFT JOIN dbo.AdvertisingSubType ast ON ast.[AdvertisingSubTypeID] = tmm.[AdvertisingSubTypeID]
         LEFT JOIN dbo.Company c ON c.[CompanyID] = tmm.[CompanyID]
         WHERE tmm.[TourID] = ${tourId}
         ORDER BY ast.[ParentCategory], ast.[SubTypeName]`);
            const toInt2 = (v) => { const n = Number(v); return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null; };
            const toStr2 = (v) => (v == null || v === '' ? null : String(v).trim());
            mediaMix = mmRows.map((r) => ({
                tourMediaMixId: Number(pickRaw(r, 'mmid')),
                advertisingSubTypeId: Number(pickRaw(r, 'astid')),
                subTypeName: String(pickRaw(r, 'astn') ?? ''),
                parentCategory: toStr2(pickRaw(r, 'astpc')),
                companyId: toInt2(pickRaw(r, 'cid')),
                companyName: toStr2(pickRaw(r, 'cname')),
            }));
        }
        catch { }
        let advertisingSubTypes = [];
        try {
            const astRows = await this.dataSource.query(`SELECT [AdvertisingSubTypeID] AS id, [SubTypeName] AS name, [ParentCategory] AS pc, [IsActive] AS ia
         FROM dbo.AdvertisingSubType WHERE [IsActive] = 1
         ORDER BY [ParentCategory], [SortOrder], [SubTypeName]`);
            advertisingSubTypes = astRows.map((r) => ({
                advertisingSubTypeId: Number(pickRaw(r, 'id')),
                subTypeName: String(pickRaw(r, 'name') ?? ''),
                parentCategory: (pickRaw(r, 'pc') == null || pickRaw(r, 'pc') === '') ? null : String(pickRaw(r, 'pc')).trim(),
                isActive: pickRaw(r, 'ia') === true || pickRaw(r, 'ia') === 1 || pickRaw(r, 'ia') === '1',
            }));
        }
        catch { }
        let iaeMarketingDirectorContactId = null;
        let iaeMarketingDirectorContactName = null;
        let iaeMarketingManagerContactId = null;
        let iaeMarketingManagerContactName = null;
        let iaeMarketingCoordinatorContactId = null;
        let iaeMarketingCoordinatorContactName = null;
        if (await this.engagementHasIaeMarketingCols()) {
            try {
                const rows = await this.dataSource.query(`
          SELECT
            e.[IAEMarketingDirectorContactID] AS dirId,
            dirCI.[FirstName] + N' ' + dirCI.[LastName] AS dirName,
            e.[IAEMarketingManagerContactID] AS mgrId,
            mgrCI.[FirstName] + N' ' + mgrCI.[LastName] AS mgrName,
            e.[IAEMarketingCoordinatorContactID] AS coordId,
            coordCI.[FirstName] + N' ' + coordCI.[LastName] AS coordName
          FROM dbo.Engagement e
          LEFT JOIN dbo.Contact dirC ON dirC.[ContactID] = e.[IAEMarketingDirectorContactID]
          LEFT JOIN dbo.ContactInfo dirCI ON dirCI.[ContactInfoID] = dirC.[ContactInfoID]
          LEFT JOIN dbo.Contact mgrC ON mgrC.[ContactID] = e.[IAEMarketingManagerContactID]
          LEFT JOIN dbo.ContactInfo mgrCI ON mgrCI.[ContactInfoID] = mgrC.[ContactInfoID]
          LEFT JOIN dbo.Contact coordC ON coordC.[ContactID] = e.[IAEMarketingCoordinatorContactID]
          LEFT JOIN dbo.ContactInfo coordCI ON coordCI.[ContactInfoID] = coordC.[ContactInfoID]
          WHERE e.[EngagementID] = ${engagementId}
        `);
                const row = rows?.[0];
                if (row) {
                    const toInt = (v) => { const n = Number(v); return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null; };
                    const toStr = (v) => (v == null || v === '' ? null : String(v).trim());
                    iaeMarketingDirectorContactId = toInt(pickRaw(row, 'dirId'));
                    iaeMarketingDirectorContactName = toStr(pickRaw(row, 'dirName'));
                    iaeMarketingManagerContactId = toInt(pickRaw(row, 'mgrId'));
                    iaeMarketingManagerContactName = toStr(pickRaw(row, 'mgrName'));
                    iaeMarketingCoordinatorContactId = toInt(pickRaw(row, 'coordId'));
                    iaeMarketingCoordinatorContactName = toStr(pickRaw(row, 'coordName'));
                }
            }
            catch { }
        }
        let tourMarketingDirectorContactId = null;
        let tourMarketingDirectorContactName = null;
        let tourMarketingManagerContactId = null;
        let tourMarketingManagerContactName = null;
        if (await this.tourHasMarketingCols()) {
            try {
                const rows = await this.dataSource.query(`
          SELECT
            t.[TourMarketingDirectorContactID] AS dirId,
            dirCI.[FirstName] + N' ' + dirCI.[LastName] AS dirName,
            t.[TourMarketingManagerContactID] AS mgrId,
            mgrCI.[FirstName] + N' ' + mgrCI.[LastName] AS mgrName
          FROM dbo.Tour t
          LEFT JOIN dbo.Contact dirC ON dirC.[ContactID] = t.[TourMarketingDirectorContactID]
          LEFT JOIN dbo.ContactInfo dirCI ON dirCI.[ContactInfoID] = dirC.[ContactInfoID]
          LEFT JOIN dbo.Contact mgrC ON mgrC.[ContactID] = t.[TourMarketingManagerContactID]
          LEFT JOIN dbo.ContactInfo mgrCI ON mgrCI.[ContactInfoID] = mgrC.[ContactInfoID]
          WHERE t.[TourID] = ${tourId}
        `);
                const row = rows?.[0];
                if (row) {
                    const toInt = (v) => { const n = Number(v); return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null; };
                    const toStr = (v) => (v == null || v === '' ? null : String(v).trim());
                    tourMarketingDirectorContactId = toInt(pickRaw(row, 'dirId'));
                    tourMarketingDirectorContactName = toStr(pickRaw(row, 'dirName'));
                    tourMarketingManagerContactId = toInt(pickRaw(row, 'mgrId'));
                    tourMarketingManagerContactName = toStr(pickRaw(row, 'mgrName'));
                }
            }
            catch { }
        }
        return {
            tourMarketingContacts,
            audienceGender,
            tourAudienceDemographics,
            tourAudienceAgeRange,
            mediaMix,
            advertisingSubTypes,
            iaeMarketingDirectorContactId,
            iaeMarketingDirectorContactName,
            iaeMarketingManagerContactId,
            iaeMarketingManagerContactName,
            iaeMarketingCoordinatorContactId,
            iaeMarketingCoordinatorContactName,
            tourMarketingDirectorContactId,
            tourMarketingDirectorContactName,
            tourMarketingManagerContactId,
            tourMarketingManagerContactName,
        };
    }
    async updateIaeMarketingTeam(engagementId, dto) {
        await this.assertEngagementExists(engagementId);
        if (!(await this.engagementHasIaeMarketingCols()))
            return;
        const sets = [];
        if (dto.iaeMarketingDirectorContactId !== undefined) {
            sets.push(`[IAEMarketingDirectorContactID] = ${dto.iaeMarketingDirectorContactId ?? 'NULL'}`);
        }
        if (dto.iaeMarketingManagerContactId !== undefined) {
            sets.push(`[IAEMarketingManagerContactID] = ${dto.iaeMarketingManagerContactId ?? 'NULL'}`);
        }
        if (dto.iaeMarketingCoordinatorContactId !== undefined) {
            sets.push(`[IAEMarketingCoordinatorContactID] = ${dto.iaeMarketingCoordinatorContactId ?? 'NULL'}`);
        }
        if (sets.length === 0)
            return;
        await this.dataSource.query(`UPDATE dbo.Engagement SET ${sets.join(', ')} WHERE [EngagementID] = ${engagementId}`);
    }
    async updateTourMarketingTeam(engagementId, dto) {
        const engagement = await this.assertEngagementExists(engagementId);
        if (!(await this.tourHasMarketingCols()))
            return;
        const sets = [];
        if (dto.tourMarketingDirectorContactId !== undefined) {
            sets.push(`[TourMarketingDirectorContactID] = ${dto.tourMarketingDirectorContactId ?? 'NULL'}`);
        }
        if (dto.tourMarketingManagerContactId !== undefined) {
            sets.push(`[TourMarketingManagerContactID] = ${dto.tourMarketingManagerContactId ?? 'NULL'}`);
        }
        if (sets.length === 0)
            return;
        await this.dataSource.query(`UPDATE dbo.Tour SET ${sets.join(', ')} WHERE [TourID] = ${engagement.tourId}`);
    }
    buildAddressLabel(row) {
        if (!row)
            return null;
        const parts = [
            row['line1'],
            row['line2'],
            row['city'],
            row['state'],
            row['postal'],
            row['country'],
        ]
            .map((v) => (v == null || v === '' ? null : String(v).trim()))
            .filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : null;
    }
    async listEngagementTravel(engagementId) {
        await this.assertEngagementExists(engagementId);
        const travels = await this.engagementTravelRepo.find({
            where: { engagementId },
            order: { engagementTravelId: 'ASC' },
        });
        if (travels.length === 0)
            return [];
        const results = [];
        for (const t of travels) {
            const travelType = String(t.travelType ?? '').trim();
            if (travelType === 'Hotel') {
                const hotel = await this.engagementTravelHotelRepo.findOne({
                    where: { engagementTravelId: t.engagementTravelId },
                });
                const hotelCompanyName = await this.lookupCompanyName(hotel?.hotelCompanyId ?? null);
                const occupantName = await this.lookupContactName(hotel?.occupantContactId ?? null);
                let hotelAddressLine1 = null;
                let hotelAddressCity = null;
                let hotelAddressStateProvince = null;
                let hotelAddressPostalCode = null;
                let hotelAddressCountry = null;
                if (hotel?.hotelCompanyId != null && hotel.hotelCompanyId > 0) {
                    try {
                        const addrRows = await this.dataSource.query(`SELECT a.[AddressLine1] AS l1, a.[City] AS city, a.[StateProvince] AS sp, a.[PostalCode] AS pc, a.[Country] AS ctry
               FROM dbo.Company c
               LEFT JOIN dbo.Address a ON a.[AddressID] = c.[PhysicalAddressID]
               WHERE c.[CompanyID] = @0`, [hotel.hotelCompanyId]);
                        const ar = addrRows?.[0];
                        if (ar) {
                            const ts = (k) => { const v = pickRaw(ar, k); return v == null || v === '' ? null : String(v).trim(); };
                            hotelAddressLine1 = ts('l1');
                            hotelAddressCity = ts('city');
                            hotelAddressStateProvince = ts('sp');
                            hotelAddressPostalCode = ts('pc');
                            hotelAddressCountry = ts('ctry');
                        }
                    }
                    catch { }
                }
                results.push({
                    engagementTravelId: t.engagementTravelId,
                    travelType: 'Hotel',
                    hotel: hotel
                        ? {
                            hotelTravelId: hotel.hotelTravelId,
                            engagementTravelId: t.engagementTravelId,
                            bookedBy: t.bookedBy,
                            hotelCompanyId: hotel.hotelCompanyId,
                            hotelCompanyName,
                            hotelAddressLine1,
                            hotelAddressCity,
                            hotelAddressStateProvince,
                            hotelAddressPostalCode,
                            hotelAddressCountry,
                            numberOfRooms: hotel.numberOfRooms,
                            roomTypes: hotel.roomTypes,
                            checkInDate: hotel.checkInDate,
                            checkOutDate: hotel.checkOutDate,
                            occupantContactId: hotel.occupantContactId,
                            occupantContactName: occupantName,
                        }
                        : null,
                    carServices: [],
                });
            }
            else if (travelType === 'Car') {
                const carServices = await this.engagementTravelCarServiceRepo.find({
                    where: { engagementTravelId: t.engagementTravelId },
                    order: { carServiceTravelId: 'ASC' },
                });
                const csRows = [];
                for (const cs of carServices) {
                    const [origRow, destRow] = await Promise.all([
                        cs.originAddressId
                            ? this.dataSource.query(`SELECT [AddressLine1] AS line1, [AddressLine2] AS line2, [City] AS city, [StateProvince] AS state, [PostalCode] AS postal, [Country] AS country
                   FROM dbo.Address WHERE [AddressID]=@0`, [cs.originAddressId])
                            : null,
                        cs.destinationAddressId
                            ? this.dataSource.query(`SELECT [AddressLine1] AS line1, [AddressLine2] AS line2, [City] AS city, [StateProvince] AS state, [PostalCode] AS postal, [Country] AS country
                   FROM dbo.Address WHERE [AddressID]=@0`, [cs.destinationAddressId])
                            : null,
                    ]);
                    csRows.push({
                        carServiceTravelId: cs.carServiceTravelId,
                        engagementTravelId: t.engagementTravelId,
                        bookedBy: t.bookedBy,
                        originAddressId: cs.originAddressId,
                        originAddressLabel: this.buildAddressLabel(origRow?.[0]),
                        destinationAddressId: cs.destinationAddressId,
                        destinationAddressLabel: this.buildAddressLabel(destRow?.[0]),
                        pickupDateTime: cs.pickupDateTime instanceof Date
                            ? cs.pickupDateTime.toISOString()
                            : cs.pickupDateTime,
                    });
                }
                results.push({
                    engagementTravelId: t.engagementTravelId,
                    travelType: 'Car',
                    hotel: null,
                    carServices: csRows,
                });
            }
        }
        return results;
    }
    async addEngagementTravelHotel(engagementId, dto) {
        await this.assertEngagementExists(engagementId);
        return this.dataSource.transaction(async (manager) => {
            const travel = manager.create(engagement_travel_entity_1.EngagementTravel, {
                engagementId,
                travelType: 'Hotel',
                bookedBy: dto.bookedBy ?? null,
            });
            const savedTravel = await manager.save(engagement_travel_entity_1.EngagementTravel, travel);
            const hotel = manager.create(engagement_travel_hotel_entity_1.EngagementTravelHotel, {
                engagementTravelId: savedTravel.engagementTravelId,
                hotelCompanyId: dto.hotelCompanyId ?? null,
                numberOfRooms: dto.numberOfRooms ?? null,
                roomTypes: dto.roomTypes ?? null,
                checkInDate: dto.checkInDate ?? null,
                checkOutDate: dto.checkOutDate ?? null,
                occupantContactId: dto.occupantContactId ?? null,
            });
            const savedHotel = await manager.save(engagement_travel_hotel_entity_1.EngagementTravelHotel, hotel);
            return {
                engagementTravelId: savedTravel.engagementTravelId,
                hotelTravelId: savedHotel.hotelTravelId,
            };
        });
    }
    async updateEngagementTravelHotel(engagementId, engagementTravelId, dto) {
        await this.assertEngagementExists(engagementId);
        const travel = await this.engagementTravelRepo.findOne({
            where: { engagementTravelId, engagementId },
        });
        if (!travel)
            throw new common_1.NotFoundException({ message: 'Travel record not found for this engagement.' });
        if (travel.travelType !== 'Hotel')
            throw new common_1.BadRequestException({ message: 'Travel record is not a Hotel type.' });
        if (dto.bookedBy !== undefined)
            travel.bookedBy = dto.bookedBy ?? null;
        await this.engagementTravelRepo.save(travel);
        const hotel = await this.engagementTravelHotelRepo.findOne({ where: { engagementTravelId } });
        if (!hotel)
            throw new common_1.NotFoundException({ message: 'Hotel detail record not found.' });
        if (dto.hotelCompanyId !== undefined)
            hotel.hotelCompanyId = dto.hotelCompanyId ?? null;
        if (dto.numberOfRooms !== undefined)
            hotel.numberOfRooms = dto.numberOfRooms ?? null;
        if (dto.roomTypes !== undefined)
            hotel.roomTypes = dto.roomTypes?.slice(0, 255) ?? null;
        if (dto.checkInDate !== undefined)
            hotel.checkInDate = dto.checkInDate ?? null;
        if (dto.checkOutDate !== undefined)
            hotel.checkOutDate = dto.checkOutDate ?? null;
        if (dto.occupantContactId !== undefined)
            hotel.occupantContactId = dto.occupantContactId ?? null;
        await this.engagementTravelHotelRepo.save(hotel);
    }
    async addEngagementTravelCarService(engagementId, dto) {
        await this.assertEngagementExists(engagementId);
        return this.dataSource.transaction(async (manager) => {
            let originAddressId = dto.originAddressId ?? null;
            if (originAddressId == null && dto.originAddress) {
                const addr = manager.create(address_entity_1.Address, {
                    addressLine1: dto.originAddress.addressLine1,
                    addressLine2: dto.originAddress.addressLine2 ?? null,
                    city: dto.originAddress.city,
                    stateProvince: dto.originAddress.stateProvince,
                    postalCode: dto.originAddress.postalCode,
                    country: dto.originAddress.country,
                });
                const saved = await manager.save(address_entity_1.Address, addr);
                originAddressId = saved.addressId;
            }
            let destinationAddressId = dto.destinationAddressId ?? null;
            if (destinationAddressId == null && dto.destinationAddress) {
                const addr = manager.create(address_entity_1.Address, {
                    addressLine1: dto.destinationAddress.addressLine1,
                    addressLine2: dto.destinationAddress.addressLine2 ?? null,
                    city: dto.destinationAddress.city,
                    stateProvince: dto.destinationAddress.stateProvince,
                    postalCode: dto.destinationAddress.postalCode,
                    country: dto.destinationAddress.country,
                });
                const saved = await manager.save(address_entity_1.Address, addr);
                destinationAddressId = saved.addressId;
            }
            const travel = manager.create(engagement_travel_entity_1.EngagementTravel, {
                engagementId,
                travelType: 'Car',
                bookedBy: dto.bookedBy ?? null,
            });
            const savedTravel = await manager.save(engagement_travel_entity_1.EngagementTravel, travel);
            const cs = manager.create(engagement_travel_car_service_entity_1.EngagementTravelCarService, {
                engagementTravelId: savedTravel.engagementTravelId,
                originAddressId,
                destinationAddressId,
                pickupDateTime: dto.pickupDateTime ? new Date(dto.pickupDateTime) : null,
            });
            const savedCs = await manager.save(engagement_travel_car_service_entity_1.EngagementTravelCarService, cs);
            return {
                engagementTravelId: savedTravel.engagementTravelId,
                carServiceTravelId: savedCs.carServiceTravelId,
            };
        });
    }
    async updateEngagementTravelCarService(engagementId, carServiceTravelId, dto) {
        await this.assertEngagementExists(engagementId);
        const cs = await this.engagementTravelCarServiceRepo.findOne({
            where: { carServiceTravelId },
        });
        if (!cs)
            throw new common_1.NotFoundException({ message: 'Car service record not found.' });
        const travel = await this.engagementTravelRepo.findOne({
            where: { engagementTravelId: cs.engagementTravelId, engagementId },
        });
        if (!travel)
            throw new common_1.NotFoundException({ message: 'Travel record not found for this engagement.' });
        if (dto.bookedBy !== undefined) {
            travel.bookedBy = dto.bookedBy ?? null;
            await this.engagementTravelRepo.save(travel);
        }
        await this.dataSource.transaction(async (manager) => {
            if (dto.originAddressId !== undefined) {
                cs.originAddressId = dto.originAddressId ?? null;
            }
            else if (dto.originAddress) {
                const addr = manager.create(address_entity_1.Address, {
                    addressLine1: dto.originAddress.addressLine1,
                    addressLine2: dto.originAddress.addressLine2 ?? null,
                    city: dto.originAddress.city,
                    stateProvince: dto.originAddress.stateProvince,
                    postalCode: dto.originAddress.postalCode,
                    country: dto.originAddress.country,
                });
                const saved = await manager.save(address_entity_1.Address, addr);
                cs.originAddressId = saved.addressId;
            }
            if (dto.destinationAddressId !== undefined) {
                cs.destinationAddressId = dto.destinationAddressId ?? null;
            }
            else if (dto.destinationAddress) {
                const addr = manager.create(address_entity_1.Address, {
                    addressLine1: dto.destinationAddress.addressLine1,
                    addressLine2: dto.destinationAddress.addressLine2 ?? null,
                    city: dto.destinationAddress.city,
                    stateProvince: dto.destinationAddress.stateProvince,
                    postalCode: dto.destinationAddress.postalCode,
                    country: dto.destinationAddress.country,
                });
                const saved = await manager.save(address_entity_1.Address, addr);
                cs.destinationAddressId = saved.addressId;
            }
            if (dto.pickupDateTime !== undefined) {
                cs.pickupDateTime = dto.pickupDateTime ? new Date(dto.pickupDateTime) : null;
            }
            await manager.save(engagement_travel_car_service_entity_1.EngagementTravelCarService, cs);
        });
    }
    async deleteEngagementTravel(engagementId, engagementTravelId) {
        await this.assertEngagementExists(engagementId);
        const travel = await this.engagementTravelRepo.findOne({
            where: { engagementTravelId, engagementId },
        });
        if (!travel)
            throw new common_1.NotFoundException({ message: 'Travel record not found for this engagement.' });
        await this.dataSource.transaction(async (manager) => {
            if (travel.travelType === 'Hotel') {
                await manager.delete(engagement_travel_hotel_entity_1.EngagementTravelHotel, { engagementTravelId });
            }
            else if (travel.travelType === 'Car') {
                await manager.delete(engagement_travel_car_service_entity_1.EngagementTravelCarService, { engagementTravelId });
            }
            await manager.delete(engagement_travel_entity_1.EngagementTravel, { engagementTravelId });
        });
    }
    async getEngagementPartner(engagementId) {
        await this.assertEngagementExists(engagementId);
        try {
            const rows = await this.dataSource.query(`SELECT TOP 1
          ep.[PartnerCompanyID] AS compId,
          c.[CompanyName] AS compName,
          ep.[PartnerContactID] AS contId,
          ci.[FirstName] + N' ' + ci.[LastName] AS contName
         FROM dbo.EngagementPartner ep
         LEFT JOIN dbo.Company c ON c.[CompanyID] = ep.[PartnerCompanyID]
         LEFT JOIN dbo.Contact con ON con.[ContactID] = ep.[PartnerContactID]
         LEFT JOIN dbo.ContactInfo ci ON ci.[ContactInfoID] = con.[ContactInfoID]
         WHERE ep.[EngagementID] = ${Math.trunc(Number(engagementId))}
         ORDER BY ep.[EngagementPartnerID]`);
            const row = rows?.[0];
            if (!row)
                return { partnerCompanyId: null, partnerCompanyName: null, partnerContactId: null, partnerContactName: null };
            const toInt = (v) => { const n = Number(v); return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null; };
            const toStr = (v) => (v == null || v === '' ? null : String(v).trim());
            return {
                partnerCompanyId: toInt(pickRaw(row, 'compId')),
                partnerCompanyName: toStr(pickRaw(row, 'compName')),
                partnerContactId: toInt(pickRaw(row, 'contId')),
                partnerContactName: toStr(pickRaw(row, 'contName')),
            };
        }
        catch {
            return { partnerCompanyId: null, partnerCompanyName: null, partnerContactId: null, partnerContactName: null };
        }
    }
    async upsertEngagementPartner(engagementId, dto) {
        await this.assertEngagementExists(engagementId);
        const eid = Math.trunc(Number(engagementId));
        if (dto.partnerCompanyId == null || !Number.isFinite(Number(dto.partnerCompanyId)) || Number(dto.partnerCompanyId) < 1) {
            throw new common_1.BadRequestException({ message: 'partnerCompanyId is required.' });
        }
        const compSql = String(Math.trunc(Number(dto.partnerCompanyId)));
        const contSql = dto.partnerContactId != null ? String(Math.trunc(Number(dto.partnerContactId))) : 'NULL';
        const existing = await this.dataSource.query(`SELECT [EngagementPartnerID] FROM dbo.EngagementPartner WHERE [EngagementID] = ${eid}`);
        if (existing.length > 0) {
            await this.dataSource.query(`UPDATE dbo.EngagementPartner
         SET [PartnerCompanyID] = ${compSql},
             [PartnerContactID] = ${contSql},
             [modified_by] = N'app',
             [modified_at] = GETDATE()
         WHERE [EngagementID] = ${eid}`);
        }
        else {
            await this.dataSource.query(`INSERT INTO dbo.EngagementPartner ([EngagementID],[PartnerCompanyID],[PartnerContactID],[created_by],[created_at],[modified_by],[modified_at])
         VALUES (${eid}, ${compSql}, ${contSql}, N'app', GETDATE(), N'app', GETDATE())`);
        }
    }
    async getDepositTerms(engagementId) {
        await this.assertEngagementExists(engagementId);
        try {
            const rows = await this.dataSource.query(`SELECT TOP 1 pc.[DepositAmount] AS depositAmount,
                CONVERT(varchar(10), pc.[DepositDueDate], 120) AS depositDueDate
         FROM dbo.PerformanceContracts pc
         WHERE pc.EngagementID = ${Math.trunc(engagementId)}
         ORDER BY pc.[ContractID] DESC`);
            const row = rows?.[0];
            if (!row)
                return { depositAmount: null, depositDueDate: null };
            const rawAmt = row.depositAmount ?? row.DepositAmount ?? null;
            const rawDate = row.depositDueDate ?? row.DepositDueDate ?? null;
            return {
                depositAmount: rawAmt != null && rawAmt !== '' ? Number(rawAmt) : null,
                depositDueDate: rawDate != null && rawDate !== '' ? String(rawDate).trim().slice(0, 10) : null,
            };
        }
        catch {
            return { depositAmount: null, depositDueDate: null };
        }
    }
    async updateDepositTerms(engagementId, dto) {
        await this.assertEngagementExists(engagementId);
        const eid = Math.trunc(engagementId);
        const existing = await this.dataSource.query(`SELECT TOP 1 [ContractID] FROM dbo.PerformanceContracts WHERE [EngagementID] = ${eid}`);
        const exists = existing?.length > 0;
        const sets = [];
        if (dto.depositAmount !== undefined) {
            sets.push(`[DepositAmount] = ${dto.depositAmount == null ? 'NULL' : Number(dto.depositAmount)}`);
        }
        if (dto.depositDueDate !== undefined) {
            sets.push(`[DepositDueDate] = ${dto.depositDueDate == null || dto.depositDueDate.trim() === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(dto.depositDueDate.trim().slice(0, 10))}`);
        }
        if (!sets.length)
            return;
        if (exists) {
            await this.dataSource.query(`UPDATE dbo.PerformanceContracts SET ${sets.join(', ')} WHERE [EngagementID] = ${eid}`);
        }
        else {
            const cols = ['[EngagementID]'];
            const vals = [String(eid)];
            if (dto.depositAmount !== undefined) {
                cols.push('[DepositAmount]');
                vals.push(dto.depositAmount == null ? 'NULL' : String(Number(dto.depositAmount)));
            }
            if (dto.depositDueDate !== undefined) {
                cols.push('[DepositDueDate]');
                vals.push(dto.depositDueDate == null || dto.depositDueDate.trim() === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(dto.depositDueDate.trim().slice(0, 10)));
            }
            await this.dataSource.query(`INSERT INTO dbo.PerformanceContracts (${cols.join(', ')}) VALUES (${vals.join(', ')})`);
        }
    }
    async getPerformanceContracts(engagementId) {
        await this.assertEngagementExists(engagementId);
        const eid = Math.trunc(engagementId);
        const rows = await this.dataSource.query(`SELECT [ContractID] AS contractId,
              [CreatedAt] AS createdAt,
              [EngagementID] AS engagementId,
              [Agency] AS agency,
              [Agent] AS agent,
              [Attraction] AS attraction,
              [VenueName] AS venueName,
              [VenueAddress] AS venueAddress,
              [VenueCity] AS venueCity,
              [VenueState] AS venueState,
              [VenueCountry] AS venueCountry,
              [Producer] AS producer,
              [ProducerAddress] AS producerAddress,
              [ProducerFedID] AS producerFedId,
              [GuaranteeAmount] AS guaranteeAmount,
              [GuaranteeCurrency] AS guaranteeCurrency,
              [DepositAmount] AS depositAmount,
              CONVERT(varchar(10), [DepositDueDate], 120) AS depositDueDate,
              [BalanceAmount] AS balanceAmount,
              CONVERT(varchar(10), [BalanceDueDate], 120) AS balanceDueDate,
              [RoyaltyDescription] AS royaltyDescription,
              [OverageDescription] AS overageDescription,
              [PaymentTerms] AS paymentTerms,
              [PaymentMethodType] AS paymentMethodType,
              [PaymentPayableTo] AS paymentPayableTo,
              [PaymentBankName] AS paymentBankName,
              [Performances] AS performances,
              [AdditionallyInsured] AS additionallyInsured,
              [AnnotatedPdfBlobName] AS annotatedPdfBlobName,
              [OriginalFilename] AS originalFilename,
              [OneDrivePdfUrl] AS oneDrivePdfUrl
       FROM dbo.PerformanceContracts
       WHERE [EngagementID] = ${eid}
       ORDER BY [ContractID] DESC`);
        return rows.map((r) => ({
            ...r,
            guaranteeAmount: r.guaranteeAmount != null ? Number(r.guaranteeAmount) : null,
            depositAmount: r.depositAmount != null ? Number(r.depositAmount) : null,
            balanceAmount: r.balanceAmount != null ? Number(r.balanceAmount) : null,
        }));
    }
    async savePerformanceContract(engagementId, dto) {
        await this.assertEngagementExists(engagementId);
        const eid = Math.trunc(engagementId);
        const cols = ['[EngagementID]', '[CreatedAt]'];
        const vals = [String(eid), 'GETDATE()'];
        const addCol = (col, val, maxLen) => {
            if (val === undefined)
                return;
            if (val === null || (typeof val === 'string' && val.trim() === '')) {
                cols.push(`[${col}]`);
                vals.push('NULL');
            }
            else if (typeof val === 'number') {
                cols.push(`[${col}]`);
                vals.push(String(val));
            }
            else {
                cols.push(`[${col}]`);
                vals.push(this.escapeSqlNVarCharLiteral(String(val).trim().slice(0, maxLen ?? 2048)));
            }
        };
        addCol('Agency', dto.agency, 255);
        addCol('Agent', dto.agent, 255);
        addCol('Attraction', dto.attraction, 255);
        addCol('VenueName', dto.venueName, 255);
        addCol('VenueAddress', dto.venueAddress, 500);
        addCol('VenueCity', dto.venueCity, 100);
        addCol('VenueState', dto.venueState, 100);
        addCol('VenueCountry', dto.venueCountry, 100);
        addCol('Producer', dto.producer, 255);
        addCol('ProducerAddress', dto.producerAddress, 500);
        addCol('ProducerFedID', dto.producerFedId, 50);
        addCol('GuaranteeAmount', dto.guaranteeAmount);
        addCol('GuaranteeCurrency', dto.guaranteeCurrency, 10);
        addCol('DepositAmount', dto.depositAmount);
        addCol('DepositDueDate', dto.depositDueDate, 10);
        addCol('BalanceAmount', dto.balanceAmount);
        addCol('BalanceDueDate', dto.balanceDueDate, 10);
        addCol('RoyaltyDescription', dto.royaltyDescription, 8000);
        addCol('OverageDescription', dto.overageDescription, 8000);
        addCol('PaymentTerms', dto.paymentTerms, 8000);
        addCol('PaymentMethodType', dto.paymentMethodType, 100);
        addCol('PaymentPayableTo', dto.paymentPayableTo, 255);
        addCol('PaymentBankName', dto.paymentBankName, 255);
        addCol('Performances', dto.performances, 8000);
        addCol('AdditionallyInsured', dto.additionallyInsured, 8000);
        addCol('AnnotatedPdfBlobName', dto.annotatedPdfBlobName, 500);
        addCol('OriginalFilename', dto.originalFilename, 500);
        addCol('OneDrivePdfUrl', dto.oneDrivePdfUrl, 1000);
        const result = await this.dataSource.query(`INSERT INTO dbo.PerformanceContracts (${cols.join(', ')}) OUTPUT INSERTED.[ContractID] AS contractId VALUES (${vals.join(', ')})`);
        const contractId = result?.[0]?.contractId;
        return { contractId: Number(contractId) };
    }
    async updatePerformanceContract(engagementId, contractId, dto) {
        await this.assertEngagementExists(engagementId);
        const eid = Math.trunc(engagementId);
        const cid = Math.trunc(contractId);
        const sets = [];
        const addSet = (col, val, maxLen) => {
            if (val === undefined)
                return;
            if (val === null || (typeof val === 'string' && val.trim() === '')) {
                sets.push(`[${col}] = NULL`);
            }
            else if (typeof val === 'number') {
                sets.push(`[${col}] = ${val}`);
            }
            else {
                sets.push(`[${col}] = ${this.escapeSqlNVarCharLiteral(String(val).trim().slice(0, maxLen ?? 2048))}`);
            }
        };
        addSet('Agency', dto.agency, 255);
        addSet('Agent', dto.agent, 255);
        addSet('Attraction', dto.attraction, 255);
        addSet('VenueName', dto.venueName, 255);
        addSet('VenueAddress', dto.venueAddress, 500);
        addSet('VenueCity', dto.venueCity, 100);
        addSet('VenueState', dto.venueState, 100);
        addSet('VenueCountry', dto.venueCountry, 100);
        addSet('Producer', dto.producer, 255);
        addSet('ProducerAddress', dto.producerAddress, 500);
        addSet('ProducerFedID', dto.producerFedId, 50);
        addSet('GuaranteeAmount', dto.guaranteeAmount);
        addSet('GuaranteeCurrency', dto.guaranteeCurrency, 10);
        addSet('DepositAmount', dto.depositAmount);
        addSet('DepositDueDate', dto.depositDueDate, 10);
        addSet('BalanceAmount', dto.balanceAmount);
        addSet('BalanceDueDate', dto.balanceDueDate, 10);
        addSet('RoyaltyDescription', dto.royaltyDescription, 8000);
        addSet('OverageDescription', dto.overageDescription, 8000);
        addSet('PaymentTerms', dto.paymentTerms, 8000);
        addSet('PaymentMethodType', dto.paymentMethodType, 100);
        addSet('PaymentPayableTo', dto.paymentPayableTo, 255);
        addSet('PaymentBankName', dto.paymentBankName, 255);
        addSet('Performances', dto.performances, 8000);
        addSet('AdditionallyInsured', dto.additionallyInsured, 8000);
        addSet('AnnotatedPdfBlobName', dto.annotatedPdfBlobName, 500);
        addSet('OriginalFilename', dto.originalFilename, 500);
        addSet('OneDrivePdfUrl', dto.oneDrivePdfUrl, 1000);
        if (sets.length === 0)
            return;
        await this.dataSource.query(`UPDATE dbo.PerformanceContracts SET ${sets.join(', ')} WHERE [ContractID] = ${cid} AND [EngagementID] = ${eid}`);
    }
    async deletePerformanceContract(engagementId, contractId) {
        await this.assertEngagementExists(engagementId);
        await this.dataSource.query(`DELETE FROM dbo.PerformanceContracts WHERE [ContractID] = ${Math.trunc(contractId)} AND [EngagementID] = ${Math.trunc(engagementId)}`);
    }
};
exports.EngagementService = EngagementService;
exports.EngagementService = EngagementService = EngagementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(engagement_entity_1.Engagement)),
    __param(1, (0, typeorm_1.InjectRepository)(engagement_finance_entity_1.EngagementFinances)),
    __param(2, (0, typeorm_1.InjectRepository)(engagement_venue_entity_1.EngagementVenue)),
    __param(3, (0, typeorm_1.InjectRepository)(engagement_production_entity_1.EngagementProduction)),
    __param(4, (0, typeorm_1.InjectRepository)(tour_entity_1.Tour)),
    __param(5, (0, typeorm_1.InjectRepository)(venue_entity_1.Venue)),
    __param(6, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __param(7, (0, typeorm_1.InjectRepository)(venue_service_provider_entity_1.VenueServiceProvider)),
    __param(8, (0, typeorm_1.InjectRepository)(company_service_entity_1.CompanyService)),
    __param(9, (0, typeorm_1.InjectRepository)(service_provided_entity_1.ServiceProvided)),
    __param(10, (0, typeorm_1.InjectRepository)(performance_entity_1.Performance)),
    __param(11, (0, typeorm_1.InjectRepository)(performance_ticketing_entity_1.PerformanceTicketing)),
    __param(12, (0, typeorm_1.InjectRepository)(link_entity_1.Link)),
    __param(13, (0, typeorm_1.InjectRepository)(engagement_iae_contact_entity_1.EngagementIAEContact)),
    __param(14, (0, typeorm_1.InjectRepository)(contact_entity_1.Contact)),
    __param(15, (0, typeorm_1.InjectRepository)(contact_info_entity_1.ContactInfo)),
    __param(16, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __param(17, (0, typeorm_1.InjectRepository)(department_entity_1.Department)),
    __param(18, (0, typeorm_1.InjectRepository)(non_resident_withholding_entity_1.NonResidentWithholding)),
    __param(19, (0, typeorm_1.InjectRepository)(artist_finance_entity_1.ArtistFinance)),
    __param(20, (0, typeorm_1.InjectRepository)(settlement_finance_entity_1.SettlementFinance)),
    __param(21, (0, typeorm_1.InjectRepository)(engagement_travel_entity_1.EngagementTravel)),
    __param(22, (0, typeorm_1.InjectRepository)(engagement_travel_car_service_entity_1.EngagementTravelCarService)),
    __param(23, (0, typeorm_1.InjectRepository)(engagement_travel_hotel_entity_1.EngagementTravelHotel)),
    __param(24, (0, typeorm_1.InjectRepository)(engagement_link_entity_1.EngagementLink)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        ems_app_created_store_1.EmsAppCreatedStore,
        typeorm_2.DataSource,
        audit_request_context_service_1.AuditRequestContext,
        document_library_service_1.DocumentLibraryService])
], EngagementService);
//# sourceMappingURL=engagement.service.js.map