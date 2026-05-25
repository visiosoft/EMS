import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Class } from '../entities/class.entity';
import { CompanyType } from '../entities/company-type.entity';
import { Department } from '../entities/department.entity';
import { Dma } from '../entities/dma.entity';
import { Role } from '../entities/role.entity';
import { SeatingType } from '../entities/seating-type.entity';
import { VenueType } from '../entities/venue-type.entity';
import { Brand } from '../entities/brand.entity';
import { ServiceProvided } from '../entities/service-provided.entity';
import { Tax } from '../entities/tax.entity';
import { CompanyService as CompanyServiceEntity } from '../entities/company-service.entity';
import { Company } from '../entities/company.entity';
import { NonResidentWithholding } from '../entities/non-resident-withholding.entity';
import {
  CreateLookupRowDto,
  UpdateLookupRowDto,
} from './dto/manage-lookup-row.dto';

type ManagedLookupTable =
  | 'company-types'
  | 'venue-types'
  | 'seating-types'
  | 'departments'
  | 'classes'
  | 'roles'
  | 'brands'
  | 'company-services'
  | 'services-provided'
  | 'dmas';

@Injectable()
export class LookupsService {
  constructor(
    @InjectRepository(CompanyType)
    private readonly companyTypeRepo: Repository<CompanyType>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(SeatingType)
    private readonly seatingTypeRepo: Repository<SeatingType>,
    @InjectRepository(Dma)
    private readonly dmaRepo: Repository<Dma>,
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(VenueType)
    private readonly venueTypeRepo: Repository<VenueType>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(Tax)
    private readonly taxRepo: Repository<Tax>,
    @InjectRepository(ServiceProvided)
    private readonly serviceProvidedRepo: Repository<ServiceProvided>,
    @InjectRepository(CompanyServiceEntity)
    private readonly companyServiceRepo: Repository<CompanyServiceEntity>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(NonResidentWithholding)
    private readonly nonResidentWithholdingRepo: Repository<NonResidentWithholding>,
  ) {}

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
      order: { taxJurisdictionType: 'ASC' as const, taxName: 'ASC' as const },
    });
  }

  findServicesProvided() {
    return this.serviceProvidedRepo.find({ order: { serviceName: 'ASC' } });
  }

  async findStagehandProviders(): Promise<
    { companyId: number; companyName: string }[]
  > {
    const stagehands = await this.serviceProvidedRepo
      .createQueryBuilder('sp')
      .where('LOWER(sp.serviceName) = LOWER(:n)', { n: 'Stagehands' })
      .getOne();
    if (!stagehands) return [];

    const rows = await this.companyServiceRepo
      .createQueryBuilder('cs')
      .innerJoin(Company, 'c', 'c.companyId = cs.companyId')
      .where('cs.serviceProvidedId = :sid', {
        sid: stagehands.serviceProvidedId,
      })
      .select(['c.companyId AS companyId', 'c.companyName AS companyName'])
      .orderBy('c.companyName', 'ASC')
      .getRawMany<Record<string, unknown>>();

    return rows.map((r) => ({
      companyId: Number(r.companyId ?? r.CompanyID),
      companyName: String(r.companyName ?? r.CompanyName ?? ''),
    }));
  }

  async findNonResidentWithholdings(): Promise<
    {
      withholdingId: number;
      withholdingTaxRate: string;
      dmaid: number | null;
      taxAgencyId: number | null;
    }[]
  > {
    const rows = await this.nonResidentWithholdingRepo.find({
      order: { withholdingId: 'ASC' as const },
    });
    return rows.map((r) => ({
      withholdingId: r.withholdingId,
      withholdingTaxRate: r.withholdingTaxRate,
      dmaid: r.dmaid ?? null,
      taxAgencyId: r.taxAgencyId ?? null,
    }));
  }

  /** First DMA row matching postal code (dbo.DMA is postal-level). */
  async findDmaByPostal(postalCode: string) {
    const raw = postalCode.trim();
    if (!raw) return null;

    const direct = await this.dmaRepo
      .createQueryBuilder('d')
      .where('d.postalCode = :pc', { pc: raw })
      .orderBy('d.dmaid', 'ASC')
      .getOne();
    if (direct) return direct;

    const normalized = raw.toUpperCase().replace(/\s+/g, ' ');
    if (normalized !== raw) {
      const normalizedRow = await this.dmaRepo
        .createQueryBuilder('d')
        .where('d.postalCode = :pc', { pc: normalized })
        .orderBy('d.dmaid', 'ASC')
        .getOne();
      if (normalizedRow) return normalizedRow;
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
      if (fuzzy) return fuzzy;
    }

    return null;
  }

  /**
   * One row per MarketName: all postal variants for a market collapse to MIN(DMAID) and a sample postal.
   * Pickers show a single entry per market (e.g. one "ABILENE-SWEETWATER" row).
   */
  private buildDmaMarketsGroupedSubquery(query: string, includePostalCount = false) {
    const qb = this.dmaRepo
      .createQueryBuilder('d')
      .select('MIN(d.dmaid)', 'dmaid')
      .addSelect('d.marketName', 'marketName')
      .addSelect('MIN(d.postalCode)', 'postalCode');
    if (includePostalCount) {
      qb.addSelect('COUNT(*)', 'postalCount');
    }
    qb.groupBy('d.marketName');

    this.applyDmaMarketSearchFilter(qb, query);
    return qb;
  }

  private applyDmaMarketSearchFilter(
    qb: ReturnType<Repository<Dma>['createQueryBuilder']>,
    query: string,
  ) {
    const trimmed = query.trim();
    if (!trimmed) return;

    const sq = `%${trimmed}%`;
    const digitsOnly = /^\d+$/.test(trimmed);

    if (digitsOnly) {
      const dmaIdExact = Number.parseInt(trimmed, 10);
      const idExactUsable =
        Number.isFinite(dmaIdExact) &&
        dmaIdExact >= 0 &&
        dmaIdExact <= 2147483647 &&
        String(dmaIdExact) === trimmed;

      if (idExactUsable) {
        qb.where(
          "(LOWER(d.marketName) LIKE LOWER(:sq) OR LOWER(ISNULL(d.postalCode, '')) LIKE LOWER(:sq) OR d.dmaid = :dmaIdExact)",
          { sq, dmaIdExact },
        );
      } else {
        qb.where(
          "(LOWER(d.marketName) LIKE LOWER(:sq) OR LOWER(ISNULL(d.postalCode, '')) LIKE LOWER(:sq))",
          { sq },
        );
      }
    } else {
      qb.where(
        "(LOWER(d.marketName) LIKE LOWER(:sq) OR LOWER(ISNULL(d.postalCode, '')) LIKE LOWER(:sq))",
        { sq },
      );
    }
  }

  private mapDmaMarketRows(rows: Record<string, unknown>[]) {
    return rows.map((r) => ({
      dmaid: Number(r.dmaid ?? r.DMAID),
      marketName: String(r.marketName ?? r.MarketName ?? ''),
      postalCode: String(r.postalCode ?? r.PostalCode ?? ''),
    }));
  }

  private mapDmaHubMarketRows(rows: Record<string, unknown>[]) {
    return rows.map((r) => ({
      dmaid: Number(r.dmaid ?? r.DMAID),
      marketName: String(r.marketName ?? r.MarketName ?? ''),
      samplePostalCode: String(r.postalCode ?? r.PostalCode ?? ''),
      postalCount: Number(r.postalCount ?? r.PostalCount ?? 0),
    }));
  }

  /**
   * All logical DMA markets (one per market name), MIN(DMAID) per group.
   */
  async findDmaMarkets(): Promise<
    { dmaid: number; marketName: string; postalCode: string }[]
  > {
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
      .getRawMany<Record<string, unknown>>();
    return this.mapDmaMarketRows(rows);
  }

  /** Search DMA markets by query string (case-insensitive partial match). */
  async searchDmaMarkets(
    query: string,
    limit = 50,
  ): Promise<{ dmaid: number; marketName: string; postalCode: string }[]> {
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
      .getRawMany<Record<string, unknown>>();
    return this.mapDmaMarketRows(rows);
  }

  /** Paginated DMA markets with optional search filter. */
  async findDmaMarketsPaginated(
    offset: number,
    limit: number,
    query = '',
  ): Promise<{
    data: { dmaid: number; marketName: string; postalCode: string }[];
    total: number;
  }> {
    const inner = this.buildDmaMarketsGroupedSubquery(query);

    const countRow = await this.dmaRepo.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'cnt')
      .from(`(${inner.getQuery()})`, 'dedup')
      .setParameters(inner.getParameters())
      .getRawOne<{ cnt: string | number }>();

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
      .getRawMany<Record<string, unknown>>();

    return {
      data: this.mapDmaMarketRows(rows),
      total,
    };
  }

  /** Company Hub — paginated markets with postal counts per market name. */
  async findDmaHubMarketsPaginated(
    offset: number,
    limit: number,
    query = '',
  ): Promise<{
    data: {
      dmaid: number;
      marketName: string;
      samplePostalCode: string;
      postalCount: number;
    }[];
    total: number;
  }> {
    const inner = this.buildDmaMarketsGroupedSubquery(query, true);

    const countRow = await this.dmaRepo.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'cnt')
      .from(`(${inner.getQuery()})`, 'dedup')
      .setParameters(inner.getParameters())
      .getRawOne<{ cnt: string | number }>();

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
      .getRawMany<Record<string, unknown>>();

    return {
      data: this.mapDmaHubMarketRows(rows),
      total,
    };
  }

  /** Company Hub — lightweight typeahead (does not replace full search until user confirms). */
  async findDmaHubMarketSuggestions(query: string, limit = 8) {
    const safeLimit = Math.min(20, Math.max(1, Math.floor(limit)));
    const { data } = await this.findDmaHubMarketsPaginated(0, safeLimit, query);
    return data;
  }

  /** All postal codes for a single market name (lazy-loaded in hub UI). */
  async findPostalCodesByMarketName(
    marketName: string,
    offset: number,
    limit: number,
  ): Promise<{
    data: { dmaid: number; postalCode: string }[];
    total: number;
  }> {
    const name = marketName.trim();
    if (!name) {
      return { data: [], total: 0 };
    }

    const qb = this.dmaRepo
      .createQueryBuilder('d')
      .where('d.marketName = :marketName', { marketName: name })
      .orderBy('d.postalCode', 'ASC')
      .addOrderBy('d.dmaid', 'ASC');

    const total = await qb.clone().getCount();

    const rows = await qb.offset(Math.max(0, offset)).limit(Math.max(1, limit)).getMany();

    return {
      data: rows.map((r) => ({
        dmaid: r.dmaid,
        postalCode: r.postalCode,
      })),
      total,
    };
  }

  private resolveManagedLookupTable(raw: string): ManagedLookupTable {
    const normalized = String(raw ?? '')
      .trim()
      .toLowerCase();
    const known: ManagedLookupTable[] = [
      'company-types',
      'venue-types',
      'seating-types',
      'departments',
      'classes',
      'roles',
      'brands',
      'company-services',
      'services-provided',
      'dmas',
    ];
    if (known.includes(normalized as ManagedLookupTable)) {
      return normalized as ManagedLookupTable;
    }
    throw new BadRequestException({
      message:
        'Unknown lookup table. Supported values: company-types, venue-types, seating-types, departments, classes, roles, brands, company-services, services-provided, dmas.',
    });
  }

  private normalizeRequiredName(name: unknown) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) {
      throw new BadRequestException({ message: 'Name is required.' });
    }
    return trimmed.slice(0, 100);
  }

  private toPositiveInt(value: unknown, label: string) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1) {
      throw new BadRequestException({
        message: `${label} must be a positive integer.`,
      });
    }
    return n;
  }

  private parseSortDirection(raw?: string): 'ASC' | 'DESC' {
    return String(raw ?? '')
      .trim()
      .toLowerCase() === 'desc'
      ? 'DESC'
      : 'ASC';
  }

  private toContainsPattern(raw?: string): string | null {
    const q = String(raw ?? '').trim();
    return q ? `%${q}%` : null;
  }

  private normalizeRequiredPostal(postalCode: unknown) {
    const trimmed = typeof postalCode === 'string' ? postalCode.trim() : '';
    if (!trimmed) {
      throw new BadRequestException({ message: 'Postal code is required.' });
    }
    return trimmed.slice(0, 20);
  }

  async listManagedLookupRows(
    tableRaw: string,
    opts: {
      offset: number;
      limit: number;
      q?: string;
      sortBy?: string;
      sortDir?: string;
    },
  ): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const table = this.resolveManagedLookupTable(tableRaw);
    const sortBy = String(opts.sortBy ?? '')
      .trim()
      .toLowerCase();
    const sortDir = this.parseSortDirection(opts.sortDir);
    const like = this.toContainsPattern(opts.q);

    if (table === 'company-services') {
      const qb = this.companyServiceRepo
        .createQueryBuilder('cs')
        .leftJoin(Company, 'c', 'c.companyId = cs.companyId')
        .leftJoin(
          ServiceProvided,
          'sp',
          'sp.serviceProvidedId = cs.serviceProvidedId',
        )
        .select([
          'cs.companyServiceId AS companyServiceId',
          'cs.companyId AS companyId',
          'cs.serviceProvidedId AS serviceProvidedId',
          'c.companyName AS companyName',
          'sp.serviceName AS serviceName',
        ]);

      if (like) {
        qb.where(
          `(
            LOWER(ISNULL(c.companyName, '')) LIKE LOWER(:like)
            OR LOWER(ISNULL(sp.serviceName, '')) LIKE LOWER(:like)
            OR CAST(cs.companyServiceId AS nvarchar(30)) LIKE :like
            OR CAST(cs.companyId AS nvarchar(30)) LIKE :like
            OR CAST(cs.serviceProvidedId AS nvarchar(30)) LIKE :like
          )`,
          { like },
        );
      }

      if (sortBy === 'companyid') {
        qb.orderBy('cs.companyId', sortDir).addOrderBy(
          'cs.companyServiceId',
          'ASC',
        );
      } else if (sortBy === 'serviceprovidedid') {
        qb.orderBy('cs.serviceProvidedId', sortDir).addOrderBy(
          'cs.companyServiceId',
          'ASC',
        );
      } else if (sortBy === 'companyname') {
        qb.orderBy('c.companyName', sortDir).addOrderBy(
          'cs.companyServiceId',
          'ASC',
        );
      } else if (sortBy === 'servicename') {
        qb.orderBy('sp.serviceName', sortDir).addOrderBy(
          'cs.companyServiceId',
          'ASC',
        );
      } else {
        qb.orderBy('cs.companyServiceId', sortDir).addOrderBy(
          'cs.companyId',
          'ASC',
        );
      }

      const total = await qb.getCount();
      const rows = await qb
        .offset(opts.offset)
        .limit(opts.limit)
        .getRawMany<Record<string, unknown>>();
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

    if (table === 'dmas') {
      const qb = this.dmaRepo
        .createQueryBuilder('d')
        .select([
          'd.dmaid AS dmaid',
          'd.marketName AS marketName',
          'd.postalCode AS postalCode',
        ]);

      if (like) {
        qb.where(
          `(
            LOWER(ISNULL(d.marketName, '')) LIKE LOWER(:like)
            OR LOWER(ISNULL(d.postalCode, '')) LIKE LOWER(:like)
            OR CAST(d.dmaid AS nvarchar(30)) LIKE :like
          )`,
          { like },
        );
      }

      if (sortBy === 'id') {
        qb.orderBy('d.dmaid', sortDir).addOrderBy('d.marketName', 'ASC');
      } else if (sortBy === 'postalcode') {
        qb.orderBy('d.postalCode', sortDir).addOrderBy('d.dmaid', 'ASC');
      } else {
        qb.orderBy('d.marketName', sortDir).addOrderBy('d.dmaid', 'ASC');
      }

      const total = await qb.getCount();
      const rows = await qb
        .offset(opts.offset)
        .limit(opts.limit)
        .getRawMany<Record<string, unknown>>();
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
    } as const;

    const config = map[table];
    const qb = config.repo.createQueryBuilder('t');

    if (like) {
      qb.where(
        `(LOWER(ISNULL(${config.nameSql}, '')) LIKE LOWER(:like) OR CAST(${config.idSql} AS nvarchar(30)) LIKE :like)`,
        { like },
      );
    }

    if (sortBy === 'id') {
      qb.orderBy(config.idSql, sortDir).addOrderBy(config.nameSql, 'ASC');
    } else {
      qb.orderBy(config.nameSql, sortDir).addOrderBy(config.idSql, 'ASC');
    }

    const total = await qb.getCount();
    const rows = await qb.offset(opts.offset).limit(opts.limit).getMany();
    const data = rows.map((row) => ({
      [config.idKey]: Number((row as Record<string, unknown>)[config.idKey]),
      [config.nameKey]: String(
        (row as Record<string, unknown>)[config.nameKey] ?? '',
      ),
    }));
    return { data, total };
  }

  async createManagedLookupRow(tableRaw: string, dto: CreateLookupRowDto) {
    const table = this.resolveManagedLookupTable(tableRaw);
    if (table === 'company-services') {
      const companyId = this.toPositiveInt(dto.companyId, 'companyId');
      const serviceProvidedId = this.toPositiveInt(
        dto.serviceProvidedId,
        'serviceProvidedId',
      );
      const [company, service] = await Promise.all([
        this.companyRepo.findOne({ where: { companyId } }),
        this.serviceProvidedRepo.findOne({ where: { serviceProvidedId } }),
      ]);
      if (!company) {
        throw new BadRequestException({
          message: 'Selected company does not exist.',
        });
      }
      if (!service) {
        throw new BadRequestException({
          message: 'Selected service does not exist.',
        });
      }
      const existing = await this.companyServiceRepo.findOne({
        where: { companyId, serviceProvidedId },
      });
      if (existing) {
        throw new BadRequestException({
          message: 'This company-service mapping already exists.',
        });
      }
      const saved = await this.companyServiceRepo.save(
        this.companyServiceRepo.create({ companyId, serviceProvidedId }),
      );
      return {
        companyServiceId: saved.companyServiceId,
        companyId,
        serviceProvidedId,
        companyName: company.companyName,
        serviceName: service.serviceName,
      };
    }

    if (table === 'brands') {
      const brandName = this.normalizeRequiredName(dto.name);
      const saved = await this.brandRepo.save(
        this.brandRepo.create({ brandName }),
      );
      return { brandId: saved.brandId, brandName: saved.brandName };
    }

    if (table === 'services-provided') {
      const serviceName = this.normalizeRequiredName(dto.name);
      const saved = await this.serviceProvidedRepo.save(
        this.serviceProvidedRepo.create({ serviceName }),
      );
      return {
        serviceProvidedId: saved.serviceProvidedId,
        serviceName: saved.serviceName,
      };
    }
    if (table === 'dmas') {
      const marketName = this.normalizeRequiredName(dto.name);
      const postalCode = this.normalizeRequiredPostal(dto.postalCode);
      const saved = await this.dmaRepo.save(
        this.dmaRepo.create({ marketName, postalCode }),
      );
      return {
        dmaid: saved.dmaid,
        marketName: saved.marketName,
        postalCode: saved.postalCode,
      };
    }

    const name = this.normalizeRequiredName(dto.name);
    if (table === 'company-types') {
      const saved = await this.companyTypeRepo.save(
        this.companyTypeRepo.create({ companyTypeName: name }),
      );
      return {
        companyTypeId: saved.companyTypeId,
        companyTypeName: saved.companyTypeName,
      };
    }
    if (table === 'venue-types') {
      const saved = await this.venueTypeRepo.save(
        this.venueTypeRepo.create({ venueTypeName: name }),
      );
      return {
        venueTypeId: saved.venueTypeId,
        venueTypeName: saved.venueTypeName,
      };
    }
    if (table === 'seating-types') {
      const saved = await this.seatingTypeRepo.save(
        this.seatingTypeRepo.create({ seatingName: name }),
      );
      return {
        seatingTypeId: saved.seatingTypeId,
        seatingName: saved.seatingName,
      };
    }
    if (table === 'departments') {
      const saved = await this.departmentRepo.save(
        this.departmentRepo.create({ departmentName: name }),
      );
      return {
        departmentId: saved.departmentId,
        departmentName: saved.departmentName,
      };
    }
    if (table === 'classes') {
      const saved = await this.classRepo.save(
        this.classRepo.create({ className: name }),
      );
      return { classId: saved.classId, className: saved.className };
    }

    const saved = await this.roleRepo.save(
      this.roleRepo.create({ roleName: name }),
    );
    return { roleId: saved.roleId, roleName: saved.roleName };
  }

  async updateManagedLookupRow(
    tableRaw: string,
    id: number,
    dto: UpdateLookupRowDto,
  ) {
    const table = this.resolveManagedLookupTable(tableRaw);
    if (table === 'company-services') {
      const row = await this.companyServiceRepo.findOne({
        where: { companyServiceId: id },
      });
      if (!row) {
        throw new NotFoundException(`CompanyService ${id} was not found.`);
      }
      const nextCompanyId =
        dto.companyId != null
          ? this.toPositiveInt(dto.companyId, 'companyId')
          : row.companyId;
      const nextServiceProvidedId =
        dto.serviceProvidedId != null
          ? this.toPositiveInt(dto.serviceProvidedId, 'serviceProvidedId')
          : row.serviceProvidedId;
      const [company, service] = await Promise.all([
        this.companyRepo.findOne({ where: { companyId: nextCompanyId } }),
        this.serviceProvidedRepo.findOne({
          where: { serviceProvidedId: nextServiceProvidedId },
        }),
      ]);
      if (!company)
        throw new BadRequestException({
          message: 'Selected company does not exist.',
        });
      if (!service)
        throw new BadRequestException({
          message: 'Selected service does not exist.',
        });

      const duplicate = await this.companyServiceRepo
        .createQueryBuilder('cs')
        .where('cs.companyServiceId <> :id', { id })
        .andWhere('cs.companyId = :companyId', { companyId: nextCompanyId })
        .andWhere('cs.serviceProvidedId = :serviceProvidedId', {
          serviceProvidedId: nextServiceProvidedId,
        })
        .getOne();
      if (duplicate) {
        throw new BadRequestException({
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

    const name = this.normalizeRequiredName(dto.name);
    if (table === 'company-types') {
      const row = await this.companyTypeRepo.findOne({
        where: { companyTypeId: id },
      });
      if (!row) throw new NotFoundException(`CompanyType ${id} was not found.`);
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
      if (!row) throw new NotFoundException(`VenueType ${id} was not found.`);
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
      if (!row) throw new NotFoundException(`SeatingType ${id} was not found.`);
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
      if (!row) throw new NotFoundException(`Department ${id} was not found.`);
      row.departmentName = name;
      const saved = await this.departmentRepo.save(row);
      return {
        departmentId: saved.departmentId,
        departmentName: saved.departmentName,
      };
    }
    if (table === 'classes') {
      const row = await this.classRepo.findOne({ where: { classId: id } });
      if (!row) throw new NotFoundException(`Class ${id} was not found.`);
      row.className = name;
      const saved = await this.classRepo.save(row);
      return { classId: saved.classId, className: saved.className };
    }
    if (table === 'roles') {
      const row = await this.roleRepo.findOne({ where: { roleId: id } });
      if (!row) throw new NotFoundException(`Role ${id} was not found.`);
      row.roleName = name;
      const saved = await this.roleRepo.save(row);
      return { roleId: saved.roleId, roleName: saved.roleName };
    }
    if (table === 'brands') {
      const row = await this.brandRepo.findOne({ where: { brandId: id } });
      if (!row) throw new NotFoundException(`Brand ${id} was not found.`);
      row.brandName = name;
      const saved = await this.brandRepo.save(row);
      return { brandId: saved.brandId, brandName: saved.brandName };
    }
    if (table === 'dmas') {
      const row = await this.dmaRepo.findOne({ where: { dmaid: id } });
      if (!row) throw new NotFoundException(`DMA ${id} was not found.`);
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
      throw new NotFoundException(`ServiceProvided ${id} was not found.`);
    row.serviceName = name;
    const saved = await this.serviceProvidedRepo.save(row);
    return {
      serviceProvidedId: saved.serviceProvidedId,
      serviceName: saved.serviceName,
    };
  }

  async removeManagedLookupRow(tableRaw: string, id: number): Promise<void> {
    const table = this.resolveManagedLookupTable(tableRaw);
    const remove = async () => {
      if (table === 'company-types') {
        const res = await this.companyTypeRepo.delete({ companyTypeId: id });
        if (!res.affected)
          throw new NotFoundException(`CompanyType ${id} was not found.`);
        return;
      }
      if (table === 'venue-types') {
        const res = await this.venueTypeRepo.delete({ venueTypeId: id });
        if (!res.affected)
          throw new NotFoundException(`VenueType ${id} was not found.`);
        return;
      }
      if (table === 'seating-types') {
        const res = await this.seatingTypeRepo.delete({ seatingTypeId: id });
        if (!res.affected)
          throw new NotFoundException(`SeatingType ${id} was not found.`);
        return;
      }
      if (table === 'departments') {
        const res = await this.departmentRepo.delete({ departmentId: id });
        if (!res.affected)
          throw new NotFoundException(`Department ${id} was not found.`);
        return;
      }
      if (table === 'classes') {
        const res = await this.classRepo.delete({ classId: id });
        if (!res.affected)
          throw new NotFoundException(`Class ${id} was not found.`);
        return;
      }
      if (table === 'roles') {
        const res = await this.roleRepo.delete({ roleId: id });
        if (!res.affected)
          throw new NotFoundException(`Role ${id} was not found.`);
        return;
      }
      if (table === 'brands') {
        const res = await this.brandRepo.delete({ brandId: id });
        if (!res.affected)
          throw new NotFoundException(`Brand ${id} was not found.`);
        return;
      }
      if (table === 'company-services') {
        const res = await this.companyServiceRepo.delete({
          companyServiceId: id,
        });
        if (!res.affected)
          throw new NotFoundException(`CompanyService ${id} was not found.`);
        return;
      }
      if (table === 'dmas') {
        const res = await this.dmaRepo.delete({ dmaid: id });
        if (!res.affected)
          throw new NotFoundException(`DMA ${id} was not found.`);
        return;
      }
      const res = await this.serviceProvidedRepo.delete({
        serviceProvidedId: id,
      });
      if (!res.affected)
        throw new NotFoundException(`ServiceProvided ${id} was not found.`);
    };

    try {
      await remove();
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError as
          | { number?: number; message?: string }
          | undefined;
        if (
          driverError?.number === 547 ||
          /constraint|reference/i.test(driverError?.message ?? '')
        ) {
          throw new BadRequestException({
            message:
              'Cannot delete this row because it is referenced by other records.',
          });
        }
      }
      throw error;
    }
  }
}
