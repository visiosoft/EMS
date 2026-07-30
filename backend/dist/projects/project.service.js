"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ProjectService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const admin_users_service_1 = require("../admin-users/admin-users.service");
const ems_app_created_store_1 = require("../attraction-tours/ems-app-created.store");
const engagement_entity_1 = require("../entities/engagement.entity");
const engagement_project_entity_1 = require("../entities/engagement-project.entity");
const engagement_project_dma_entity_1 = require("../entities/engagement-project-dma.entity");
const engagement_project_venue_entity_1 = require("../entities/engagement-project-venue.entity");
const engagement_project_performance_option_entity_1 = require("../entities/engagement-project-performance-option.entity");
const engagement_venue_entity_1 = require("../entities/engagement-venue.entity");
const engagement_xref_entity_1 = require("../entities/engagement-xref.entity");
const attraction_entity_1 = require("../entities/attraction.entity");
const company_entity_1 = require("../entities/company.entity");
const dma_entity_1 = require("../entities/dma.entity");
const performance_entity_1 = require("../entities/performance.entity");
const tour_entity_1 = require("../entities/tour.entity");
const link_entity_1 = require("../entities/link.entity");
const venue_entity_1 = require("../entities/venue.entity");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const confirmed_offer_multer_config_1 = require("./confirmed-offer-multer.config");
const audit_request_context_service_1 = require("../audit/audit-request-context.service");
const project_stage_constants_1 = require("./project-stage.constants");
const ENGAGEMENT_VENUE_OPTION_STATUS_ALLOWLIST = [
    'Confirmed',
    'Pending',
    'Inactive',
];
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let ProjectService = class ProjectService {
    static { ProjectService_1 = this; }
    projectRepo;
    projectVenueRepo;
    optionRepo;
    projectDmaRepo;
    tourRepo;
    attractionRepo;
    venueRepo;
    companyRepo;
    linkRepo;
    dataSource;
    auditContext;
    adminUsersService;
    emsCreated;
    logger = new common_1.Logger(ProjectService_1.name);
    static VENUE_STATUS_LIST_TTL_MS = 60_000;
    venueStatusListCache = null;
    static OPTION_STATUS_LIST_TTL_MS = 60_000;
    optionStatusListCache = null;
    agentContactColumnNameCache = undefined;
    companyTypeLinkTableCache = undefined;
    static CREATED_BY_NAME_CACHE_TTL_MS = 5 * 60_000;
    createdByNameCache = null;
    constructor(projectRepo, projectVenueRepo, optionRepo, projectDmaRepo, tourRepo, attractionRepo, venueRepo, companyRepo, linkRepo, dataSource, auditContext, adminUsersService, emsCreated) {
        this.projectRepo = projectRepo;
        this.projectVenueRepo = projectVenueRepo;
        this.optionRepo = optionRepo;
        this.projectDmaRepo = projectDmaRepo;
        this.tourRepo = tourRepo;
        this.attractionRepo = attractionRepo;
        this.venueRepo = venueRepo;
        this.companyRepo = companyRepo;
        this.linkRepo = linkRepo;
        this.dataSource = dataSource;
        this.auditContext = auditContext;
        this.adminUsersService = adminUsersService;
        this.emsCreated = emsCreated;
    }
    safeDbIdentifier(name) {
        return `[${String(name).replace(/\]/g, ']]')}]`;
    }
    async canQueryCompanyTypeLinkTable(tableName) {
        try {
            await this.dataSource.query(`SELECT TOP 1 1 AS [ok] FROM [dbo].${this.safeDbIdentifier(tableName)}`);
            return true;
        }
        catch {
            return false;
        }
    }
    normalizeTime(t) {
        if (!t)
            return null;
        const parts = t.trim().split(':');
        if (parts.length === 2)
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
        if (parts.length === 3)
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0').slice(0, 2)}`;
        throw new common_1.BadRequestException({
            message: 'Invalid time format. Use HH:MM or HH:MM:SS.',
        });
    }
    formatTime(t) {
        if (!t)
            return null;
        const parts = t.split(':');
        if (parts.length >= 2)
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        return t;
    }
    async getProjectStageMeta() {
        return { projectStages: [...project_stage_constants_1.PROJECT_STAGE_VALUES], source: 'application' };
    }
    async getOfferReviewStatusMeta() {
        return {
            offerReviewStatuses: [...project_stage_constants_1.OFFER_REVIEW_STATUS_VALUES],
            source: 'application',
        };
    }
    parseVenueStatusEnvAllowlist() {
        const raw = process.env.VENUE_STATUS_ALLOWLIST?.trim();
        if (!raw)
            return [];
        return raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }
    async resolveVenueStatusAllowlist() {
        const fromEnv = this.parseVenueStatusEnvAllowlist();
        if (fromEnv.length > 0) {
            return { values: fromEnv, source: 'environment' };
        }
        return {
            values: [...ENGAGEMENT_VENUE_OPTION_STATUS_ALLOWLIST],
            source: 'application',
        };
    }
    async getVenueStatusMeta() {
        const now = Date.now();
        if (this.venueStatusListCache &&
            now - this.venueStatusListCache.at <
                ProjectService_1.VENUE_STATUS_LIST_TTL_MS) {
            const r = this.venueStatusListCache.result;
            return { venueStatuses: r.values, source: r.source };
        }
        const r = await this.resolveVenueStatusAllowlist();
        this.venueStatusListCache = { at: now, result: r };
        return { venueStatuses: r.values, source: r.source };
    }
    assertValidProjectStage(stage) {
        if (!(0, project_stage_constants_1.isAllowedProjectStage)(stage)) {
            throw new common_1.BadRequestException({
                message: `Invalid project stage "${stage}". Allowed values: ${project_stage_constants_1.PROJECT_STAGE_VALUES.join(', ')}.`,
            });
        }
    }
    assertValidOfferReviewStatus(review, currentStage) {
        if (!(0, project_stage_constants_1.isAllowedOfferReviewStatus)(review)) {
            throw new common_1.BadRequestException({
                message: `Invalid offer review status "${review}". Allowed values: ${project_stage_constants_1.OFFER_REVIEW_STATUS_VALUES.join(', ')}.`,
            });
        }
        if (String(currentStage ?? '')
            .trim()
            .toLowerCase() !== 'submitted') {
            throw new common_1.BadRequestException({
                message: 'Offer review status can only be set once the offer creation status is "Submitted".',
            });
        }
    }
    normalizeDateOnly(value) {
        if (value == null)
            return null;
        if (value instanceof Date) {
            if (Number.isNaN(value.getTime()))
                return null;
            const y = value.getUTCFullYear();
            const m = String(value.getUTCMonth() + 1).padStart(2, '0');
            const d = String(value.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        const t = String(value).trim();
        return t.length > 0 ? t.slice(0, 10) : null;
    }
    assertValidTourDateRange(tourStartDate, tourEndDate) {
        if (!tourStartDate || !tourEndDate) {
            throw new common_1.BadRequestException({
                message: 'Tour start date and end date are required.',
            });
        }
        if (tourStartDate > tourEndDate) {
            throw new common_1.BadRequestException({
                message: 'Tour start date cannot be after end date.',
            });
        }
    }
    parseAgentContactId(value) {
        if (value == null)
            return null;
        const t = String(value).trim();
        if (!t)
            return null;
        const n = Number(t);
        if (!Number.isInteger(n) || n < 1) {
            throw new common_1.BadRequestException({
                message: 'Invalid talent agent. Select a valid talent agent contact.',
            });
        }
        return n;
    }
    async resolveAgentContactColumnName() {
        if (this.agentContactColumnNameCache !== undefined) {
            return this.agentContactColumnNameCache;
        }
        try {
            const rows = await this.dataSource.query(`
        SELECT TOP 1 c.name AS colName
        FROM sys.columns c
        WHERE c.object_id = OBJECT_ID('dbo.EngagementProject', 'U')
          AND LOWER(c.name) IN (
            'agentcontactid',
            'talentagentcontactid',
            'agentcontactassignmentid',
            'contactassignmentid'
          )
        ORDER BY CASE LOWER(c.name)
          WHEN 'agentcontactid' THEN 1
          WHEN 'talentagentcontactid' THEN 2
          WHEN 'agentcontactassignmentid' THEN 3
          WHEN 'contactassignmentid' THEN 4
          ELSE 9
        END
      `);
            const name = String(rows?.[0]?.colName ?? '').trim();
            this.agentContactColumnNameCache = name.length > 0 ? name : null;
            return this.agentContactColumnNameCache;
        }
        catch {
            this.agentContactColumnNameCache = null;
            return null;
        }
    }
    async resolveCompanyTypeLinkTableName() {
        if (this.companyTypeLinkTableCache !== undefined) {
            const cached = this.companyTypeLinkTableCache;
            if (cached && (await this.canQueryCompanyTypeLinkTable(cached))) {
                return cached;
            }
            if (cached) {
                this.companyTypeLinkTableCache = undefined;
            }
            else {
                return null;
            }
        }
        try {
            const rows = await this.dataSource.query(`
        SELECT TOP 1 t.TABLE_NAME AS [tableName]
        FROM INFORMATION_SCHEMA.TABLES t
        INNER JOIN INFORMATION_SCHEMA.COLUMNS cCompany
          ON cCompany.TABLE_SCHEMA = t.TABLE_SCHEMA
         AND cCompany.TABLE_NAME = t.TABLE_NAME
         AND cCompany.COLUMN_NAME = 'CompanyID'
        INNER JOIN INFORMATION_SCHEMA.COLUMNS cType
          ON cType.TABLE_SCHEMA = t.TABLE_SCHEMA
         AND cType.TABLE_NAME = t.TABLE_NAME
         AND cType.COLUMN_NAME = 'CompanyTypeID'
        WHERE t.TABLE_SCHEMA = 'dbo'
          AND t.TABLE_TYPE = 'BASE TABLE'
          AND t.TABLE_NAME <> 'Company'
        ORDER BY
          CASE t.TABLE_NAME
            WHEN 'CompanyCompanyType' THEN 1
            WHEN 'CompanyTypeCompany' THEN 2
            WHEN 'CompanyTypeAssignment' THEN 3
            WHEN 'CompanyTypeMap' THEN 4
            ELSE 100
          END,
          t.TABLE_NAME ASC
      `);
            const candidates = rows
                .map((row) => String(row.tableName ?? row.TABLENAME ?? '').trim())
                .filter((name) => name.length > 0);
            for (const candidate of candidates) {
                if (await this.canQueryCompanyTypeLinkTable(candidate)) {
                    this.companyTypeLinkTableCache = candidate;
                    return candidate;
                }
            }
            this.companyTypeLinkTableCache = null;
            return null;
        }
        catch {
            this.companyTypeLinkTableCache = null;
            return null;
        }
    }
    async companyHasTypeName(companyId, expectedTypeName) {
        const co = await this.companyRepo.findOne({
            where: { companyId },
            relations: { companyType: true },
        });
        if (!co) {
            throw new common_1.BadRequestException({ message: 'Company not found.' });
        }
        const expected = expectedTypeName.trim().toLowerCase();
        const primaryType = co.companyType?.companyTypeName?.trim().toLowerCase() ?? '';
        if (primaryType === expected) {
            return true;
        }
        const linkTable = await this.resolveCompanyTypeLinkTableName();
        if (!linkTable) {
            return false;
        }
        const safeTable = this.safeDbIdentifier(linkTable);
        try {
            const rows = await this.dataSource.query(`
        SELECT TOP 1 1 AS [ok]
        FROM [dbo].${safeTable} ctm
        INNER JOIN [dbo].[CompanyType] ct
          ON ct.CompanyTypeID = ctm.CompanyTypeID
        WHERE ctm.CompanyID = ${Math.floor(companyId)}
          AND LOWER(LTRIM(RTRIM(ct.CompanyTypeName))) = LOWER(${`N'${expectedTypeName.replace(/'/g, "''")}'`})
      `);
            return rows.length > 0;
        }
        catch {
            this.companyTypeLinkTableCache = undefined;
            return false;
        }
    }
    async hasAgentContactColumn() {
        return (await this.resolveAgentContactColumnName()) != null;
    }
    async getProjectAgentContactId(engagementProjectId) {
        const col = await this.resolveAgentContactColumnName();
        if (!col)
            return null;
        const pid = Math.floor(Number(engagementProjectId));
        if (!Number.isFinite(pid) || pid < 1)
            return null;
        const rows = await this.dataSource.query(`SELECT TOP 1 [${col}] AS agentContactId FROM dbo.EngagementProject WHERE EngagementProjectID = ${pid}`);
        const raw = rows?.[0]?.agentContactId;
        if (raw == null)
            return null;
        const n = Number(raw);
        return Number.isInteger(n) && n > 0 ? n : null;
    }
    async setProjectAgentContactId(manager, engagementProjectId, agentContactId) {
        const col = await this.resolveAgentContactColumnName();
        if (!col) {
            return;
        }
        const pid = Math.floor(Number(engagementProjectId));
        if (!Number.isFinite(pid) || pid < 1)
            return;
        const valueSql = agentContactId == null ? 'NULL' : String(agentContactId);
        await manager.query(`UPDATE dbo.EngagementProject SET [${col}] = ${valueSql} WHERE EngagementProjectID = ${pid}`);
        const verify = await this.getProjectAgentContactId(pid);
        const expected = agentContactId == null ? null : Number(agentContactId);
        if ((verify ?? null) !== (expected ?? null)) {
            throw new common_1.BadRequestException({
                message: 'Talent agent was not persisted correctly. Please verify EngagementProject agent-contact column mapping.',
            });
        }
    }
    async assertValidVenueStatus(status) {
        const { venueStatuses } = await this.getVenueStatusMeta();
        if (venueStatuses.length === 0) {
            return;
        }
        if (!venueStatuses.includes(status)) {
            throw new common_1.BadRequestException({
                message: `Invalid venue status "${status}". Allowed values: ${venueStatuses.join(', ')}.`,
            });
        }
    }
    parseOptionStatusEnvAllowlist() {
        const raw = process.env.OPTION_STATUS_ALLOWLIST?.trim();
        if (!raw)
            return [];
        return raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }
    async resolveOptionStatusAllowlist() {
        const fromEnv = this.parseOptionStatusEnvAllowlist();
        if (fromEnv.length > 0) {
            return { values: fromEnv, source: 'environment' };
        }
        return {
            values: [...ENGAGEMENT_VENUE_OPTION_STATUS_ALLOWLIST],
            source: 'application',
        };
    }
    async getOptionStatusMeta() {
        const now = Date.now();
        if (this.optionStatusListCache &&
            now - this.optionStatusListCache.at <
                ProjectService_1.OPTION_STATUS_LIST_TTL_MS) {
            const r = this.optionStatusListCache.result;
            return { optionStatuses: r.values, source: r.source };
        }
        const r = await this.resolveOptionStatusAllowlist();
        this.optionStatusListCache = { at: now, result: r };
        return { optionStatuses: r.values, source: r.source };
    }
    async assertValidOptionStatus(status) {
        const { optionStatuses } = await this.getOptionStatusMeta();
        if (optionStatuses.length === 0) {
            return;
        }
        if (!optionStatuses.includes(status)) {
            throw new common_1.BadRequestException({
                message: `Invalid performance option status "${status}". Allowed values: ${optionStatuses.join(', ')}.`,
            });
        }
    }
    async assertTourExists(tourId) {
        const tour = await this.tourRepo.findOne({ where: { tourId } });
        if (!tour) {
            throw new common_1.BadRequestException({
                message: `Tour with ID ${tourId} not found.`,
            });
        }
        return tour;
    }
    async assertCompanyIsTalentAgency(companyId) {
        const isTalentAgency = await this.companyHasTypeName(companyId, 'Talent Agency');
        if (!isTalentAgency) {
            throw new common_1.BadRequestException({
                message: 'Talent agency must be a company of type Talent Agency.',
            });
        }
    }
    async assertVenueCompany(venueCompanyId) {
        const company = await this.companyRepo.findOne({
            where: { companyId: venueCompanyId },
        });
        if (!company) {
            throw new common_1.BadRequestException({
                message: `Company with ID ${venueCompanyId} not found.`,
            });
        }
        const venue = await this.venueRepo.findOne({
            where: { companyId: venueCompanyId },
        });
        if (!venue) {
            throw new common_1.BadRequestException({
                message: 'Company exists but is not a venue.',
            });
        }
    }
    async assertProjectExists(id) {
        const project = await this.projectRepo.findOne({
            where: { engagementProjectId: id },
        });
        if (!project) {
            throw new common_1.NotFoundException({
                message: `Project with ID ${id} not found.`,
            });
        }
        return project;
    }
    projectXrefKey(projectId) {
        return `EngagementProject:${projectId}`;
    }
    async getConvertedEngagementId(projectId, manager = this.dataSource.manager) {
        const xref = await manager.findOne(engagement_xref_entity_1.EngagementXref, {
            where: { sourceEngagementId: this.projectXrefKey(projectId) },
        });
        return xref?.engagementId ?? null;
    }
    async assertProjectEditable(projectId) {
        const convertedEngagementId = await this.getConvertedEngagementId(projectId);
        if (convertedEngagementId != null) {
            throw new common_1.ConflictException({
                message: 'This project has already been converted into an engagement and is view-only. Open the engagement to make further changes.',
                engagementId: convertedEngagementId,
            });
        }
    }
    async convertProjectToEngagement(manager, project, openingPerformances = []) {
        const existing = await this.getConvertedEngagementId(project.engagementProjectId, manager);
        if (existing != null)
            return existing;
        const venues = await manager.find(engagement_project_venue_entity_1.EngagementProjectVenue, {
            where: { engagementProjectId: project.engagementProjectId },
            order: { engagementProjectVenueId: 'ASC' },
        });
        if (venues.length === 0) {
            throw new common_1.BadRequestException({
                message: 'Add at least one venue proposal before converting this project into an engagement.',
            });
        }
        const venueCompanyIds = new Set();
        for (const venue of venues) {
            if (venueCompanyIds.has(venue.venueCompanyId)) {
                throw new common_1.BadRequestException({
                    message: 'A venue has been proposed more than once. Remove the duplicate venue before converting this project into an engagement.',
                });
            }
            venueCompanyIds.add(venue.venueCompanyId);
        }
        let firstEngagementId = null;
        for (const venue of venues) {
            const existingVenueXref = await manager.findOne(engagement_xref_entity_1.EngagementXref, {
                where: {
                    sourceEngagementId: `EngagementProjectVenue:${venue.engagementProjectVenueId}`,
                },
            });
            if (existingVenueXref) {
                if (firstEngagementId === null) {
                    firstEngagementId = existingVenueXref.engagementId;
                }
                continue;
            }
            const performanceRows = [];
            const showDateTimes = new Set();
            const addPerformanceRow = (dateRaw, timeRaw, statusRaw, missingMessage) => {
                const date = this.normalizeDateOnly(dateRaw);
                const time = this.normalizeTime(timeRaw);
                if (!date || !time) {
                    throw new common_1.BadRequestException({
                        message: missingMessage,
                    });
                }
                const key = `${date}T${time}`;
                if (showDateTimes.has(key)) {
                    throw new common_1.BadRequestException({
                        message: 'Two proposed performances for a venue use the same date and time. Change one before converting this project.',
                    });
                }
                showDateTimes.add(key);
                performanceRows.push({
                    date,
                    time,
                    status: (statusRaw ?? '').trim() || project_stage_constants_1.DEFAULT_PUBLIC_TICKETING_STATUS,
                });
            };
            for (const opening of openingPerformances ?? []) {
                addPerformanceRow(opening.performanceDate, opening.performanceTime, opening.performanceStatus, 'Every opening show needs both a date and time before this project can be converted into an engagement.');
            }
            const options = await manager.find(engagement_project_performance_option_entity_1.EngagementProjectPerformanceOption, {
                where: {
                    engagementProjectId: project.engagementProjectId,
                    engagementProjectVenueId: venue.engagementProjectVenueId,
                },
                order: { proposedDate: 'ASC', performanceOptionId: 'ASC' },
            });
            for (const option of options) {
                addPerformanceRow(option.proposedDate, option.proposedTime, project_stage_constants_1.DEFAULT_PRIVATE_TICKETING_STATUS, 'Every proposed performance needs both a date and time before this project can be converted into an engagement.');
            }
            if (performanceRows.length === 0) {
                throw new common_1.BadRequestException({
                    message: 'Add at least one opening show or proposed performance for each venue before converting this project into an engagement.',
                });
            }
            const savedEngagement = await manager.save(engagement_entity_1.Engagement, manager.create(engagement_entity_1.Engagement, {
                engagementStatus: 'Unknown',
                engagementScaling: null,
                tourId: project.tourId,
                sellableCapacity: null,
                grossPotential: null,
            }));
            if (firstEngagementId === null) {
                firstEngagementId = savedEngagement.engagementId;
            }
            await manager.save(engagement_venue_entity_1.EngagementVenue, manager.create(engagement_venue_entity_1.EngagementVenue, {
                engagementId: savedEngagement.engagementId,
                venueCompanyId: venue.venueCompanyId,
                isPrimary: true,
            }));
            for (const row of performanceRows) {
                await manager.save(performance_entity_1.Performance, manager.create(performance_entity_1.Performance, {
                    engagementId: savedEngagement.engagementId,
                    performanceStatus: row.status,
                    performanceDate: row.date,
                    performanceTime: row.time,
                }));
            }
            await manager.save(engagement_xref_entity_1.EngagementXref, manager.create(engagement_xref_entity_1.EngagementXref, {
                sourceEngagementId: `EngagementProjectVenue:${venue.engagementProjectVenueId}`,
                engagementId: savedEngagement.engagementId,
            }));
            this.emsCreated.recordEngagement(savedEngagement.engagementId);
        }
        if (firstEngagementId !== null) {
            await manager.save(engagement_xref_entity_1.EngagementXref, manager.create(engagement_xref_entity_1.EngagementXref, {
                sourceEngagementId: this.projectXrefKey(project.engagementProjectId),
                engagementId: firstEngagementId,
            }));
        }
        return firstEngagementId;
    }
    isOidLike(value) {
        const trimmed = String(value ?? '').trim();
        return GUID_RE.test(trimmed);
    }
    async getCreatedByNameMap() {
        const now = Date.now();
        if (this.createdByNameCache &&
            now - this.createdByNameCache.at <
                ProjectService_1.CREATED_BY_NAME_CACHE_TTL_MS) {
            return this.createdByNameCache.byOid;
        }
        try {
            const users = await this.adminUsersService.listUsers();
            const byOid = new Map();
            for (const user of users) {
                const id = String(user.id ?? '')
                    .trim()
                    .toLowerCase();
                const name = String(user.name ?? '').trim();
                if (!id || !name)
                    continue;
                byOid.set(id, name);
            }
            this.createdByNameCache = { at: now, byOid };
            return byOid;
        }
        catch (error) {
            this.logger.warn(`Could not resolve CreatedBy display names from user directory: ${error instanceof Error ? error.message : String(error)}`);
            return new Map();
        }
    }
    rememberCreatedByName(oid, name) {
        const key = String(oid ?? '')
            .trim()
            .toLowerCase();
        const value = String(name ?? '').trim();
        if (!key || !value)
            return;
        const now = Date.now();
        if (this.createdByNameCache &&
            now - this.createdByNameCache.at <
                ProjectService_1.CREATED_BY_NAME_CACHE_TTL_MS) {
            this.createdByNameCache.byOid.set(key, value);
            return;
        }
        this.createdByNameCache = {
            at: now,
            byOid: new Map([[key, value]]),
        };
    }
    async resolveCreatedByDisplayValue(value, createdByNameMap) {
        if (value == null)
            return null;
        const trimmed = value.trim();
        if (!trimmed)
            return null;
        if (!this.isOidLike(trimmed))
            return trimmed;
        const byOid = createdByNameMap ?? (await this.getCreatedByNameMap());
        const oid = trimmed.toLowerCase();
        const mappedName = byOid.get(oid);
        if (mappedName)
            return mappedName;
        try {
            const user = await this.adminUsersService.findUserById(trimmed);
            const foundName = user?.name?.trim();
            if (foundName) {
                this.rememberCreatedByName(oid, foundName);
                if (createdByNameMap)
                    createdByNameMap.set(oid, foundName);
                return foundName;
            }
        }
        catch (error) {
            this.logger.warn(`Could not resolve CreatedBy name for OID ${trimmed}: ${error instanceof Error ? error.message : String(error)}`);
        }
        const requestOid = this.auditContext.getUserOid()?.trim().toLowerCase();
        if (requestOid && requestOid === oid) {
            const requestName = this.auditContext.getUserDisplayName()?.trim();
            if (requestName)
                return requestName.slice(0, 200);
        }
        return 'Unknown user';
    }
    async resolveCreatedByDisplayValuesForRows(rows) {
        const oids = new Set();
        for (const row of rows) {
            const raw = row.createdBy?.trim();
            if (!raw || !this.isOidLike(raw))
                continue;
            oids.add(raw.toLowerCase());
        }
        if (oids.size === 0)
            return new Map();
        const byOid = await this.getCreatedByNameMap();
        const resolved = new Map();
        for (const oid of oids) {
            const name = byOid.get(oid);
            if (name)
                resolved.set(oid, name);
        }
        return resolved;
    }
    resolveProjectCreatedBy(createdByFromPayload) {
        const auditOid = this.auditContext.getUserOid();
        if (auditOid && auditOid.trim().length > 0) {
            return auditOid.trim().slice(0, 200);
        }
        const fallback = createdByFromPayload?.trim();
        if (!fallback)
            return null;
        return this.isOidLike(fallback) ? fallback.slice(0, 200) : null;
    }
    normalizeDmaIds(ids) {
        if (!ids?.length)
            return [];
        const seen = new Set();
        for (const n of ids) {
            if (typeof n === 'number' && Number.isInteger(n) && n >= 1)
                seen.add(n);
        }
        return [...seen].sort((a, b) => a - b);
    }
    async assertDmasExist(manager, dmaIds) {
        if (dmaIds.length === 0)
            return;
        const dmaRepo = manager.getRepository(dma_entity_1.Dma);
        const cnt = await dmaRepo
            .createQueryBuilder('d')
            .where('d.dmaid IN (:...ids)', { ids: dmaIds })
            .getCount();
        if (cnt !== dmaIds.length) {
            throw new common_1.BadRequestException({
                message: 'One or more selected markets (DMA) are not in the database. Refresh the list and try again.',
            });
        }
    }
    async insertProjectDmasInTransaction(manager, projectId, dmaIds) {
        const normalized = this.normalizeDmaIds(dmaIds);
        if (normalized.length === 0)
            return;
        await this.assertDmasExist(manager, normalized);
        for (const dmaid of normalized) {
            await manager.save(engagement_project_dma_entity_1.EngagementProjectDma, manager.create(engagement_project_dma_entity_1.EngagementProjectDma, {
                engagementProjectId: projectId,
                dmaid,
            }));
        }
    }
    async assertVenueInProject(projectId, venueId) {
        const venue = await this.projectVenueRepo.findOne({
            where: {
                engagementProjectId: projectId,
                engagementProjectVenueId: venueId,
            },
        });
        if (!venue) {
            throw new common_1.NotFoundException({
                message: `Venue proposal with ID ${venueId} not found in project ${projectId}.`,
            });
        }
        return venue;
    }
    async assertOptionInProject(projectId, optionId) {
        const option = await this.optionRepo.findOne({
            where: { engagementProjectId: projectId, performanceOptionId: optionId },
        });
        if (!option) {
            throw new common_1.NotFoundException({
                message: `Performance option with ID ${optionId} not found in project ${projectId}.`,
            });
        }
        return option;
    }
    mapProjectVenueQueryFailed(op, projectId, e, venueStatus) {
        const d = String(e.driverError ?? e.message);
        this.logger.error(`Project venue ${op} failed (projectId=${projectId}): ${d}`);
        const driver = e.driverError;
        const n = driver?.number;
        if (n === 2627 ||
            n === 2601 ||
            /duplicate key|UNIQUE KEY constraint/i.test(d)) {
            throw new common_1.ConflictException({
                message: 'This venue is already added to this project.',
                detail: d,
            });
        }
        if (n === 547 || /FOREIGN KEY/i.test(d)) {
            throw new common_1.BadRequestException({
                message: 'This venue can’t be linked. Check that the company is a valid venue in the system and the project still exists.',
                detail: d,
            });
        }
        if (venueStatus &&
            (/CHECK constraint|VenueStatus/i.test(d) || /VenueStatus/i.test(d))) {
            throw new common_1.BadRequestException({
                message: `This venue status isn’t accepted by the database: ${venueStatus}.`,
                detail: d,
            });
        }
        throw new common_1.BadRequestException({
            message: 'Could not add the venue. The database rejected the change — check the server log for details.',
            detail: d,
        });
    }
    async buildProjectResponse(project) {
        const tour = await this.tourRepo.findOne({
            where: { tourId: project.tourId },
            relations: { attraction: true, talentAgencyCompany: true },
        });
        const attraction = tour?.attraction ?? null;
        const effectiveMgmtId = tour?.talentAgencyCompanyId ?? null;
        const effectiveMgmtName = tour?.talentAgencyCompany?.companyName ?? null;
        const dbVenues = await this.projectVenueRepo.find({
            where: { engagementProjectId: project.engagementProjectId },
        });
        const options = await this.optionRepo.find({
            where: { engagementProjectId: project.engagementProjectId },
            order: { proposedDate: 'ASC' },
        });
        const projectDmas = await this.projectDmaRepo.find({
            where: { engagementProjectId: project.engagementProjectId },
            order: { dmaid: 'ASC' },
        });
        const agentContactId = await this.getProjectAgentContactId(project.engagementProjectId);
        const convertedEngagementId = await this.getConvertedEngagementId(project.engagementProjectId);
        const firstVenueId = dbVenues[0]?.engagementProjectVenueId;
        const optionsForVenue = (venueRowId) => {
            const linked = options.filter((o) => o.engagementProjectVenueId === venueRowId);
            if (linked.length > 0)
                return linked;
            if (venueRowId === firstVenueId) {
                return options.filter((o) => o.engagementProjectVenueId == null);
            }
            return [];
        };
        const venueCompanyIds = [
            ...new Set(dbVenues
                .map((v) => Number(v.venueCompanyId))
                .filter((id) => Number.isInteger(id) && id > 0)),
        ];
        const [venueCompanies, venueRows] = venueCompanyIds.length > 0
            ? await Promise.all([
                this.companyRepo.find({
                    where: { companyId: (0, typeorm_2.In)(venueCompanyIds) },
                    relations: { dma: true },
                }),
                this.venueRepo.find({
                    where: { companyId: (0, typeorm_2.In)(venueCompanyIds) },
                }),
            ])
            : [[], []];
        const venueCompanyById = new Map(venueCompanies.map((company) => [company.companyId, company]));
        const venueByCompanyId = new Map(venueRows.map((venue) => [venue.companyId, venue]));
        const venueRowIds = dbVenues.map((v) => v.engagementProjectVenueId);
        const venueXrefs = venueRowIds.length > 0
            ? await this.dataSource.manager.find(engagement_xref_entity_1.EngagementXref, {
                where: {
                    sourceEngagementId: (0, typeorm_2.In)(venueRowIds.map((id) => `EngagementProjectVenue:${id}`)),
                },
            })
            : [];
        const engagementIdByVenueRowId = new Map(venueXrefs.map((xref) => {
            const parts = xref.sourceEngagementId.split(':');
            const rowId = Number(parts[1]);
            return [rowId, xref.engagementId];
        }));
        const venuesWithDetails = dbVenues.map((v) => {
            const company = venueCompanyById.get(v.venueCompanyId);
            const venue = venueByCompanyId.get(v.venueCompanyId);
            return {
                engagementProjectVenueId: v.engagementProjectVenueId,
                engagementProjectId: v.engagementProjectId,
                venueCompanyId: v.venueCompanyId,
                venueCompanyName: company?.companyName ?? null,
                venueName: venue?.venueName ?? null,
                venueDmaId: company?.dmaid ?? null,
                venueDmaMarketName: company?.dma?.marketName ?? null,
                venueStatus: v.venueStatus,
                configName: null,
                dealType: null,
                guarantee: null,
                splitPct: null,
                breakeven: null,
                marketingCoOp: null,
                engagementId: engagementIdByVenueRowId.get(v.engagementProjectVenueId) ??
                    (v.venueStatus === 'Confirmed' ? convertedEngagementId : null),
                performanceOptions: optionsForVenue(v.engagementProjectVenueId).map((o) => ({
                    performanceOptionId: o.performanceOptionId,
                    engagementProjectId: o.engagementProjectId,
                    engagementProjectVenueId: o.engagementProjectVenueId ?? null,
                    proposedDate: o.proposedDate,
                    proposedTime: this.formatTime(o.proposedTime),
                    optionStatus: o.optionStatus,
                })),
            };
        });
        const createdBy = await this.resolveCreatedByDisplayValue(project.createdBy);
        return {
            engagementProjectId: project.engagementProjectId,
            tourId: project.tourId,
            attractionId: tour?.attractionId ?? null,
            tourName: tour?.tourName ?? null,
            tourStartDate: this.normalizeDateOnly(tour?.tourStartDate ?? null),
            tourEndDate: this.normalizeDateOnly(tour?.tourEndDate ?? null),
            attractionName: attraction?.attractionName ?? null,
            talentAgencyCompanyId: effectiveMgmtId,
            talentAgencyCompanyName: effectiveMgmtName,
            projectStage: project.projectStage,
            offerReviewStatus: project.offerReviewStatus,
            confirmedOfferLinkId: project.confirmedOfferLinkId,
            createdDate: project.createdDate,
            createdBy,
            name: null,
            bookerId: null,
            agentContactId,
            dmaIds: projectDmas.map((d) => d.dmaid),
            targetOnSale: null,
            notes: null,
            convertedEngagementId,
            isReadOnly: false,
            venues: venuesWithDetails,
        };
    }
    async create(dto) {
        const tourRow = await this.assertTourExists(dto.tourId);
        await this.assertCompanyIsTalentAgency(dto.talentAgencyCompanyId);
        if (tourRow.talentAgencyCompanyId != null &&
            tourRow.talentAgencyCompanyId !== dto.talentAgencyCompanyId) {
            throw new common_1.BadRequestException({
                message: 'The selected tour already has a different talent agency on file. Use that agency or update the tour first.',
            });
        }
        this.assertValidProjectStage(dto.projectStage);
        if (dto.offerReviewStatus !== undefined && dto.offerReviewStatus != null) {
            this.assertValidOfferReviewStatus(dto.offerReviewStatus, dto.projectStage);
        }
        const normalizedTourStartDate = this.normalizeDateOnly(dto.tourStartDate);
        const normalizedTourEndDate = this.normalizeDateOnly(dto.tourEndDate);
        this.assertValidTourDateRange(normalizedTourStartDate, normalizedTourEndDate);
        const normalizedAgentContactId = this.parseAgentContactId(dto.agentContactId);
        if (!dto.venues?.length) {
            throw new common_1.BadRequestException({
                message: 'Select at least one venue.',
            });
        }
        for (const v of dto.venues) {
            await this.assertVenueCompany(v.venueCompanyId);
            await this.assertValidVenueStatus(v.venueStatus);
            for (const o of v.performanceOptions ?? []) {
                if ((o.proposedDate ?? '').trim().length === 0)
                    continue;
                await this.assertValidOptionStatus(o.optionStatus);
            }
        }
        try {
            return await this.dataSource.transaction(async (manager) => {
                const project = manager.create(engagement_project_entity_1.EngagementProject, {
                    tourId: dto.tourId,
                    projectStage: dto.projectStage,
                    offerReviewStatus: dto.offerReviewStatus ?? null,
                    createdDate: new Date(),
                    createdBy: this.resolveProjectCreatedBy(dto.createdBy),
                });
                const savedProject = await manager.save(engagement_project_entity_1.EngagementProject, project);
                await this.insertProjectDmasInTransaction(manager, savedProject.engagementProjectId, dto.dmaIds);
                for (const v of dto.venues ?? []) {
                    const pv = manager.create(engagement_project_venue_entity_1.EngagementProjectVenue, {
                        engagementProjectId: savedProject.engagementProjectId,
                        venueCompanyId: v.venueCompanyId,
                        venueStatus: v.venueStatus,
                    });
                    const savedPv = await manager.save(engagement_project_venue_entity_1.EngagementProjectVenue, pv);
                    for (const opt of v.performanceOptions ?? []) {
                        const o = manager.create(engagement_project_performance_option_entity_1.EngagementProjectPerformanceOption, {
                            engagementProjectId: savedProject.engagementProjectId,
                            engagementProjectVenueId: savedPv.engagementProjectVenueId,
                            proposedDate: opt.proposedDate,
                            proposedTime: this.normalizeTime(opt.proposedTime),
                            optionStatus: opt.optionStatus,
                        });
                        await manager.save(o);
                    }
                }
                await manager.update(tour_entity_1.Tour, { tourId: dto.tourId }, {
                    talentAgencyCompanyId: dto.talentAgencyCompanyId,
                    tourStartDate: normalizedTourStartDate,
                    tourEndDate: normalizedTourEndDate,
                });
                await this.setProjectAgentContactId(manager, savedProject.engagementProjectId, normalizedAgentContactId);
                const engagementId = (0, project_stage_constants_1.isProjectConversionReview)(dto.offerReviewStatus)
                    ? await this.convertProjectToEngagement(manager, savedProject, dto.openingPerformances)
                    : null;
                return {
                    engagementProjectId: savedProject.engagementProjectId,
                    engagementId,
                    converted: engagementId != null,
                };
            });
        }
        catch (err) {
            if (err instanceof typeorm_2.QueryFailedError) {
                const d = String(err.driverError ?? err.message);
                this.logger.warn(`Create project failed: ${d}`);
                const isStageCheck = /CHECK constraint/i.test(d) && /OfferCreationStatus/i.test(d);
                const isReviewCheck = /CHECK constraint/i.test(d) && /OfferReviewStatus/i.test(d);
                const isOptionStatusCheck = /CHECK constraint/i.test(d) && /OptionStatus/i.test(d);
                throw new common_1.BadRequestException({
                    message: isStageCheck
                        ? `This project stage isn't accepted by the database. Use one of: ${project_stage_constants_1.PROJECT_STAGE_VALUES.join(', ')}.`
                        : isReviewCheck
                            ? `This offer review status isn't accepted by the database. Use one of: ${project_stage_constants_1.OFFER_REVIEW_STATUS_VALUES.join(', ')}.`
                            : isOptionStatusCheck
                                ? 'A proposed date option used a status the database does not allow. Refresh the page and try again, or ask an administrator which option statuses are valid.'
                                : 'Could not create the project. Check that the tour exists and that the information you entered matches your organization’s rules.',
                    detail: d,
                });
            }
            throw err;
        }
    }
    async update(id, dto) {
        const project = await this.assertProjectExists(id);
        const shouldConvert = dto.offerReviewStatus !== undefined &&
            (0, project_stage_constants_1.isProjectConversionReview)(dto.offerReviewStatus);
        if (dto.projectStage !== undefined) {
            this.assertValidProjectStage(dto.projectStage);
            project.projectStage = dto.projectStage;
        }
        if (dto.offerReviewStatus !== undefined && dto.offerReviewStatus != null) {
            const effectiveStage = dto.projectStage ?? project.projectStage;
            this.assertValidOfferReviewStatus(dto.offerReviewStatus, effectiveStage);
            if (dto.offerReviewStatus !== 'Confirmed' &&
                project.confirmedOfferLinkId != null) {
                await this.removeConfirmedOfferPdf(project);
            }
            project.offerReviewStatus = dto.offerReviewStatus;
        }
        else if (dto.offerReviewStatus === null) {
            if (project.confirmedOfferLinkId != null) {
                await this.removeConfirmedOfferPdf(project);
            }
            project.offerReviewStatus = null;
        }
        if (dto.tourId !== undefined) {
            await this.assertTourExists(dto.tourId);
            project.tourId = dto.tourId;
        }
        if (dto.talentAgencyCompanyId !== undefined) {
            await this.assertCompanyIsTalentAgency(dto.talentAgencyCompanyId);
        }
        const normalizedTourStartDate = dto.tourStartDate !== undefined
            ? this.normalizeDateOnly(dto.tourStartDate)
            : undefined;
        const normalizedTourEndDate = dto.tourEndDate !== undefined
            ? this.normalizeDateOnly(dto.tourEndDate)
            : undefined;
        const normalizedAgentContactId = dto.agentContactId !== undefined
            ? this.parseAgentContactId(dto.agentContactId)
            : undefined;
        try {
            const engagementId = await this.dataSource.transaction(async (manager) => {
                if (dto.dmaIds !== undefined) {
                    await manager.delete(engagement_project_dma_entity_1.EngagementProjectDma, {
                        engagementProjectId: id,
                    });
                    const normalized = this.normalizeDmaIds(dto.dmaIds);
                    if (normalized.length > 0) {
                        await this.assertDmasExist(manager, normalized);
                        for (const dmaid of normalized) {
                            await manager.save(engagement_project_dma_entity_1.EngagementProjectDma, manager.create(engagement_project_dma_entity_1.EngagementProjectDma, {
                                engagementProjectId: id,
                                dmaid,
                            }));
                        }
                    }
                }
                if (dto.talentAgencyCompanyId !== undefined) {
                    const effectiveTourId = dto.tourId ?? project.tourId;
                    await manager.update(tour_entity_1.Tour, { tourId: effectiveTourId }, { talentAgencyCompanyId: dto.talentAgencyCompanyId });
                }
                if (normalizedTourStartDate !== undefined ||
                    normalizedTourEndDate !== undefined) {
                    const effectiveTourId = dto.tourId ?? project.tourId;
                    const tourRow = await manager.findOne(tour_entity_1.Tour, {
                        where: { tourId: effectiveTourId },
                    });
                    if (!tourRow) {
                        throw new common_1.BadRequestException({
                            message: 'Selected tour was not found.',
                        });
                    }
                    const mergedStart = normalizedTourStartDate !== undefined
                        ? normalizedTourStartDate
                        : this.normalizeDateOnly(tourRow.tourStartDate ?? null);
                    const mergedEnd = normalizedTourEndDate !== undefined
                        ? normalizedTourEndDate
                        : this.normalizeDateOnly(tourRow.tourEndDate ??
                            null);
                    this.assertValidTourDateRange(mergedStart, mergedEnd);
                    await manager.update(tour_entity_1.Tour, { tourId: effectiveTourId }, { tourStartDate: mergedStart, tourEndDate: mergedEnd });
                }
                if (normalizedAgentContactId !== undefined) {
                    await this.setProjectAgentContactId(manager, id, normalizedAgentContactId);
                }
                await manager.save(engagement_project_entity_1.EngagementProject, project);
                return shouldConvert
                    ? await this.convertProjectToEngagement(manager, project, dto.openingPerformances)
                    : null;
            });
            return { engagementId, converted: engagementId != null };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException)
                throw e;
            if (e instanceof typeorm_2.QueryFailedError) {
                const d = String(e.driverError ?? e.message);
                this.logger.warn(`Update project failed (id=${id}): ${d}`);
                const isStageCheck = /CHECK constraint/i.test(d) && /OfferCreationStatus/i.test(d);
                const isReviewCheck = /CHECK constraint/i.test(d) && /OfferReviewStatus/i.test(d);
                throw new common_1.BadRequestException({
                    message: isStageCheck
                        ? `This project stage isn’t accepted by the database. Use one of: ${project_stage_constants_1.PROJECT_STAGE_VALUES.join(', ')}.`
                        : isReviewCheck
                            ? `This offer review status isn’t accepted by the database. Use one of: ${project_stage_constants_1.OFFER_REVIEW_STATUS_VALUES.join(', ')}.`
                            : 'Could not update the project. Check the information you entered, or ask your administrator if something is blocked by your system’s rules.',
                    detail: d,
                });
            }
            throw e;
        }
    }
    async remove(id) {
        await this.assertProjectExists(id);
        try {
            await this.dataSource.transaction(async (manager) => {
                await manager.delete(engagement_project_performance_option_entity_1.EngagementProjectPerformanceOption, {
                    engagementProjectId: id,
                });
                await manager.delete(engagement_project_venue_entity_1.EngagementProjectVenue, {
                    engagementProjectId: id,
                });
                await manager.delete(engagement_project_dma_entity_1.EngagementProjectDma, {
                    engagementProjectId: id,
                });
                await manager.delete(engagement_project_entity_1.EngagementProject, { engagementProjectId: id });
            });
        }
        catch (e) {
            if (e instanceof typeorm_2.QueryFailedError) {
                const detail = String(e.driverError ?? e.message);
                this.logger.warn(`Project delete blocked (id=${id}): ${detail}`);
                throw new common_1.ConflictException({
                    message: 'This project can’t be removed because it’s still linked to other records. Remove or reassign those links first, or ask an administrator for help.',
                    detail,
                });
            }
            throw e;
        }
    }
    async listPaginated(offset, limit, search, projectStageFilter, sortByRaw, sortDirRaw) {
        const qb = this.projectRepo
            .createQueryBuilder('ep')
            .innerJoinAndSelect('ep.tour', 't')
            .leftJoinAndSelect('t.attraction', 'a')
            .leftJoinAndSelect('t.talentAgencyCompany', 'tmg');
        const stage = (projectStageFilter ?? '').trim();
        if (stage && stage !== 'All') {
            qb.andWhere('ep.projectStage = :projectStage', { projectStage: stage });
        }
        const q = (search ?? '').trim();
        if (q) {
            this.searchTokens(q).forEach((token, index) => {
                const param = `projectSearch${index}`;
                const like = `%${this.escapeLikePattern(token)}%`;
                qb.andWhere(new typeorm_2.Brackets((w) => {
                    w.where(`CAST(ep.engagementProjectId AS VARCHAR(20)) LIKE :${param} ESCAPE '\\'`, { [param]: like })
                        .orWhere(`LOWER(ISNULL(t.tourName, '')) LIKE LOWER(:${param}) ESCAPE '\\'`, { [param]: like })
                        .orWhere(`LOWER(ISNULL(a.attractionName, '')) LIKE LOWER(:${param}) ESCAPE '\\'`, { [param]: like })
                        .orWhere(`LOWER(ISNULL(tmg.companyName, '')) LIKE LOWER(:${param}) ESCAPE '\\'`, { [param]: like })
                        .orWhere(`LOWER(ISNULL(ep.projectStage, '')) LIKE LOWER(:${param}) ESCAPE '\\'`, { [param]: like })
                        .orWhere(`LOWER(ISNULL(ep.createdBy, '')) LIKE LOWER(:${param}) ESCAPE '\\'`, { [param]: like })
                        .orWhere(`CONVERT(VARCHAR(30), ep.createdDate, 126) LIKE :${param} ESCAPE '\\'`, { [param]: like });
                }));
            });
        }
        const sortBy = (sortByRaw ?? '').trim().toLowerCase();
        const sortDir = (sortDirRaw ?? '').trim().toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        const sortWhitelist = {
            attraction: 'a.attractionName',
            tour: 't.tourName',
            tourmgmt: 'tmg.companyName',
            createdby: 'ep.createdBy',
            created: 'ep.createdDate',
        };
        const sortExpr = sortWhitelist[sortBy];
        if (sortExpr) {
            qb.orderBy(sortExpr, sortDir).addOrderBy('ep.engagementProjectId', 'DESC');
        }
        else {
            qb.orderBy('ep.engagementProjectId', 'DESC');
        }
        const total = await qb.getCount();
        const rows = await qb.skip(offset).take(limit).getMany();
        const createdByNameMap = await this.resolveCreatedByDisplayValuesForRows(rows.map((p) => ({ createdBy: p.createdBy })));
        const projectIds = rows.map((p) => p.engagementProjectId);
        const dmaByProject = new Map();
        if (projectIds.length > 0) {
            const links = await this.projectDmaRepo.find({
                where: { engagementProjectId: (0, typeorm_2.In)(projectIds) },
                order: { engagementProjectId: 'ASC', dmaid: 'ASC' },
            });
            for (const link of links) {
                const arr = dmaByProject.get(link.engagementProjectId) ?? [];
                arr.push(link.dmaid);
                dmaByProject.set(link.engagementProjectId, arr);
            }
        }
        return {
            data: await Promise.all(rows.map(async (p) => ({
                engagementProjectId: p.engagementProjectId,
                tourId: p.tourId,
                attractionId: p.tour?.attractionId ?? null,
                tourName: p.tour?.tourName ?? null,
                tourStartDate: this.normalizeDateOnly(p.tour?.tourStartDate ?? null),
                tourEndDate: this.normalizeDateOnly(p.tour?.tourEndDate ?? null),
                attractionName: p.tour?.attraction?.attractionName ?? null,
                talentAgencyCompanyId: p.tour?.talentAgencyCompanyId ?? null,
                talentAgencyCompanyName: p.tour?.talentAgencyCompany?.companyName ?? null,
                projectStage: p.projectStage,
                offerReviewStatus: p.offerReviewStatus,
                createdDate: p.createdDate,
                createdBy: await this.resolveCreatedByDisplayValue(p.createdBy, createdByNameMap),
                name: null,
                bookerId: null,
                agentContactId: null,
                dmaIds: dmaByProject.get(p.engagementProjectId) ?? [],
                targetOnSale: null,
                notes: null,
            }))),
            total,
        };
    }
    async getOne(id) {
        const project = await this.projectRepo.findOne({
            where: { engagementProjectId: id },
            relations: {
                tour: { attraction: true, talentAgencyCompany: true },
            },
        });
        if (!project) {
            throw new common_1.NotFoundException({
                message: `Project with ID ${id} not found.`,
            });
        }
        return this.buildProjectResponse(project);
    }
    async addVenue(projectId, dto) {
        await this.assertProjectExists(projectId);
        await this.assertVenueCompany(dto.venueCompanyId);
        await this.assertValidVenueStatus(dto.venueStatus);
        const existing = await this.projectVenueRepo.findOne({
            where: {
                engagementProjectId: projectId,
                venueCompanyId: dto.venueCompanyId,
            },
        });
        if (existing) {
            throw new common_1.ConflictException({
                message: 'This venue is already added to this project.',
            });
        }
        for (const opt of dto.performanceOptions ?? []) {
            await this.assertValidOptionStatus(opt.optionStatus);
        }
        try {
            return await this.dataSource.transaction(async (manager) => {
                const pv = manager.create(engagement_project_venue_entity_1.EngagementProjectVenue, {
                    engagementProjectId: projectId,
                    venueCompanyId: dto.venueCompanyId,
                    venueStatus: dto.venueStatus,
                });
                const saved = await manager.save(pv);
                for (const opt of dto.performanceOptions ?? []) {
                    const o = manager.create(engagement_project_performance_option_entity_1.EngagementProjectPerformanceOption, {
                        engagementProjectId: projectId,
                        engagementProjectVenueId: saved.engagementProjectVenueId,
                        proposedDate: opt.proposedDate,
                        proposedTime: this.normalizeTime(opt.proposedTime),
                        optionStatus: opt.optionStatus,
                    });
                    await manager.save(o);
                }
                return { engagementProjectVenueId: saved.engagementProjectVenueId };
            });
        }
        catch (e) {
            if (e instanceof common_1.ConflictException ||
                e instanceof common_1.BadRequestException ||
                e instanceof common_1.NotFoundException) {
                throw e;
            }
            if (e instanceof typeorm_2.QueryFailedError) {
                return this.mapProjectVenueQueryFailed('add', projectId, e, dto.venueStatus);
            }
            throw e;
        }
    }
    async updateVenue(projectId, venueId, dto) {
        const pv = await this.assertVenueInProject(projectId, venueId);
        if (dto.venueStatus !== undefined) {
            await this.assertValidVenueStatus(dto.venueStatus);
            pv.venueStatus = dto.venueStatus;
        }
        await this.projectVenueRepo.save(pv);
        if (dto.engagementId) {
            const xrefKey = `EngagementProjectVenue:${venueId}`;
            const xrefRepo = this.dataSource.manager.getRepository(engagement_xref_entity_1.EngagementXref);
            let xref = await xrefRepo.findOne({
                where: { sourceEngagementId: xrefKey },
            });
            if (!xref) {
                xref = xrefRepo.create({
                    sourceEngagementId: xrefKey,
                    engagementId: dto.engagementId,
                });
            }
            else {
                xref.engagementId = dto.engagementId;
            }
            await xrefRepo.save(xref);
        }
    }
    async removeVenue(projectId, venueId) {
        await this.assertVenueInProject(projectId, venueId);
        await this.optionRepo.delete({
            engagementProjectVenueId: venueId,
        });
        await this.projectVenueRepo.delete({
            engagementProjectId: projectId,
            engagementProjectVenueId: venueId,
        });
    }
    async addPerformanceOption(projectId, dto) {
        await this.assertProjectExists(projectId);
        await this.assertValidOptionStatus(dto.optionStatus);
        await this.assertVenueInProject(projectId, dto.engagementProjectVenueId);
        const opt = this.optionRepo.create({
            engagementProjectId: projectId,
            engagementProjectVenueId: dto.engagementProjectVenueId,
            proposedDate: dto.proposedDate,
            proposedTime: this.normalizeTime(dto.proposedTime),
            optionStatus: dto.optionStatus,
        });
        const saved = await this.optionRepo.save(opt);
        return { performanceOptionId: saved.performanceOptionId };
    }
    async updatePerformanceOption(projectId, optionId, dto) {
        const opt = await this.assertOptionInProject(projectId, optionId);
        if (dto.proposedDate !== undefined)
            opt.proposedDate = dto.proposedDate;
        if (dto.proposedTime !== undefined)
            opt.proposedTime = this.normalizeTime(dto.proposedTime);
        if (dto.optionStatus !== undefined) {
            await this.assertValidOptionStatus(dto.optionStatus);
            opt.optionStatus = dto.optionStatus;
        }
        await this.optionRepo.save(opt);
    }
    async removePerformanceOption(projectId, optionId) {
        await this.assertOptionInProject(projectId, optionId);
        await this.optionRepo.delete({
            engagementProjectId: projectId,
            performanceOptionId: optionId,
        });
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
    async uploadConfirmedOfferPdf(projectId, file) {
        const project = await this.assertProjectExists(projectId);
        const publicPath = `/uploads/confirmed-offers/${file.filename}`.slice(0, 2048);
        const link = this.linkRepo.create({
            linkType: 'ConfirmedOffer',
            linkUrl: publicPath,
            linkName: file.originalname,
            linkPath: publicPath,
        });
        const savedLink = await this.linkRepo.save(link);
        project.confirmedOfferLinkId = savedLink.linkId;
        await this.projectRepo.save(project);
        return { linkId: savedLink.linkId, linkName: savedLink.linkName };
    }
    async getConfirmedOfferPdfPath(projectId) {
        const project = await this.assertProjectExists(projectId);
        if (project.confirmedOfferLinkId == null) {
            throw new common_1.NotFoundException('No confirmed-offer PDF has been uploaded for this project.');
        }
        const link = await this.linkRepo.findOne({
            where: { linkId: project.confirmedOfferLinkId },
        });
        if (!link) {
            throw new common_1.NotFoundException('The link record for this confirmed-offer PDF was not found.');
        }
        const fileName = link.linkPath.split('/').pop() ?? '';
        const filePath = path.resolve(path.join(confirmed_offer_multer_config_1.CONFIRMED_OFFER_UPLOAD_DIR, fileName));
        if (!filePath.startsWith(path.resolve(confirmed_offer_multer_config_1.CONFIRMED_OFFER_UPLOAD_DIR))) {
            throw new common_1.BadRequestException('Invalid file path.');
        }
        if (!fs.existsSync(filePath)) {
            throw new common_1.NotFoundException('The confirmed-offer PDF file was not found on disk.');
        }
        return { filePath, linkName: link.linkName };
    }
    async removeConfirmedOfferPdf(project) {
        const linkId = project.confirmedOfferLinkId;
        if (linkId == null)
            return;
        const link = await this.linkRepo.findOne({ where: { linkId } });
        project.confirmedOfferLinkId = null;
        await this.projectRepo.save(project);
        if (link) {
            const fileName = link.linkPath.split('/').pop() ?? '';
            if (fileName) {
                const filePath = path.resolve(path.join(confirmed_offer_multer_config_1.CONFIRMED_OFFER_UPLOAD_DIR, fileName));
                if (filePath.startsWith(path.resolve(confirmed_offer_multer_config_1.CONFIRMED_OFFER_UPLOAD_DIR)) &&
                    fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            await this.linkRepo.remove(link);
        }
    }
};
exports.ProjectService = ProjectService;
exports.ProjectService = ProjectService = ProjectService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(engagement_project_entity_1.EngagementProject)),
    __param(1, (0, typeorm_1.InjectRepository)(engagement_project_venue_entity_1.EngagementProjectVenue)),
    __param(2, (0, typeorm_1.InjectRepository)(engagement_project_performance_option_entity_1.EngagementProjectPerformanceOption)),
    __param(3, (0, typeorm_1.InjectRepository)(engagement_project_dma_entity_1.EngagementProjectDma)),
    __param(4, (0, typeorm_1.InjectRepository)(tour_entity_1.Tour)),
    __param(5, (0, typeorm_1.InjectRepository)(attraction_entity_1.Attraction)),
    __param(6, (0, typeorm_1.InjectRepository)(venue_entity_1.Venue)),
    __param(7, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __param(8, (0, typeorm_1.InjectRepository)(link_entity_1.Link)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        audit_request_context_service_1.AuditRequestContext,
        admin_users_service_1.AdminUsersService,
        ems_app_created_store_1.EmsAppCreatedStore])
], ProjectService);
//# sourceMappingURL=project.service.js.map