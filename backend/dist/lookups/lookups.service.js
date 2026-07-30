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
exports.LookupsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const class_entity_1 = require("../entities/class.entity");
const company_type_entity_1 = require("../entities/company-type.entity");
const department_entity_1 = require("../entities/department.entity");
const dma_entity_1 = require("../entities/dma.entity");
const dma_normalization_util_1 = require("./dma-normalization.util");
const role_entity_1 = require("../entities/role.entity");
const seating_type_entity_1 = require("../entities/seating-type.entity");
const venue_type_entity_1 = require("../entities/venue-type.entity");
const brand_entity_1 = require("../entities/brand.entity");
const service_provided_entity_1 = require("../entities/service-provided.entity");
const tax_entity_1 = require("../entities/tax.entity");
const company_service_entity_1 = require("../entities/company-service.entity");
const company_type_service_entity_1 = require("../entities/company-type-service.entity");
const company_entity_1 = require("../entities/company.entity");
const non_resident_withholding_entity_1 = require("../entities/non-resident-withholding.entity");
let LookupsService = class LookupsService {
    companyTypeRepo;
    roleRepo;
    departmentRepo;
    seatingTypeRepo;
    dmaRepo;
    classRepo;
    venueTypeRepo;
    brandRepo;
    taxRepo;
    serviceProvidedRepo;
    companyServiceRepo;
    companyTypeServiceRepo;
    companyRepo;
    nonResidentWithholdingRepo;
    constructor(companyTypeRepo, roleRepo, departmentRepo, seatingTypeRepo, dmaRepo, classRepo, venueTypeRepo, brandRepo, taxRepo, serviceProvidedRepo, companyServiceRepo, companyTypeServiceRepo, companyRepo, nonResidentWithholdingRepo) {
        this.companyTypeRepo = companyTypeRepo;
        this.roleRepo = roleRepo;
        this.departmentRepo = departmentRepo;
        this.seatingTypeRepo = seatingTypeRepo;
        this.dmaRepo = dmaRepo;
        this.classRepo = classRepo;
        this.venueTypeRepo = venueTypeRepo;
        this.brandRepo = brandRepo;
        this.taxRepo = taxRepo;
        this.serviceProvidedRepo = serviceProvidedRepo;
        this.companyServiceRepo = companyServiceRepo;
        this.companyTypeServiceRepo = companyTypeServiceRepo;
        this.companyRepo = companyRepo;
        this.nonResidentWithholdingRepo = nonResidentWithholdingRepo;
    }
    async hasDboColumn(tableName, columnName) {
        const rows = await this.companyRepo.manager.query(`
        SELECT TOP 1 1 AS ok
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = @0
          AND COLUMN_NAME = @1
      `, [tableName, columnName]);
        return rows.length > 0;
    }
    async companyTypeIdsForCompany(companyId) {
        const company = await this.companyRepo.findOne({ where: { companyId } });
        if (!company)
            return [];
        const ids = new Set();
        if (Number.isInteger(company.companyTypeId) && company.companyTypeId > 0) {
            ids.add(company.companyTypeId);
        }
        try {
            const rows = await this.companyRepo.manager.query(`
          SELECT cct.CompanyTypeID AS companyTypeId
          FROM dbo.CompanyCompanyType cct
          WHERE cct.CompanyID = @0
        `, [companyId]);
            for (const row of rows) {
                const id = Number(row.companyTypeId ?? row.COMPANYTYPEID);
                if (Number.isInteger(id) && id > 0)
                    ids.add(id);
            }
        }
        catch {
        }
        return [...ids];
    }
    async assertCompanyServiceAllowed(companyId, serviceProvidedId) {
        const companyTypeIds = await this.companyTypeIdsForCompany(companyId);
        if (companyTypeIds.length === 0) {
            throw new common_1.BadRequestException({
                message: 'Selected company does not have a company type, so services cannot be assigned.',
            });
        }
        const allowed = await this.companyTypeServiceRepo.count({
            where: {
                companyTypeId: (0, typeorm_2.In)(companyTypeIds),
                serviceProvidedId,
            },
        });
        if (allowed < 1) {
            throw new common_1.BadRequestException({
                message: 'Selected service is not allowed for this company type. Update dbo.CompanyTypeService or choose an allowed service.',
            });
        }
    }
    findCompanyTypes() {
        return this.companyTypeRepo.find({
            order: { companyTypeName: 'ASC' },
        });
    }
    findRoles() {
        return this.roleRepo.find({ order: { roleName: 'ASC' } });
    }
    findDepartments() {
        return this.departmentRepo.find({ order: { departmentName: 'ASC' } });
    }
    findSeatingTypes() {
        return this.seatingTypeRepo.find({ order: { seatingName: 'ASC' } });
    }
    findClasses() {
        return this.classRepo.find({ order: { className: 'ASC' } });
    }
    findVenueTypes() {
        return this.venueTypeRepo.find({ order: { venueTypeName: 'ASC' } });
    }
    findBrands() {
        return this.brandRepo.find({ order: { brandName: 'ASC' } });
    }
    findTaxes() {
        return this.taxRepo.find({
            order: { taxJurisdictionType: 'ASC', taxName: 'ASC' },
        });
    }
    findServicesProvided() {
        return this.serviceProvidedRepo.find({ order: { serviceName: 'ASC' } });
    }
    async findServicesAllowedForCompanyTypes(companyTypeIdsRaw) {
        const ids = String(companyTypeIdsRaw ?? '')
            .split(',')
            .map((part) => Number(part.trim()))
            .filter((id) => Number.isInteger(id) && id > 0);
        const companyTypeIds = [...new Set(ids)];
        if (companyTypeIds.length === 0)
            return [];
        return this.serviceProvidedRepo
            .createQueryBuilder('sp')
            .innerJoin(company_type_service_entity_1.CompanyTypeService, 'cts', 'cts.serviceProvidedId = sp.serviceProvidedId')
            .where('cts.companyTypeId IN (:...companyTypeIds)', { companyTypeIds })
            .orderBy('sp.serviceName', 'ASC')
            .addOrderBy('sp.serviceProvidedId', 'ASC')
            .distinct(true)
            .getMany();
    }
    async findStagehandProviders() {
        const stagehands = await this.serviceProvidedRepo
            .createQueryBuilder('sp')
            .where('LOWER(sp.serviceName) = LOWER(:n)', { n: 'Stagehands' })
            .getOne();
        if (!stagehands)
            return [];
        const rows = await this.companyServiceRepo.manager.query(`
        SELECT
          c.CompanyID AS companyId,
          c.CompanyName AS companyName,
          ct.CompanyTypeName AS companyTypeName,
          pa.City AS physicalCity,
          pa.StateProvince AS physicalStateProvince,
          dma.MarketName AS dmaMarketName
        FROM dbo.CompanyService cs
        INNER JOIN dbo.Company c
          ON c.CompanyID = cs.CompanyID
        LEFT JOIN dbo.CompanyCompanyType cct
          ON cct.CompanyID = c.CompanyID
        LEFT JOIN dbo.CompanyType ct
          ON ct.CompanyTypeID = COALESCE(cct.CompanyTypeID, c.CompanyTypeID)
        LEFT JOIN dbo.Address pa
          ON pa.AddressID = c.PhysicalAddressID
        LEFT JOIN dbo.DMA dma
          ON dma.PostalCode = pa.PostalCode
        WHERE cs.ServiceProvidedID = @0
        ORDER BY c.CompanyName ASC, ct.CompanyTypeName ASC
      `, [stagehands.serviceProvidedId]);
        const providers = new Map();
        for (const row of rows) {
            const companyId = Number(row.companyId ?? row.CompanyID);
            if (!Number.isInteger(companyId) || companyId <= 0)
                continue;
            const companyTypeName = String(row.companyTypeName ?? row.CompanyTypeName ?? '').trim();
            const current = providers.get(companyId) ?? {
                companyId,
                companyName: String(row.companyName ?? row.CompanyName ?? ''),
                companyTypeName: companyTypeName || null,
                companyTypeNames: [],
                physicalCity: row.physicalCity == null ? null : String(row.physicalCity),
                physicalStateProvince: row.physicalStateProvince == null
                    ? null
                    : String(row.physicalStateProvince),
                dmaMarketName: row.dmaMarketName == null ? null : String(row.dmaMarketName),
            };
            if (companyTypeName &&
                !current.companyTypeNames.some((name) => name.toLowerCase() === companyTypeName.toLowerCase())) {
                current.companyTypeNames.push(companyTypeName);
            }
            providers.set(companyId, current);
        }
        return [...providers.values()];
    }
    async findNonResidentWithholdings() {
        const hasDmaId = await this.hasDboColumn('NonResidentWithholding', 'DMAID');
        if (hasDmaId) {
            const rows = await this.nonResidentWithholdingRepo.find({
                order: { withholdingId: 'ASC' },
            });
            return rows.map((r) => ({
                withholdingId: r.withholdingId,
                withholdingTaxRate: r.withholdingTaxRate,
                dmaid: r.dmaid ?? null,
                taxAgencyId: r.taxAgencyId ?? null,
            }));
        }
        const rows = await this.companyRepo.manager.query(`
        SELECT
          w.WithholdingID AS withholdingId,
          w.WithholdingTaxRate AS withholdingTaxRate,
          CAST(NULL AS int) AS dmaid,
          w.TaxAgencyID AS taxAgencyId
        FROM [dbo].[NonResidentWithholding] w
        ORDER BY w.WithholdingID ASC
      `);
        return rows.map((r) => ({
            withholdingId: Number(r.withholdingId ?? 0),
            withholdingTaxRate: String(r.withholdingTaxRate ?? ''),
            dmaid: null,
            taxAgencyId: r.taxAgencyId == null ? null : Number(r.taxAgencyId),
        }));
    }
    async findDmaByPostal(postalCode) {
        const raw = postalCode.trim();
        if (!raw)
            return null;
        const direct = await this.dmaRepo
            .createQueryBuilder('d')
            .where('d.postalCode = :pc', { pc: raw })
            .orderBy('d.dmaid', 'ASC')
            .getOne();
        if (direct)
            return direct;
        const normalized = raw.toUpperCase().replace(/\s+/g, ' ');
        if (normalized !== raw) {
            const normalizedRow = await this.dmaRepo
                .createQueryBuilder('d')
                .where('d.postalCode = :pc', { pc: normalized })
                .orderBy('d.dmaid', 'ASC')
                .getOne();
            if (normalizedRow)
                return normalizedRow;
        }
        const likeZip = raw.replace(/\D/g, '').slice(0, 5);
        if (likeZip.length === 5) {
            const fuzzy = await this.dmaRepo
                .createQueryBuilder('d')
                .where("REPLACE(REPLACE(d.postalCode, ' ', ''), '-', '') LIKE :z", {
                z: `${likeZip}%`,
            })
                .orderBy('d.dmaid', 'ASC')
                .getOne();
            if (fuzzy)
                return fuzzy;
        }
        return null;
    }
    buildDmaMarketsGroupedSubquery(query, includePostalCount = false) {
        const rawGrouped = this.dmaRepo
            .createQueryBuilder('d')
            .select('MIN(d.dmaid)', 'dmaid')
            .addSelect('d.marketName', 'marketName')
            .addSelect('MIN(d.postalCode)', 'postalCode')
            .addSelect('COUNT(*)', 'cnt')
            .groupBy('d.marketName');
        this.applyDmaMarketSearchFilter(rawGrouped, query);
        const qb = this.dmaRepo.manager
            .createQueryBuilder()
            .select('MIN(g.dmaid)', 'dmaid')
            .addSelect('MIN(g.marketName)', 'marketName')
            .addSelect('MIN(g.postalCode)', 'postalCode');
        if (includePostalCount) {
            qb.addSelect('SUM(g.cnt)', 'postalCount');
        }
        qb.from(`(${rawGrouped.getQuery()})`, 'g')
            .setParameters(rawGrouped.getParameters())
            .groupBy((0, dma_normalization_util_1.dmaMarketNameNormSql)('g.marketName'));
        return qb;
    }
    applyDmaMarketSearchFilter(qb, query) {
        this.searchTokens(query).forEach((token, index) => {
            const param = `dmaMarketSearch${index}`;
            qb.andWhere(`(
          LOWER(ISNULL(d.marketName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          OR LOWER(ISNULL(d.postalCode, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          OR CAST(d.dmaid AS nvarchar(30)) LIKE :${param} ESCAPE '\\'
        )`, { [param]: `%${this.escapeLikePattern(token)}%` });
        });
    }
    mapDmaMarketRows(rows) {
        return rows.map((r) => ({
            dmaid: Number(r.dmaid ?? r.DMAID),
            marketName: String(r.marketName ?? r.MarketName ?? ''),
            postalCode: String(r.postalCode ?? r.PostalCode ?? ''),
        }));
    }
    mapDmaHubMarketRows(rows) {
        return rows.map((r) => ({
            dmaid: Number(r.dmaid ?? r.DMAID),
            marketName: String(r.marketName ?? r.MarketName ?? ''),
            samplePostalCode: String(r.postalCode ?? r.PostalCode ?? ''),
            postalCount: Number(r.postalCount ?? r.PostalCount ?? 0),
        }));
    }
    async findDmaMarkets() {
        const inner = this.buildDmaMarketsGroupedSubquery('');
        const rows = await this.dmaRepo.manager
            .createQueryBuilder()
            .select('t.dmaid', 'dmaid')
            .addSelect('t.marketName', 'marketName')
            .addSelect('t.postalCode', 'postalCode')
            .from(`(${inner.getQuery()})`, 't')
            .setParameters(inner.getParameters())
            .orderBy('t.marketName', 'ASC')
            .addOrderBy('t.dmaid', 'ASC')
            .getRawMany();
        return this.mapDmaMarketRows(rows);
    }
    async searchDmaMarkets(query, limit = 50) {
        const inner = this.buildDmaMarketsGroupedSubquery(query);
        const rows = await this.dmaRepo.manager
            .createQueryBuilder()
            .select('t.dmaid', 'dmaid')
            .addSelect('t.marketName', 'marketName')
            .addSelect('t.postalCode', 'postalCode')
            .from(`(${inner.getQuery()})`, 't')
            .setParameters(inner.getParameters())
            .orderBy('t.marketName', 'ASC')
            .addOrderBy('t.dmaid', 'ASC')
            .take(limit)
            .getRawMany();
        return this.mapDmaMarketRows(rows);
    }
    async findDmaMarketsPaginated(offset, limit, query = '') {
        const inner = this.buildDmaMarketsGroupedSubquery(query);
        const countRow = await this.dmaRepo.manager
            .createQueryBuilder()
            .select('COUNT(*)', 'cnt')
            .from(`(${inner.getQuery()})`, 'dedup')
            .setParameters(inner.getParameters())
            .getRawOne();
        const total = Number(countRow?.cnt ?? 0);
        const rows = await this.dmaRepo.manager
            .createQueryBuilder()
            .select('t.dmaid', 'dmaid')
            .addSelect('t.marketName', 'marketName')
            .addSelect('t.postalCode', 'postalCode')
            .from(`(${inner.getQuery()})`, 't')
            .setParameters(inner.getParameters())
            .orderBy('t.marketName', 'ASC')
            .addOrderBy('t.dmaid', 'ASC')
            .offset(offset)
            .limit(limit)
            .getRawMany();
        return {
            data: this.mapDmaMarketRows(rows),
            total,
        };
    }
    async findDmaHubMarketsPaginated(offset, limit, query = '') {
        const inner = this.buildDmaMarketsGroupedSubquery(query, true);
        const countRow = await this.dmaRepo.manager
            .createQueryBuilder()
            .select('COUNT(*)', 'cnt')
            .from(`(${inner.getQuery()})`, 'dedup')
            .setParameters(inner.getParameters())
            .getRawOne();
        const total = Number(countRow?.cnt ?? 0);
        const rows = await this.dmaRepo.manager
            .createQueryBuilder()
            .select('t.dmaid', 'dmaid')
            .addSelect('t.marketName', 'marketName')
            .addSelect('t.postalCode', 'postalCode')
            .addSelect('t.postalCount', 'postalCount')
            .from(`(${inner.getQuery()})`, 't')
            .setParameters(inner.getParameters())
            .orderBy('t.marketName', 'ASC')
            .addOrderBy('t.dmaid', 'ASC')
            .offset(offset)
            .limit(limit)
            .getRawMany();
        return {
            data: this.mapDmaHubMarketRows(rows),
            total,
        };
    }
    async findDmaHubMarketSuggestions(query, limit = 8) {
        const safeLimit = Math.min(20, Math.max(1, Math.floor(limit)));
        const { data } = await this.findDmaHubMarketsPaginated(0, safeLimit, query);
        return data;
    }
    resolveManagedLookupTable(raw) {
        const normalized = String(raw ?? '')
            .trim()
            .toLowerCase();
        const known = [
            'company-types',
            'venue-types',
            'seating-types',
            'departments',
            'classes',
            'roles',
            'brands',
            'company-services',
            'company-type-services',
            'services-provided',
            'dmas',
        ];
        if (known.includes(normalized)) {
            return normalized;
        }
        throw new common_1.BadRequestException({
            message: 'Unknown lookup table. Supported values: company-types, venue-types, seating-types, departments, classes, roles, brands, company-services, company-type-services, services-provided, dmas.',
        });
    }
    normalizeRequiredName(name) {
        const trimmed = typeof name === 'string' ? name.trim() : '';
        if (!trimmed) {
            throw new common_1.BadRequestException({ message: 'Name is required.' });
        }
        return trimmed.slice(0, 100);
    }
    toPositiveInt(value, label) {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 1) {
            throw new common_1.BadRequestException({
                message: `${label} must be a positive integer.`,
            });
        }
        return n;
    }
    normalizeServiceProvidedIds(dto) {
        const rawValues = Array.isArray(dto.serviceProvidedIds) && dto.serviceProvidedIds.length > 0
            ? dto.serviceProvidedIds
            : dto.serviceProvidedId != null
                ? [dto.serviceProvidedId]
                : [];
        const ids = [
            ...new Set(rawValues
                .map((value) => Number(value))
                .filter((value) => Number.isInteger(value) && value > 0)),
        ];
        if (ids.length === 0) {
            throw new common_1.BadRequestException({
                message: 'Select at least one service.',
            });
        }
        return ids;
    }
    async assertServicesExist(serviceProvidedIds) {
        const services = await this.serviceProvidedRepo.find({
            where: { serviceProvidedId: (0, typeorm_2.In)(serviceProvidedIds) },
            order: { serviceName: 'ASC' },
        });
        if (services.length !== serviceProvidedIds.length) {
            throw new common_1.BadRequestException({
                message: 'One or more selected services do not exist.',
            });
        }
        return services;
    }
    async companyTypeServiceGroup(companyTypeId) {
        const companyType = await this.companyTypeRepo.findOne({
            where: { companyTypeId },
        });
        if (!companyType) {
            throw new common_1.NotFoundException(`CompanyType ${companyTypeId} was not found.`);
        }
        const rows = await this.companyTypeServiceRepo
            .createQueryBuilder('cts')
            .leftJoin(service_provided_entity_1.ServiceProvided, 'sp', 'sp.serviceProvidedId = cts.serviceProvidedId')
            .select([
            'cts.companyTypeId AS companyTypeId',
            'cts.serviceProvidedId AS serviceProvidedId',
            'sp.serviceName AS serviceName',
        ])
            .where('cts.companyTypeId = :companyTypeId', { companyTypeId })
            .orderBy('sp.serviceName', 'ASC')
            .getRawMany();
        const services = rows
            .map((row) => ({
            serviceProvidedId: Number(row.serviceProvidedId),
            serviceName: String(row.serviceName ?? ''),
        }))
            .filter((row) => Number.isInteger(row.serviceProvidedId) && row.serviceProvidedId > 0);
        return {
            companyTypeServiceId: companyTypeId,
            companyTypeId,
            companyTypeName: companyType.companyTypeName,
            serviceProvidedIds: services.map((row) => row.serviceProvidedId),
            serviceNames: services.map((row) => row.serviceName),
            serviceName: services.map((row) => row.serviceName).join(', '),
            services,
        };
    }
    parseSortDirection(raw) {
        return String(raw ?? '')
            .trim()
            .toLowerCase() === 'desc'
            ? 'DESC'
            : 'ASC';
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
    normalizeRequiredPostal(postalCode) {
        const trimmed = typeof postalCode === 'string' ? postalCode.trim() : '';
        if (!trimmed) {
            throw new common_1.BadRequestException({ message: 'Postal code is required.' });
        }
        return trimmed.slice(0, 20);
    }
    async listManagedLookupRows(tableRaw, opts) {
        const table = this.resolveManagedLookupTable(tableRaw);
        const sortBy = String(opts.sortBy ?? '')
            .trim()
            .toLowerCase();
        const sortDir = this.parseSortDirection(opts.sortDir);
        const searchTokens = this.searchTokens(opts.q);
        if (table === 'company-services') {
            const qb = this.companyServiceRepo
                .createQueryBuilder('cs')
                .leftJoin(company_entity_1.Company, 'c', 'c.companyId = cs.companyId')
                .leftJoin(service_provided_entity_1.ServiceProvided, 'sp', 'sp.serviceProvidedId = cs.serviceProvidedId')
                .select([
                'cs.companyServiceId AS companyServiceId',
                'cs.companyId AS companyId',
                'cs.serviceProvidedId AS serviceProvidedId',
                'c.companyName AS companyName',
                'sp.serviceName AS serviceName',
            ]);
            searchTokens.forEach((token, index) => {
                const param = `companyServiceSearch${index}`;
                qb.andWhere(`(
            LOWER(ISNULL(c.companyName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR LOWER(ISNULL(sp.serviceName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR CAST(cs.companyServiceId AS nvarchar(30)) LIKE :${param} ESCAPE '\\'
            OR CAST(cs.companyId AS nvarchar(30)) LIKE :${param} ESCAPE '\\'
            OR CAST(cs.serviceProvidedId AS nvarchar(30)) LIKE :${param} ESCAPE '\\'
          )`, { [param]: `%${this.escapeLikePattern(token)}%` });
            });
            if (sortBy === 'companyid') {
                qb.orderBy('cs.companyId', sortDir).addOrderBy('cs.companyServiceId', 'ASC');
            }
            else if (sortBy === 'serviceprovidedid') {
                qb.orderBy('cs.serviceProvidedId', sortDir).addOrderBy('cs.companyServiceId', 'ASC');
            }
            else if (sortBy === 'companyname') {
                qb.orderBy('c.companyName', sortDir).addOrderBy('cs.companyServiceId', 'ASC');
            }
            else if (sortBy === 'servicename') {
                qb.orderBy('sp.serviceName', sortDir).addOrderBy('cs.companyServiceId', 'ASC');
            }
            else {
                qb.orderBy('cs.companyServiceId', sortDir).addOrderBy('cs.companyId', 'ASC');
            }
            const total = await qb.getCount();
            const rows = await qb
                .offset(opts.offset)
                .limit(opts.limit)
                .getRawMany();
            return {
                data: rows.map((r) => ({
                    companyServiceId: Number(r.companyServiceId),
                    companyId: Number(r.companyId),
                    serviceProvidedId: Number(r.serviceProvidedId),
                    companyName: String(r.companyName ?? ''),
                    serviceName: String(r.serviceName ?? ''),
                })),
                total,
            };
        }
        if (table === 'company-type-services') {
            const qb = this.companyTypeServiceRepo
                .createQueryBuilder('cts')
                .leftJoin(company_type_entity_1.CompanyType, 'ct', 'ct.companyTypeId = cts.companyTypeId')
                .leftJoin(service_provided_entity_1.ServiceProvided, 'sp', 'sp.serviceProvidedId = cts.serviceProvidedId')
                .select([
                'cts.companyTypeServiceId AS companyTypeServiceId',
                'cts.companyTypeId AS companyTypeId',
                'cts.serviceProvidedId AS serviceProvidedId',
                'ct.companyTypeName AS companyTypeName',
                'sp.serviceName AS serviceName',
            ]);
            searchTokens.forEach((token, index) => {
                const param = `companyTypeServiceSearch${index}`;
                qb.andWhere(`(
            LOWER(ISNULL(ct.companyTypeName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR LOWER(ISNULL(sp.serviceName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR CAST(cts.companyTypeServiceId AS nvarchar(30)) LIKE :${param} ESCAPE '\\'
            OR CAST(cts.companyTypeId AS nvarchar(30)) LIKE :${param} ESCAPE '\\'
            OR CAST(cts.serviceProvidedId AS nvarchar(30)) LIKE :${param} ESCAPE '\\'
          )`, { [param]: `%${this.escapeLikePattern(token)}%` });
            });
            qb.orderBy('ct.companyTypeName', 'ASC').addOrderBy('sp.serviceName', 'ASC');
            const rows = await qb.getRawMany();
            const grouped = new Map();
            for (const r of rows) {
                const companyTypeId = Number(r.companyTypeId);
                const serviceProvidedId = Number(r.serviceProvidedId);
                if (!Number.isInteger(companyTypeId) || companyTypeId < 1)
                    continue;
                const current = grouped.get(companyTypeId) ?? {
                    companyTypeServiceId: companyTypeId,
                    companyTypeId,
                    companyTypeName: String(r.companyTypeName ?? ''),
                    serviceProvidedIds: [],
                    serviceNames: [],
                    services: [],
                };
                if (Number.isInteger(serviceProvidedId) &&
                    serviceProvidedId > 0 &&
                    !current.serviceProvidedIds.includes(serviceProvidedId)) {
                    const serviceName = String(r.serviceName ?? '');
                    current.serviceProvidedIds.push(serviceProvidedId);
                    current.serviceNames.push(serviceName);
                    current.services.push({ serviceProvidedId, serviceName });
                }
                grouped.set(companyTypeId, current);
            }
            const data = [...grouped.values()].map((row) => ({
                ...row,
                serviceName: row.serviceNames.join(', '),
            }));
            const dir = sortDir === 'DESC' ? -1 : 1;
            data.sort((a, b) => {
                const av = sortBy === 'servicename'
                    ? String(a.serviceName ?? '')
                    : sortBy === 'companytypeid'
                        ? String(a.companyTypeId).padStart(10, '0')
                        : String(a.companyTypeName ?? '');
                const bv = sortBy === 'servicename'
                    ? String(b.serviceName ?? '')
                    : sortBy === 'companytypeid'
                        ? String(b.companyTypeId).padStart(10, '0')
                        : String(b.companyTypeName ?? '');
                return av.localeCompare(bv, undefined, { sensitivity: 'base' }) * dir;
            });
            const total = data.length;
            return {
                data: data.slice(opts.offset, opts.offset + opts.limit),
                total,
            };
        }
        if (table === 'dmas') {
            const qb = this.dmaRepo
                .createQueryBuilder('d')
                .select([
                'd.dmaid AS dmaid',
                'd.marketName AS marketName',
                'd.postalCode AS postalCode',
            ]);
            searchTokens.forEach((token, index) => {
                const param = `dmaSearch${index}`;
                qb.andWhere(`(
            LOWER(ISNULL(d.marketName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR LOWER(ISNULL(d.postalCode, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR CAST(d.dmaid AS nvarchar(30)) LIKE :${param} ESCAPE '\\'
          )`, { [param]: `%${this.escapeLikePattern(token)}%` });
            });
            if (sortBy === 'id') {
                qb.orderBy('d.dmaid', sortDir).addOrderBy('d.marketName', 'ASC');
            }
            else if (sortBy === 'postalcode') {
                qb.orderBy('d.postalCode', sortDir).addOrderBy('d.dmaid', 'ASC');
            }
            else {
                qb.orderBy('d.marketName', sortDir).addOrderBy('d.dmaid', 'ASC');
            }
            const total = await qb.getCount();
            const rows = await qb
                .offset(opts.offset)
                .limit(opts.limit)
                .getRawMany();
            return {
                data: rows.map((r) => ({
                    dmaid: Number(r.dmaid),
                    marketName: String(r.marketName ?? ''),
                    postalCode: String(r.postalCode ?? ''),
                })),
                total,
            };
        }
        const map = {
            'company-types': {
                repo: this.companyTypeRepo,
                idKey: 'companyTypeId',
                nameKey: 'companyTypeName',
                idSql: 't.companyTypeId',
                nameSql: 't.companyTypeName',
            },
            'venue-types': {
                repo: this.venueTypeRepo,
                idKey: 'venueTypeId',
                nameKey: 'venueTypeName',
                idSql: 't.venueTypeId',
                nameSql: 't.venueTypeName',
            },
            'seating-types': {
                repo: this.seatingTypeRepo,
                idKey: 'seatingTypeId',
                nameKey: 'seatingName',
                idSql: 't.seatingTypeId',
                nameSql: 't.seatingName',
            },
            departments: {
                repo: this.departmentRepo,
                idKey: 'departmentId',
                nameKey: 'departmentName',
                idSql: 't.departmentId',
                nameSql: 't.departmentName',
            },
            classes: {
                repo: this.classRepo,
                idKey: 'classId',
                nameKey: 'className',
                idSql: 't.classId',
                nameSql: 't.className',
            },
            roles: {
                repo: this.roleRepo,
                idKey: 'roleId',
                nameKey: 'roleName',
                idSql: 't.roleId',
                nameSql: 't.roleName',
            },
            brands: {
                repo: this.brandRepo,
                idKey: 'brandId',
                nameKey: 'brandName',
                idSql: 't.brandId',
                nameSql: 't.brandName',
            },
            'services-provided': {
                repo: this.serviceProvidedRepo,
                idKey: 'serviceProvidedId',
                nameKey: 'serviceName',
                idSql: 't.serviceProvidedId',
                nameSql: 't.serviceName',
            },
        };
        const config = map[table];
        const qb = config.repo.createQueryBuilder('t');
        searchTokens.forEach((token, index) => {
            const param = `lookupSearch${index}`;
            qb.andWhere(`(LOWER(ISNULL(${config.nameSql}, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR CAST(${config.idSql} AS nvarchar(30)) LIKE :${param} ESCAPE '\\')`, { [param]: `%${this.escapeLikePattern(token)}%` });
        });
        if (sortBy === 'id') {
            qb.orderBy(config.idSql, sortDir).addOrderBy(config.nameSql, 'ASC');
        }
        else {
            qb.orderBy(config.nameSql, sortDir).addOrderBy(config.idSql, 'ASC');
        }
        const total = await qb.getCount();
        const rows = await qb.offset(opts.offset).limit(opts.limit).getMany();
        const data = rows.map((row) => ({
            [config.idKey]: Number(row[config.idKey]),
            [config.nameKey]: String(row[config.nameKey] ?? ''),
        }));
        return { data, total };
    }
    async createManagedLookupRow(tableRaw, dto) {
        const table = this.resolveManagedLookupTable(tableRaw);
        if (table === 'company-services') {
            const companyId = this.toPositiveInt(dto.companyId, 'companyId');
            const serviceProvidedId = this.toPositiveInt(dto.serviceProvidedId, 'serviceProvidedId');
            const [company, service] = await Promise.all([
                this.companyRepo.findOne({ where: { companyId } }),
                this.serviceProvidedRepo.findOne({ where: { serviceProvidedId } }),
            ]);
            if (!company) {
                throw new common_1.BadRequestException({
                    message: 'Selected company does not exist.',
                });
            }
            if (!service) {
                throw new common_1.BadRequestException({
                    message: 'Selected service does not exist.',
                });
            }
            await this.assertCompanyServiceAllowed(companyId, serviceProvidedId);
            const existing = await this.companyServiceRepo.findOne({
                where: { companyId, serviceProvidedId },
            });
            if (existing) {
                throw new common_1.BadRequestException({
                    message: 'This company-service mapping already exists.',
                });
            }
            const saved = await this.companyServiceRepo.save(this.companyServiceRepo.create({ companyId, serviceProvidedId }));
            return {
                companyServiceId: saved.companyServiceId,
                companyId,
                serviceProvidedId,
                companyName: company.companyName,
                serviceName: service.serviceName,
            };
        }
        if (table === 'company-type-services') {
            const companyTypeId = this.toPositiveInt(dto.companyTypeId, 'companyTypeId');
            const serviceProvidedIds = this.normalizeServiceProvidedIds(dto);
            const [companyType, services] = await Promise.all([
                this.companyTypeRepo.findOne({ where: { companyTypeId } }),
                this.assertServicesExist(serviceProvidedIds),
            ]);
            if (!companyType) {
                throw new common_1.BadRequestException({
                    message: 'Selected company type does not exist.',
                });
            }
            const existing = await this.companyTypeServiceRepo.count({
                where: { companyTypeId },
            });
            if (existing > 0) {
                throw new common_1.BadRequestException({
                    message: 'This company type already has service mappings. Open it and edit the services instead.',
                });
            }
            await this.companyTypeServiceRepo.save(services.map((service) => this.companyTypeServiceRepo.create({
                companyTypeId,
                serviceProvidedId: service.serviceProvidedId,
            })));
            return this.companyTypeServiceGroup(companyTypeId);
        }
        if (table === 'brands') {
            const brandName = this.normalizeRequiredName(dto.name);
            const saved = await this.brandRepo.save(this.brandRepo.create({ brandName }));
            return { brandId: saved.brandId, brandName: saved.brandName };
        }
        if (table === 'services-provided') {
            const serviceName = this.normalizeRequiredName(dto.name);
            const saved = await this.serviceProvidedRepo.save(this.serviceProvidedRepo.create({ serviceName }));
            return {
                serviceProvidedId: saved.serviceProvidedId,
                serviceName: saved.serviceName,
            };
        }
        if (table === 'dmas') {
            const marketName = this.normalizeRequiredName(dto.name);
            const postalCode = this.normalizeRequiredPostal(dto.postalCode);
            const saved = await this.dmaRepo.save(this.dmaRepo.create({ marketName, postalCode }));
            return {
                dmaid: saved.dmaid,
                marketName: saved.marketName,
                postalCode: saved.postalCode,
            };
        }
        const name = this.normalizeRequiredName(dto.name);
        if (table === 'company-types') {
            const saved = await this.companyTypeRepo.save(this.companyTypeRepo.create({ companyTypeName: name }));
            return {
                companyTypeId: saved.companyTypeId,
                companyTypeName: saved.companyTypeName,
            };
        }
        if (table === 'venue-types') {
            const saved = await this.venueTypeRepo.save(this.venueTypeRepo.create({ venueTypeName: name }));
            return {
                venueTypeId: saved.venueTypeId,
                venueTypeName: saved.venueTypeName,
            };
        }
        if (table === 'seating-types') {
            const saved = await this.seatingTypeRepo.save(this.seatingTypeRepo.create({ seatingName: name }));
            return {
                seatingTypeId: saved.seatingTypeId,
                seatingName: saved.seatingName,
            };
        }
        if (table === 'departments') {
            const saved = await this.departmentRepo.save(this.departmentRepo.create({ departmentName: name }));
            return {
                departmentId: saved.departmentId,
                departmentName: saved.departmentName,
            };
        }
        if (table === 'classes') {
            const saved = await this.classRepo.save(this.classRepo.create({ className: name }));
            return { classId: saved.classId, className: saved.className };
        }
        const saved = await this.roleRepo.save(this.roleRepo.create({ roleName: name }));
        return { roleId: saved.roleId, roleName: saved.roleName };
    }
    async updateManagedLookupRow(tableRaw, id, dto) {
        const table = this.resolveManagedLookupTable(tableRaw);
        if (table === 'company-services') {
            const row = await this.companyServiceRepo.findOne({
                where: { companyServiceId: id },
            });
            if (!row) {
                throw new common_1.NotFoundException(`CompanyService ${id} was not found.`);
            }
            const nextCompanyId = dto.companyId != null
                ? this.toPositiveInt(dto.companyId, 'companyId')
                : row.companyId;
            const nextServiceProvidedId = dto.serviceProvidedId != null
                ? this.toPositiveInt(dto.serviceProvidedId, 'serviceProvidedId')
                : row.serviceProvidedId;
            const [company, service] = await Promise.all([
                this.companyRepo.findOne({ where: { companyId: nextCompanyId } }),
                this.serviceProvidedRepo.findOne({
                    where: { serviceProvidedId: nextServiceProvidedId },
                }),
            ]);
            if (!company)
                throw new common_1.BadRequestException({
                    message: 'Selected company does not exist.',
                });
            if (!service)
                throw new common_1.BadRequestException({
                    message: 'Selected service does not exist.',
                });
            await this.assertCompanyServiceAllowed(nextCompanyId, nextServiceProvidedId);
            const duplicate = await this.companyServiceRepo
                .createQueryBuilder('cs')
                .where('cs.companyServiceId <> :id', { id })
                .andWhere('cs.companyId = :companyId', { companyId: nextCompanyId })
                .andWhere('cs.serviceProvidedId = :serviceProvidedId', {
                serviceProvidedId: nextServiceProvidedId,
            })
                .getOne();
            if (duplicate) {
                throw new common_1.BadRequestException({
                    message: 'This company-service mapping already exists.',
                });
            }
            row.companyId = nextCompanyId;
            row.serviceProvidedId = nextServiceProvidedId;
            const saved = await this.companyServiceRepo.save(row);
            return {
                companyServiceId: saved.companyServiceId,
                companyId: saved.companyId,
                serviceProvidedId: saved.serviceProvidedId,
                companyName: company.companyName,
                serviceName: service.serviceName,
            };
        }
        if (table === 'company-type-services') {
            const nextCompanyTypeId = dto.companyTypeId != null
                ? this.toPositiveInt(dto.companyTypeId, 'companyTypeId')
                : id;
            const serviceProvidedIds = this.normalizeServiceProvidedIds(dto);
            const existingCount = await this.companyTypeServiceRepo.count({
                where: { companyTypeId: id },
            });
            if (existingCount < 1) {
                throw new common_1.NotFoundException(`CompanyTypeService ${id} was not found.`);
            }
            const [companyType, services] = await Promise.all([
                this.companyTypeRepo.findOne({
                    where: { companyTypeId: nextCompanyTypeId },
                }),
                this.assertServicesExist(serviceProvidedIds),
            ]);
            if (!companyType)
                throw new common_1.BadRequestException({
                    message: 'Selected company type does not exist.',
                });
            if (nextCompanyTypeId !== id) {
                const duplicateCompanyType = await this.companyTypeServiceRepo.count({
                    where: { companyTypeId: nextCompanyTypeId },
                });
                if (duplicateCompanyType > 0) {
                    throw new common_1.BadRequestException({
                        message: 'This company type already has service mappings. Edit that row instead.',
                    });
                }
            }
            await this.companyTypeServiceRepo.manager.transaction(async (em) => {
                await em.delete(company_type_service_entity_1.CompanyTypeService, { companyTypeId: id });
                await em.save(company_type_service_entity_1.CompanyTypeService, services.map((service) => em.create(company_type_service_entity_1.CompanyTypeService, {
                    companyTypeId: nextCompanyTypeId,
                    serviceProvidedId: service.serviceProvidedId,
                })));
            });
            return this.companyTypeServiceGroup(nextCompanyTypeId);
        }
        const name = this.normalizeRequiredName(dto.name);
        if (table === 'company-types') {
            const row = await this.companyTypeRepo.findOne({
                where: { companyTypeId: id },
            });
            if (!row)
                throw new common_1.NotFoundException(`CompanyType ${id} was not found.`);
            row.companyTypeName = name;
            const saved = await this.companyTypeRepo.save(row);
            return {
                companyTypeId: saved.companyTypeId,
                companyTypeName: saved.companyTypeName,
            };
        }
        if (table === 'venue-types') {
            const row = await this.venueTypeRepo.findOne({
                where: { venueTypeId: id },
            });
            if (!row)
                throw new common_1.NotFoundException(`VenueType ${id} was not found.`);
            row.venueTypeName = name;
            const saved = await this.venueTypeRepo.save(row);
            return {
                venueTypeId: saved.venueTypeId,
                venueTypeName: saved.venueTypeName,
            };
        }
        if (table === 'seating-types') {
            const row = await this.seatingTypeRepo.findOne({
                where: { seatingTypeId: id },
            });
            if (!row)
                throw new common_1.NotFoundException(`SeatingType ${id} was not found.`);
            row.seatingName = name;
            const saved = await this.seatingTypeRepo.save(row);
            return {
                seatingTypeId: saved.seatingTypeId,
                seatingName: saved.seatingName,
            };
        }
        if (table === 'departments') {
            const row = await this.departmentRepo.findOne({
                where: { departmentId: id },
            });
            if (!row)
                throw new common_1.NotFoundException(`Department ${id} was not found.`);
            row.departmentName = name;
            const saved = await this.departmentRepo.save(row);
            return {
                departmentId: saved.departmentId,
                departmentName: saved.departmentName,
            };
        }
        if (table === 'classes') {
            const row = await this.classRepo.findOne({ where: { classId: id } });
            if (!row)
                throw new common_1.NotFoundException(`Class ${id} was not found.`);
            row.className = name;
            const saved = await this.classRepo.save(row);
            return { classId: saved.classId, className: saved.className };
        }
        if (table === 'roles') {
            const row = await this.roleRepo.findOne({ where: { roleId: id } });
            if (!row)
                throw new common_1.NotFoundException(`Role ${id} was not found.`);
            row.roleName = name;
            const saved = await this.roleRepo.save(row);
            return { roleId: saved.roleId, roleName: saved.roleName };
        }
        if (table === 'brands') {
            const row = await this.brandRepo.findOne({ where: { brandId: id } });
            if (!row)
                throw new common_1.NotFoundException(`Brand ${id} was not found.`);
            row.brandName = name;
            const saved = await this.brandRepo.save(row);
            return { brandId: saved.brandId, brandName: saved.brandName };
        }
        if (table === 'dmas') {
            const row = await this.dmaRepo.findOne({ where: { dmaid: id } });
            if (!row)
                throw new common_1.NotFoundException(`DMA ${id} was not found.`);
            row.marketName = this.normalizeRequiredName(dto.name);
            row.postalCode =
                dto.postalCode != null
                    ? this.normalizeRequiredPostal(dto.postalCode)
                    : this.normalizeRequiredPostal(row.postalCode);
            const saved = await this.dmaRepo.save(row);
            return {
                dmaid: saved.dmaid,
                marketName: saved.marketName,
                postalCode: saved.postalCode,
            };
        }
        const row = await this.serviceProvidedRepo.findOne({
            where: { serviceProvidedId: id },
        });
        if (!row)
            throw new common_1.NotFoundException(`ServiceProvided ${id} was not found.`);
        row.serviceName = name;
        const saved = await this.serviceProvidedRepo.save(row);
        return {
            serviceProvidedId: saved.serviceProvidedId,
            serviceName: saved.serviceName,
        };
    }
    async removeManagedLookupRow(tableRaw, id) {
        const table = this.resolveManagedLookupTable(tableRaw);
        const remove = async () => {
            if (table === 'company-types') {
                const res = await this.companyTypeRepo.delete({ companyTypeId: id });
                if (!res.affected)
                    throw new common_1.NotFoundException(`CompanyType ${id} was not found.`);
                return;
            }
            if (table === 'venue-types') {
                const res = await this.venueTypeRepo.delete({ venueTypeId: id });
                if (!res.affected)
                    throw new common_1.NotFoundException(`VenueType ${id} was not found.`);
                return;
            }
            if (table === 'seating-types') {
                const res = await this.seatingTypeRepo.delete({ seatingTypeId: id });
                if (!res.affected)
                    throw new common_1.NotFoundException(`SeatingType ${id} was not found.`);
                return;
            }
            if (table === 'departments') {
                const res = await this.departmentRepo.delete({ departmentId: id });
                if (!res.affected)
                    throw new common_1.NotFoundException(`Department ${id} was not found.`);
                return;
            }
            if (table === 'classes') {
                const res = await this.classRepo.delete({ classId: id });
                if (!res.affected)
                    throw new common_1.NotFoundException(`Class ${id} was not found.`);
                return;
            }
            if (table === 'roles') {
                const res = await this.roleRepo.delete({ roleId: id });
                if (!res.affected)
                    throw new common_1.NotFoundException(`Role ${id} was not found.`);
                return;
            }
            if (table === 'brands') {
                const res = await this.brandRepo.delete({ brandId: id });
                if (!res.affected)
                    throw new common_1.NotFoundException(`Brand ${id} was not found.`);
                return;
            }
            if (table === 'company-services') {
                const res = await this.companyServiceRepo.delete({
                    companyServiceId: id,
                });
                if (!res.affected)
                    throw new common_1.NotFoundException(`CompanyService ${id} was not found.`);
                return;
            }
            if (table === 'company-type-services') {
                const res = await this.companyTypeServiceRepo.delete({
                    companyTypeId: id,
                });
                if (!res.affected)
                    throw new common_1.NotFoundException(`CompanyTypeService ${id} was not found.`);
                return;
            }
            if (table === 'dmas') {
                const res = await this.dmaRepo.delete({ dmaid: id });
                if (!res.affected)
                    throw new common_1.NotFoundException(`DMA ${id} was not found.`);
                return;
            }
            const res = await this.serviceProvidedRepo.delete({
                serviceProvidedId: id,
            });
            if (!res.affected)
                throw new common_1.NotFoundException(`ServiceProvided ${id} was not found.`);
        };
        try {
            await remove();
        }
        catch (error) {
            if (error instanceof typeorm_2.QueryFailedError) {
                const driverError = error.driverError;
                if (driverError?.number === 547 ||
                    /constraint|reference/i.test(driverError?.message ?? '')) {
                    throw new common_1.BadRequestException({
                        message: 'Cannot delete this row because it is referenced by other records.',
                    });
                }
            }
            throw error;
        }
    }
};
exports.LookupsService = LookupsService;
exports.LookupsService = LookupsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(company_type_entity_1.CompanyType)),
    __param(1, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __param(2, (0, typeorm_1.InjectRepository)(department_entity_1.Department)),
    __param(3, (0, typeorm_1.InjectRepository)(seating_type_entity_1.SeatingType)),
    __param(4, (0, typeorm_1.InjectRepository)(dma_entity_1.Dma)),
    __param(5, (0, typeorm_1.InjectRepository)(class_entity_1.Class)),
    __param(6, (0, typeorm_1.InjectRepository)(venue_type_entity_1.VenueType)),
    __param(7, (0, typeorm_1.InjectRepository)(brand_entity_1.Brand)),
    __param(8, (0, typeorm_1.InjectRepository)(tax_entity_1.Tax)),
    __param(9, (0, typeorm_1.InjectRepository)(service_provided_entity_1.ServiceProvided)),
    __param(10, (0, typeorm_1.InjectRepository)(company_service_entity_1.CompanyService)),
    __param(11, (0, typeorm_1.InjectRepository)(company_type_service_entity_1.CompanyTypeService)),
    __param(12, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __param(13, (0, typeorm_1.InjectRepository)(non_resident_withholding_entity_1.NonResidentWithholding)),
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
        typeorm_2.Repository])
], LookupsService);
//# sourceMappingURL=lookups.service.js.map