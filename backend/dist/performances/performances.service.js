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
exports.PerformancesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const address_entity_1 = require("../entities/address.entity");
const attraction_entity_1 = require("../entities/attraction.entity");
const company_entity_1 = require("../entities/company.entity");
const engagement_entity_1 = require("../entities/engagement.entity");
const engagement_production_entity_1 = require("../entities/engagement-production.entity");
const engagement_venue_entity_1 = require("../entities/engagement-venue.entity");
const performance_entity_1 = require("../entities/performance.entity");
const performance_ticketing_entity_1 = require("../entities/performance-ticketing.entity");
const tour_entity_1 = require("../entities/tour.entity");
const venue_entity_1 = require("../entities/venue.entity");
const engagement_status_util_1 = require("../engagements/engagement-status.util");
const CALENDAR_SELECT = [
    'p.performanceId         AS performanceId',
    'p.engagementId          AS engagementId',
    'p.performanceStatus     AS performanceStatus',
    'CONVERT(varchar(10), p.performanceDate, 120) AS performanceDate',
    'CONVERT(varchar(8),  p.performanceTime, 108) AS performanceTime',
    'e.engagementStatus      AS engagementStatus',
    'e.tourId                AS tourId',
    't.tourName              AS tourName',
    't.attractionId          AS attractionId',
    'a.attractionName        AS attractionName',
    'ev.venueCompanyId       AS venueCompanyId',
    'vc.companyName          AS venueCompanyName',
    'v.venueName             AS venueName',
    'addr.city               AS city',
    'addr.stateProvince      AS stateProvince',
    'CONVERT(varchar(10), ep.announcementDate, 120) AS announcementDate',
    'CONVERT(varchar(10), pt.preSaleDate, 120)      AS presaleStartDate',
    'CONVERT(varchar(10), pt.onSaleDate, 120)       AS onSaleDate',
];
let PerformancesService = class PerformancesService {
    performanceRepo;
    dataSource;
    preSaleEndDateColPresent = null;
    constructor(performanceRepo, dataSource) {
        this.performanceRepo = performanceRepo;
        this.dataSource = dataSource;
    }
    async performanceTicketingHasPreSaleEndDateColumn() {
        if (this.preSaleEndDateColPresent !== null)
            return this.preSaleEndDateColPresent;
        try {
            const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'PerformanceTicketing' AND c.name=N'PreSaleEndDate')
        THEN 1 ELSE 0 END AS ok
      `);
            const row0 = r?.[0];
            const rawOk = row0?.['ok'];
            const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
            this.preSaleEndDateColPresent = ok;
            return ok;
        }
        catch {
            this.preSaleEndDateColPresent = false;
            return false;
        }
    }
    async buildCalendarQuery(year, month, broadenDateMatch = false) {
        const hasPresaleEnd = await this.performanceTicketingHasPreSaleEndDateColumn();
        const select = [
            ...CALENDAR_SELECT,
            hasPresaleEnd
                ? 'CONVERT(varchar(10), pt.[PreSaleEndDate], 120) AS presaleEndDate'
                : 'CAST(NULL AS varchar(10)) AS presaleEndDate',
        ];
        const qb = this.performanceRepo
            .createQueryBuilder('p')
            .innerJoin(engagement_entity_1.Engagement, 'e', 'e.engagementId = p.engagementId')
            .leftJoin(tour_entity_1.Tour, 't', 't.tourId = e.tourId')
            .leftJoin(attraction_entity_1.Attraction, 'a', 'a.attractionId = t.attractionId')
            .leftJoin(engagement_venue_entity_1.EngagementVenue, 'ev', 'ev.engagementId = e.engagementId AND ev.isPrimary = :prim', { prim: true })
            .leftJoin(venue_entity_1.Venue, 'v', 'v.companyId = ev.venueCompanyId')
            .leftJoin(company_entity_1.Company, 'vc', 'vc.companyId = ev.venueCompanyId')
            .leftJoin(address_entity_1.Address, 'addr', 'addr.addressId = vc.physicalAddressId')
            .leftJoin(engagement_production_entity_1.EngagementProduction, 'ep', 'ep.engagementId = e.engagementId')
            .leftJoin(performance_ticketing_entity_1.PerformanceTicketing, 'pt', 'pt.performanceId = p.performanceId')
            .select(select);
        if (year !== undefined && !isNaN(year)) {
            if (broadenDateMatch && month !== undefined && !isNaN(month)) {
                const dateMatches = [
                    '(YEAR(p.performanceDate) = :year AND MONTH(p.performanceDate) = :month)',
                    '(YEAR(ep.announcementDate) = :year AND MONTH(ep.announcementDate) = :month)',
                    '(YEAR(pt.preSaleDate) = :year AND MONTH(pt.preSaleDate) = :month)',
                    '(YEAR(pt.onSaleDate) = :year AND MONTH(pt.onSaleDate) = :month)',
                ];
                if (hasPresaleEnd) {
                    dateMatches.push('(YEAR(pt.[PreSaleEndDate]) = :year AND MONTH(pt.[PreSaleEndDate]) = :month)');
                }
                qb.andWhere(`(${dateMatches.join(' OR ')})`, { year, month });
            }
            else {
                qb.andWhere('YEAR(p.performanceDate) = :year', { year });
                if (month !== undefined && !isNaN(month)) {
                    qb.andWhere('MONTH(p.performanceDate) = :month', { month });
                }
            }
        }
        return qb;
    }
    applyCalendarListSort(qb, sortByRaw, sortDirRaw) {
        const sortBy = (sortByRaw ?? '').trim().toLowerCase();
        const sortDir = (sortDirRaw ?? '').trim().toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        const tie = () => qb
            .addOrderBy('performanceDate', 'ASC')
            .addOrderBy('performanceTime', 'ASC')
            .addOrderBy('performanceId', 'ASC');
        if (sortBy === 'attraction') {
            qb.orderBy('attractionName', sortDir);
            tie();
        }
        else if (sortBy === 'tour') {
            qb.orderBy('tourName', sortDir);
            tie();
        }
        else if (sortBy === 'venue') {
            qb.orderBy('venueCompanyName', sortDir).addOrderBy('venueName', sortDir);
            tie();
        }
        else if (sortBy === 'city') {
            qb.orderBy('city', sortDir);
            tie();
        }
        else if (sortBy === 'state') {
            qb.orderBy('stateProvince', sortDir);
            tie();
        }
        else if (sortBy === 'status') {
            qb.orderBy('engagementStatus', sortDir);
            tie();
        }
        else {
            qb.orderBy('performanceDate', sortDir)
                .addOrderBy('performanceTime', sortDir)
                .addOrderBy('performanceId', 'ASC');
        }
    }
    applyVisibilityFilter(qb, visibility) {
        const allowed = new Set(['Unknown', 'Private', 'Public']);
        const wanted = [...new Set(visibility.map((s) => s.trim()))].filter((s) => allowed.has(s));
        if (wanted.length === 0 || wanted.length >= 3)
            return;
        const orParts = [];
        if (wanted.includes('Private')) {
            orParts.push(`e.engagementStatus = 'Private'`);
        }
        if (wanted.includes('Public')) {
            orParts.push(`e.engagementStatus = 'Public'`);
        }
        if (wanted.includes('Unknown')) {
            orParts.push(`(e.engagementStatus IS NULL OR e.engagementStatus NOT IN ('Private', 'Public'))`);
        }
        if (orParts.length > 0) {
            qb.andWhere(`(${orParts.join(' OR ')})`);
        }
    }
    mapCalendarRaw(r) {
        return {
            performanceId: Number(r['performanceId']),
            engagementId: Number(r['engagementId']),
            performanceStatus: String(r['performanceStatus'] ?? ''),
            performanceDate: String(r['performanceDate'] ?? ''),
            performanceTime: String(r['performanceTime'] ?? ''),
            engagementStatus: (0, engagement_status_util_1.normalizeEngagementStatus)(String(r['engagementStatus'] ?? '')),
            tourId: r['tourId'] != null ? Number(r['tourId']) : null,
            tourName: r['tourName'] != null ? String(r['tourName']) : null,
            attractionId: r['attractionId'] != null ? Number(r['attractionId']) : null,
            attractionName: r['attractionName'] != null ? String(r['attractionName']) : null,
            venueCompanyId: r['venueCompanyId'] != null ? Number(r['venueCompanyId']) : null,
            venueCompanyName: r['venueCompanyName'] != null ? String(r['venueCompanyName']) : null,
            venueName: r['venueName'] != null ? String(r['venueName']) : null,
            city: r['city'] != null ? String(r['city']) : null,
            stateProvince: r['stateProvince'] != null ? String(r['stateProvince']) : null,
            announcementDate: r['announcementDate'] != null && r['announcementDate'] !== ''
                ? String(r['announcementDate']).slice(0, 10)
                : null,
            presaleStartDate: r['presaleStartDate'] != null && r['presaleStartDate'] !== ''
                ? String(r['presaleStartDate']).slice(0, 10)
                : null,
            presaleEndDate: r['presaleEndDate'] != null && r['presaleEndDate'] !== ''
                ? String(r['presaleEndDate']).slice(0, 10)
                : null,
            onSaleDate: r['onSaleDate'] != null && r['onSaleDate'] !== ''
                ? String(r['onSaleDate']).slice(0, 10)
                : null,
        };
    }
    async findAll(year, month) {
        const qb = await this.buildCalendarQuery(year, month, true);
        qb.orderBy('p.performanceDate', 'ASC')
            .addOrderBy('p.performanceTime', 'ASC')
            .addOrderBy('p.performanceId', 'ASC');
        const raw = await qb.getRawMany();
        return raw.map((r) => this.mapCalendarRaw(r));
    }
    async findAllPaginated(year, month, offset, limit, visibility, sortByRaw, sortDirRaw) {
        const qb = await this.buildCalendarQuery(year, month, false);
        this.applyVisibilityFilter(qb, visibility);
        this.applyCalendarListSort(qb, sortByRaw, sortDirRaw);
        const total = await qb.getCount();
        const raw = await qb
            .offset(offset)
            .limit(limit)
            .getRawMany();
        return {
            data: raw.map((r) => this.mapCalendarRaw(r)),
            total,
        };
    }
};
exports.PerformancesService = PerformancesService;
exports.PerformancesService = PerformancesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(performance_entity_1.Performance)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource])
], PerformancesService);
//# sourceMappingURL=performances.service.js.map