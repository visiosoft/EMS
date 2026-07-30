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
var TourService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TourService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const attraction_entity_1 = require("../entities/attraction.entity");
const age_range_entity_1 = require("../entities/age-range.entity");
const class_entity_1 = require("../entities/class.entity");
const company_entity_1 = require("../entities/company.entity");
const contact_entity_1 = require("../entities/contact.entity");
const contact_assignment_entity_1 = require("../entities/contact-assignment.entity");
const engagement_entity_1 = require("../entities/engagement.entity");
const engagement_project_entity_1 = require("../entities/engagement-project.entity");
const job_entity_1 = require("../entities/job.entity");
const link_entity_1 = require("../entities/link.entity");
const tour_audience_age_range_entity_1 = require("../entities/tour-audience-age-range.entity");
const tour_entity_1 = require("../entities/tour.entity");
const tour_talent_agent_entity_1 = require("../entities/tour-talent-agent.entity");
const venue_type_entity_1 = require("../entities/venue-type.entity");
const ems_app_created_store_1 = require("./ems-app-created.store");
let TourService = TourService_1 = class TourService {
    tourRepo;
    attractionRepo;
    classRepo;
    ageRangeRepo;
    tourAudienceAgeRangeRepo;
    jobRepo;
    venueTypeRepo;
    engagementRepo;
    engagementProjectRepo;
    linkRepo;
    companyRepo;
    contactRepo;
    contactAssignmentRepo;
    tourTalentAgentRepo;
    emsCreated;
    logger = new common_1.Logger(TourService_1.name);
    constructor(tourRepo, attractionRepo, classRepo, ageRangeRepo, tourAudienceAgeRangeRepo, jobRepo, venueTypeRepo, engagementRepo, engagementProjectRepo, linkRepo, companyRepo, contactRepo, contactAssignmentRepo, tourTalentAgentRepo, emsCreated) {
        this.tourRepo = tourRepo;
        this.attractionRepo = attractionRepo;
        this.classRepo = classRepo;
        this.ageRangeRepo = ageRangeRepo;
        this.tourAudienceAgeRangeRepo = tourAudienceAgeRangeRepo;
        this.jobRepo = jobRepo;
        this.venueTypeRepo = venueTypeRepo;
        this.engagementRepo = engagementRepo;
        this.engagementProjectRepo = engagementProjectRepo;
        this.linkRepo = linkRepo;
        this.companyRepo = companyRepo;
        this.contactRepo = contactRepo;
        this.contactAssignmentRepo = contactAssignmentRepo;
        this.tourTalentAgentRepo = tourTalentAgentRepo;
        this.emsCreated = emsCreated;
    }
    async assertTalentAgencyCompany(companyId) {
        const co = await this.companyRepo.findOne({
            where: { companyId },
            relations: { companyType: true },
        });
        if (!co) {
            throw new common_1.NotFoundException({ message: 'Company not found.' });
        }
        const typeName = co.companyType?.companyTypeName?.trim().toLowerCase() ?? '';
        if (typeName === 'talent agency')
            return;
        let linkedTalentAgency = false;
        try {
            const rows = await this.companyRepo.manager.query(`
          SELECT TOP 1 1 AS ok
          FROM dbo.CompanyCompanyType cct
          INNER JOIN dbo.CompanyType ct ON ct.CompanyTypeID = cct.CompanyTypeID
          WHERE cct.CompanyID = ${Number(companyId)}
            AND LOWER(LTRIM(RTRIM(ct.CompanyTypeName))) = 'talent agency'
        `);
            linkedTalentAgency = rows.length > 0;
        }
        catch (e) {
            this.logger.warn(`Could not verify dbo.CompanyCompanyType for talent agency ${companyId}: ${e instanceof Error ? e.message : String(e)}`);
        }
        if (!linkedTalentAgency) {
            throw new common_1.BadRequestException({
                message: 'Talent agency must be a company of type Talent Agency.',
            });
        }
    }
    async assertCompanyExists(companyId, label = 'Company') {
        const co = await this.companyRepo.findOne({ where: { companyId } });
        if (!co) {
            throw new common_1.NotFoundException({ message: `${label} not found.` });
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
    normalizeContactIds(ids) {
        return [
            ...new Set((Array.isArray(ids) ? ids : [])
                .map(Number)
                .filter((id) => Number.isInteger(id) && id > 0)),
        ];
    }
    normalizeAgeRangeIds(ids) {
        return [
            ...new Set((Array.isArray(ids) ? ids : [])
                .map(Number)
                .filter((id) => Number.isInteger(id) && id > 0)),
        ];
    }
    normalizeAudienceGender(value) {
        const t = String(value ?? '').trim();
        if (!t)
            return null;
        const allowed = new Set(['All', 'Male', 'Female']);
        if (!allowed.has(t)) {
            throw new common_1.BadRequestException({
                message: 'Audience gender must be All, Male, or Female.',
            });
        }
        return t;
    }
    async labelsForAgeRangeIds(ids) {
        const normalized = this.normalizeAgeRangeIds(ids);
        if (!normalized.length)
            return [];
        const rows = await this.ageRangeRepo.find({
            where: { ageRangeId: (0, typeorm_2.In)(normalized) },
            order: { sortOrder: 'ASC', ageRangeLabel: 'ASC' },
        });
        if (rows.length !== normalized.length) {
            throw new common_1.BadRequestException({
                message: 'One or more audience age ranges are not valid.',
            });
        }
        return rows.map((row) => row.ageRangeLabel);
    }
    async syncTourAudienceAgeRanges(tourId, ids) {
        const normalized = this.normalizeAgeRangeIds(ids);
        const labels = await this.labelsForAgeRangeIds(normalized);
        await this.tourAudienceAgeRangeRepo.delete({ tourId });
        if (normalized.length) {
            await this.tourAudienceAgeRangeRepo.save(normalized.map((ageRangeId) => this.tourAudienceAgeRangeRepo.create({ tourId, ageRangeId })));
        }
        await this.tourRepo.update({ tourId }, { audienceAgeRange: labels.length ? labels.join(', ') : null });
        return labels;
    }
    async tourAgeRangesByTourIds(tourIds) {
        const uniq = [...new Set(tourIds)].filter((id) => Number.isInteger(id) && id > 0);
        const map = new Map();
        for (const id of uniq)
            map.set(id, { ids: [], labels: [] });
        if (!uniq.length)
            return map;
        const rows = await this.tourAudienceAgeRangeRepo.find({
            where: { tourId: (0, typeorm_2.In)(uniq) },
            relations: { ageRange: true },
            order: { ageRange: { sortOrder: 'ASC' } },
        });
        for (const row of rows) {
            const bucket = map.get(row.tourId) ?? { ids: [], labels: [] };
            if (!bucket.ids.includes(row.ageRangeId))
                bucket.ids.push(row.ageRangeId);
            const label = row.ageRange?.ageRangeLabel?.trim();
            if (label && !bucket.labels.includes(label))
                bucket.labels.push(label);
            map.set(row.tourId, bucket);
        }
        return map;
    }
    async resolveJobId(jobName) {
        const name = String(jobName ?? '').trim();
        if (!name)
            return null;
        const existing = await this.jobRepo
            .createQueryBuilder('j')
            .where('LOWER(LTRIM(RTRIM(j.jobName))) = LOWER(LTRIM(RTRIM(:name)))', {
            name,
        })
            .getOne();
        if (existing)
            return existing.jobId;
        const created = await this.jobRepo.save(this.jobRepo.create({
            jobName: name.slice(0, 255),
            jobCode: null,
            isActive: true,
        }));
        return created.jobId;
    }
    async assertTalentAgentContactsBelongToAgency(contactIds, talentAgencyCompanyId) {
        const ids = this.normalizeContactIds(contactIds);
        if (ids.length === 0)
            return ids;
        if (talentAgencyCompanyId == null ||
            !Number.isInteger(Number(talentAgencyCompanyId)) ||
            Number(talentAgencyCompanyId) < 1) {
            throw new common_1.BadRequestException({
                message: 'Select a talent agency before assigning talent agents.',
            });
        }
        const contactCount = await this.contactRepo.count({
            where: { contactId: (0, typeorm_2.In)(ids) },
        });
        if (contactCount !== ids.length) {
            throw new common_1.BadRequestException({
                message: 'One or more selected talent agents no longer exist.',
            });
        }
        const rows = await this.contactAssignmentRepo
            .createQueryBuilder('ca')
            .select('ca.contactId', 'contactId')
            .where('ca.companyId = :companyId', {
            companyId: Number(talentAgencyCompanyId),
        })
            .andWhere('ca.contactId IN (:...ids)', { ids })
            .groupBy('ca.contactId')
            .getRawMany();
        const assigned = new Set(rows.map((row) => Number(row.contactId)));
        const missing = ids.filter((id) => !assigned.has(id));
        if (missing.length > 0) {
            throw new common_1.BadRequestException({
                message: 'One or more selected talent agents are not assigned to this talent agency.',
            });
        }
        return ids;
    }
    async syncTourTalentAgents(tourId, contactIds, talentAgencyCompanyId) {
        const ids = await this.assertTalentAgentContactsBelongToAgency(contactIds, talentAgencyCompanyId);
        await this.tourTalentAgentRepo.delete({ tourId });
        if (ids.length === 0)
            return;
        await this.tourTalentAgentRepo.save(ids.map((contactId) => this.tourTalentAgentRepo.create({ tourId, contactId })));
    }
    async tourTalentAgentsByTourIds(tourIds) {
        const uniq = [...new Set(tourIds)].filter((id) => Number.isInteger(id) && id > 0);
        const map = new Map();
        for (const id of uniq)
            map.set(id, { ids: [], names: [] });
        if (!uniq.length)
            return map;
        const rows = await this.tourTalentAgentRepo.find({
            where: { tourId: (0, typeorm_2.In)(uniq) },
            relations: { contact: { contactInfo: true } },
            order: { tourTalentAgentId: 'ASC' },
        });
        for (const row of rows) {
            const bucket = map.get(row.tourId) ?? { ids: [], names: [] };
            if (!bucket.ids.includes(row.contactId))
                bucket.ids.push(row.contactId);
            const info = row.contact?.contactInfo;
            const name = `${info?.firstName ?? ''} ${info?.lastName ?? ''}`.trim();
            if (name && !bucket.names.includes(name))
                bucket.names.push(name);
            map.set(row.tourId, bucket);
        }
        return map;
    }
    dateOnlyString(v) {
        if (v == null)
            return null;
        const s = v instanceof Date ? v.toISOString() : String(v);
        const trimmed = s.trim();
        if (!trimmed)
            return null;
        return trimmed.slice(0, 10);
    }
    normalizeTourDateInput(v) {
        const t = String(v ?? '').trim();
        return t.length > 0 ? t : null;
    }
    assertTourDateRange(startDate, endDate) {
        if (!startDate || !endDate)
            return;
        if (startDate > endDate) {
            throw new common_1.BadRequestException('Tour start date cannot be after tour end date.');
        }
    }
    async attachBannerFromUpload(tour, file) {
        const fileName = file.filename;
        if (!fileName?.trim()) {
            throw new common_1.BadRequestException('Upload did not produce a filename.');
        }
        const publicPath = `/uploads/tour-banners/${fileName}`.slice(0, 2048);
        const safeName = (file.originalname || 'Tour banner')
            .replace(/[\x00-\x1f]/g, '')
            .slice(0, 255);
        const link = this.linkRepo.create({
            linkType: 'Image',
            linkUrl: publicPath,
            linkPath: publicPath.slice(0, 1024),
            linkName: safeName || 'Tour banner',
        });
        const savedLink = await this.linkRepo.save(link);
        tour.bannerLinkId = savedLink.linkId;
        await this.tourRepo.save(tour);
    }
    async tourBannerUrlsByTourIds(tourIds) {
        const uniq = [...new Set(tourIds)].filter((id) => Number.isInteger(id) && id > 0);
        const map = new Map();
        for (const id of uniq)
            map.set(id, null);
        if (!uniq.length)
            return map;
        const rows = await this.tourRepo
            .createQueryBuilder('t')
            .leftJoin(link_entity_1.Link, 'tb', 'tb.linkId = t.bannerLinkId')
            .select('t.tourId', 'tourId')
            .addSelect('tb.linkUrl', 'tourBannerImageUrl')
            .where('t.tourId IN (:...ids)', { ids: uniq })
            .getRawMany();
        for (const row of rows) {
            const tid = Number(row.tourId);
            const u = row.tourBannerImageUrl != null
                ? String(row.tourBannerImageUrl).trim()
                : '';
            map.set(tid, u || null);
        }
        return map;
    }
    mapTourEntityToRow(t, tourBannerImageUrl, talentAgents, ageRanges, mediaMix) {
        const ageLabels = ageRanges?.labels ?? [];
        return {
            tourId: t.tourId,
            tourName: t.tourName,
            attractionId: t.attractionId,
            attractionName: t.attraction?.attractionName ?? '',
            classId: t.classId,
            className: t.class?.className ?? '',
            audienceGender: t.audienceGender,
            audienceAgeRange: ageLabels.length
                ? ageLabels.join(', ')
                : t.audienceAgeRange,
            audienceAgeRangeIds: ageRanges?.ids ?? [],
            audienceAgeRangeLabels: ageLabels,
            ascap: t.ascap,
            bmi: t.bmi,
            sesac: t.sesac,
            gmr: t.gmr,
            tourInsuranceLanguage: t.tourInsuranceLanguage,
            talentAgencyCompanyId: t.talentAgencyCompanyId ?? t.talentAgencyCompany?.companyId ?? null,
            talentAgencyCompanyName: t.talentAgencyCompany?.companyName ?? null,
            tourManagementCompanyId: t.tourManagementCompanyId ?? t.tourManagementCompany?.companyId ?? null,
            tourManagementCompanyName: t.tourManagementCompany?.companyName ?? null,
            jobId: t.jobId ?? t.job?.jobId ?? null,
            jobName: t.job?.jobName ?? null,
            talentAgentContactIds: talentAgents?.ids ?? [],
            talentAgentNames: talentAgents?.names ?? [],
            techRiderLinkId: t.techRiderLinkId,
            venueTypePreferenceId: t.venueTypePreferenceId,
            venueTypePreferenceName: t.venueTypePreference?.venueTypeName ?? null,
            tourStartDate: this.dateOnlyString(t.tourStartDate),
            tourEndDate: this.dateOnlyString(t.tourEndDate),
            tourBannerImageUrl,
            mediaMix: mediaMix ?? [],
            appCreated: this.emsCreated.canDeleteTour(t.tourId),
        };
    }
    toPositiveIntOrNull(v) {
        const n = Number(v);
        return v != null && v !== '' && Number.isInteger(n) && n > 0 ? n : null;
    }
    toTrimmedOrNull(v) {
        return v == null || v === '' ? null : String(v).trim();
    }
    async tourMediaMixByTourIds(tourIds) {
        const uniq = [...new Set(tourIds)].filter((id) => Number.isInteger(id) && id > 0);
        const map = new Map();
        for (const id of uniq)
            map.set(id, []);
        if (!uniq.length)
            return map;
        const rows = await this.tourRepo.manager.query(`SELECT
        tmm.[TourMediaMixID] AS mmid,
        tmm.[TourID] AS tid,
        tmm.[AdvertisingSubTypeID] AS astid,
        ast.[SubTypeName] AS astn,
        ast.[ParentCategory] AS astpc,
        tmm.[CompanyID] AS cid,
        c.[CompanyName] AS cname
       FROM dbo.TourMediaMix tmm
       LEFT JOIN dbo.AdvertisingSubType ast ON ast.[AdvertisingSubTypeID] = tmm.[AdvertisingSubTypeID]
       LEFT JOIN dbo.Company c ON c.[CompanyID] = tmm.[CompanyID]
       WHERE tmm.[TourID] IN (${uniq.join(',')})
       ORDER BY ast.[ParentCategory], ast.[SubTypeName]`);
        for (const r of rows) {
            const tid = Number(r.tid);
            const bucket = map.get(tid) ?? [];
            bucket.push({
                tourMediaMixId: Number(r.mmid),
                advertisingSubTypeId: Number(r.astid),
                subTypeName: String(r.astn ?? ''),
                parentCategory: this.toTrimmedOrNull(r.astpc),
                companyId: this.toPositiveIntOrNull(r.cid),
                companyName: this.toTrimmedOrNull(r.cname),
            });
            map.set(tid, bucket);
        }
        return map;
    }
    async listAdvertisingSubTypes() {
        const rows = await this.tourRepo.manager.query(`SELECT [AdvertisingSubTypeID] AS id, [SubTypeName] AS name, [ParentCategory] AS pc
       FROM dbo.AdvertisingSubType
       WHERE [IsActive] = 1
       ORDER BY [ParentCategory], [SortOrder], [SubTypeName]`);
        return rows.map((r) => ({
            advertisingSubTypeId: Number(r.id),
            subTypeName: String(r.name ?? ''),
            parentCategory: this.toTrimmedOrNull(r.pc),
        }));
    }
    normalizeMediaMix(entries) {
        const list = Array.isArray(entries) ? entries : [];
        const out = [];
        const seen = new Set();
        for (const e of list) {
            const ast = Number(e?.advertisingSubTypeId);
            if (!Number.isInteger(ast) || ast < 1)
                continue;
            const companyId = this.toPositiveIntOrNull(e?.companyId);
            const key = `${ast}:${companyId ?? 0}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            out.push({ advertisingSubTypeId: ast, companyId });
        }
        return out;
    }
    async syncTourMediaMix(tourId, entries) {
        const normalized = this.normalizeMediaMix(entries);
        if (normalized.length) {
            const subTypeIds = [
                ...new Set(normalized.map((e) => e.advertisingSubTypeId)),
            ];
            const validRows = await this.tourRepo.manager.query(`SELECT [AdvertisingSubTypeID] AS id FROM dbo.AdvertisingSubType
         WHERE [IsActive] = 1 AND [AdvertisingSubTypeID] IN (${subTypeIds.join(',')})`);
            const validSubTypeIds = new Set(validRows.map((r) => Number(r.id)));
            if (validSubTypeIds.size !== subTypeIds.length) {
                throw new common_1.BadRequestException({
                    message: 'One or more advertising sub-types are not valid.',
                });
            }
            const companyIds = [
                ...new Set(normalized
                    .map((e) => e.companyId)
                    .filter((id) => id != null)),
            ];
            if (companyIds.length) {
                const companyCount = await this.companyRepo.count({
                    where: { companyId: (0, typeorm_2.In)(companyIds) },
                });
                if (companyCount !== companyIds.length) {
                    throw new common_1.BadRequestException({
                        message: 'One or more advertising outlet companies no longer exist.',
                    });
                }
            }
        }
        await this.tourRepo.manager.query(`DELETE FROM dbo.TourMediaMix WHERE [TourID] = ${tourId}`);
        for (const e of normalized) {
            const companyVal = e.companyId == null ? 'NULL' : String(e.companyId);
            await this.tourRepo.manager.query(`INSERT INTO dbo.TourMediaMix ([TourID], [AdvertisingSubTypeID], [CompanyID])
         VALUES (${tourId}, ${e.advertisingSubTypeId}, ${companyVal})`);
        }
    }
    async assertUniqueTourName(tourName, excludeTourId) {
        const t = tourName.trim();
        if (!t)
            return;
        const qb = this.tourRepo
            .createQueryBuilder('t')
            .where('LOWER(t.tourName) = LOWER(:tourName)', { tourName: t });
        if (excludeTourId != null) {
            qb.andWhere('t.tourId != :excludeTourId', { excludeTourId });
        }
        const found = await qb.getOne();
        if (found) {
            throw new common_1.ConflictException('A tour with this name already exists. Choose a different name.');
        }
    }
    async list() {
        const rows = await this.tourRepo
            .createQueryBuilder('t')
            .innerJoinAndSelect('t.attraction', 'a')
            .innerJoinAndSelect('t.class', 'c')
            .leftJoinAndSelect('t.venueTypePreference', 'v')
            .leftJoinAndSelect('t.talentAgencyCompany', 'ta')
            .leftJoinAndSelect('t.tourManagementCompany', 'tm')
            .leftJoinAndSelect('t.job', 'job')
            .orderBy('t.tourName', 'ASC')
            .getMany();
        const bannerMap = await this.tourBannerUrlsByTourIds(rows.map((t) => t.tourId));
        const agentMap = await this.tourTalentAgentsByTourIds(rows.map((t) => t.tourId));
        const ageMap = await this.tourAgeRangesByTourIds(rows.map((t) => t.tourId));
        const mediaMixMap = await this.tourMediaMixByTourIds(rows.map((t) => t.tourId));
        return rows.map((t) => this.mapTourEntityToRow(t, bannerMap.get(t.tourId) ?? null, agentMap.get(t.tourId), ageMap.get(t.tourId), mediaMixMap.get(t.tourId)));
    }
    async listPaginated(offset, limit, q, sortByRaw, sortDirRaw) {
        const qb = this.tourRepo
            .createQueryBuilder('t')
            .innerJoinAndSelect('t.attraction', 'a')
            .innerJoinAndSelect('t.class', 'c')
            .leftJoinAndSelect('t.venueTypePreference', 'v')
            .leftJoinAndSelect('t.talentAgencyCompany', 'ta')
            .leftJoinAndSelect('t.tourManagementCompany', 'tm')
            .leftJoinAndSelect('t.job', 'job');
        const sortBy = (sortByRaw ?? '').trim().toLowerCase();
        const sortDir = (sortDirRaw ?? '').trim().toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        if (sortBy === 'attraction') {
            qb.orderBy('a.attractionName', sortDir).addOrderBy('t.tourName', 'ASC');
        }
        else if (sortBy === 'class') {
            qb.orderBy('c.className', sortDir).addOrderBy('t.tourName', 'ASC');
        }
        else if (sortBy === 'management' || sortBy === 'tourmgmt') {
            qb.orderBy('ta.companyName', sortDir).addOrderBy('t.tourName', 'ASC');
        }
        else if (sortBy === 'payable' || sortBy === 'payableentity') {
            qb.orderBy('tm.companyName', sortDir).addOrderBy('t.tourName', 'ASC');
        }
        else {
            qb.orderBy('t.tourName', sortDir).addOrderBy('t.tourId', 'ASC');
        }
        this.searchTokens(q).forEach((token, index) => {
            const param = `tourSearch${index}`;
            qb.andWhere(`(
          LOWER(ISNULL(t.tourName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          OR LOWER(ISNULL(a.attractionName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          OR LOWER(ISNULL(c.className, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          OR LOWER(ISNULL(v.venueTypeName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          OR LOWER(ISNULL(ta.companyName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          OR LOWER(ISNULL(tm.companyName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          OR LOWER(ISNULL(job.jobName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
        )`, { [param]: `%${this.escapeLikePattern(token)}%` });
        });
        const total = await qb.getCount();
        const rows = await qb.skip(offset).take(limit).getMany();
        const bannerMap = await this.tourBannerUrlsByTourIds(rows.map((t) => t.tourId));
        const agentMap = await this.tourTalentAgentsByTourIds(rows.map((t) => t.tourId));
        const ageMap = await this.tourAgeRangesByTourIds(rows.map((t) => t.tourId));
        const mediaMixMap = await this.tourMediaMixByTourIds(rows.map((t) => t.tourId));
        return {
            data: rows.map((t) => this.mapTourEntityToRow(t, bannerMap.get(t.tourId) ?? null, agentMap.get(t.tourId), ageMap.get(t.tourId), mediaMixMap.get(t.tourId))),
            total,
        };
    }
    async listByAttractionPaginated(attractionId, offset, limit) {
        const aid = Math.floor(attractionId);
        if (!Number.isFinite(aid) || aid < 1) {
            return { data: [], total: 0 };
        }
        const qb = this.tourRepo
            .createQueryBuilder('t')
            .innerJoinAndSelect('t.attraction', 'a')
            .innerJoinAndSelect('t.class', 'c')
            .leftJoinAndSelect('t.venueTypePreference', 'v')
            .leftJoinAndSelect('t.talentAgencyCompany', 'ta')
            .leftJoinAndSelect('t.tourManagementCompany', 'tm')
            .leftJoinAndSelect('t.job', 'job')
            .where('t.attractionId = :aid', { aid })
            .orderBy('t.tourName', 'ASC')
            .addOrderBy('t.tourId', 'ASC');
        const total = await qb.getCount();
        const rows = await qb
            .skip(Math.max(0, offset))
            .take(Math.max(1, limit))
            .getMany();
        const bannerMap = await this.tourBannerUrlsByTourIds(rows.map((t) => t.tourId));
        const agentMap = await this.tourTalentAgentsByTourIds(rows.map((t) => t.tourId));
        const ageMap = await this.tourAgeRangesByTourIds(rows.map((t) => t.tourId));
        const mediaMixMap = await this.tourMediaMixByTourIds(rows.map((t) => t.tourId));
        return {
            data: rows.map((t) => this.mapTourEntityToRow(t, bannerMap.get(t.tourId) ?? null, agentMap.get(t.tourId), ageMap.get(t.tourId), mediaMixMap.get(t.tourId))),
            total,
        };
    }
    async listAgeRanges() {
        return this.ageRangeRepo.find({
            order: { sortOrder: 'ASC', ageRangeLabel: 'ASC' },
        });
    }
    async create(dto, bannerFile) {
        const attraction = await this.attractionRepo.findOne({
            where: { attractionId: dto.attractionId },
        });
        if (!attraction) {
            throw new common_1.NotFoundException({ message: 'Attraction not found.' });
        }
        const cls = await this.classRepo.findOne({
            where: { classId: dto.classId },
        });
        if (!cls) {
            throw new common_1.NotFoundException({ message: 'Genre (class) not found.' });
        }
        const tourName = dto.tourName.trim();
        if (!tourName) {
            throw new common_1.BadRequestException('Tour name is required.');
        }
        if (dto.talentAgencyCompanyId == null || dto.talentAgencyCompanyId < 1) {
            throw new common_1.BadRequestException('Talent agency is required when creating a tour.');
        }
        await this.assertTalentAgencyCompany(dto.talentAgencyCompanyId);
        const talentAgentContactIds = await this.assertTalentAgentContactsBelongToAgency(dto.talentAgentContactIds ?? [], dto.talentAgencyCompanyId);
        const tourStartDate = this.normalizeTourDateInput(dto.tourStartDate);
        const tourEndDate = this.normalizeTourDateInput(dto.tourEndDate);
        this.assertTourDateRange(tourStartDate, tourEndDate);
        const audienceGender = this.normalizeAudienceGender(dto.audienceGender);
        const jobId = await this.resolveJobId(dto.jobName);
        const ageRangeLabels = await this.labelsForAgeRangeIds(this.normalizeAgeRangeIds(dto.audienceAgeRangeIds));
        const row = this.tourRepo.create({
            tourName,
            attractionId: dto.attractionId,
            classId: dto.classId,
            audienceGender,
            audienceAgeRange: ageRangeLabels.length
                ? ageRangeLabels.join(', ')
                : null,
            ascap: dto.ascap ?? false,
            bmi: dto.bmi ?? false,
            sesac: dto.sesac ?? false,
            gmr: dto.gmr ?? false,
            tourInsuranceLanguage: null,
            techRiderLinkId: null,
            venueTypePreferenceId: null,
            bannerLinkId: null,
            talentAgencyCompanyId: dto.talentAgencyCompanyId,
            tourManagementCompanyId: null,
            jobId,
            tourStartDate,
            tourEndDate,
        });
        const saved = await this.tourRepo.save(row);
        await this.syncTourAudienceAgeRanges(saved.tourId, dto.audienceAgeRangeIds ?? []);
        await this.syncTourTalentAgents(saved.tourId, talentAgentContactIds, dto.talentAgencyCompanyId);
        this.emsCreated.recordTour(saved.tourId);
        if (bannerFile) {
            await this.attachBannerFromUpload(saved, bannerFile);
        }
        return this.buildListRow(saved.tourId);
    }
    async update(id, dto, bannerFile) {
        const existing = await this.tourRepo.findOne({ where: { tourId: id } });
        if (!existing) {
            throw new common_1.NotFoundException({ message: 'Tour not found.' });
        }
        if (dto.attractionId != null) {
            const a = await this.attractionRepo.findOne({
                where: { attractionId: dto.attractionId },
            });
            if (!a)
                throw new common_1.NotFoundException({ message: 'Attraction not found.' });
            existing.attractionId = dto.attractionId;
        }
        if (dto.classId != null) {
            const c = await this.classRepo.findOne({
                where: { classId: dto.classId },
            });
            if (!c)
                throw new common_1.NotFoundException({ message: 'Genre (class) not found.' });
            existing.classId = dto.classId;
        }
        if (dto.tourName !== undefined) {
            existing.tourName = dto.tourName.trim();
        }
        if (dto.ascap !== undefined)
            existing.ascap = dto.ascap;
        if (dto.bmi !== undefined)
            existing.bmi = dto.bmi;
        if (dto.sesac !== undefined)
            existing.sesac = dto.sesac;
        if (dto.gmr !== undefined)
            existing.gmr = dto.gmr;
        if (dto.audienceGender !== undefined) {
            existing.audienceGender = this.normalizeAudienceGender(dto.audienceGender);
        }
        if (dto.audienceAgeRange !== undefined) {
            existing.audienceAgeRange = dto.audienceAgeRange?.trim() || null;
        }
        if (dto.jobName !== undefined) {
            existing.jobId = await this.resolveJobId(dto.jobName);
        }
        if (dto.tourInsuranceLanguage !== undefined) {
            existing.tourInsuranceLanguage =
                dto.tourInsuranceLanguage?.trim() || null;
        }
        if (dto.venueTypePreferenceId !== undefined) {
            if (dto.venueTypePreferenceId != null) {
                const vt = await this.venueTypeRepo.findOne({
                    where: { venueTypeId: dto.venueTypePreferenceId },
                });
                if (!vt)
                    throw new common_1.NotFoundException({
                        message: 'Venue type not found.',
                    });
            }
            existing.venueTypePreferenceId = dto.venueTypePreferenceId;
        }
        if (dto.talentAgencyCompanyId !== undefined) {
            if (dto.talentAgencyCompanyId != null) {
                await this.assertTalentAgencyCompany(dto.talentAgencyCompanyId);
            }
            existing.talentAgencyCompanyId = dto.talentAgencyCompanyId;
        }
        if (dto.tourManagementCompanyId !== undefined) {
            if (dto.tourManagementCompanyId != null) {
                await this.assertCompanyExists(dto.tourManagementCompanyId, 'Payable entity');
            }
            existing.tourManagementCompanyId = dto.tourManagementCompanyId;
        }
        if (dto.tourStartDate !== undefined) {
            existing.tourStartDate = this.normalizeTourDateInput(dto.tourStartDate);
        }
        if (dto.tourEndDate !== undefined) {
            existing.tourEndDate = this.normalizeTourDateInput(dto.tourEndDate);
        }
        this.assertTourDateRange(this.dateOnlyString(existing.tourStartDate), this.dateOnlyString(existing.tourEndDate));
        const finalName = existing.tourName.trim();
        if (!finalName) {
            throw new common_1.BadRequestException('Tour name is required.');
        }
        existing.tourName = finalName;
        const nextTalentAgencyCompanyId = existing.talentAgencyCompanyId ?? null;
        const agencyChanged = dto.talentAgencyCompanyId !== undefined;
        const nextTalentAgentContactIds = dto.talentAgentContactIds !== undefined
            ? await this.assertTalentAgentContactsBelongToAgency(dto.talentAgentContactIds, nextTalentAgencyCompanyId)
            : null;
        try {
            await this.tourRepo.save(existing);
            if (dto.audienceAgeRangeIds !== undefined) {
                await this.syncTourAudienceAgeRanges(id, dto.audienceAgeRangeIds);
            }
            if (nextTalentAgentContactIds !== null) {
                await this.syncTourTalentAgents(id, nextTalentAgentContactIds, nextTalentAgencyCompanyId);
            }
            else if (agencyChanged) {
                await this.syncTourTalentAgents(id, [], nextTalentAgencyCompanyId);
            }
            if (dto.mediaMix !== undefined) {
                await this.syncTourMediaMix(id, dto.mediaMix);
            }
        }
        catch (e) {
            if (e instanceof typeorm_2.QueryFailedError) {
                const d = String(e.driverError ?? e.message);
                this.logger.warn(`Tour update failed (tourId=${id}): ${d}`);
                throw new common_1.BadRequestException({
                    message: 'Could not update the tour. The talent agent / company may be invalid for this tour, or the change conflicts with existing data.',
                    detail: d,
                });
            }
            throw e;
        }
        const refreshed = await this.tourRepo.findOne({ where: { tourId: id } });
        if (!refreshed) {
            throw new common_1.NotFoundException({ message: 'Tour not found.' });
        }
        if (bannerFile) {
            await this.attachBannerFromUpload(refreshed, bannerFile);
        }
        else if (dto.removeBanner) {
            refreshed.bannerLinkId = null;
            await this.tourRepo.save(refreshed);
        }
        return this.buildListRow(id);
    }
    async buildListRow(tourId) {
        const t = await this.tourRepo
            .createQueryBuilder('t')
            .innerJoinAndSelect('t.attraction', 'a')
            .innerJoinAndSelect('t.class', 'c')
            .leftJoinAndSelect('t.venueTypePreference', 'v')
            .leftJoinAndSelect('t.talentAgencyCompany', 'ta')
            .leftJoinAndSelect('t.tourManagementCompany', 'tm')
            .leftJoinAndSelect('t.job', 'job')
            .where('t.tourId = :tourId', { tourId })
            .getOne();
        if (!t) {
            throw new common_1.NotFoundException({ message: 'Tour not found.' });
        }
        const bannerMap = await this.tourBannerUrlsByTourIds([tourId]);
        const agentMap = await this.tourTalentAgentsByTourIds([tourId]);
        const ageMap = await this.tourAgeRangesByTourIds([tourId]);
        const mediaMixMap = await this.tourMediaMixByTourIds([tourId]);
        return this.mapTourEntityToRow(t, bannerMap.get(tourId) ?? null, agentMap.get(tourId), ageMap.get(tourId), mediaMixMap.get(tourId));
    }
    async remove(id) {
        const existing = await this.tourRepo.findOne({ where: { tourId: id } });
        if (!existing) {
            throw new common_1.NotFoundException({ message: 'Tour not found.' });
        }
        const engCount = await this.engagementRepo.count({
            where: { tourId: id },
        });
        if (engCount > 0) {
            throw new common_1.ConflictException({
                message: 'This tour can’t be removed because it’s still linked to one or more engagements. Remove or close those engagements first, then try again.',
            });
        }
        const projectCount = await this.engagementProjectRepo.count({
            where: { tourId: id },
        });
        if (projectCount > 0) {
            throw new common_1.ConflictException({
                message: 'This tour can’t be removed because it is linked to one or more projects. Remove or reassign the project so it no longer uses this tour, then try again.',
            });
        }
        await this.tourTalentAgentRepo.delete({ tourId: id });
        await this.tourAudienceAgeRangeRepo.delete({ tourId: id });
        await this.tourRepo.delete({ tourId: id });
        this.emsCreated.removeTour(id);
    }
};
exports.TourService = TourService;
exports.TourService = TourService = TourService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tour_entity_1.Tour)),
    __param(1, (0, typeorm_1.InjectRepository)(attraction_entity_1.Attraction)),
    __param(2, (0, typeorm_1.InjectRepository)(class_entity_1.Class)),
    __param(3, (0, typeorm_1.InjectRepository)(age_range_entity_1.AgeRange)),
    __param(4, (0, typeorm_1.InjectRepository)(tour_audience_age_range_entity_1.TourAudienceAgeRange)),
    __param(5, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(6, (0, typeorm_1.InjectRepository)(venue_type_entity_1.VenueType)),
    __param(7, (0, typeorm_1.InjectRepository)(engagement_entity_1.Engagement)),
    __param(8, (0, typeorm_1.InjectRepository)(engagement_project_entity_1.EngagementProject)),
    __param(9, (0, typeorm_1.InjectRepository)(link_entity_1.Link)),
    __param(10, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __param(11, (0, typeorm_1.InjectRepository)(contact_entity_1.Contact)),
    __param(12, (0, typeorm_1.InjectRepository)(contact_assignment_entity_1.ContactAssignment)),
    __param(13, (0, typeorm_1.InjectRepository)(tour_talent_agent_entity_1.TourTalentAgent)),
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
        ems_app_created_store_1.EmsAppCreatedStore])
], TourService);
//# sourceMappingURL=tour.service.js.map