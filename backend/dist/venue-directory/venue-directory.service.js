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
var VenueDirectoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VenueDirectoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const venue_entity_1 = require("../entities/venue.entity");
const dma_normalization_util_1 = require("../lookups/dma-normalization.util");
const venue_directory_sort_1 = require("./venue-directory-sort");
const VENUE_TYPE_NAME = 'venue';
let VenueDirectoryService = VenueDirectoryService_1 = class VenueDirectoryService {
    venueRepo;
    constructor(venueRepo) {
        this.venueRepo = venueRepo;
    }
    static applyVenueTypeWhere(qb) {
        return qb.andWhere('LOWER(LTRIM(RTRIM(ct.companyTypeName))) = :ctVenue', {
            ctVenue: VENUE_TYPE_NAME,
        });
    }
    baseAllVenuesQuery(v) {
        const qb = this.venueRepo
            .createQueryBuilder('v')
            .innerJoin('v.company', 'c')
            .innerJoin('c.companyType', 'ct')
            .leftJoin('v.venueType', 'vt')
            .leftJoin('c.dma', 'd')
            .leftJoin('c.physicalAddress', 'pa');
        VenueDirectoryService_1.applyVenueTypeWhere(qb);
        const qVen = (v.q ?? '').trim();
        if (qVen) {
            const tokens = this.searchTokens(qVen);
            tokens.forEach((token, index) => {
                const param = `qVenue${index}`;
                qb.andWhere(`(
            LOWER(ISNULL(v.venueName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR LOWER(ISNULL(c.companyName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR LOWER(ISNULL(vt.venueTypeName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR LOWER(ISNULL(pa.city, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR LOWER(ISNULL(pa.stateProvince, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR LOWER(ISNULL(pa.country, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR LOWER(ISNULL(pa.postalCode, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR LOWER(ISNULL(d.marketName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR LOWER(ISNULL(${venue_directory_sort_1.ALL_VENUES_ENTERTAINMENT_COMPLEX_NAMES_SQL}, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          )`, { [param]: `%${this.escapeLikePattern(token)}%` });
            });
        }
        if (v.complexCompanyId != null && Number.isFinite(v.complexCompanyId)) {
            qb.andWhere(`EXISTS (SELECT 1 FROM dbo.VenueComplexMember vcmf WHERE vcmf.VenueCompanyID = v.companyId AND vcmf.ComplexCompanyID = :ccid)`, { ccid: v.complexCompanyId });
        }
        else {
            const cName = (v.complexName ?? '')
                .trim()
                .replace(/[\s.,:;]+$/g, '')
                .replace(/\s+/g, ' ');
            if (cName) {
                const likeC = `%${cName.toLowerCase()}%`;
                qb.andWhere(`EXISTS (
            SELECT 1
            FROM dbo.VenueComplexMember vcmf2
            INNER JOIN dbo.Company ccnf ON ccnf.CompanyID = vcmf2.ComplexCompanyID
            WHERE vcmf2.VenueCompanyID = v.companyId
              AND LOWER(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(
                CASE WHEN RIGHT(RTRIM(ccnf.CompanyName),1) IN ('.', ',', ':', ';')
                     THEN LEFT(RTRIM(ccnf.CompanyName), LEN(RTRIM(ccnf.CompanyName))-1)
                     ELSE RTRIM(ccnf.CompanyName) END
              , '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' ')))) LIKE :qC
          )`, { qC: likeC });
            }
        }
        if (v.venueTypeId != null && Number.isFinite(v.venueTypeId)) {
            qb.andWhere('v.venueTypeId = :vtypeId', { vtypeId: v.venueTypeId });
        }
        if (v.dmaId != null && Number.isFinite(v.dmaId)) {
            qb.andWhere('c.dmaid = :dmaF', { dmaF: v.dmaId });
        }
        if (Array.isArray(v.dmaIds) && v.dmaIds.length > 0) {
            const normExpr = (alias) => (0, dma_normalization_util_1.dmaMarketNameNormSql)(`${alias}.MarketName`);
            qb.andWhere(`EXISTS (
          SELECT 1
          FROM dbo.DMA ds
          INNER JOIN dbo.DMA dv ON ${normExpr('dv')} = ${normExpr('ds')}
          WHERE ds.DMAID IN (:...dmaIds)
            AND dv.DMAID = c.dmaid
        )`, { dmaIds: v.dmaIds });
        }
        return qb;
    }
    async listAllVenues(offset, limit, filters) {
        const safeOffset = Math.max(0, Math.floor(offset) || 0);
        const safeLimit = Math.min(10_000, Math.max(1, Math.floor(limit) || 25));
        const dataQb = this.baseAllVenuesQuery(filters)
            .select('v.companyId', 'companyId')
            .addSelect(venue_directory_sort_1.ALL_VENUES_ENTERTAINMENT_COMPLEX_NAMES_SQL, 'entertainmentComplexNames')
            .addSelect('v.venueName', 'venueName')
            .addSelect('v.seatingCapacity', 'seatingCapacity')
            .addSelect('v.venueTypeId', 'venueTypeId')
            .addSelect('vt.venueTypeName', 'venueTypeName')
            .addSelect('c.dmaid', 'dmaId')
            .addSelect('d.marketName', 'dmaMarketName')
            .addSelect('pa.city', 'city')
            .addSelect('pa.stateProvince', 'stateProvince');
        (0, venue_directory_sort_1.applyAllVenuesSort)(dataQb, filters.sortBy, filters.sortDir);
        const countQb = this.baseAllVenuesQuery(filters).select('COUNT(1)', 'cnt');
        const totalRow = await countQb.getRawOne();
        const total = Math.floor(Number(totalRow?.cnt ??
            this.pickRaw((totalRow ?? {}), 'cnt', 0) ??
            0));
        const raw = await dataQb.offset(safeOffset).limit(safeLimit).getRawMany();
        const data = raw.map((row) => ({
            companyId: Math.floor(Number(this.pickRaw(row, 'companyId', 0))),
            entertainmentComplexNames: this.nullableStr(this.pickRaw(row, 'entertainmentComplexNames', null)),
            venueName: String(this.pickRaw(row, 'venueName', '')).trim(),
            seatingCapacity: Math.floor(Number(this.pickRaw(row, 'seatingCapacity', 0))),
            venueTypeId: this.nullableInt(this.pickRaw(row, 'venueTypeId', null)),
            venueTypeName: this.nullableStr(this.pickRaw(row, 'venueTypeName', null)),
            dmaId: this.nullableInt(this.pickRaw(row, 'dmaId', null)),
            dmaMarketName: this.nullableStr(this.pickRaw(row, 'dmaMarketName', null)),
            city: this.nullableStr(this.pickRaw(row, 'city', null)),
            stateProvince: this.nullableStr(this.pickRaw(row, 'stateProvince', null)),
        }));
        return { data, total: Number.isFinite(total) && total > 0 ? total : 0 };
    }
    pickRaw(row, key, def) {
        const direct = row[key];
        if (direct != null)
            return direct;
        const l = key.toLowerCase();
        for (const k of Object.keys(row)) {
            if (k.toLowerCase() === l)
                return row[k];
        }
        return def;
    }
    nullableInt(v) {
        if (v == null || v === '')
            return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    nullableStr(v) {
        if (v == null)
            return null;
        const t = String(v).trim();
        return t || null;
    }
    searchTokens(raw) {
        return [
            ...new Set(String(raw ?? '')
                .trim()
                .split(/[^a-zA-Z0-9]+/)
                .map((token) => token.trim())
                .filter(Boolean)),
        ].slice(0, 8);
    }
    escapeLikePattern(raw) {
        return String(raw)
            .replace(/\\/g, '\\\\')
            .replace(/%/g, '\\%')
            .replace(/_/g, '\\_')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]');
    }
};
exports.VenueDirectoryService = VenueDirectoryService;
exports.VenueDirectoryService = VenueDirectoryService = VenueDirectoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(venue_entity_1.Venue)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], VenueDirectoryService);
//# sourceMappingURL=venue-directory.service.js.map