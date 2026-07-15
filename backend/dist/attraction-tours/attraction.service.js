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
exports.AttractionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const attraction_entity_1 = require("../entities/attraction.entity");
const link_entity_1 = require("../entities/link.entity");
const tour_entity_1 = require("../entities/tour.entity");
const ems_app_created_store_1 = require("./ems-app-created.store");
let AttractionService = class AttractionService {
    attractionRepo;
    tourRepo;
    emsCreated;
    constructor(attractionRepo, tourRepo, emsCreated) {
        this.attractionRepo = attractionRepo;
        this.tourRepo = tourRepo;
        this.emsCreated = emsCreated;
    }
    async latestTourBannerUrlsByAttractionIds(attractionIds) {
        const uniq = [...new Set(attractionIds)].filter((id) => Number.isInteger(id) && id > 0);
        const map = new Map();
        for (const id of uniq)
            map.set(id, null);
        if (!uniq.length)
            return map;
        const maxRows = await this.tourRepo
            .createQueryBuilder('t')
            .select('t.attractionId', 'attractionId')
            .addSelect('MAX(t.tourId)', 'maxTourId')
            .where('t.attractionId IN (:...ids)', { ids: uniq })
            .groupBy('t.attractionId')
            .getRawMany();
        const tourIds = maxRows
            .map((r) => Number(r.maxTourId))
            .filter((id) => Number.isFinite(id) && id > 0);
        if (!tourIds.length)
            return map;
        const urlRows = await this.tourRepo
            .createQueryBuilder('t')
            .leftJoin(link_entity_1.Link, 'tb', 'tb.linkId = t.bannerLinkId')
            .select('t.tourId', 'tourId')
            .addSelect('t.attractionId', 'attractionId')
            .addSelect('tb.linkUrl', 'tourBannerImageUrl')
            .where('t.tourId IN (:...tourIds)', { tourIds })
            .getRawMany();
        const urlByTourId = new Map();
        for (const row of urlRows) {
            const tid = Number(row.tourId);
            const u = row.tourBannerImageUrl != null
                ? String(row.tourBannerImageUrl).trim()
                : '';
            urlByTourId.set(tid, u || null);
        }
        for (const row of maxRows) {
            const aid = Number(row.attractionId);
            const url = urlByTourId.get(Number(row.maxTourId)) ?? null;
            map.set(aid, url);
        }
        return map;
    }
    async assertUniqueAttractionName(name, excludeAttractionId) {
        const t = name.trim();
        if (!t)
            return;
        const qb = this.attractionRepo
            .createQueryBuilder('a')
            .where('LOWER(a.attractionName) = LOWER(:name)', { name: t });
        if (excludeAttractionId != null) {
            qb.andWhere('a.attractionId != :excludeId', {
                excludeId: excludeAttractionId,
            });
        }
        const found = await qb.getOne();
        if (found) {
            throw new common_1.ConflictException('An attraction with this name already exists. Choose a different name.');
        }
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
    escapeLikePattern(value) {
        return String(value)
            .replace(/\\/g, '\\\\')
            .replace(/%/g, '\\%')
            .replace(/_/g, '\\_')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]');
    }
    async list() {
        const attractions = await this.attractionRepo.find({
            order: { attractionName: 'ASC' },
        });
        const countsRaw = await this.tourRepo
            .createQueryBuilder('t')
            .select('t.attractionId', 'aid')
            .addSelect('COUNT(*)', 'cnt')
            .groupBy('t.attractionId')
            .getRawMany();
        const countMap = new Map();
        for (const r of countsRaw)
            countMap.set(Number(r.aid), Number(r.cnt));
        const bannerMap = await this.latestTourBannerUrlsByAttractionIds(attractions.map((a) => a.attractionId));
        return attractions.map((a) => ({
            attractionId: a.attractionId,
            attractionName: a.attractionName,
            activeTourCount: countMap.get(a.attractionId) ?? 0,
            latestTourBannerImageUrl: bannerMap.get(a.attractionId) ?? null,
            appCreated: this.emsCreated.canDeleteAttraction(a.attractionId),
        }));
    }
    async listPaginated(offset, limit, q, sortByRaw, sortDirRaw) {
        const sortBy = (sortByRaw ?? '').trim().toLowerCase();
        const sortDir = (sortDirRaw ?? '').trim().toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        const baseQb = this.attractionRepo
            .createQueryBuilder('a')
            .addSelect('(SELECT COUNT(1) FROM dbo.[Tour] t2 WHERE t2.[AttractionID] = a.[AttractionID])', 'activeTourCount');
        if (sortBy === 'tours' || sortBy === 'activetours') {
            baseQb
                .orderBy('activeTourCount', sortDir)
                .addOrderBy('a.attractionName', 'ASC');
        }
        else {
            baseQb
                .orderBy('a.attractionName', sortDir)
                .addOrderBy('a.attractionId', 'ASC');
        }
        this.searchTokens(q).forEach((token, index) => {
            const param = `attractionSearch${index}`;
            baseQb.andWhere(`(
          LOWER(ISNULL(a.attractionName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          OR CAST(a.attractionId AS nvarchar(30)) LIKE :${param} ESCAPE '\\'
        )`, { [param]: `%${this.escapeLikePattern(token)}%` });
        });
        const total = await baseQb.getCount();
        const attractions = await baseQb.skip(offset).take(limit).getMany();
        const ids = attractions.map((a) => a.attractionId);
        const countMap = new Map();
        if (ids.length > 0) {
            const countsRaw = await this.tourRepo
                .createQueryBuilder('t')
                .select('t.attractionId', 'aid')
                .addSelect('COUNT(*)', 'cnt')
                .where('t.attractionId IN (:...ids)', { ids })
                .groupBy('t.attractionId')
                .getRawMany();
            for (const r of countsRaw)
                countMap.set(Number(r.aid), Number(r.cnt));
        }
        const bannerMap = await this.latestTourBannerUrlsByAttractionIds(ids);
        return {
            data: attractions.map((a) => ({
                attractionId: a.attractionId,
                attractionName: a.attractionName,
                activeTourCount: countMap.get(a.attractionId) ?? 0,
                latestTourBannerImageUrl: bannerMap.get(a.attractionId) ?? null,
                appCreated: this.emsCreated.canDeleteAttraction(a.attractionId),
            })),
            total,
        };
    }
    async create(dto) {
        const attractionName = dto.attractionName.trim();
        if (!attractionName) {
            throw new common_1.BadRequestException('Attraction name is required.');
        }
        await this.assertUniqueAttractionName(attractionName);
        const row = this.attractionRepo.create({
            attractionName,
            attractionManagementLinkId: null,
        });
        const saved = await this.attractionRepo.save(row);
        this.emsCreated.recordAttraction(saved.attractionId);
        return this.buildListRow(saved.attractionId);
    }
    async update(id, dto) {
        const existing = await this.attractionRepo.findOne({
            where: { attractionId: id },
        });
        if (!existing)
            throw new common_1.NotFoundException({ message: 'Attraction not found.' });
        if (dto.attractionName !== undefined) {
            const attractionName = dto.attractionName.trim();
            if (!attractionName) {
                throw new common_1.BadRequestException('Attraction name is required.');
            }
            await this.assertUniqueAttractionName(attractionName, id);
            existing.attractionName = attractionName;
        }
        await this.attractionRepo.save(existing);
        return this.buildListRow(id);
    }
    async buildListRow(attractionId) {
        const a = await this.attractionRepo.findOne({ where: { attractionId } });
        if (!a) {
            throw new common_1.NotFoundException({ message: 'Attraction not found.' });
        }
        const activeTourCount = await this.tourRepo.count({
            where: { attractionId },
        });
        const bannerMap = await this.latestTourBannerUrlsByAttractionIds([
            attractionId,
        ]);
        return {
            attractionId: a.attractionId,
            attractionName: a.attractionName,
            activeTourCount,
            latestTourBannerImageUrl: bannerMap.get(attractionId) ?? null,
            appCreated: this.emsCreated.canDeleteAttraction(a.attractionId),
        };
    }
    async remove(id) {
        const existing = await this.attractionRepo.findOne({
            where: { attractionId: id },
        });
        if (!existing) {
            throw new common_1.NotFoundException({ message: 'Attraction not found.' });
        }
        const tourCount = await this.tourRepo.count({
            where: { attractionId: id },
        });
        if (tourCount > 0) {
            throw new common_1.ConflictException({
                message: 'This attraction can’t be removed because it still has one or more tours. Remove those tours first (and close any engagements on them), then try again.',
            });
        }
        await this.attractionRepo.delete({ attractionId: id });
        this.emsCreated.removeAttraction(id);
    }
};
exports.AttractionService = AttractionService;
exports.AttractionService = AttractionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(attraction_entity_1.Attraction)),
    __param(1, (0, typeorm_1.InjectRepository)(tour_entity_1.Tour)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        ems_app_created_store_1.EmsAppCreatedStore])
], AttractionService);
//# sourceMappingURL=attraction.service.js.map