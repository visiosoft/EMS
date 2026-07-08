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
var DailySalesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailySalesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const address_entity_1 = require("../entities/address.entity");
const attraction_entity_1 = require("../entities/attraction.entity");
const class_entity_1 = require("../entities/class.entity");
const company_entity_1 = require("../entities/company.entity");
const contact_entity_1 = require("../entities/contact.entity");
const contact_assignment_entity_1 = require("../entities/contact-assignment.entity");
const engagement_entity_1 = require("../entities/engagement.entity");
const engagement_venue_entity_1 = require("../entities/engagement-venue.entity");
const performance_entity_1 = require("../entities/performance.entity");
const performance_ticketing_entity_1 = require("../entities/performance-ticketing.entity");
const ticketing_sales_entity_1 = require("../entities/ticketing-sales.entity");
const tour_entity_1 = require("../entities/tour.entity");
const venue_entity_1 = require("../entities/venue.entity");
const audit_request_context_service_1 = require("../audit/audit-request-context.service");
const engagement_service_1 = require("../engagements/engagement.service");
const engagement_status_util_1 = require("../engagements/engagement-status.util");
function ymdAddDays(ymd, delta) {
    const [y, m, d] = ymd.split('-').map(Number);
    if (!y || !m || !d)
        return ymd;
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + delta);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function numOrZero(v) {
    if (v == null || v === '')
        return 0;
    if (typeof v === 'object' && v !== null && 'toString' in v) {
        const s = v.toString();
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : 0;
    }
    return typeof v === 'number' && Number.isFinite(v)
        ? v
        : parseFloat(String(v)) || 0;
}
function pickRow(row, name) {
    if (row == null)
        return undefined;
    if (name in row)
        return row[name];
    const l = name.toLowerCase();
    for (const k of Object.keys(row)) {
        if (k.toLowerCase() === l)
            return row[k];
    }
    return undefined;
}
function parsePositiveIntCsv(raw) {
    if (!raw)
        return [];
    const out = new Set();
    for (const token of raw.split(',')) {
        const n = Number(token.trim());
        if (Number.isInteger(n) && n > 0)
            out.add(n);
    }
    return [...out];
}
function toYmdString(v) {
    if (v == null || v === '')
        return '';
    if (v instanceof Date) {
        if (Number.isNaN(v.getTime()))
            return '';
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const s = String(v).trim();
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
}
function timeToHhmmss(v) {
    if (v == null || v === '')
        return null;
    const s = String(v).trim();
    const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
        const h = String(Math.min(23, Math.max(0, parseInt(m[1], 10)))).padStart(2, '0');
        const min = m[2].padStart(2, '0');
        const sec = (m[3] ?? '00').padStart(2, '0');
        return `${h}:${min}:${sec}`;
    }
    return null;
}
function venueLabelFromEngagement(e) {
    const vn = e.venueName?.trim();
    const cn = e.venueCompanyName?.trim();
    if (vn)
        return vn;
    if (cn)
        return cn;
    return '—';
}
function totalsForReportingDay(perfIds, byPerf, day) {
    let tickets = 0;
    let revenue = 0;
    for (const pid of perfIds) {
        const rows = [...(byPerf.get(pid) ?? [])].sort((a, b) => a.salesDate.localeCompare(b.salesDate));
        let latest = null;
        for (const row of rows) {
            if (row.salesDate > day)
                break;
            latest = row;
        }
        if (latest) {
            tickets += latest.tickets;
            revenue += latest.revenue;
        }
    }
    return { tickets, revenue };
}
function pctVsCap(total, cap) {
    if (!(cap > 0) || !Number.isFinite(total))
        return 0;
    return (total / cap) * 100;
}
function seatsRemainingDisplay(cap, totalTickets) {
    return Math.max(0, cap - totalTickets);
}
function revenueRemainingDisplay(potential, totalRevenue) {
    return Math.max(0, potential - totalRevenue);
}
function buildDailySeries(asOf, perfIds, byPerf) {
    let minD = null;
    const cursors = new Map();
    for (const pid of perfIds) {
        const rows = [...(byPerf.get(pid) ?? [])].sort((a, b) => a.salesDate.localeCompare(b.salesDate));
        if (!rows?.length)
            continue;
        for (const r of rows) {
            if (!minD || r.salesDate < minD)
                minD = r.salesDate;
        }
        cursors.set(pid, { rows, index: 0, tickets: 0, revenue: 0 });
    }
    if (!minD) {
        return [
            {
                date: asOf,
                totalTickets: 0,
                totalRevenue: 0,
                dailyTickets: 0,
                dailyRevenue: 0,
            },
        ];
    }
    const out = [];
    let prevTickets = 0;
    let prevRevenue = 0;
    for (let d = minD; d <= asOf; d = ymdAddDays(d, 1)) {
        let totalTickets = 0;
        let totalRevenue = 0;
        for (const cursor of cursors.values()) {
            while (cursor.index < cursor.rows.length &&
                cursor.rows[cursor.index].salesDate <= d) {
                const row = cursor.rows[cursor.index];
                cursor.tickets = row.tickets;
                cursor.revenue = row.revenue;
                cursor.index += 1;
            }
            totalTickets += cursor.tickets;
            totalRevenue += cursor.revenue;
        }
        const dayT = Math.max(0, totalTickets - prevTickets);
        const dayR = Math.max(0, totalRevenue - prevRevenue);
        out.push({
            date: d,
            totalTickets,
            totalRevenue,
            dailyTickets: dayT,
            dailyRevenue: dayR,
        });
        prevTickets = totalTickets;
        prevRevenue = totalRevenue;
    }
    return out;
}
let DailySalesService = DailySalesService_1 = class DailySalesService {
    salesRepo;
    performanceRepo;
    performanceTicketingRepo;
    engagementRepo;
    attractionRepo;
    contactRepo;
    engagementService;
    auditContext;
    logger = new common_1.Logger(DailySalesService_1.name);
    lastConvertedProjectPerformanceRepairAt = 0;
    constructor(salesRepo, performanceRepo, performanceTicketingRepo, engagementRepo, attractionRepo, contactRepo, engagementService, auditContext) {
        this.salesRepo = salesRepo;
        this.performanceRepo = performanceRepo;
        this.performanceTicketingRepo = performanceTicketingRepo;
        this.engagementRepo = engagementRepo;
        this.attractionRepo = attractionRepo;
        this.contactRepo = contactRepo;
        this.engagementService = engagementService;
        this.auditContext = auditContext;
    }
    async ensureConvertedProjectPerformancesFromOptions() {
        const now = Date.now();
        if (now - this.lastConvertedProjectPerformanceRepairAt < 30_000)
            return;
        this.lastConvertedProjectPerformanceRepairAt = now;
        try {
            const rows = await this.performanceRepo.manager.query(`
        ;WITH ConvertedProject AS (
          SELECT
            e.EngagementID,
            ep.EngagementProjectID
          FROM dbo.Engagement e
          INNER JOIN dbo.EngagementXref x
            ON x.EngagementID = e.EngagementID
          INNER JOIN dbo.EngagementProject ep
            ON x.SourceEngagementID = CONCAT(N'EngagementProject:', CONVERT(nvarchar(30), ep.EngagementProjectID))
        ),
        Candidate AS (
          SELECT DISTINCT
            cp.EngagementID,
            CONVERT(date, po.ProposedDate) AS PerformanceDate,
            COALESCE(CONVERT(time, po.ProposedTime), CONVERT(time, '20:00:00')) AS PerformanceTime,
            CASE
              WHEN po.OptionStatus = N'Private' THEN N'Private (Not Announced)'
              WHEN po.OptionStatus = N'Public' THEN N'Public (Not On Sale)'
              ELSE N'Public (Not On Sale)'
            END AS TicketingStatus
          FROM ConvertedProject cp
          INNER JOIN dbo.EngagementProjectPerformanceOption po
            ON po.EngagementProjectID = cp.EngagementProjectID
          WHERE po.ProposedDate IS NOT NULL
            AND (
              po.EngagementProjectVenueID IS NULL
              OR EXISTS (
                SELECT 1
                FROM dbo.EngagementProjectVenue epv
                INNER JOIN dbo.EngagementVenue ev
                  ON ev.EngagementID = cp.EngagementID
                 AND ev.VenueCompanyID = epv.VenueCompanyID
                WHERE epv.EngagementProjectVenueID = po.EngagementProjectVenueID
              )
            )
        )
        INSERT INTO dbo.Performance (
          EngagementID,
          TicketingStatus,
          PerformanceDate,
          PerformanceTime,
          created_by,
          created_at
        )
        SELECT
          c.EngagementID,
          c.TicketingStatus,
          c.PerformanceDate,
          c.PerformanceTime,
          N'system',
          GETUTCDATE()
        FROM Candidate c
        WHERE NOT EXISTS (
          SELECT 1
          FROM dbo.Performance p
          WHERE p.EngagementID = c.EngagementID
            AND CONVERT(date, p.PerformanceDate) = c.PerformanceDate
            AND CONVERT(time, p.PerformanceTime) = c.PerformanceTime
        );

        SELECT @@ROWCOUNT AS insertedCount;
      `);
            const inserted = Number(rows?.[0]?.insertedCount ?? 0);
            if (inserted > 0) {
                this.logger.log(`Backfilled ${inserted} missing performance row(s) for converted project engagement(s).`);
            }
        }
        catch (error) {
            this.lastConvertedProjectPerformanceRepairAt = 0;
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Could not repair converted-project performance rows for Daily Sales: ${message}`);
        }
    }
    async getMarketingWindowForPerformances(perfIds) {
        if (perfIds.length === 0) {
            return { preSaleDate: null, onSaleDate: null };
        }
        const rows = [];
        const chunkSize = 1000;
        for (let i = 0; i < perfIds.length; i += chunkSize) {
            const chunk = perfIds.slice(i, i + chunkSize);
            const chunkRows = await this.performanceTicketingRepo.find({
                where: { performanceId: (0, typeorm_2.In)(chunk) },
                order: { performanceId: 'ASC', ticketingId: 'ASC' },
            });
            rows.push(...chunkRows);
        }
        rows.sort((a, b) => {
            if (a.performanceId !== b.performanceId) {
                return a.performanceId - b.performanceId;
            }
            return a.ticketingId - b.ticketingId;
        });
        const firstByPerformance = new Map();
        for (const row of rows) {
            if (!firstByPerformance.has(row.performanceId)) {
                firstByPerformance.set(row.performanceId, row);
            }
        }
        const preSaleDates = [];
        const onSaleDates = [];
        for (const row of firstByPerformance.values()) {
            const preSaleDate = toYmdString(row.preSaleDate);
            const onSaleDate = toYmdString(row.onSaleDate);
            if (/^\d{4}-\d{2}-\d{2}$/.test(preSaleDate)) {
                preSaleDates.push(preSaleDate);
            }
            if (/^\d{4}-\d{2}-\d{2}$/.test(onSaleDate)) {
                onSaleDates.push(onSaleDate);
            }
        }
        return {
            preSaleDate: preSaleDates.sort()[0] ?? null,
            onSaleDate: onSaleDates.sort()[0] ?? null,
        };
    }
    searchTokens(value) {
        return [
            ...new Set(String(value ?? '')
                .trim()
                .toLowerCase()
                .split(/[^a-z0-9]+/)
                .map((token) => token.trim())
                .filter(Boolean)),
        ].slice(0, 8);
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
    async findAll(engagementId) {
        await this.ensureConvertedProjectPerformancesFromOptions();
        const qb = this.salesRepo
            .createQueryBuilder('ts')
            .innerJoin(performance_entity_1.Performance, 'p', 'p.performanceId = ts.performanceId')
            .innerJoin(engagement_entity_1.Engagement, 'e', 'e.engagementId = p.engagementId')
            .leftJoin(tour_entity_1.Tour, 't', 't.tourId = e.tourId')
            .leftJoin(attraction_entity_1.Attraction, 'a', 'a.attractionId = t.attractionId')
            .leftJoin(engagement_venue_entity_1.EngagementVenue, 'ev', 'ev.engagementId = e.engagementId AND ev.isPrimary = :prim', { prim: true })
            .leftJoin(venue_entity_1.Venue, 'v', 'v.companyId = ev.venueCompanyId')
            .leftJoin(company_entity_1.Company, 'vc', 'vc.companyId = ev.venueCompanyId')
            .leftJoin(address_entity_1.Address, 'addr', 'addr.addressId = vc.physicalAddressId')
            .leftJoin('vc.dma', 'dma')
            .select([
            'ts.performanceId                                        AS performanceId',
            'p.engagementId                                         AS engagementId',
            'CONVERT(varchar(10), ts.salesDate, 120)                AS salesDate',
            'CONVERT(varchar(10), p.performanceDate, 120)           AS performanceDate',
            'CONVERT(varchar(8),  p.performanceTime, 108)           AS performanceTime',
            'p.performanceStatus                                     AS performanceStatus',
            'e.engagementStatus                                      AS engagementStatus',
            'ts.performanceSalesQuantity                             AS ticketsSold',
            'ts.performanceSalesRevenue                              AS revenue',
            'e.tourId                                                AS tourId',
            't.tourName                                              AS tourName',
            't.attractionId                                          AS attractionId',
            'a.attractionName                                        AS attractionName',
            'ev.venueCompanyId                                       AS venueCompanyId',
            'vc.companyName                                          AS venueCompanyName',
            'v.venueName                                             AS venueName',
            'addr.city                                               AS city',
            'addr.stateProvince                                      AS stateProvince',
            'dma.marketName                                          AS dmaMarketName',
        ])
            .orderBy('ts.salesDate', 'DESC')
            .addOrderBy('p.performanceDate', 'ASC');
        if (engagementId !== undefined && !isNaN(engagementId)) {
            qb.andWhere('e.engagementId = :engagementId', { engagementId });
        }
        const raw = await qb.getRawMany();
        return raw.map((r) => ({
            performanceId: Number(r['performanceId']),
            engagementId: Number(r['engagementId']),
            salesDate: String(r['salesDate'] ?? ''),
            performanceDate: String(r['performanceDate'] ?? ''),
            performanceTime: String(r['performanceTime'] ?? ''),
            performanceStatus: String(r['performanceStatus'] ?? ''),
            engagementStatus: (0, engagement_status_util_1.normalizeEngagementStatus)(String(r['engagementStatus'] ?? '')),
            ticketsSold: r['ticketsSold'] != null ? Number(r['ticketsSold']) : null,
            revenue: r['revenue'] != null ? Number(r['revenue']) : null,
            tourId: r['tourId'] != null ? Number(r['tourId']) : null,
            tourName: r['tourName'] != null ? String(r['tourName']) : null,
            attractionId: r['attractionId'] != null ? Number(r['attractionId']) : null,
            attractionName: r['attractionName'] != null ? String(r['attractionName']) : null,
            venueCompanyId: r['venueCompanyId'] != null ? Number(r['venueCompanyId']) : null,
            venueCompanyName: r['venueCompanyName'] != null ? String(r['venueCompanyName']) : null,
            venueName: r['venueName'] != null ? String(r['venueName']) : null,
            city: r['city'] != null ? String(r['city']) : null,
            stateProvince: r['stateProvince'] != null ? String(r['stateProvince']) : null,
            dmaMarketName: r['dmaMarketName'] != null ? String(r['dmaMarketName']) : null,
        }));
    }
    async findByPerformancePage(asOfDateParam, pageIn, pageSizeIn, searchRaw, attractionName, performanceDateRaw, startDateRaw, endDateRaw, genreRaw, tourRaw, companyRaw, venueRaw, contactRaw, sortByRaw, sortDirRaw, eventsScopeRaw, iaeContactIdsRaw) {
        const asOf = await this.resolveAsOfDateString(asOfDateParam);
        const page = Math.max(1, Number.isFinite(pageIn) ? Math.floor(pageIn) : 1);
        const pageSize = Math.min(10_000, Math.max(1, Number.isFinite(pageSizeIn) ? Math.floor(pageSizeIn) : 25));
        const search = (searchRaw ?? '').trim() || undefined;
        const performanceDate = this.normalizeOptionalYmd(performanceDateRaw);
        const startDate = this.normalizeOptionalYmd(startDateRaw);
        const endDate = this.normalizeOptionalYmd(endDateRaw);
        const companyToken = companyRaw?.trim() || undefined;
        const parsedCompanyId = Number(companyToken);
        const companyId = companyToken && Number.isInteger(parsedCompanyId) && parsedCompanyId > 0
            ? parsedCompanyId
            : undefined;
        if (startDate && endDate && endDate < startDate) {
            throw new common_1.BadRequestException({
                message: 'Performance range end cannot be before range start.',
            });
        }
        if (performanceDate &&
            startDate &&
            endDate &&
            (performanceDate < startDate || performanceDate > endDate)) {
            throw new common_1.BadRequestException({
                message: 'Single performance day must fall within the selected start and end range.',
            });
        }
        await this.ensureConvertedProjectPerformancesFromOptions();
        const yesterdayDate = ymdAddDays(asOf, -1);
        const eventsScope = (eventsScopeRaw ?? '').trim().toLowerCase();
        const mineOnly = eventsScope === 'mine' || eventsScope === 'my';
        const explicitIaeContactIds = parsePositiveIntCsv(iaeContactIdsRaw);
        let myIaeContactId = null;
        if (mineOnly) {
            const userEmail = this.auditContext.getUserEmail()?.trim().toLowerCase();
            if (!userEmail) {
                throw new common_1.BadRequestException({
                    message: 'Cannot filter to My Events without a signed-in user email. Sign in again or choose All Events.',
                });
            }
            myIaeContactId = await this.resolveIaeContactIdForSignedInUser();
            if (myIaeContactId == null) {
                return {
                    items: [],
                    total: 0,
                    page,
                    pageSize,
                    todayDate: asOf,
                    yesterdayDate,
                    summary: {
                        todayTickets: 0,
                        todayRevenue: 0,
                        yesterdayTickets: 0,
                        yesterdayRevenue: 0,
                        totalTickets: 0,
                        totalRevenue: 0,
                    },
                    attractions: [],
                    filterOptions: await this.getByPerformanceFilterOptions(asOf, {
                        performanceDate,
                        startDate,
                        endDate,
                    }),
                };
            }
        }
        const baseQb = this.createByPerformanceBaseQb(asOf, {
            search,
            attractionName: attractionName?.trim() || undefined,
            performanceDate,
            startDate,
            endDate,
            genre: genreRaw?.trim() || undefined,
            tourName: tourRaw?.trim() || undefined,
            companyId,
            companyName: companyId == null ? companyToken : undefined,
            venueName: venueRaw?.trim() || undefined,
            contactName: contactRaw?.trim() || undefined,
            myIaeContactId: myIaeContactId ?? undefined,
            iaeContactIds: explicitIaeContactIds.length > 0 ? explicitIaeContactIds : undefined,
        });
        const sortBy = (sortByRaw ?? '').trim().toLowerCase();
        const sortDir = (sortDirRaw ?? '').trim().toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        const engagementSortQb = baseQb
            .clone()
            .select('e.engagementId', 'engagementId')
            .addSelect('MIN(a.attractionName)', 'sortAttractionName')
            .addSelect('MIN(t.tourName)', 'sortTourName')
            .addSelect('MIN(vc.companyName)', 'sortVenueCompanyName')
            .addSelect('MIN(v.venueName)', 'sortVenueName')
            .addSelect('MIN(addr.city)', 'sortCity')
            .addSelect('MIN(addr.stateProvince)', 'sortStateProvince')
            .addSelect('MIN(e.engagementStatus)', 'sortEngagementStatus')
            .addSelect('COALESCE(SUM(CAST(ts_today.performanceSalesQuantity AS BIGINT)), 0)', 'sortTodayTickets')
            .addSelect('COALESCE(SUM(CAST(ts_today.performanceSalesRevenue AS decimal(18,2))), 0)', 'sortTodayRevenue')
            .addSelect('MIN(CONVERT(date, p.performanceDate))', 'sortPerformanceDate')
            .addSelect('MIN(CONVERT(time, p.performanceTime))', 'sortPerformanceTime')
            .addSelect('MIN(p.performanceId)', 'sortPerformanceId')
            .groupBy('e.engagementId');
        if (sortBy === 'attraction') {
            engagementSortQb
                .orderBy('sortAttractionName', sortDir)
                .addOrderBy('sortPerformanceDate', 'ASC')
                .addOrderBy('sortPerformanceTime', 'ASC')
                .addOrderBy('sortPerformanceId', 'ASC');
        }
        else if (sortBy === 'tour') {
            engagementSortQb
                .orderBy('sortTourName', sortDir)
                .addOrderBy('sortPerformanceDate', 'ASC')
                .addOrderBy('sortPerformanceTime', 'ASC')
                .addOrderBy('sortPerformanceId', 'ASC');
        }
        else if (sortBy === 'venue') {
            engagementSortQb
                .orderBy('sortVenueCompanyName', sortDir)
                .addOrderBy('sortVenueName', sortDir)
                .addOrderBy('sortPerformanceDate', 'ASC')
                .addOrderBy('sortPerformanceTime', 'ASC')
                .addOrderBy('sortPerformanceId', 'ASC');
        }
        else if (sortBy === 'city') {
            engagementSortQb
                .orderBy('sortCity', sortDir)
                .addOrderBy('sortPerformanceDate', 'ASC')
                .addOrderBy('sortPerformanceTime', 'ASC')
                .addOrderBy('sortPerformanceId', 'ASC');
        }
        else if (sortBy === 'state') {
            engagementSortQb
                .orderBy('sortStateProvince', sortDir)
                .addOrderBy('sortPerformanceDate', 'ASC')
                .addOrderBy('sortPerformanceTime', 'ASC')
                .addOrderBy('sortPerformanceId', 'ASC');
        }
        else if (sortBy === 'status' || sortBy === 'engagement') {
            engagementSortQb
                .orderBy('sortEngagementStatus', sortDir)
                .addOrderBy('sortPerformanceDate', 'ASC')
                .addOrderBy('sortPerformanceTime', 'ASC')
                .addOrderBy('sortPerformanceId', 'ASC');
        }
        else if (sortBy === 'todaytickets') {
            engagementSortQb
                .orderBy('sortTodayTickets', sortDir)
                .addOrderBy('sortPerformanceDate', 'ASC')
                .addOrderBy('sortPerformanceTime', 'ASC')
                .addOrderBy('sortPerformanceId', 'ASC');
        }
        else if (sortBy === 'todayrevenue') {
            engagementSortQb
                .orderBy('sortTodayRevenue', sortDir)
                .addOrderBy('sortPerformanceDate', 'ASC')
                .addOrderBy('sortPerformanceTime', 'ASC')
                .addOrderBy('sortPerformanceId', 'ASC');
        }
        else {
            engagementSortQb
                .orderBy('sortPerformanceDate', sortDir)
                .addOrderBy('sortPerformanceTime', sortDir)
                .addOrderBy('sortPerformanceId', 'ASC');
        }
        const [attractions, totalRaw, agg, pagedEngagementRows, filterOptions] = await Promise.all([
            this.getDistinctAttractionsFromBase(baseQb),
            baseQb
                .clone()
                .select('COUNT(DISTINCT e.engagementId)', 'total')
                .getRawOne(),
            this.sumSalesForByPerformanceQuery(baseQb.clone(), asOf),
            engagementSortQb
                .clone()
                .offset((page - 1) * pageSize)
                .limit(pageSize)
                .getRawMany(),
            this.getByPerformanceFilterOptions(asOf, {
                performanceDate,
                startDate,
                endDate,
            }),
        ]);
        const total = Number(totalRaw?.total ?? 0);
        const pagedEngagementIds = pagedEngagementRows
            .map((r) => Number(r['engagementId']))
            .filter((id) => Number.isFinite(id) && id > 0);
        if (pagedEngagementIds.length === 0) {
            return {
                items: [],
                total,
                page,
                pageSize,
                todayDate: asOf,
                yesterdayDate,
                summary: {
                    todayTickets: numOrZero(pickRow(agg, 'sumTixT')),
                    todayRevenue: numOrZero(pickRow(agg, 'sumRevT')),
                    yesterdayTickets: numOrZero(pickRow(agg, 'sumTixY')),
                    yesterdayRevenue: numOrZero(pickRow(agg, 'sumRevY')),
                    totalTickets: numOrZero(pickRow(agg, 'sumTotalTickets')),
                    totalRevenue: numOrZero(pickRow(agg, 'sumTotalRevenue')),
                },
                attractions,
                filterOptions,
            };
        }
        const rawItems = [];
        const chunkSize = 1000;
        for (let i = 0; i < pagedEngagementIds.length; i += chunkSize) {
            const chunk = pagedEngagementIds.slice(i, i + chunkSize);
            const chunkItems = await baseQb
                .clone()
                .select([
                'p.performanceId                                         AS performanceId',
                'p.engagementId                                         AS engagementId',
                'CONVERT(varchar(10), p.performanceDate, 120)           AS performanceDate',
                'CONVERT(varchar(8),  p.performanceTime, 108)          AS performanceTime',
                'p.performanceStatus                                    AS performanceStatus',
                'e.engagementStatus                                     AS engagementStatus',
                'e.sellableCapacity                                     AS engagementSellableCapacity',
                'e.grossPotential                                       AS engagementGrossPotential',
                'a.attractionId                                         AS attractionId',
                'a.attractionName                                       AS attractionName',
                'cls.className                                          AS genre',
                't.tourName                                             AS tourName',
                'vc.companyName                                         AS venueCompanyName',
                'v.venueName                                            AS venueName',
                'addr.city                                              AS city',
                'addr.stateProvince                                   AS stateProvince',
                `(
          SELECT STRING_AGG(LTRIM(RTRIM(ccx.CompanyName)), N', ') WITHIN GROUP (ORDER BY LTRIM(RTRIM(ccx.CompanyName)))
          FROM dbo.VenueComplexMember vcmx
          INNER JOIN dbo.Company ccx ON ccx.CompanyID = vcmx.ComplexCompanyID
          WHERE vcmx.VenueCompanyID = ev.venueCompanyId
        )                                                       AS entertainmentComplexNames`,
                `(
          SELECT TOP 1 CONCAT(ci.FirstName, N' ', ci.LastName)
          FROM dbo.ContactAssignment ca
          INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
          INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
          WHERE ca.CompanyID = ev.venueCompanyId
          ORDER BY ci.FirstName, ci.LastName
        )                                                       AS contactName`,
                `(
          SELECT CONVERT(varchar(10), MIN(CONVERT(date, ts0.SalesDate)), 120)
          FROM dbo.TicketingSales ts0
          WHERE ts0.PerformanceID = p.performanceId
        )                                                       AS firstSalesDate`,
                'CONVERT(varchar(10), CAST(:asOf AS date), 120)         AS todayDate',
                'ts_today.performanceSalesQuantity                      AS todayTicketsSold',
                'ts_today.performanceSalesRevenue                        AS todayRevenue',
                'CONVERT(varchar(10), DATEADD(day, -1, CAST(:asOf AS date)), 120) AS yesterdayDate',
                'ts_yesterday.performanceSalesQuantity                  AS yesterdayTicketsSold',
                'ts_yesterday.performanceSalesRevenue                    AS yesterdayRevenue',
                `(
          SELECT COALESCE(SUM(CAST(ts_ca.performanceSalesQuantity AS BIGINT)), 0)
          FROM dbo.TicketingSales ts_ca
          WHERE ts_ca.performanceId = p.performanceId
            AND CONVERT(date, ts_ca.salesDate) <= CAST(:asOf AS date)
        )                                                       AS cumTicketsThruAsOf`,
                `(
          SELECT COALESCE(SUM(ts_cr.performanceSalesRevenue), 0)
          FROM dbo.TicketingSales ts_cr
          WHERE ts_cr.performanceId = p.performanceId
            AND CONVERT(date, ts_cr.salesDate) <= CAST(:asOf AS date)
        )                                                       AS cumRevenueThruAsOf`,
                `(
          SELECT COALESCE(SUM(CAST(ts_cy.performanceSalesQuantity AS BIGINT)), 0)
          FROM dbo.TicketingSales ts_cy
          WHERE ts_cy.performanceId = p.performanceId
            AND CONVERT(date, ts_cy.salesDate) <= DATEADD(day, -1, CAST(:asOf AS date))
        )                                                       AS cumTicketsThruPrior`,
                `(
          SELECT COALESCE(SUM(ts_cy2.performanceSalesRevenue), 0)
          FROM dbo.TicketingSales ts_cy2
          WHERE ts_cy2.performanceId = p.performanceId
            AND CONVERT(date, ts_cy2.salesDate) <= DATEADD(day, -1, CAST(:asOf AS date))
        )                                                       AS cumRevenueThruPrior`,
            ])
                .andWhere('e.engagementId IN (:...engagementIds)', {
                engagementIds: chunk,
            })
                .setParameter('asOf', asOf)
                .getRawMany();
            rawItems.push(...chunkItems);
        }
        const mappedItems = rawItems.map((r) => {
            const todayTickets = r['todayTicketsSold'] != null ? Number(r['todayTicketsSold']) : null;
            const ydayTickets = r['yesterdayTicketsSold'] != null
                ? Number(r['yesterdayTicketsSold'])
                : null;
            const todayRev = r['todayRevenue'] != null ? Number(r['todayRevenue']) : null;
            const cumTicketsThruAsOf = numOrZero(r['cumTicketsThruAsOf']);
            const cumTicketsThruPrior = numOrZero(r['cumTicketsThruPrior']);
            const cumRevenueThruAsOf = numOrZero(r['cumRevenueThruAsOf']);
            const cumRevenueThruPrior = numOrZero(r['cumRevenueThruPrior']);
            const firstSalesDate = r['firstSalesDate'] != null ? String(r['firstSalesDate']) : null;
            return {
                performanceId: Number(r['performanceId']),
                engagementId: Number(r['engagementId']),
                performanceDate: String(r['performanceDate'] ?? ''),
                performanceTime: String(r['performanceTime'] ?? ''),
                performanceStatus: String(r['performanceStatus'] ?? ''),
                engagementStatus: (0, engagement_status_util_1.normalizeEngagementStatus)(String(r['engagementStatus'] ?? '')),
                attractionName: r['attractionName'] != null ? String(r['attractionName']) : null,
                attractionId: r['attractionId'] != null ? Number(r['attractionId']) : null,
                genre: r['genre'] != null ? String(r['genre']) : null,
                tourName: r['tourName'] != null ? String(r['tourName']) : null,
                venueCompanyName: r['venueCompanyName'] != null ? String(r['venueCompanyName']) : null,
                venueName: r['venueName'] != null ? String(r['venueName']) : null,
                city: r['city'] != null ? String(r['city']) : null,
                stateProvince: r['stateProvince'] != null ? String(r['stateProvince']) : null,
                entertainmentComplexNames: r['entertainmentComplexNames'] != null
                    ? String(r['entertainmentComplexNames'])
                    : null,
                todayDate: String(r['todayDate'] ?? ''),
                todayTicketsSold: todayTickets,
                todayRevenue: todayRev,
                yesterdayDate: String(r['yesterdayDate'] ?? yesterdayDate),
                yesterdayTicketsSold: ydayTickets,
                yesterdayRevenue: r['yesterdayRevenue'] != null ? Number(r['yesterdayRevenue']) : null,
                soldYesterday: Math.max(0, cumTicketsThruAsOf - cumTicketsThruPrior),
                totalSold: cumTicketsThruAsOf,
                totalRevenue: cumRevenueThruAsOf,
                daysOnSale: firstSalesDate && /^\d{4}-\d{2}-\d{2}$/.test(firstSalesDate)
                    ? Math.max(1, Math.floor((new Date(asOf + 'T00:00:00').getTime() -
                        new Date(firstSalesDate + 'T00:00:00').getTime()) /
                        86_400_000) + 1)
                    : 0,
                contactName: r['contactName'] != null ? String(r['contactName']) : null,
                engagementSellableCapacity: (() => {
                    const v = r['engagementSellableCapacity'];
                    if (v == null)
                        return null;
                    const n = Number(v);
                    return Number.isFinite(n) ? n : null;
                })(),
                engagementGrossPotential: (() => {
                    const v = r['engagementGrossPotential'];
                    if (v == null || v === '')
                        return null;
                    const n = Number(v);
                    return Number.isFinite(n) ? n : null;
                })(),
            };
        });
        const engagementOrder = new Map(pagedEngagementIds.map((engagementId, idx) => [engagementId, idx]));
        const byEngagement = new Map();
        const timeOrMax = (s) => s && /^\d{2}:\d{2}:\d{2}$/.test(s) ? s : '99:99:99';
        for (const item of mappedItems) {
            const existing = byEngagement.get(item.engagementId);
            if (!existing) {
                byEngagement.set(item.engagementId, item);
                continue;
            }
            const shouldReplace = item.performanceDate < existing.performanceDate ||
                (item.performanceDate === existing.performanceDate &&
                    timeOrMax(item.performanceTime) <
                        timeOrMax(existing.performanceTime)) ||
                (item.performanceDate === existing.performanceDate &&
                    timeOrMax(item.performanceTime) ===
                        timeOrMax(existing.performanceTime) &&
                    item.performanceId < existing.performanceId);
            if (shouldReplace) {
                byEngagement.set(item.engagementId, item);
            }
        }
        const items = [...byEngagement.values()].sort((a, b) => {
            const ai = engagementOrder.get(a.engagementId) ?? Number.MAX_SAFE_INTEGER;
            const bi = engagementOrder.get(b.engagementId) ?? Number.MAX_SAFE_INTEGER;
            return ai - bi;
        });
        return {
            items,
            total,
            page,
            pageSize,
            todayDate: asOf,
            yesterdayDate,
            summary: {
                todayTickets: numOrZero(pickRow(agg, 'sumTixT')),
                todayRevenue: numOrZero(pickRow(agg, 'sumRevT')),
                yesterdayTickets: numOrZero(pickRow(agg, 'sumTixY')),
                yesterdayRevenue: numOrZero(pickRow(agg, 'sumRevY')),
                totalTickets: numOrZero(pickRow(agg, 'sumTotalTickets')),
                totalRevenue: numOrZero(pickRow(agg, 'sumTotalRevenue')),
            },
            attractions,
            filterOptions,
        };
    }
    createByPerformanceBaseQb(asOf, options) {
        const qb = this.performanceRepo
            .createQueryBuilder('p')
            .innerJoin(engagement_entity_1.Engagement, 'e', 'e.engagementId = p.engagementId')
            .leftJoin(tour_entity_1.Tour, 't', 't.tourId = e.tourId')
            .leftJoin(attraction_entity_1.Attraction, 'a', 'a.attractionId = t.attractionId')
            .leftJoin(class_entity_1.Class, 'cls', 'cls.classId = t.classId')
            .leftJoin(engagement_venue_entity_1.EngagementVenue, 'ev', 'ev.engagementId = e.engagementId AND ev.isPrimary = :prim', { prim: true })
            .leftJoin(venue_entity_1.Venue, 'v', 'v.companyId = ev.venueCompanyId')
            .leftJoin(company_entity_1.Company, 'vc', 'vc.companyId = ev.venueCompanyId')
            .leftJoin(address_entity_1.Address, 'addr', 'addr.addressId = vc.physicalAddressId')
            .leftJoin(ticketing_sales_entity_1.TicketingSales, 'ts_today', 'ts_today.performanceId = p.performanceId AND ' +
            'CONVERT(date, ts_today.salesDate) = CAST(:asOf AS date)')
            .leftJoin(ticketing_sales_entity_1.TicketingSales, 'ts_yesterday', 'ts_yesterday.performanceId = p.performanceId AND ' +
            'CONVERT(date, ts_yesterday.salesDate) = DATEADD(day, -1, CAST(:asOf AS date))')
            .setParameter('asOf', asOf);
        const hasExplicitPerfDateFilter = Boolean(options.performanceDate || options.startDate || options.endDate);
        if (!hasExplicitPerfDateFilter) {
            qb.andWhere('CONVERT(date, p.performanceDate) >= CAST(:asOf AS date)');
        }
        if (options.performanceDate) {
            qb.andWhere('CONVERT(date, p.performanceDate) = CAST(:perfDay AS date)', {
                perfDay: options.performanceDate,
            });
        }
        if (options.startDate) {
            qb.andWhere('CONVERT(date, p.performanceDate) >= CAST(:startDate AS date)', {
                startDate: options.startDate,
            });
        }
        if (options.endDate) {
            qb.andWhere('CONVERT(date, p.performanceDate) <= CAST(:endDate AS date)', {
                endDate: options.endDate,
            });
        }
        if (options.attractionName) {
            qb.andWhere('LOWER(LTRIM(RTRIM(a.attractionName))) = LOWER(LTRIM(RTRIM(:attName)))', {
                attName: options.attractionName,
            });
        }
        if (options.genre) {
            qb.andWhere('LOWER(LTRIM(RTRIM(cls.className))) = LOWER(LTRIM(RTRIM(:genreName)))', { genreName: options.genre });
        }
        if (options.tourName) {
            qb.andWhere('LOWER(LTRIM(RTRIM(t.tourName))) = LOWER(LTRIM(RTRIM(:tourName)))', { tourName: options.tourName });
        }
        if (options.companyId != null) {
            qb.andWhere('vc.companyId = :companyId', {
                companyId: options.companyId,
            });
        }
        else if (options.companyName) {
            qb.andWhere('LOWER(LTRIM(RTRIM(vc.companyName))) = LOWER(LTRIM(RTRIM(:companyName)))', {
                companyName: options.companyName,
            });
        }
        if (options.venueName) {
            qb.andWhere('LOWER(LTRIM(RTRIM(v.venueName))) = LOWER(LTRIM(RTRIM(:venueName)))', { venueName: options.venueName });
        }
        if (options.contactName) {
            qb.andWhere(`EXISTS (
          SELECT 1
          FROM dbo.ContactAssignment ca
          INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
          INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
          WHERE ca.CompanyID = ev.venueCompanyId
            AND LOWER(LTRIM(RTRIM(CONCAT(ci.FirstName, N' ', ci.LastName)))) = LOWER(LTRIM(RTRIM(:contactName)))
        )`, { contactName: options.contactName });
        }
        if (options.myIaeContactId != null) {
            qb.andWhere(`EXISTS (
          SELECT 1
          FROM dbo.EngagementIAEContact eic
          WHERE eic.EngagementID = e.engagementId
            AND eic.ContactID = :myIaeContactId
        )`, { myIaeContactId: options.myIaeContactId });
        }
        if (options.iaeContactIds?.length) {
            qb.andWhere(`EXISTS (
          SELECT 1
          FROM dbo.EngagementIAEContact eic
          WHERE eic.EngagementID = e.engagementId
            AND eic.ContactID IN (:...iaeContactIds)
        )`, { iaeContactIds: options.iaeContactIds });
        }
        this.searchTokens(options.search).forEach((token, index) => {
            const param = `dailySalesSearch${index}`;
            qb.andWhere(`CHARINDEX(:${param}, LOWER(CONCAT(
          N' ',
          a.attractionName,
          N' ',
          cls.className,
          N' ',
          t.tourName,
          N' ',
          vc.companyName,
          N' ',
          v.venueName,
          N' ',
          addr.city,
          N' ',
          addr.stateProvince,
          N' ',
          (
            SELECT TOP 1 CONCAT(ci.FirstName, N' ', ci.LastName)
            FROM dbo.ContactAssignment ca
            INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
            INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
            WHERE ca.CompanyID = ev.venueCompanyId
            ORDER BY ci.FirstName, ci.LastName
          ),
          N' ',
          CONVERT(varchar(10), p.performanceDate, 120)
        ))) > 0`, { [param]: token });
        });
        return qb;
    }
    async getByPerformanceFilterOptions(asOf, options) {
        const base = this.performanceRepo
            .createQueryBuilder('p')
            .innerJoin(engagement_entity_1.Engagement, 'e', 'e.engagementId = p.engagementId')
            .leftJoin(tour_entity_1.Tour, 't', 't.tourId = e.tourId')
            .leftJoin(class_entity_1.Class, 'cls', 'cls.classId = t.classId')
            .leftJoin(engagement_venue_entity_1.EngagementVenue, 'ev', 'ev.engagementId = e.engagementId AND ev.isPrimary = :prim', { prim: true })
            .leftJoin(venue_entity_1.Venue, 'v', 'v.companyId = ev.venueCompanyId')
            .leftJoin(company_entity_1.Company, 'vc', 'vc.companyId = ev.venueCompanyId')
            .setParameter('asOf', asOf);
        const hasExplicitPerfDateFilter = Boolean(options.performanceDate || options.startDate || options.endDate);
        if (!hasExplicitPerfDateFilter) {
            base.andWhere('CONVERT(date, p.performanceDate) >= CAST(:asOf AS date)');
        }
        if (options.performanceDate) {
            base.andWhere('CONVERT(date, p.performanceDate) = CAST(:perfDay AS date)', { perfDay: options.performanceDate });
        }
        if (options.startDate) {
            base.andWhere('CONVERT(date, p.performanceDate) >= CAST(:startDate AS date)', {
                startDate: options.startDate,
            });
        }
        if (options.endDate) {
            base.andWhere('CONVERT(date, p.performanceDate) <= CAST(:endDate AS date)', {
                endDate: options.endDate,
            });
        }
        const [genres, tours, companies, venues, contacts] = await Promise.all([
            base
                .clone()
                .select('cls.className', 'value')
                .andWhere('cls.className IS NOT NULL')
                .distinct(true)
                .orderBy('cls.className', 'ASC')
                .getRawMany(),
            base
                .clone()
                .select('t.tourName', 'value')
                .andWhere('t.tourName IS NOT NULL')
                .distinct(true)
                .orderBy('t.tourName', 'ASC')
                .getRawMany(),
            base
                .clone()
                .leftJoin(address_entity_1.Address, 'companyAddr', 'companyAddr.addressId = vc.physicalAddressId')
                .leftJoin('vc.companyType', 'legacyCompanyType')
                .select('vc.companyId', 'companyId')
                .addSelect('vc.companyName', 'companyName')
                .addSelect('companyAddr.city', 'physicalCity')
                .addSelect('companyAddr.stateProvince', 'physicalStateProvince')
                .addSelect(`COALESCE(
            NULLIF(
              STUFF((
                SELECT DISTINCT N', ' + ct.CompanyTypeName
                FROM dbo.CompanyCompanyType cct
                INNER JOIN dbo.CompanyType ct
                  ON ct.CompanyTypeID = cct.CompanyTypeID
                WHERE cct.CompanyID = vc.companyId
                FOR XML PATH(''), TYPE
              ).value('.', 'nvarchar(max)'), 1, 2, N''),
              N''
            ),
            legacyCompanyType.companyTypeName
          )`, 'companyTypeNames')
                .andWhere('vc.companyId IS NOT NULL')
                .andWhere('vc.companyName IS NOT NULL')
                .distinct(true)
                .orderBy('vc.companyName', 'ASC')
                .addOrderBy('companyAddr.city', 'ASC')
                .getRawMany(),
            base
                .clone()
                .select('v.venueName', 'value')
                .andWhere('v.venueName IS NOT NULL')
                .distinct(true)
                .orderBy('v.venueName', 'ASC')
                .getRawMany(),
            base
                .clone()
                .select(`(
            SELECT TOP 1 CONCAT(ci.FirstName, N' ', ci.LastName)
            FROM dbo.ContactAssignment ca
            INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
            INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
            WHERE ca.CompanyID = ev.venueCompanyId
            ORDER BY ci.FirstName, ci.LastName
          )`, 'value')
                .distinct(true)
                .orderBy('value', 'ASC')
                .getRawMany(),
        ]);
        const mapValues = (rows) => rows
            .map((r) => (r.value == null ? '' : String(r.value).trim()))
            .filter((v) => v.length > 0);
        return {
            genres: mapValues(genres),
            tours: mapValues(tours),
            companies: companies
                .map((row) => ({
                companyId: Number(row.companyId),
                companyName: String(row.companyName ?? '').trim(),
                companyTypeNames: String(row.companyTypeNames ?? '')
                    .split(',')
                    .map((name) => name.trim())
                    .filter((name, index, list) => {
                    if (!name)
                        return false;
                    const key = name.toLowerCase();
                    return (list.findIndex((candidate) => candidate.toLowerCase() === key) === index);
                }),
                physicalCity: row.physicalCity == null ? null : String(row.physicalCity).trim(),
                physicalStateProvince: row.physicalStateProvince == null
                    ? null
                    : String(row.physicalStateProvince).trim(),
                dmaMarketName: null,
            }))
                .filter((company) => Number.isInteger(company.companyId) &&
                company.companyId > 0 &&
                company.companyName.length > 0),
            venues: mapValues(venues),
            contacts: mapValues(contacts),
        };
    }
    async sumSalesForByPerformanceQuery(base, asOf) {
        const yest = ymdAddDays(asOf, -1);
        const subQuery = base
            .clone()
            .select('p.performanceId', 'performanceId')
            .orderBy();
        const one = await this.salesRepo
            .createQueryBuilder('ts')
            .select('COALESCE(SUM(CASE WHEN CONVERT(date, ts.salesDate) = CAST(:asOf AS date) THEN CAST(ts.performanceSalesQuantity AS BIGINT) ELSE 0 END), 0)', 'sumTixT')
            .addSelect('COALESCE(SUM(CASE WHEN CONVERT(date, ts.salesDate) = CAST(:asOf AS date) THEN CAST(ts.performanceSalesRevenue AS decimal(18,2)) ELSE 0 END), 0)', 'sumRevT')
            .addSelect('COALESCE(SUM(CASE WHEN CONVERT(date, ts.salesDate) = CAST(:yestDay AS date) THEN CAST(ts.performanceSalesQuantity AS BIGINT) ELSE 0 END), 0)', 'sumTixY')
            .addSelect('COALESCE(SUM(CASE WHEN CONVERT(date, ts.salesDate) = CAST(:yestDay AS date) THEN CAST(ts.performanceSalesRevenue AS decimal(18,2)) ELSE 0 END), 0)', 'sumRevY')
            .addSelect('COALESCE(SUM(CAST(ts.performanceSalesQuantity AS BIGINT)), 0)', 'sumTotalTickets')
            .addSelect('COALESCE(SUM(CAST(ts.performanceSalesRevenue AS decimal(18,2))), 0)', 'sumTotalRevenue')
            .where(`ts.performanceId IN (${subQuery.getQuery()})`)
            .setParameters(subQuery.getParameters())
            .setParameter('yestDay', yest)
            .getRawOne();
        return one ?? {};
    }
    async getDistinctAttractionsFromBase(baseQb) {
        const raw = await baseQb
            .clone()
            .select('a.attractionId', 'attractionId')
            .addSelect('a.attractionName', 'attractionName')
            .distinct(true)
            .andWhere('a.attractionId IS NOT NULL')
            .orderBy('a.attractionName', 'ASC')
            .getRawMany();
        return raw
            .map((r) => ({
            attractionId: Number(r['attractionId']),
            attractionName: String(r['attractionName'] ?? '').trim(),
        }))
            .filter((x) => Number.isFinite(x.attractionId) &&
            x.attractionId > 0 &&
            x.attractionName.length > 0);
    }
    async getByPerformanceSuggestions(asOfDateParam, query, performanceDateRaw, startDateRaw, endDateRaw) {
        const q = (query ?? '').trim().toLowerCase();
        if (!q)
            return [];
        const asOf = await this.resolveAsOfDateString(asOfDateParam);
        const performanceDate = this.normalizeOptionalYmd(performanceDateRaw);
        const startDate = this.normalizeOptionalYmd(startDateRaw);
        const endDate = this.normalizeOptionalYmd(endDateRaw);
        if (startDate && endDate && endDate < startDate) {
            throw new common_1.BadRequestException({
                message: 'Performance range end cannot be before range start.',
            });
        }
        const like = `%${q}%`;
        const baseQb = this.performanceRepo
            .createQueryBuilder('p')
            .innerJoin(engagement_entity_1.Engagement, 'e', 'e.engagementId = p.engagementId')
            .leftJoin(tour_entity_1.Tour, 't', 't.tourId = e.tourId')
            .leftJoin(attraction_entity_1.Attraction, 'a', 'a.attractionId = t.attractionId')
            .leftJoin(engagement_venue_entity_1.EngagementVenue, 'ev', 'ev.engagementId = e.engagementId AND ev.isPrimary = :prim', { prim: true })
            .leftJoin(venue_entity_1.Venue, 'v', 'v.companyId = ev.venueCompanyId')
            .leftJoin(company_entity_1.Company, 'vc', 'vc.companyId = ev.venueCompanyId')
            .leftJoin(address_entity_1.Address, 'addr', 'addr.addressId = vc.physicalAddressId')
            .setParameter('asOf', asOf);
        const hasExplicitPerfDateFilter = Boolean(performanceDate || startDate || endDate);
        if (!hasExplicitPerfDateFilter) {
            baseQb.andWhere('CONVERT(date, p.performanceDate) >= CAST(:asOf AS date)');
        }
        if (performanceDate) {
            baseQb.andWhere('CONVERT(date, p.performanceDate) = CAST(:perfDay AS date)', {
                perfDay: performanceDate,
            });
        }
        if (startDate) {
            baseQb.andWhere('CONVERT(date, p.performanceDate) >= CAST(:startDate AS date)', {
                startDate,
            });
        }
        if (endDate) {
            baseQb.andWhere('CONVERT(date, p.performanceDate) <= CAST(:endDate AS date)', {
                endDate,
            });
        }
        const limitQb = (qb) => qb.addOrderBy('1').limit(6);
        const [attractions, tours, venues, companies, cities] = await Promise.all([
            limitQb(baseQb
                .clone()
                .select('a.attractionName', 'label')
                .addSelect('t.tourName', 'sublabel')
                .distinct(true)
                .andWhere('LOWER(a.attractionName) LIKE :q', { q: like })).getRawMany(),
            limitQb(baseQb
                .clone()
                .select('t.tourName', 'label')
                .addSelect('vc.companyName', 'sublabel')
                .distinct(true)
                .andWhere('LOWER(t.tourName) LIKE :q', { q: like })).getRawMany(),
            limitQb(baseQb
                .clone()
                .select('v.venueName', 'label')
                .addSelect('addr.city', 'sublabel')
                .distinct(true)
                .andWhere('LOWER(v.venueName) LIKE :q', { q: like })).getRawMany(),
            limitQb(baseQb
                .clone()
                .select('vc.companyName', 'label')
                .addSelect('addr.city', 'sublabel')
                .distinct(true)
                .andWhere('LOWER(vc.companyName) LIKE :q', { q: like })).getRawMany(),
            limitQb(baseQb
                .clone()
                .select('addr.city', 'label')
                .addSelect('addr.stateProvince', 'sublabel')
                .distinct(true)
                .andWhere('LOWER(addr.city) LIKE :q', { q: like })).getRawMany(),
        ]);
        const clean = (rows) => rows
            .map((r) => ({
            label: String(r.label ?? '').trim(),
            sublabel: String(r.sublabel ?? '').trim(),
        }))
            .filter((r) => r.label.length > 0);
        const all = [
            ...clean(attractions),
            ...clean(tours),
            ...clean(venues),
            ...clean(companies),
            ...clean(cities),
        ];
        const seen = new Set();
        return all
            .filter((r) => {
            const key = r.label.toLowerCase();
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        })
            .slice(0, 10);
    }
    normalizeOptionalYmd(raw) {
        const s = (raw ?? '').trim();
        if (!s)
            return undefined;
        if (/^\d{4}-\d{2}-\d{2}$/.test(s))
            return s;
        return undefined;
    }
    async resolveAsOfDateString(input) {
        if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
            return input;
        }
        if (input) {
            throw new common_1.BadRequestException({
                message: 'asOfDate must be YYYY-MM-DD when provided.',
            });
        }
        const r = await this.performanceRepo.query('SELECT CONVERT(varchar(10), CAST(GETDATE() AS date), 120) AS d');
        return r[0]?.d ?? new Date().toISOString().slice(0, 10);
    }
    async getEngagementDashboard(engagementId, asOfDateParam, performanceIdFilter) {
        const asOf = await this.resolveAsOfDateString(asOfDateParam);
        await this.ensureConvertedProjectPerformancesFromOptions();
        let engagement;
        try {
            engagement = await this.engagementService.getOne(engagementId);
        }
        catch {
            throw new common_1.NotFoundException({
                message: `Engagement #${engagementId} not found.`,
            });
        }
        const allPerfs = await this.performanceRepo.find({
            where: { engagementId },
            order: { performanceDate: 'ASC', performanceTime: 'ASC' },
        });
        let perfs = allPerfs;
        if (performanceIdFilter != null) {
            const match = allPerfs.find((p) => p.performanceId === performanceIdFilter);
            if (!match) {
                throw new common_1.NotFoundException({
                    message: `Performance #${performanceIdFilter} does not belong to engagement #${engagementId}.`,
                });
            }
            perfs = [match];
        }
        const perfIds = perfs.map((p) => p.performanceId);
        const performanceCount = perfs.length;
        const marketingWindow = await this.getMarketingWindowForPerformances(perfIds);
        const byPerf = new Map();
        for (const id of perfIds)
            byPerf.set(id, []);
        if (perfIds.length > 0) {
            const rows = [];
            const chunkSize = 1000;
            for (let i = 0; i < perfIds.length; i += chunkSize) {
                const chunk = perfIds.slice(i, i + chunkSize);
                const chunkRows = await this.salesRepo
                    .createQueryBuilder('ts')
                    .where('ts.performanceId IN (:...ids)', { ids: chunk })
                    .andWhere('CONVERT(date, ts.salesDate) <= CAST(:asOf AS date)', {
                    asOf,
                })
                    .orderBy('ts.performanceId', 'ASC')
                    .addOrderBy('ts.salesDate', 'ASC')
                    .getMany();
                rows.push(...chunkRows);
            }
            rows.sort((a, b) => {
                if (a.performanceId !== b.performanceId) {
                    return a.performanceId - b.performanceId;
                }
                const dateA = a.salesDate ? String(a.salesDate) : '';
                const dateB = b.salesDate ? String(b.salesDate) : '';
                return dateA.localeCompare(dateB);
            });
            for (const row of rows) {
                const ymd = toYmdString(row.salesDate);
                if (!ymd)
                    continue;
                const arr = byPerf.get(row.performanceId);
                arr.push({
                    salesDate: ymd,
                    tickets: row.performanceSalesQuantity ?? 0,
                    revenue: row.performanceSalesRevenue != null
                        ? Number(row.performanceSalesRevenue)
                        : 0,
                });
            }
        }
        const series = buildDailySeries(asOf, perfIds, byPerf);
        const endTotals = totalsForReportingDay(perfIds, byPerf, asOf);
        const baselineDay = ymdAddDays(asOf, -7);
        const baselineTotals = totalsForReportingDay(perfIds, byPerf, baselineDay);
        const ticketsLast7Days = Math.max(0, endTotals.tickets - baselineTotals.tickets);
        const revenueLast7Days = Math.max(0, endTotals.revenue - baselineTotals.revenue);
        const perShowCapRaw = engagement.sellableCapacity;
        const perShowGrossRaw = (() => {
            const v = engagement.grossPotential;
            if (v == null)
                return null;
            if (typeof v === 'string' && v.trim() === '')
                return null;
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        })();
        const cap = perShowCapRaw != null && performanceCount > 0
            ? perShowCapRaw * performanceCount
            : perShowCapRaw;
        const grossPotentialNum = perShowGrossRaw != null && performanceCount > 0
            ? perShowGrossRaw * performanceCount
            : perShowGrossRaw;
        const pctSold = cap != null && cap > 0 ? pctVsCap(endTotals.tickets, cap) : null;
        const pctRevenueVsPotential = grossPotentialNum != null && grossPotentialNum > 0
            ? pctVsCap(endTotals.revenue, grossPotentialNum)
            : null;
        const openingYmd = (perfs[0] && toYmdString(perfs[0].performanceDate)) ||
            engagement.openingPerformanceDate ||
            null;
        let daysUntilOpening = 0;
        if (openingYmd && /^\d{4}-\d{2}-\d{2}$/.test(openingYmd)) {
            const openMs = new Date(`${openingYmd}T12:00:00`).getTime();
            const asMs = new Date(`${asOf}T12:00:00`).getTime();
            const diff = Math.ceil((openMs - asMs) / 86_400_000);
            daysUntilOpening = diff > 0 ? diff : 0;
        }
        const first = perfs[0];
        const showDate = first
            ? toYmdString(first.performanceDate) || null
            : engagement.openingPerformanceDate;
        const showTime = first
            ? timeToHhmmss(first.performanceTime)
            : engagement.openingPerformanceTime;
        const summary = series.map((pt) => {
            const seatsSoldPct = cap != null && cap > 0 ? pctVsCap(pt.totalTickets, cap) : null;
            const seatsRemaining = cap != null ? seatsRemainingDisplay(cap, pt.totalTickets) : null;
            const revenueRemaining = grossPotentialNum != null && grossPotentialNum > 0
                ? revenueRemainingDisplay(grossPotentialNum, pt.totalRevenue)
                : null;
            return {
                date: pt.date,
                totalTicketsSold: pt.totalTickets,
                totalValueSold: pt.totalRevenue,
                dailyTicketsSold: pt.dailyTickets,
                dailyValueSold: pt.dailyRevenue,
                seatsSoldPct,
                seatsRemaining,
                revenueRemaining,
            };
        });
        return {
            engagementId,
            asOfDate: asOf,
            header: {
                attractionName: engagement.attractionName,
                tourName: engagement.tourName ?? '',
                entertainmentComplexNames: engagement.entertainmentComplexNames,
                venueLabel: venueLabelFromEngagement(engagement),
                city: engagement.city,
                stateProvince: engagement.stateProvince,
                showDate,
                showTime,
            },
            sellableCapacity: cap,
            grossPotential: grossPotentialNum,
            marketingWindow,
            kpis: {
                totalRevenue: endTotals.revenue,
                ticketsDistributed: endTotals.tickets,
                pctSold,
                revenueLast7Days,
                ticketsLast7Days,
                daysUntilOpening,
                pctRevenueVsPotential,
            },
            series,
            summary,
            performanceId: performanceIdFilter ?? null,
        };
    }
    async getAttractionSalesSummary(attractionId, asOfDateParam) {
        const asOf = await this.resolveAsOfDateString(asOfDateParam);
        await this.ensureConvertedProjectPerformancesFromOptions();
        const att = await this.attractionRepo.findOne({ where: { attractionId } });
        if (!att) {
            throw new common_1.NotFoundException({
                message: `Attraction #${attractionId} not found.`,
            });
        }
        const engagements = await this.engagementRepo
            .createQueryBuilder('e')
            .innerJoinAndSelect('e.tour', 't')
            .where('t.attractionId = :aid', { aid: attractionId })
            .getMany();
        const engagementIds = engagements.map((x) => x.engagementId);
        const engagementCount = engagements.length;
        let sellableSum = 0;
        let sellableAny = false;
        let grossSum = 0;
        let grossAny = false;
        const tourNames = new Set();
        const engagementBaselines = engagements
            .slice()
            .sort((a, b) => a.engagementId - b.engagementId)
            .map((e) => {
            const tn = e.tour?.tourName?.trim();
            if (tn)
                tourNames.add(tn);
            const gpRaw = e.grossPotential;
            const gpNum = gpRaw != null && gpRaw !== '' && Number.isFinite(Number(gpRaw))
                ? Number(Number(gpRaw).toFixed(2))
                : null;
            return {
                engagementId: e.engagementId,
                tourName: tn || `Engagement #${e.engagementId}`,
                sellableCapacity: e.sellableCapacity != null &&
                    Number.isFinite(Number(e.sellableCapacity))
                    ? Math.trunc(Number(e.sellableCapacity))
                    : null,
                grossPotential: gpNum,
            };
        });
        for (const e of engagements) {
            const sc = e.sellableCapacity;
            if (sc != null && Number.isFinite(sc)) {
                sellableSum += sc;
                sellableAny = true;
            }
            const gp = e.grossPotential != null && e.grossPotential !== ''
                ? Number(e.grossPotential)
                : null;
            if (gp != null && Number.isFinite(gp)) {
                grossSum += gp;
                grossAny = true;
            }
        }
        const sellableCapacity = sellableAny ? sellableSum : null;
        const grossPotential = grossAny ? grossSum : null;
        const perfs = [];
        if (engagementIds.length > 0) {
            const chunkSize = 1000;
            for (let i = 0; i < engagementIds.length; i += chunkSize) {
                const chunk = engagementIds.slice(i, i + chunkSize);
                const chunkPerfs = await this.performanceRepo.find({
                    where: { engagementId: (0, typeorm_2.In)(chunk) },
                    order: { performanceDate: 'ASC', performanceTime: 'ASC' },
                });
                perfs.push(...chunkPerfs);
            }
            perfs.sort((a, b) => {
                const dateA = a.performanceDate ? String(a.performanceDate) : '';
                const dateB = b.performanceDate ? String(b.performanceDate) : '';
                if (dateA !== dateB)
                    return dateA.localeCompare(dateB);
                const timeA = a.performanceTime ? String(a.performanceTime) : '';
                const timeB = b.performanceTime ? String(b.performanceTime) : '';
                if (timeA !== timeB)
                    return timeA.localeCompare(timeB);
                return a.performanceId - b.performanceId;
            });
        }
        const perfIds = perfs.map((p) => p.performanceId);
        const marketingWindow = await this.getMarketingWindowForPerformances(perfIds);
        const byPerf = new Map();
        for (const id of perfIds)
            byPerf.set(id, []);
        if (perfIds.length > 0) {
            const rows = [];
            const chunkSize = 1000;
            for (let i = 0; i < perfIds.length; i += chunkSize) {
                const chunk = perfIds.slice(i, i + chunkSize);
                const chunkRows = await this.salesRepo
                    .createQueryBuilder('ts')
                    .where('ts.performanceId IN (:...ids)', { ids: chunk })
                    .andWhere('CONVERT(date, ts.salesDate) <= CAST(:asOf AS date)', {
                    asOf,
                })
                    .orderBy('ts.performanceId', 'ASC')
                    .addOrderBy('ts.salesDate', 'ASC')
                    .getMany();
                rows.push(...chunkRows);
            }
            rows.sort((a, b) => {
                if (a.performanceId !== b.performanceId) {
                    return a.performanceId - b.performanceId;
                }
                const dateA = a.salesDate ? String(a.salesDate) : '';
                const dateB = b.salesDate ? String(b.salesDate) : '';
                return dateA.localeCompare(dateB);
            });
            for (const row of rows) {
                const ymd = toYmdString(row.salesDate);
                if (!ymd)
                    continue;
                const arr = byPerf.get(row.performanceId);
                arr.push({
                    salesDate: ymd,
                    tickets: row.performanceSalesQuantity ?? 0,
                    revenue: row.performanceSalesRevenue != null
                        ? Number(row.performanceSalesRevenue)
                        : 0,
                });
            }
        }
        const series = buildDailySeries(asOf, perfIds, byPerf);
        const endTotals = totalsForReportingDay(perfIds, byPerf, asOf);
        const baselineDay = ymdAddDays(asOf, -7);
        const baselineTotals = totalsForReportingDay(perfIds, byPerf, baselineDay);
        const ticketsLast7Days = Math.max(0, endTotals.tickets - baselineTotals.tickets);
        const revenueLast7Days = Math.max(0, endTotals.revenue - baselineTotals.revenue);
        const cap = sellableCapacity;
        const potential = grossPotential;
        const pctSold = cap != null && cap > 0 ? pctVsCap(endTotals.tickets, cap) : null;
        const pctRevenueVsPotential = potential != null && potential > 0
            ? pctVsCap(endTotals.revenue, potential)
            : null;
        const first = perfs[0];
        const openingYmd = (first && toYmdString(first.performanceDate)) || null;
        let daysUntilOpening = 0;
        if (openingYmd && /^\d{4}-\d{2}-\d{2}$/.test(openingYmd)) {
            const openMs = new Date(`${openingYmd}T12:00:00`).getTime();
            const asMs = new Date(`${asOf}T12:00:00`).getTime();
            const diff = Math.ceil((openMs - asMs) / 86_400_000);
            daysUntilOpening = diff > 0 ? diff : 0;
        }
        const showDate = first ? toYmdString(first.performanceDate) || null : null;
        const showTime = first ? timeToHhmmss(first.performanceTime) : null;
        const summary = series.map((pt) => {
            const seatsSoldPct = cap != null && cap > 0 ? pctVsCap(pt.totalTickets, cap) : null;
            const seatsRemaining = cap != null ? seatsRemainingDisplay(cap, pt.totalTickets) : null;
            const revenueRemaining = potential != null && potential > 0
                ? revenueRemainingDisplay(potential, pt.totalRevenue)
                : null;
            return {
                date: pt.date,
                totalTicketsSold: pt.totalTickets,
                totalValueSold: pt.totalRevenue,
                dailyTicketsSold: pt.dailyTickets,
                dailyValueSold: pt.dailyRevenue,
                seatsSoldPct,
                seatsRemaining,
                revenueRemaining,
            };
        });
        const sortedTours = [...tourNames].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        const tourRollup = sortedTours.length === 0
            ? 'No tours'
            : sortedTours.length <= 2
                ? sortedTours.join(', ')
                : `${sortedTours.slice(0, 2).join(', ')} +${sortedTours.length - 2} more`;
        const tourNameLabel = `${engagementCount} engagement${engagementCount !== 1 ? 's' : ''} · ${tourRollup}`;
        return {
            attractionId,
            engagementCount,
            asOfDate: asOf,
            header: {
                attractionName: att.attractionName,
                tourName: tourNameLabel,
                entertainmentComplexNames: null,
                venueLabel: 'Roll-up (all engagements)',
                city: null,
                stateProvince: null,
                showDate,
                showTime,
            },
            sellableCapacity: cap,
            grossPotential: potential,
            marketingWindow,
            kpis: {
                totalRevenue: endTotals.revenue,
                ticketsDistributed: endTotals.tickets,
                pctSold,
                revenueLast7Days,
                ticketsLast7Days,
                daysUntilOpening,
                pctRevenueVsPotential,
            },
            series,
            summary,
            engagementBaselines,
            performanceId: null,
        };
    }
    normalizePatchSalesDateYmd(raw) {
        const s = (raw ?? '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            throw new common_1.BadRequestException('Sales date must be a calendar day in YYYY-MM-DD format.');
        }
        return s;
    }
    assertTicketingSalesDateOnOrBeforePerformance(performanceDateRaw, salesDateYmd) {
        const cap = toYmdString(performanceDateRaw);
        if (!cap || !/^\d{4}-\d{2}-\d{2}$/.test(cap))
            return;
        if (salesDateYmd > cap) {
            throw new common_1.BadRequestException({
                message: `Ticket sales cannot be saved for ${salesDateYmd}: sales can only be entered on or before this show's performance date (${cap}).`,
            });
        }
    }
    async updateSales(performanceId, salesDate, body) {
        if (body.ticketsSold !== undefined && body.ticketsSold !== null) {
            if (!Number.isInteger(body.ticketsSold) || body.ticketsSold < 0) {
                throw new common_1.BadRequestException('Tickets sold must be a whole number that is zero or greater.');
            }
        }
        if (body.revenue !== undefined && body.revenue !== null) {
            if (body.revenue < 0 || !Number.isFinite(body.revenue)) {
                throw new common_1.BadRequestException('Revenue must be a valid number that is zero or greater.');
            }
        }
        const ymd = this.normalizePatchSalesDateYmd(salesDate);
        const perf = await this.performanceRepo.findOne({
            where: { performanceId },
            select: {
                performanceId: true,
                engagementId: true,
                performanceDate: true,
            },
        });
        if (!perf) {
            throw new common_1.NotFoundException(`Performance #${performanceId} was not found.`);
        }
        this.assertTicketingSalesDateOnOrBeforePerformance(perf.performanceDate, ymd);
        let row = await this.salesRepo.findOne({
            where: { performanceId, salesDate: ymd },
        });
        if (!row) {
            row = this.salesRepo.create({
                performanceId,
                salesDate: ymd,
                performanceSalesQuantity: null,
                performanceSalesRevenue: null,
            });
        }
        const mergedTickets = body.ticketsSold !== undefined
            ? (body.ticketsSold ?? 0)
            : (row.performanceSalesQuantity ?? 0);
        const mergedRevenue = body.revenue !== undefined
            ? body.revenue != null
                ? Number(Number(body.revenue).toFixed(2))
                : 0
            : row.performanceSalesRevenue != null
                ? Number(Number(row.performanceSalesRevenue).toFixed(2))
                : 0;
        const engagement = await this.engagementRepo.findOne({
            where: { engagementId: perf.engagementId },
            select: {
                engagementId: true,
                sellableCapacity: true,
                grossPotential: true,
            },
        });
        const rawSellableCapacity = Number(engagement?.sellableCapacity ?? 0);
        const engagementSellableCapacity = Number.isFinite(rawSellableCapacity) && rawSellableCapacity > 0
            ? Math.floor(rawSellableCapacity)
            : 0;
        const engagementGrossPotential = (() => {
            const n = Number(engagement?.grossPotential ?? 0);
            return Number.isFinite(n) && n > 0 ? Number(n.toFixed(2)) : 0;
        })();
        const formatMoney = (value) => value.toLocaleString(undefined, {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
        const violations = [];
        if (mergedTickets > engagementSellableCapacity) {
            violations.push(engagementSellableCapacity > 0
                ? `Tickets sold exceed the engagement sellable capacity (${mergedTickets.toLocaleString()} of ${engagementSellableCapacity.toLocaleString()}).`
                : 'Set engagement sellable capacity before saving tickets sold.');
        }
        if (mergedRevenue > engagementGrossPotential) {
            violations.push(engagementGrossPotential > 0
                ? `Revenue exceeds the engagement gross potential (${formatMoney(mergedRevenue)} of ${formatMoney(engagementGrossPotential)}).`
                : 'Set engagement gross potential before saving revenue.');
        }
        if (violations.length > 0) {
            throw new common_1.BadRequestException({
                message: `Daily sales cannot be saved. ${violations.join(' ')}`,
            });
        }
        if (body.ticketsSold !== undefined) {
            row.performanceSalesQuantity = body.ticketsSold;
        }
        if (body.revenue !== undefined) {
            row.performanceSalesRevenue =
                body.revenue != null ? parseFloat(body.revenue.toFixed(2)) : null;
        }
        await this.salesRepo.save(row);
    }
};
exports.DailySalesService = DailySalesService;
exports.DailySalesService = DailySalesService = DailySalesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ticketing_sales_entity_1.TicketingSales)),
    __param(1, (0, typeorm_1.InjectRepository)(performance_entity_1.Performance)),
    __param(2, (0, typeorm_1.InjectRepository)(performance_ticketing_entity_1.PerformanceTicketing)),
    __param(3, (0, typeorm_1.InjectRepository)(engagement_entity_1.Engagement)),
    __param(4, (0, typeorm_1.InjectRepository)(attraction_entity_1.Attraction)),
    __param(5, (0, typeorm_1.InjectRepository)(contact_entity_1.Contact)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        engagement_service_1.EngagementService,
        audit_request_context_service_1.AuditRequestContext])
], DailySalesService);
//# sourceMappingURL=daily-sales.service.js.map