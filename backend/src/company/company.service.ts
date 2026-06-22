import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Address } from '../entities/address.entity';
import { CompanyType } from '../entities/company-type.entity';
import { Company } from '../entities/company.entity';
import { ContactAssignment } from '../entities/contact-assignment.entity';
import { ContactInfo } from '../entities/contact-info.entity';
import { Contact } from '../entities/contact.entity';
import { Attraction } from '../entities/attraction.entity';
import { Dma } from '../entities/dma.entity';
import { Engagement } from '../entities/engagement.entity';
import { EngagementProjectVenue } from '../entities/engagement-project-venue.entity';
import { EngagementVenue } from '../entities/engagement-venue.entity';
import { Department } from '../entities/department.entity';
import { Role } from '../entities/role.entity';
import { Tour } from '../entities/tour.entity';
import { EngagementIAEContact } from '../entities/engagement-iae-contact.entity';
import { TourTalentAgent } from '../entities/tour-talent-agent.entity';
import { Venue } from '../entities/venue.entity';
import { VenueBrand } from '../entities/venue-brand.entity';
import { Brand } from '../entities/brand.entity';
import { VenueTax } from '../entities/venue-tax.entity';
import { Tax } from '../entities/tax.entity';
import { ServiceProvided } from '../entities/service-provided.entity';
import { CompanyService as CompanyServiceEntity } from '../entities/company-service.entity';
import { CompanyServiceArea } from '../entities/company-service-area.entity';
import { CompanyTypeService } from '../entities/company-type-service.entity';
import { VenueServiceProvider } from '../entities/venue-service-provider.entity';
import { NonResidentWithholding } from '../entities/non-resident-withholding.entity';
import {
  EngagementService,
  EngagementListRow,
} from '../engagements/engagement.service';
import { Link } from '../entities/link.entity';
import { VenueComplex } from '../entities/venue-complex.entity';
import { VenueComplexMember } from '../entities/venue-complex-member.entity';
import { CreateCompanyContactDto } from './dto/create-company-contact.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyContactDto } from './dto/create-company-contact.dto';
import {
  ManageContactDto,
  UpdateManagedContactDto,
} from './dto/manage-contact.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateVenueTicketingDto } from './dto/update-venue-ticketing.dto';
import { UpdateVenueProfileDto } from './dto/update-venue-profile.dto';
import { UpdateVenueDetailsDto } from './dto/update-venue-details.dto';
import {
  resolveVenueTicketingWebsiteColumns,
  type ResolvedVenueTicketingWebsiteColumns,
} from './venue-ticketing-columns.resolver';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { HubSpotService } from '../hubspot/hubspot.service';

/** dbo.CompanyType.CompanyName for companies that may be linked as an entertainment complex (EMS + validation). */
const ENTERTAINMENT_COMPLEX_COMPANY_TYPE = 'entertainment complex';

function assertOptionalE164Phone(
  value: string | null | undefined,
  field: 'work phone' | 'cell phone',
): void {
  if (value == null) return;
  const t = value.trim();
  if (t.length === 0) return;
  if (!isValidPhoneNumber(t)) {
    throw new BadRequestException({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: `Invalid ${field}. Use a full international number (E.164, e.g. +1 415 555 1234) or leave the field empty.`,
    });
  }
}

function isBlank(v: unknown): boolean {
  return v == null || String(v).trim().length === 0;
}

/**
 * TypeORM getRawOne/getRawMany on SQL Server often return column keys with different
 * casing than our `AS` aliases, so `row.roleName` may be undefined while `row.rolename` holds
 * the value. Same idea as `listEngagements` (g/lower helpers).
 */
function pickRawRowValue(row: Record<string, unknown>, key: string): unknown {
  if (row[key] !== undefined && row[key] !== null) {
    return row[key];
  }
  const pl = key.toLowerCase();
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === pl) {
      return row[k];
    }
  }
  for (const k of Object.keys(row)) {
    const kl = k.toLowerCase();
    if (
      kl === `r_${pl}` ||
      kl === `ci_${pl}` ||
      kl === `ca_${pl}` ||
      kl === `d_${pl}`
    ) {
      return row[k];
    }
  }
  return undefined;
}

function isTruthyBit(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const t = fullName.trim().replace(/\s+/g, ' ');
  if (!t) return { firstName: '', lastName: '' };
  const idx = t.indexOf(' ');
  if (idx < 0) return { firstName: t, lastName: '' };
  return {
    firstName: t.slice(0, idx).trim(),
    lastName: t.slice(idx + 1).trim(),
  };
}

/** Nvarchar literal for safe dynamic SQL on SQL Server. */
function sqlNVarCharLiteral(value: string | null): string {
  if (value == null) return 'NULL';
  return `N'${String(value).replace(/'/g, "''")}'`;
}

export interface CompanyListRow {
  companyId: number;
  companyName: string;
  isInternal: boolean;
  companyTypeId: number;
  companyTypeName: string;
  companyTypeIds: number[];
  companyTypeNames: string[];
  serviceProvidedIds: number[];
  serviceProvidedNames: string[];
  physicalCity: string;
  physicalStateProvince: string;
  dmaId: number | null;
  dmaMarketName: string;
}

export interface CompanyDetail extends CompanyListRow {
  physicalAddress: Address;
  mailingAddress: Address;
  serviceAreas: {
    dmaid: number;
    dmaMarketName: string;
    serviceProvidedId: number;
    serviceName: string;
  }[];
  allDmas: boolean;
  allDmasServiceProvidedId: number | null;
}

export interface CompanyContactRow {
  contactAssignmentId: number;
  contactId: number;
  contactInfoId: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string | null;
  workPhone: string | null;
  roleId: number;
  roleName: string;
  departmentId: number;
  departmentName: string;
}

export interface ManagedContactRow {
  contactId: number;
  contactInfoId: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string | null;
  workPhone: string | null;
  isStaff: boolean;
  companyIds: number[];
  companyNames: string[];
  roleIds: number[];
  roleNames: string[];
  departmentIds: number[];
  departmentNames: string[];
}

export interface CompanyVenueLinkedContactsSection {
  venueCompanyId: number;
  venueCompanyName: string;
  contacts: CompanyContactRow[];
}

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  /** First successful resolution; restarted if process restarts. */
  private venueTicketingColCache: ResolvedVenueTicketingWebsiteColumns | null =
    null;
  /** Undefined while unresolved; null means DB has no company-type link table. */
  private companyTypeLinkTableCache: string | null | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly hubSpotService: HubSpotService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    @InjectRepository(Dma)
    private readonly dmaRepo: Repository<Dma>,
    @InjectRepository(ContactAssignment)
    private readonly assignmentRepo: Repository<ContactAssignment>,
    @InjectRepository(ContactInfo)
    private readonly contactInfoRepo: Repository<ContactInfo>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    @InjectRepository(VenueComplex)
    private readonly venueComplexRepo: Repository<VenueComplex>,
    @InjectRepository(VenueComplexMember)
    private readonly venueComplexMemberRepo: Repository<VenueComplexMember>,
    @InjectRepository(VenueBrand)
    private readonly venueBrandRepo: Repository<VenueBrand>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(VenueTax)
    private readonly venueTaxRepo: Repository<VenueTax>,
    @InjectRepository(Tax)
    private readonly taxRepo: Repository<Tax>,
    @InjectRepository(ServiceProvided)
    private readonly serviceProvidedRepo: Repository<ServiceProvided>,
    @InjectRepository(CompanyServiceEntity)
    private readonly companyServiceRepo: Repository<CompanyServiceEntity>,
    @InjectRepository(CompanyTypeService)
    private readonly companyTypeServiceRepo: Repository<CompanyTypeService>,
    @InjectRepository(CompanyServiceArea)
    private readonly companyServiceAreaRepo: Repository<CompanyServiceArea>,
    @InjectRepository(VenueServiceProvider)
    private readonly venueServiceProviderRepo: Repository<VenueServiceProvider>,
    @InjectRepository(NonResidentWithholding)
    private readonly nonResidentWithholdingRepo: Repository<NonResidentWithholding>,
    @InjectRepository(Link)
    private readonly linkRepo: Repository<Link>,
    @InjectRepository(EngagementVenue)
    private readonly engagementVenueRepo: Repository<EngagementVenue>,
    @InjectRepository(EngagementProjectVenue)
    private readonly engagementProjectVenueRepo: Repository<EngagementProjectVenue>,
    @InjectRepository(CompanyType)
    private readonly companyTypeRepo: Repository<CompanyType>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    private readonly engagementService: EngagementService,
  ) {}

  private safeDbIdentifier(name: string): string {
    return `[${String(name).replace(/\]/g, ']]')}]`;
  }

  private async canQueryCompanyTypeLinkTable(
    manager: EntityManager,
    tableName: string,
  ): Promise<boolean> {
    try {
      await manager.query(
        `SELECT TOP 1 1 AS [ok] FROM [dbo].${this.safeDbIdentifier(tableName)}`,
      );
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `Skipping unusable company-type link table dbo.${tableName}: ${message}`,
      );
      return false;
    }
  }

  private normalizeServiceProvidedIds(ids?: number[] | null): number[] {
    const list = Array.isArray(ids) ? ids : [];
    const cleaned = list
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);
    return [...new Set(cleaned)];
  }

  private normalizeCompanyTypeIds(
    companyTypeIds?: number[] | null,
    legacyCompanyTypeId?: number | null,
  ): number[] {
    const list = Array.isArray(companyTypeIds) ? companyTypeIds : [];
    const cleaned = list
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (
      legacyCompanyTypeId != null &&
      Number.isInteger(legacyCompanyTypeId) &&
      legacyCompanyTypeId > 0
    ) {
      cleaned.push(Number(legacyCompanyTypeId));
    }
    return [...new Set(cleaned)];
  }

  private async allowedServiceIdsForCompanyTypes(
    companyTypeIds: number[],
    em?: EntityManager,
  ): Promise<Set<number>> {
    const ids = [...new Set(companyTypeIds)].filter(
      (id) => Number.isInteger(id) && id > 0,
    );
    if (ids.length === 0) return new Set();
    const repo = em
      ? em.getRepository(CompanyTypeService)
      : this.companyTypeServiceRepo;
    const rows = await repo.find({ where: { companyTypeId: In(ids) } });
    return new Set(rows.map((row) => row.serviceProvidedId));
  }

  private async assertCompanyServicesAllowedForTypes(
    companyTypeIds: number[],
    serviceProvidedIds: number[],
    context = 'company services',
    em?: EntityManager,
  ): Promise<void> {
    const requested = [...new Set(serviceProvidedIds)].filter(
      (id) => Number.isInteger(id) && id > 0,
    );
    if (requested.length === 0) return;

    const allowed = await this.allowedServiceIdsForCompanyTypes(
      companyTypeIds,
      em,
    );
    const blocked = requested.filter((id) => !allowed.has(id));
    if (blocked.length === 0) return;

    const services = await (
      em ? em.getRepository(ServiceProvided) : this.serviceProvidedRepo
    ).find({ where: { serviceProvidedId: In(blocked) } });
    const names = services
      .map((service) => service.serviceName)
      .filter(Boolean)
      .join(', ');
    throw new BadRequestException({
      message: `One or more ${context} are not allowed for the selected company type. Remove ${names || blocked.join(', ')} or update dbo.CompanyTypeService.`,
    });
  }

  private async resolveCompanyTypeLinkTableName(
    em?: EntityManager,
  ): Promise<string | null> {
    const manager = em ?? this.dataSource.manager;
    if (this.companyTypeLinkTableCache !== undefined) {
      const cached = this.companyTypeLinkTableCache;
      if (
        cached &&
        (await this.canQueryCompanyTypeLinkTable(manager, cached))
      ) {
        return cached;
      }
      if (cached) {
        this.companyTypeLinkTableCache = undefined;
      } else {
        return null;
      }
    }
    try {
      const rows = await manager.query(
        `
          SELECT t.TABLE_NAME AS [tableName]
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
        `,
      );
      const candidates = rows
        .map((row) => String(row.tableName ?? row.TABLENAME ?? '').trim())
        .filter((name) => name.length > 0);
      for (const candidate of candidates) {
        if (await this.canQueryCompanyTypeLinkTable(manager, candidate)) {
          this.companyTypeLinkTableCache = candidate;
          this.logger.log(`Using company-type link table: dbo.${candidate}`);
          return candidate;
        }
      }
      this.companyTypeLinkTableCache = null;
      this.logger.warn(
        'No usable dbo company-type link table found (CompanyID + CompanyTypeID). Falling back to dbo.Company.CompanyTypeID.',
      );
      return null;
    } catch (e) {
      this.companyTypeLinkTableCache = null;
      this.logger.warn(
        `Could not resolve company-type link table: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }

  private async collectCompanyTypesByCompanyId(
    companyIds: number[],
    em?: EntityManager,
  ): Promise<Map<number, CompanyType[]>> {
    const ids = [
      ...new Set(companyIds.filter((id) => Number.isInteger(id) && id > 0)),
    ];
    const out = new Map<number, CompanyType[]>();
    if (ids.length === 0) {
      return out;
    }
    const manager = em ?? this.dataSource.manager;
    const linkTable = await this.resolveCompanyTypeLinkTableName(em);
    if (linkTable) {
      const inList = ids.join(',');
      try {
        const rows = await manager.query(
          `
            SELECT
              m.CompanyID AS [companyId],
              ct.CompanyTypeID AS [companyTypeId],
              ct.CompanyTypeName AS [companyTypeName]
            FROM [dbo].${this.safeDbIdentifier(linkTable)} m
            INNER JOIN [dbo].[CompanyType] ct
              ON ct.CompanyTypeID = m.CompanyTypeID
            WHERE m.CompanyID IN (${inList})
          `,
        );
        for (const row of rows) {
          const companyId = Number(row.companyId ?? row.COMPANYID);
          const companyTypeId = Number(row.companyTypeId ?? row.COMPANYTYPEID);
          const companyTypeName = String(
            row.companyTypeName ?? row.COMPANYTYPENAME ?? '',
          ).trim();
          if (!Number.isInteger(companyId) || companyId <= 0) continue;
          if (!Number.isInteger(companyTypeId) || companyTypeId <= 0) continue;
          if (!companyTypeName) continue;
          const list = out.get(companyId) ?? [];
          if (!list.some((t) => t.companyTypeId === companyTypeId)) {
            list.push({ companyTypeId, companyTypeName });
          }
          out.set(companyId, list);
        }
      } catch (e) {
        this.companyTypeLinkTableCache = undefined;
        this.logger.warn(
          `Could not read company-type link rows from dbo.${linkTable}; using legacy CompanyTypeID only. ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    const companies = await (
      em?.getRepository(Company) ?? this.companyRepo
    ).find({
      where: { companyId: In(ids) },
      relations: { companyType: true },
    });
    for (const company of companies) {
      const legacyType = company.companyType;
      if (!legacyType) continue;
      const list = out.get(company.companyId) ?? [];
      if (!list.some((t) => t.companyTypeId === legacyType.companyTypeId)) {
        list.push({
          companyTypeId: legacyType.companyTypeId,
          companyTypeName: legacyType.companyTypeName,
        });
      }
      list.sort((a, b) =>
        a.companyTypeName.localeCompare(b.companyTypeName, undefined, {
          sensitivity: 'base',
        }),
      );
      out.set(company.companyId, list);
    }
    return out;
  }

  private async collectCompanyServicesByCompanyId(
    companyIds: number[],
    em?: EntityManager,
  ): Promise<Map<number, ServiceProvided[]>> {
    const ids = [
      ...new Set(companyIds.filter((id) => Number.isInteger(id) && id > 0)),
    ];
    const out = new Map<number, ServiceProvided[]>();
    if (ids.length === 0) return out;

    const rows = await (
      em?.getRepository(CompanyServiceEntity) ?? this.companyServiceRepo
    ).find({
      where: { companyId: In(ids) },
      relations: { serviceProvided: true },
    });

    for (const row of rows) {
      const service = row.serviceProvided;
      if (!service) continue;
      const list = out.get(row.companyId) ?? [];
      if (
        !list.some((s) => s.serviceProvidedId === service.serviceProvidedId)
      ) {
        list.push(service);
      }
      out.set(row.companyId, list);
    }
    for (const [companyId, list] of out.entries()) {
      list.sort((a, b) =>
        a.serviceName.localeCompare(b.serviceName, undefined, {
          sensitivity: 'base',
        }),
      );
      out.set(companyId, list);
    }
    return out;
  }

  private mapCompanyToDetail(
    company: Company,
    typeMap: Map<number, CompanyType[]>,
    serviceMap: Map<number, ServiceProvided[]>,
    serviceAreaMap?: Map<
      number,
      {
        dmaid: number;
        dmaMarketName: string;
        serviceProvidedId: number;
        serviceName: string;
      }[]
    >,
    allDmasMetaMap?: Map<
      number,
      { allDmas: boolean; allDmasServiceProvidedId: number | null }
    >,
  ): CompanyDetail {
    const allTypes = typeMap.get(company.companyId) ?? [];
    const allServices = serviceMap.get(company.companyId) ?? [];
    const primary =
      company.companyType ??
      allTypes.find((type) => type.companyTypeId === company.companyTypeId) ??
      allTypes[0];
    const primaryTypeId = primary?.companyTypeId ?? company.companyTypeId;
    const primaryTypeName = primary?.companyTypeName ?? '';
    const companyTypeIds = allTypes.length
      ? allTypes.map((type) => type.companyTypeId)
      : primaryTypeId > 0
        ? [primaryTypeId]
        : [];
    const companyTypeNames = allTypes.length
      ? allTypes.map((type) => type.companyTypeName)
      : primaryTypeName
        ? [primaryTypeName]
        : [];
    const allMeta = allDmasMetaMap?.get(company.companyId);
    const allDmas = allMeta?.allDmas ?? false;
    const allDmasServiceProvidedId = allMeta?.allDmasServiceProvidedId ?? null;
    const selectedAllServiceName =
      allDmas && allDmasServiceProvidedId != null
        ? (allServices.find(
            (s) => s.serviceProvidedId === allDmasServiceProvidedId,
          )?.serviceName ?? '')
        : '';
    return {
      companyId: company.companyId,
      companyName: company.companyName,
      isInternal: Boolean(company.isInternal),
      companyTypeId: primaryTypeId,
      companyTypeName: primaryTypeName,
      companyTypeIds,
      companyTypeNames,
      serviceProvidedIds: allServices.map(
        (service) => service.serviceProvidedId,
      ),
      serviceProvidedNames: allServices.map((service) => service.serviceName),
      physicalCity: company.physicalAddress?.city ?? '',
      physicalStateProvince: company.physicalAddress?.stateProvince ?? '',
      dmaId: company.dmaid,
      dmaMarketName: company.dma?.marketName ?? '',
      physicalAddress: company.physicalAddress,
      mailingAddress: company.mailingAddress,
      serviceAreas: allDmas
        ? [
            {
              dmaid: 0,
              dmaMarketName: 'All',
              serviceProvidedId: allDmasServiceProvidedId ?? 0,
              serviceName: selectedAllServiceName,
            },
          ]
        : (serviceAreaMap?.get(company.companyId) ?? []),
      allDmas,
      allDmasServiceProvidedId,
    };
  }

  private async listAllDmaMarketIds(em: EntityManager): Promise<number[]> {
    const rows = await em.query(
      `
      SELECT MIN(d.DMAID) AS dmaid
      FROM dbo.DMA d
      WHERE d.MarketName IS NOT NULL
      GROUP BY d.MarketName
      `,
    );
    return (rows as any[])
      .map((r) => Number(r.dmaid ?? r.DMAID))
      .filter((id) => Number.isInteger(id) && id > 0)
      .sort((a, b) => a - b);
  }

  private async buildAllDmasMetaMap(
    em: EntityManager,
    serviceAreaMap: Map<
      number,
      {
        dmaid: number;
        dmaMarketName: string;
        serviceProvidedId: number;
        serviceName: string;
      }[]
    >,
  ): Promise<
    Map<number, { allDmas: boolean; allDmasServiceProvidedId: number | null }>
  > {
    const out = new Map<
      number,
      { allDmas: boolean; allDmasServiceProvidedId: number | null }
    >();
    const allMarketIds = await this.listAllDmaMarketIds(em);
    const allSet = new Set(allMarketIds);

    for (const [companyId, list] of serviceAreaMap.entries()) {
      if (list.length === 0) {
        out.set(companyId, { allDmas: false, allDmasServiceProvidedId: null });
        continue;
      }
      const sidSet = new Set(list.map((x) => x.serviceProvidedId));
      if (sidSet.size !== 1) {
        out.set(companyId, { allDmas: false, allDmasServiceProvidedId: null });
        continue;
      }
      const dmaidSet = new Set(list.map((x) => x.dmaid));
      if (dmaidSet.size !== allSet.size) {
        out.set(companyId, { allDmas: false, allDmasServiceProvidedId: null });
        continue;
      }
      let matches = true;
      for (const id of dmaidSet) {
        if (!allSet.has(id)) {
          matches = false;
          break;
        }
      }
      out.set(companyId, {
        allDmas: matches,
        allDmasServiceProvidedId: matches ? [...sidSet][0] : null,
      });
    }

    return out;
  }

  private async syncCompanyServices(
    em: EntityManager,
    companyId: number,
    serviceProvidedIds: number[],
  ): Promise<void> {
    await em.delete(CompanyServiceEntity, { companyId });
    if (serviceProvidedIds.length === 0) return;
    const rows = serviceProvidedIds.map((serviceProvidedId) =>
      em.create(CompanyServiceEntity, {
        companyId,
        serviceProvidedId,
      }),
    );
    await em.save(CompanyServiceEntity, rows);
  }

  private normalizeServiceAreas(
    list?: { dmaid: number; serviceProvidedId: number }[] | null,
  ): { dmaid: number; serviceProvidedId: number }[] {
    const rows = Array.isArray(list) ? list : [];
    const out: { dmaid: number; serviceProvidedId: number }[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      const dmaid = Number((r as any)?.dmaid);
      const serviceProvidedId = Number((r as any)?.serviceProvidedId);
      if (!Number.isInteger(dmaid) || dmaid < 1) continue;
      if (!Number.isInteger(serviceProvidedId) || serviceProvidedId < 1)
        continue;
      const key = `${dmaid}:${serviceProvidedId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ dmaid, serviceProvidedId });
    }
    return out;
  }

  private async syncCompanyServiceAreas(
    em: EntityManager,
    companyId: number,
    input: {
      allDmas?: boolean;
      allDmasServiceProvidedId?: number | null;
      serviceAreas?: { dmaid: number; serviceProvidedId: number }[] | null;
    },
    companyTypeIds?: number[],
  ): Promise<{ allDmas: boolean; allDmasServiceProvidedId: number | null }> {
    const allDmas = Boolean(input.allDmas);
    const allDmasServiceProvidedId =
      input.allDmasServiceProvidedId != null
        ? Number(input.allDmasServiceProvidedId)
        : null;

    await em.delete(CompanyServiceArea, { companyId });

    if (allDmas) {
      if (
        allDmasServiceProvidedId == null ||
        !Number.isInteger(allDmasServiceProvidedId) ||
        allDmasServiceProvidedId < 1
      ) {
        throw new BadRequestException({
          message: 'Pick a service for All DMAs.',
        });
      }
      const sid = allDmasServiceProvidedId;
      if (companyTypeIds) {
        await this.assertCompanyServicesAllowedForTypes(
          companyTypeIds,
          [sid],
          'service area services',
          em,
        );
      }
      const known = await em.getRepository(ServiceProvided).findOne({
        where: { serviceProvidedId: sid },
      });
      if (!known) {
        throw new BadRequestException({
          message: 'Invalid service for All DMAs.',
        });
      }
      const dmaids = await this.listAllDmaMarketIds(em);
      if (dmaids.length === 0) {
        throw new BadRequestException({
          message: 'No DMA markets were found to apply All DMAs.',
        });
      }

      // Insert one row per DMA market (MIN(DMAID) grouped by market name)
      await em.query(
        `
        INSERT INTO [dbo].[CompanyServiceArea] ([CompanyID], [DMAID], [ServiceProvidedID])
        SELECT ${Number(companyId)}, MIN(d.[DMAID]), ${Number(sid)}
        FROM [dbo].[DMA] d
        WHERE d.[MarketName] IS NOT NULL
        GROUP BY d.[MarketName]
        `,
      );
      return { allDmas: true, allDmasServiceProvidedId: sid };
    }

    const serviceAreas = this.normalizeServiceAreas(input.serviceAreas);
    if (serviceAreas.length === 0) {
      return { allDmas: false, allDmasServiceProvidedId: null };
    }
    if (companyTypeIds) {
      await this.assertCompanyServicesAllowedForTypes(
        companyTypeIds,
        serviceAreas.map((row) => row.serviceProvidedId),
        'service area services',
        em,
      );
    }

    const uniqueDmaids = [...new Set(serviceAreas.map((r) => r.dmaid))];
    const uniqueServiceIds = [
      ...new Set(serviceAreas.map((r) => r.serviceProvidedId)),
    ];

    const [knownDmaCount, knownServiceCount] = await Promise.all([
      em.getRepository(Dma).count({ where: { dmaid: In(uniqueDmaids) } }),
      em
        .getRepository(ServiceProvided)
        .count({ where: { serviceProvidedId: In(uniqueServiceIds) } }),
    ]);
    if (knownServiceCount !== uniqueServiceIds.length) {
      throw new BadRequestException({
        message: 'One or more services are invalid.',
      });
    }
    if (knownDmaCount !== uniqueDmaids.length) {
      throw new BadRequestException({
        message: 'One or more DMAs are invalid.',
      });
    }

    const rows = serviceAreas.map((r) =>
      em.create(CompanyServiceArea, {
        companyId,
        dmaid: r.dmaid,
        serviceProvidedId: r.serviceProvidedId,
      }),
    );
    await em.save(CompanyServiceArea, rows);
    return { allDmas: false, allDmasServiceProvidedId: null };
  }

  private async collectCompanyServiceAreasByCompanyId(
    companyIds: number[],
    em?: EntityManager,
  ): Promise<
    Map<
      number,
      {
        dmaid: number;
        dmaMarketName: string;
        serviceProvidedId: number;
        serviceName: string;
      }[]
    >
  > {
    const ids = [...new Set(companyIds)].filter(
      (id) => Number.isInteger(id) && id > 0,
    );
    const out = new Map<
      number,
      {
        dmaid: number;
        dmaMarketName: string;
        serviceProvidedId: number;
        serviceName: string;
      }[]
    >();
    if (ids.length === 0) return out;

    const repo =
      em?.getRepository(CompanyServiceArea) ?? this.companyServiceAreaRepo;
    const rows = await repo.find({
      where: { companyId: In(ids) },
      relations: { dma: true, serviceProvided: true },
    });

    for (const r of rows) {
      const list = out.get(r.companyId) ?? [];
      list.push({
        dmaid: r.dmaid,
        dmaMarketName: (r.dma as any)?.marketName ?? '',
        serviceProvidedId: r.serviceProvidedId,
        serviceName: (r.serviceProvided as any)?.serviceName ?? '',
      });
      out.set(r.companyId, list);
    }

    for (const [cid, list] of out.entries()) {
      list.sort((a, b) => {
        const dma = a.dmaMarketName.localeCompare(b.dmaMarketName, undefined, {
          sensitivity: 'base',
        });
        if (dma !== 0) return dma;
        return a.serviceName.localeCompare(b.serviceName, undefined, {
          sensitivity: 'base',
        });
      });
      out.set(cid, list);
    }
    return out;
  }

  private async syncCompanyTypes(
    em: EntityManager,
    companyId: number,
    companyTypeIds: number[],
  ): Promise<void> {
    const linkTable = await this.resolveCompanyTypeLinkTableName(em);
    if (!linkTable) {
      if (companyTypeIds.length > 1) {
        throw new BadRequestException({
          message:
            'This database does not expose a company-type link table, so only one company type can be saved.',
        });
      }
      return;
    }
    const safeTable = this.safeDbIdentifier(linkTable);
    await em.query(
      `DELETE FROM [dbo].${safeTable} WHERE CompanyID = ${Number(companyId)}`,
    );
    if (companyTypeIds.length === 0) {
      return;
    }
    const values = companyTypeIds
      .map((typeId) => `(${Number(companyId)}, ${Number(typeId)})`)
      .join(', ');
    await em.query(
      `INSERT INTO [dbo].${safeTable} (CompanyID, CompanyTypeID) VALUES ${values}`,
    );
  }

  private async loadEffectiveCompanyTypeIds(
    companyId: number,
    fallbackCompanyTypeId: number,
    em?: EntityManager,
  ): Promise<number[]> {
    const map = await this.collectCompanyTypesByCompanyId([companyId], em);
    const fromMap = (map.get(companyId) ?? []).map(
      (type) => type.companyTypeId,
    );
    const deduped = [...new Set([...fromMap, fallbackCompanyTypeId])].filter(
      (id) => Number.isInteger(id) && id > 0,
    );
    return deduped;
  }

  private async getStagehandsServiceId(
    em?: EntityManager,
  ): Promise<number | null> {
    const repo = em
      ? em.getRepository(ServiceProvided)
      : this.serviceProvidedRepo;
    const row = await repo
      .createQueryBuilder('sp')
      .where('LOWER(sp.serviceName) = LOWER(:n)', { n: 'Stagehands' })
      .getOne();
    return row?.serviceProvidedId ?? null;
  }

  private async getRoleIdByName(
    name: string,
    em: EntityManager,
  ): Promise<number> {
    const t = name.trim();
    const row = await em
      .getRepository(Role)
      .createQueryBuilder('r')
      .where('LOWER(r.roleName) = LOWER(:n)', { n: t })
      .getOne();
    if (!row) {
      throw new BadRequestException({
        message: `The job role “${t}” is not set up in this system yet. Ask an administrator to add it (or contact support) before saving these venue contacts.`,
      });
    }
    return row.roleId;
  }

  private async getDepartmentIdByName(
    name: string,
    em: EntityManager,
  ): Promise<number> {
    const t = name.trim();
    const row = await em
      .getRepository(Department)
      .createQueryBuilder('d')
      .where('LOWER(d.departmentName) = LOWER(:n)', { n: t })
      .getOne();
    if (!row) {
      throw new BadRequestException({
        message: `The department “${t}” is not set up in this system yet. Ask an administrator to add it (or contact support) before saving these venue contacts.`,
      });
    }
    return row.departmentId;
  }

  private async upsertVenueContactByRoleDept(
    em: EntityManager,
    companyId: number,
    roleName: string,
    departmentName: string,
    draft:
      | {
          fullName?: string;
          email?: string;
          phone?: string;
          cellPhone?: string;
        }
      | undefined,
  ): Promise<void> {
    if (!draft) return;
    if (
      isBlank(draft.fullName) &&
      isBlank(draft.email) &&
      isBlank(draft.phone) &&
      isBlank(draft.cellPhone)
    ) {
      return;
    }
    const fullName = String(draft.fullName ?? '').trim();
    const email = String(draft.email ?? '').trim();
    const phone = draft.phone != null ? String(draft.phone).trim() : '';
    const cellPhone =
      draft.cellPhone != null ? String(draft.cellPhone).trim() : '';

    if (!email) {
      throw new BadRequestException({
        message: `Email is required for ${departmentName} ${roleName}.`,
      });
    }
    if (phone) {
      assertOptionalE164Phone(phone, 'work phone');
    }
    if (cellPhone) {
      assertOptionalE164Phone(cellPhone, 'cell phone');
    }

    const roleId = await this.getRoleIdByName(roleName, em);
    const departmentId = await this.getDepartmentIdByName(departmentName, em);

    const existingAsg = await em.findOne(ContactAssignment, {
      where: { companyId, roleId, departmentId },
      relations: { contact: { contactInfo: true } },
    });

    const existingInfo = await em
      .getRepository(ContactInfo)
      .createQueryBuilder('ci')
      .where('LOWER(ci.email) = LOWER(:email)', { email })
      .getOne();

    const { firstName, lastName } = splitFullName(fullName);
    const info =
      existingInfo ??
      (await em.save(
        ContactInfo,
        em.create(ContactInfo, {
          firstName: firstName || '',
          lastName: lastName || '',
          email,
          workPhone: phone || null,
          cellPhone: cellPhone || null,
        }),
      ));

    const existingContact = await em.findOne(Contact, {
      where: { contactInfoId: info.contactInfoId },
    });
    const contact =
      existingContact ??
      (await em.save(
        Contact,
        em.create(Contact, { contactInfoId: info.contactInfoId }),
      ));

    if (existingAsg) {
      existingAsg.contactId = contact.contactId;
      await em.save(ContactAssignment, existingAsg);
    } else {
      const assignment = em.create(ContactAssignment, {
        contactId: contact.contactId,
        companyId,
        roleId,
        departmentId,
      });
      await em.save(ContactAssignment, assignment);
    }

    // Best-effort: apply updated name/phones to the stored ContactInfo.
    if (fullName || phone || cellPhone) {
      const ci = await em.findOneBy(ContactInfo, {
        contactInfoId: info.contactInfoId,
      });
      if (ci) {
        ci.firstName = firstName || '';
        ci.lastName = lastName || '';
        if (phone) ci.workPhone = phone;
        if (cellPhone) ci.cellPhone = cellPhone;
        else if (draft.cellPhone !== undefined && !cellPhone)
          ci.cellPhone = null;
        await em.save(ContactInfo, ci);
      }
    }
  }

  /** Legacy rows used em dash as SQL NOT NULL placeholder for an empty name part — hide it in API/UI. */
  private contactNamePartForDisplay(value: string | null | undefined): string {
    const t = String(value ?? '').trim();
    if (!t) return '';
    if (/^[—–\u2013\u2014\-−\s]+$/u.test(t)) return '';
    return t;
  }

  private mapContactInfoToVenueRoleRow(ci: ContactInfo): {
    contactInfoId: number;
    fullName: string;
    email: string;
    phone: string | null;
    cellPhone: string | null;
  } {
    const firstName = this.contactNamePartForDisplay(ci.firstName);
    const lastName = this.contactNamePartForDisplay(ci.lastName);
    const email = String(ci.email ?? '').trim();
    const phone = ci.workPhone != null ? String(ci.workPhone).trim() : null;
    const cellPhone = ci.cellPhone != null ? String(ci.cellPhone).trim() : null;
    return {
      contactInfoId: ci.contactInfoId,
      fullName: [firstName, lastName].filter(Boolean).join(' ').trim(),
      email,
      phone,
      cellPhone,
    };
  }

  private async getVenueContactByRoleDept(
    companyId: number,
    roleName: string,
    departmentName: string,
    em?: EntityManager,
  ): Promise<{
    contactInfoId: number;
    fullName: string;
    email: string;
    phone: string | null;
    cellPhone: string | null;
  } | null> {
    const list = await this.getVenueContactsByRoleDept(
      companyId,
      roleName,
      departmentName,
      [],
      em,
    );
    return list[0] ?? null;
  }

  /** All contact rows for a venue role+department (multiple UI blocks). */
  private async getVenueContactsByRoleDept(
    companyId: number,
    roleName: string,
    departmentName: string,
    inheritedCompanyIds: number[] = [],
    em?: EntityManager,
  ): Promise<
    Array<{
      contactId: number;
      contactInfoId: number;
      fullName: string;
      email: string;
      phone: string | null;
      cellPhone: string | null;
    }>
  > {
    const repo = em ? em.getRepository(ContactAssignment) : this.assignmentRepo;
    const companyIds = Array.from(
      new Set(
        [companyId, ...inheritedCompanyIds]
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );
    if (companyIds.length === 0) {
      return [];
    }
    const rn = roleName.trim();
    const dn = departmentName.trim();
    /**
     * One query per companyId (venue + each linked complex). Uses getMany() so
     * MSSQL never has to alias raw scalar columns (avoids driver/raw-alias bugs);
     * also avoids `IN (:...many)` and empty `IN ()`.
     */
    const mergedRows: Array<{
      contactAssignmentId: number;
      row: {
        contactId: number;
        contactInfoId: number;
        fullName: string;
        email: string;
        phone: string | null;
        cellPhone: string | null;
      };
    }> = [];
    for (const cid of companyIds) {
      const assignments = await repo
        .createQueryBuilder('ca')
        .innerJoinAndSelect('ca.contact', 'ct')
        .innerJoinAndSelect('ct.contactInfo', 'ci')
        .innerJoinAndSelect('ca.role', 'r')
        .innerJoinAndSelect('ca.department', 'd')
        .where('ca.companyId = :cid', { cid })
        .andWhere('LOWER(r.roleName) = LOWER(:rn)', { rn })
        .andWhere('LOWER(d.departmentName) = LOWER(:dn)', { dn })
        .orderBy('ca.contactAssignmentId', 'ASC')
        .getMany();
      for (const ca of assignments) {
        const ci = ca.contact?.contactInfo;
        if (!ci) continue;
        mergedRows.push({
          contactAssignmentId: ca.contactAssignmentId,
          row: { contactId: ca.contact.contactId, ...this.mapContactInfoToVenueRoleRow(ci) },
        });
      }
    }
    mergedRows.sort((a, b) => a.contactAssignmentId - b.contactAssignmentId);
    const mapped = mergedRows.map((x) => x.row);
    const dedupedByContact = new Map<number, (typeof mapped)[number]>();
    for (const row of mapped) {
      // A contact can be assigned both at Venue and Complex company level.
      // We return one row per person (contact identity) so inherited contacts
      // do not duplicate entries in the venue profile UI.
      if (!dedupedByContact.has(row.contactId)) {
        dedupedByContact.set(row.contactId, row);
      }
    }
    return [...dedupedByContact.values()];
  }

  /**
   * Create ContactInfo (by email) + Contact + a new ContactAssignment in one slot.
   */
  private async insertVenueContactAssignment(
    em: EntityManager,
    companyId: number,
    roleId: number,
    departmentId: number,
    roleName: string,
    departmentName: string,
    draft: {
      fullName?: string;
      email?: string;
      phone?: string;
      cellPhone?: string;
    },
  ): Promise<void> {
    const fullName = String(draft.fullName ?? '').trim();
    const email = String(draft.email ?? '').trim();
    const phone = draft.phone != null ? String(draft.phone).trim() : '';
    const cellPhone =
      draft.cellPhone != null ? String(draft.cellPhone).trim() : '';

    if (!email) {
      throw new BadRequestException({
        message: `Email is required for ${departmentName} ${roleName}.`,
      });
    }
    if (phone) {
      assertOptionalE164Phone(phone, 'work phone');
    }
    if (cellPhone) {
      assertOptionalE164Phone(cellPhone, 'cell phone');
    }

    const existingInfo = await em
      .getRepository(ContactInfo)
      .createQueryBuilder('ci')
      .where('LOWER(ci.email) = LOWER(:email)', { email })
      .getOne();

    const { firstName, lastName } = splitFullName(fullName);
    const info =
      existingInfo ??
      (await em.save(
        ContactInfo,
        em.create(ContactInfo, {
          firstName: firstName || '',
          lastName: lastName || '',
          email,
          workPhone: phone || null,
          cellPhone: cellPhone || null,
        }),
      ));

    const existingContact = await em.findOne(Contact, {
      where: { contactInfoId: info.contactInfoId },
    });
    const contact =
      existingContact ??
      (await em.save(
        Contact,
        em.create(Contact, { contactInfoId: info.contactInfoId }),
      ));

    const assignment = em.create(ContactAssignment, {
      contactId: contact.contactId,
      companyId,
      roleId,
      departmentId,
    });
    await em.save(ContactAssignment, assignment);

    if (fullName || phone || cellPhone) {
      const ci = await em.findOneBy(ContactInfo, {
        contactInfoId: info.contactInfoId,
      });
      if (ci) {
        ci.firstName = firstName || '';
        ci.lastName = lastName || '';
        if (phone) ci.workPhone = phone;
        if (cellPhone) ci.cellPhone = cellPhone;
        else if (draft.cellPhone !== undefined && !cellPhone)
          ci.cellPhone = null;
        await em.save(ContactInfo, ci);
      }
    }
  }

  private async replaceVenueContactsByRoleDept(
    em: EntityManager,
    companyId: number,
    roleName: string,
    departmentName: string,
    drafts:
      | Array<{
          fullName?: string;
          email?: string;
          phone?: string;
          cellPhone?: string;
        }>
      | undefined,
  ): Promise<void> {
    if (drafts === undefined) {
      return;
    }
    const roleId = await this.getRoleIdByName(roleName, em);
    const departmentId = await this.getDepartmentIdByName(departmentName, em);
    const nonEmpty = drafts.filter(
      (d) =>
        !(
          isBlank(d.fullName) &&
          isBlank(d.email) &&
          isBlank(d.phone) &&
          isBlank(d.cellPhone)
        ),
    );

    await em.delete(ContactAssignment, { companyId, roleId, departmentId });

    for (const d of nonEmpty) {
      await this.insertVenueContactAssignment(
        em,
        companyId,
        roleId,
        departmentId,
        roleName,
        departmentName,
        d,
      );
    }
  }

  private async upsertLink(
    em: EntityManager,
    draft:
      | {
          linkId?: number | null;
          linkType?: string;
          linkUrl?: string;
          linkName?: string;
          linkPath?: string;
        }
      | null
      | undefined,
  ): Promise<number | null> {
    if (!draft) return null;
    const url = String(draft.linkUrl ?? '').trim();
    const path = String(draft.linkPath ?? '').trim();
    const name = String(draft.linkName ?? '').trim();
    const hasAny = url.length > 0 || path.length > 0 || name.length > 0;
    if (!hasAny) return null;

    const linkType =
      String(draft.linkType ?? '').trim() || (path ? 'File' : 'URL');
    const linkUrl = url || path || '';
    const linkPath = path || (url ? url : '');
    const linkName = name || linkUrl.slice(0, 255) || 'Link';

    const id = draft.linkId ?? null;
    if (id && Number.isInteger(id) && id > 0) {
      const existing = await em.findOne(Link, { where: { linkId: id } });
      if (existing) {
        existing.linkType = linkType.slice(0, 50);
        existing.linkUrl = linkUrl.slice(0, 2048);
        existing.linkPath = linkPath.slice(0, 1024);
        existing.linkName = linkName.slice(0, 255);
        await em.save(Link, existing);
        return existing.linkId;
      }
    }

    const created = em.create(Link, {
      linkType: linkType.slice(0, 50),
      linkUrl: linkUrl.slice(0, 2048),
      linkPath: linkPath.slice(0, 1024),
      linkName: linkName.slice(0, 255),
    });
    const saved = await em.save(Link, created);
    return saved.linkId;
  }

  async getVenueDetails(companyId: number) {
    await this.assertVenueCompanyForProfile(companyId);
    const venue = await this.venueRepo.findOne({
      where: { companyId },
      relations: { venueType: true, seatingType: true, loadDockAddress: true },
    });
    if (!venue) return { missing: true as const };

    const venueProfile = await this.buildVenueProfileReadModel(
      companyId,
      venue,
    );

    const brands = await this.venueBrandRepo.find({
      where: { venueCompanyId: companyId },
      relations: { brand: true },
    });

    const taxes = await this.venueTaxRepo.find({
      where: { venueCompanyId: companyId },
      relations: { tax: true },
    });

    const stagehandsServiceId = await this.getStagehandsServiceId();
    const stagehandsProvider =
      stagehandsServiceId != null
        ? await this.venueServiceProviderRepo.findOne({
            where: {
              venueCompanyId: companyId,
              serviceId: stagehandsServiceId,
            },
          })
        : null;

    const taxJurisdictions = taxes.map((t) =>
      (t.tax?.taxJurisdictionType ?? '').toLowerCase(),
    );
    const hasStateTaxOnTickets = taxJurisdictions.includes('state') ? 1 : 0;
    const hasCityTaxOnTickets = taxJurisdictions.includes('city') ? 1 : 0;

    const withholding = venue.nonResidentWithholdingId
      ? await this.nonResidentWithholdingRepo.findOne({
          where: { withholdingId: venue.nonResidentWithholdingId },
        })
      : null;
    const withholdingLink = withholding?.withholdingLinkId
      ? await this.linkRepo.findOne({
          where: { linkId: withholding.withholdingLinkId },
        })
      : null;
    const artistWaiver = withholding?.artistWaiverInstructionsId
      ? await this.linkRepo.findOne({
          where: { linkId: withholding.artistWaiverInstructionsId },
        })
      : null;
    const iaeWaiver = withholding?.iaeWaiverInstructionsId
      ? await this.linkRepo.findOne({
          where: { linkId: withholding.iaeWaiverInstructionsId },
        })
      : null;

    const inheritedComplexCompanyIds =
      await this.getVenueComplexCompanyIds(companyId);

    const financeDirectors = await this.getVenueContactsByRoleDept(
      companyId,
      'Finance Director',
      'Finance',
      inheritedComplexCompanyIds,
    );
    const settlementManagers = await this.getVenueContactsByRoleDept(
      companyId,
      'Settlement Manager',
      'Finance',
      inheritedComplexCompanyIds,
    );
    const marketingDirectors = await this.getVenueContactsByRoleDept(
      companyId,
      'Marketing Director',
      'Marketing',
      inheritedComplexCompanyIds,
    );
    const technicalDirectors = await this.getVenueContactsByRoleDept(
      companyId,
      'Technical Director',
      'Technical',
      inheritedComplexCompanyIds,
    );
    const ticketingManagers = await this.getVenueContactsByRoleDept(
      companyId,
      'Ticketing Manager',
      'Ticketing',
      inheritedComplexCompanyIds,
    );
    const bookingDirectors = await this.getVenueContactsByRoleDept(
      companyId,
      'Booking Director',
      'Booking',
      inheritedComplexCompanyIds,
    );
    const rentalManagers = await this.getVenueContactsByRoleDept(
      companyId,
      'Rental Manager',
      'Booking',
      inheritedComplexCompanyIds,
    );
    const calendarManagers = await this.getVenueContactsByRoleDept(
      companyId,
      'Calendar Manager',
      'Booking',
      inheritedComplexCompanyIds,
    );
    const contractManagers = await this.getVenueContactsByRoleDept(
      companyId,
      'Contract Manager',
      'Booking',
      inheritedComplexCompanyIds,
    );
    const stagehandProviderContacts = await this.getVenueContactsByRoleDept(
      companyId,
      'Stagehand Provider',
      'Technical',
      inheritedComplexCompanyIds,
    );

    return {
      missing: false as const,
      venueProfile,
      brandIds: brands.map((b) => b.brandId),
      taxIds: taxes.map((t) => t.taxId),
      stagehandProviderCompanyId: stagehandsProvider?.providerCompanyId ?? null,
      nonResidentWithholdingId: venue.nonResidentWithholdingId ?? null,
      hasStateTaxOnTickets,
      hasCityTaxOnTickets,
      financeDirectors,
      settlementManagers,
      marketingDirectors,
      technicalDirectors,
      ticketingManagers,
      bookingDirectors,
      rentalManagers,
      calendarManagers,
      contractManagers,
      stagehandProviderContacts,
      nonResidentWithholding: withholding
        ? {
            withholdingId: withholding.withholdingId,
            withholdingTaxRate: String(withholding.withholdingTaxRate ?? ''),
            dmaid: withholding.dmaid,
            taxAgencyId: withholding.taxAgencyId,
            withholdingLink: withholdingLink
              ? {
                  linkId: withholdingLink.linkId,
                  linkType: withholdingLink.linkType,
                  linkUrl: withholdingLink.linkUrl,
                  linkName: withholdingLink.linkName,
                  linkPath: withholdingLink.linkPath,
                }
              : null,
            artistWaiverInstructions: artistWaiver
              ? {
                  linkId: artistWaiver.linkId,
                  linkType: artistWaiver.linkType,
                  linkUrl: artistWaiver.linkUrl,
                  linkName: artistWaiver.linkName,
                  linkPath: artistWaiver.linkPath,
                }
              : null,
            iaeWaiverInstructions: iaeWaiver
              ? {
                  linkId: iaeWaiver.linkId,
                  linkType: iaeWaiver.linkType,
                  linkUrl: iaeWaiver.linkUrl,
                  linkName: iaeWaiver.linkName,
                  linkPath: iaeWaiver.linkPath,
                }
              : null,
          }
        : null,
    };
  }

  async updateVenueDetails(companyId: number, dto: UpdateVenueDetailsDto) {
    await this.assertVenueCompanyForProfile(companyId);
    return this.dataSource.transaction(async (em) => {
      // 1) Venue profile (dbo.Venue + load dock address)
      if (dto.venueProfile) {
        const { entertainmentComplexCompanyIds, ...venueProfilePatch } =
          dto.venueProfile;
        if (Object.keys(venueProfilePatch).length > 0) {
          await this.updateVenueProfile(companyId, venueProfilePatch);
        }
        if (dto.venueProfile.entertainmentComplexCompanyIds !== undefined) {
          await this.updateVenueComplexMembership(
            em,
            companyId,
            entertainmentComplexCompanyIds,
          );
        }
      }

      // 2) Venue-side FK for withholding (only when the client sends this field; avoids an extra
      //    load+save of dbo.Venue for every other partial PATCH, e.g. only venueProfile).
      if (dto.nonResidentWithholdingId !== undefined) {
        const venue = await em.findOne(Venue, { where: { companyId } });
        if (!venue) {
          throw new NotFoundException({
            message:
              'No venue profile exists for this company yet. Use Create venue profile first.',
          });
        }
        venue.nonResidentWithholdingId = dto.nonResidentWithholdingId ?? null;
        await em.save(Venue, venue);
      }

      // 3) Brands: replace set for this venue
      if (dto.brandIds !== undefined) {
        await em.delete(VenueBrand, { venueCompanyId: companyId });
        const next = Array.from(new Set(dto.brandIds)).filter(
          (x) => Number.isInteger(x) && x > 0,
        );
        if (next.length) {
          await em.insert(
            VenueBrand,
            next.map((brandId) => ({ venueCompanyId: companyId, brandId })),
          );
        }
      }

      // 4) Taxes: replace set for this venue
      if (dto.taxIds !== undefined) {
        await em.delete(VenueTax, { venueCompanyId: companyId });
        const next = Array.from(new Set(dto.taxIds)).filter(
          (x) => Number.isInteger(x) && x > 0,
        );
        if (next.length) {
          await em.insert(
            VenueTax,
            next.map((taxId) => ({ venueCompanyId: companyId, taxId })),
          );
        }
      }

      // 5) Stagehands provider: upsert (single row for Stagehands service)
      if (dto.stagehandProviderCompanyId !== undefined) {
        const stagehandsServiceId = await this.getStagehandsServiceId(em);
        if (stagehandsServiceId != null) {
          await em.delete(VenueServiceProvider, {
            venueCompanyId: companyId,
            serviceId: stagehandsServiceId,
          });
          const providerId = dto.stagehandProviderCompanyId;
          if (providerId != null) {
            // Ensure provider offers stagehands (CompanyService composite enforced in DB)
            const providerOffers = await em.findOne(CompanyServiceEntity, {
              where: {
                companyId: providerId,
                serviceProvidedId: stagehandsServiceId,
              },
            });
            if (!providerOffers) {
              throw new BadRequestException({
                message:
                  'That company is not registered as offering stagehands services. Pick a different stagehand provider or update their services first.',
              });
            }
            await em.insert(VenueServiceProvider, {
              venueCompanyId: companyId,
              serviceId: stagehandsServiceId,
              providerCompanyId: providerId,
            });
          }
        }
      }

      if (dto.nonResidentWithholding !== undefined) {
        const venueForNrw = await em.findOne(Venue, { where: { companyId } });
        if (!venueForNrw) {
          throw new NotFoundException({
            message:
              'No venue profile exists for this company yet. Use Create venue profile first.',
          });
        }
        const wid =
          dto.nonResidentWithholdingId ??
          venueForNrw.nonResidentWithholdingId ??
          null;
        if (!wid) {
          throw new BadRequestException({
            message:
              'Choose a withholding record for this venue before saving these details.',
          });
        }
        const row = await em.findOne(NonResidentWithholding, {
          where: { withholdingId: wid },
        });
        if (!row) {
          throw new BadRequestException({
            message:
              'That withholding record was not found. Check the number or ask your administrator.',
          });
        }

        if (dto.nonResidentWithholding.withholdingTaxRate !== undefined) {
          row.withholdingTaxRate =
            String(
              dto.nonResidentWithholding.withholdingTaxRate ?? '',
            ).trim() || row.withholdingTaxRate;
        }
        if (dto.nonResidentWithholding.dmaid !== undefined) {
          row.dmaid = dto.nonResidentWithholding.dmaid ?? null;
        }
        if (dto.nonResidentWithholding.taxAgencyId !== undefined) {
          row.taxAgencyId = dto.nonResidentWithholding.taxAgencyId ?? null;
        }
        if (dto.nonResidentWithholding.withholdingLink !== undefined) {
          row.withholdingLinkId = await this.upsertLink(
            em,
            dto.nonResidentWithholding.withholdingLink,
          );
        }
        if (dto.nonResidentWithholding.artistWaiverInstructions !== undefined) {
          row.artistWaiverInstructionsId = await this.upsertLink(
            em,
            dto.nonResidentWithholding.artistWaiverInstructions,
          );
        }
        if (dto.nonResidentWithholding.iaeWaiverInstructions !== undefined) {
          row.iaeWaiverInstructionsId = await this.upsertLink(
            em,
            dto.nonResidentWithholding.iaeWaiverInstructions,
          );
        }
        await em.save(NonResidentWithholding, row);
      }

      // 6) Venue contacts (role/department based)
      if (dto.financeDirectors !== undefined) {
        await this.replaceVenueContactsByRoleDept(
          em,
          companyId,
          'Finance Director',
          'Finance',
          dto.financeDirectors,
        );
      } else {
        await this.upsertVenueContactByRoleDept(
          em,
          companyId,
          'Finance Director',
          'Finance',
          dto.financeDirector,
        );
      }
      if (dto.settlementManagers !== undefined) {
        await this.replaceVenueContactsByRoleDept(
          em,
          companyId,
          'Settlement Manager',
          'Finance',
          dto.settlementManagers,
        );
      } else {
        await this.upsertVenueContactByRoleDept(
          em,
          companyId,
          'Settlement Manager',
          'Finance',
          dto.settlementManager,
        );
      }
      if (dto.marketingDirectors !== undefined) {
        await this.replaceVenueContactsByRoleDept(
          em,
          companyId,
          'Marketing Director',
          'Marketing',
          dto.marketingDirectors,
        );
      } else {
        await this.upsertVenueContactByRoleDept(
          em,
          companyId,
          'Marketing Director',
          'Marketing',
          dto.marketingDirector,
        );
      }
      if (dto.technicalDirectors !== undefined) {
        await this.replaceVenueContactsByRoleDept(
          em,
          companyId,
          'Technical Director',
          'Technical',
          dto.technicalDirectors,
        );
      } else {
        await this.upsertVenueContactByRoleDept(
          em,
          companyId,
          'Technical Director',
          'Technical',
          dto.technicalDirector,
        );
      }
      if (dto.ticketingManagers !== undefined) {
        await this.replaceVenueContactsByRoleDept(
          em,
          companyId,
          'Ticketing Manager',
          'Ticketing',
          dto.ticketingManagers,
        );
      } else {
        await this.upsertVenueContactByRoleDept(
          em,
          companyId,
          'Ticketing Manager',
          'Ticketing',
          dto.ticketingManager,
        );
      }
      if (dto.bookingDirectors !== undefined) {
        await this.replaceVenueContactsByRoleDept(
          em,
          companyId,
          'Booking Director',
          'Booking',
          dto.bookingDirectors,
        );
      } else {
        await this.upsertVenueContactByRoleDept(
          em,
          companyId,
          'Booking Director',
          'Booking',
          dto.bookingDirector,
        );
      }
      if (dto.rentalManagers !== undefined) {
        await this.replaceVenueContactsByRoleDept(
          em,
          companyId,
          'Rental Manager',
          'Booking',
          dto.rentalManagers,
        );
      } else {
        await this.upsertVenueContactByRoleDept(
          em,
          companyId,
          'Rental Manager',
          'Booking',
          dto.rentalManager,
        );
      }
      if (dto.calendarManagers !== undefined) {
        await this.replaceVenueContactsByRoleDept(
          em,
          companyId,
          'Calendar Manager',
          'Booking',
          dto.calendarManagers,
        );
      } else {
        await this.upsertVenueContactByRoleDept(
          em,
          companyId,
          'Calendar Manager',
          'Booking',
          dto.calendarManager,
        );
      }
      if (dto.contractManagers !== undefined) {
        await this.replaceVenueContactsByRoleDept(
          em,
          companyId,
          'Contract Manager',
          'Booking',
          dto.contractManagers,
        );
      } else {
        await this.upsertVenueContactByRoleDept(
          em,
          companyId,
          'Contract Manager',
          'Booking',
          dto.contractManager,
        );
      }
      if (dto.stagehandProviderContacts !== undefined) {
        await this.replaceVenueContactsByRoleDept(
          em,
          companyId,
          'Stagehand Provider',
          'Technical',
          dto.stagehandProviderContacts,
        );
      } else {
        await this.upsertVenueContactByRoleDept(
          em,
          companyId,
          'Stagehand Provider',
          'Technical',
          dto.stagehandProviderContact,
        );
      }

      return { updated: true as const };
    });
  }

  private async ensureRole(roleId: number, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(Role) : this.roleRepo;
    const row = await repo.findOne({ where: { roleId } });
    if (!row) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: `Role #${roleId} does not exist.`,
      });
    }
  }

  private async ensureDepartment(
    departmentId: number,
    em?: EntityManager,
  ): Promise<void> {
    const repo = em ? em.getRepository(Department) : this.departmentRepo;
    const row = await repo.findOne({ where: { departmentId } });
    if (!row) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: `Department #${departmentId} does not exist.`,
      });
    }
  }

  normalizePostal(postalCode: string, country: string): string {
    const raw = postalCode.trim();
    const c = country.trim().toLowerCase();
    if (c === 'usa' || c === 'united states' || c === 'us') {
      const digits = raw.replace(/\D/g, '');
      if (digits.length >= 5) return digits.slice(0, 5);
    }
    return raw.toUpperCase().replace(/\s+/g, ' ');
  }

  async resolveDmaId(
    postalCode: string,
    country: string,
  ): Promise<number | null> {
    const raw = postalCode.trim();
    if (!raw) return null;
    /** Same as GET /lookups/dma-by-postal (trim-only exact) before normalized match. */
    const direct = await this.dmaRepo
      .createQueryBuilder('d')
      .where('d.postalCode = :pc', { pc: raw })
      .orderBy('d.dmaid', 'ASC')
      .getOne();
    if (direct) return direct.dmaid;
    const normalized = this.normalizePostal(postalCode, country);
    const row = await this.dmaRepo
      .createQueryBuilder('d')
      .where('d.postalCode = :pc', { pc: normalized })
      .orderBy('d.dmaid', 'ASC')
      .getOne();
    if (row) return row.dmaid;
    const likeZip = normalized.replace(/\D/g, '').slice(0, 5);
    if (likeZip.length === 5) {
      const fuzzy = await this.dmaRepo
        .createQueryBuilder('d')
        .where("REPLACE(REPLACE(d.postalCode, ' ', ''), '-', '') LIKE :z", {
          z: `${likeZip}%`,
        })
        .orderBy('d.dmaid', 'ASC')
        .getOne();
      return fuzzy?.dmaid ?? null;
    }
    return null;
  }

  private normalizeAddressPayload(dto: {
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
  }) {
    return {
      addressLine1: dto.addressLine1.trim(),
      addressLine2: dto.addressLine2?.trim() || null,
      city: dto.city.trim(),
      stateProvince: dto.stateProvince.trim(),
      postalCode: dto.postalCode.trim(),
      country: dto.country.trim(),
    };
  }

  /**
   * dbo.Address has a unique index over normalized address fields.
   * Reuse an existing row when possible instead of always inserting.
   */
  private async getOrCreateAddress(
    em: EntityManager,
    dto: {
      addressLine1: string;
      addressLine2?: string | null;
      city: string;
      stateProvince: string;
      postalCode: string;
      country: string;
    },
  ): Promise<Address> {
    const normalized = this.normalizeAddressPayload(dto);
    const existing = await em.findOne(Address, {
      where: {
        ...normalized,
        addressLine2:
          normalized.addressLine2 === null ? IsNull() : normalized.addressLine2,
      },
    });
    if (existing) return existing;
    const address = em.create(Address, normalized);
    return em.save(Address, address);
  }

  async findAll(): Promise<CompanyDetail[]> {
    const rows = await this.companyRepo
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.companyType', 'ct')
      .leftJoinAndSelect('c.physicalAddress', 'pa')
      .leftJoinAndSelect('c.mailingAddress', 'ma')
      .leftJoinAndSelect('c.dma', 'd')
      .orderBy('c.companyName', 'ASC')
      .getMany();

    const companyIds = rows.map((row) => row.companyId);
    const typeMap = await this.collectCompanyTypesByCompanyId(companyIds);
    const serviceMap = await this.collectCompanyServicesByCompanyId(companyIds);
    const serviceAreaMap =
      await this.collectCompanyServiceAreasByCompanyId(companyIds);
    const allDmasMetaMap = await this.buildAllDmasMetaMap(
      this.dataSource.manager,
      serviceAreaMap,
    );
    return rows.map((c) =>
      this.mapCompanyToDetail(
        c,
        typeMap,
        serviceMap,
        serviceAreaMap,
        allDmasMetaMap,
      ),
    );
  }

  async findAllPaginated(
    offset: number,
    limit: number,
    search?: string,
    companyType?: string,
    sortByRaw?: string,
    sortDirRaw?: string,
  ): Promise<{ data: CompanyDetail[]; total: number }> {
    const typeName = (companyType ?? '').trim();
    const normalizedTypeName = typeName.toLowerCase();
    const qb = this.companyRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.companyType', 'ct')
      .leftJoinAndSelect('c.physicalAddress', 'pa')
      .leftJoinAndSelect('c.mailingAddress', 'ma')
      .leftJoinAndSelect('c.dma', 'd');

    const sortBy = (sortByRaw ?? '').trim().toLowerCase();
    const sortDir =
      (sortDirRaw ?? '').trim().toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const addStableTieBreak = () =>
      qb.addOrderBy('c.companyName', 'ASC').addOrderBy('c.companyId', 'ASC');

    if (sortBy === 'type') {
      qb.addSelect("ISNULL(ct.companyTypeName, '')", 'sort_company_type');
      qb.orderBy('sort_company_type', sortDir);
      addStableTieBreak();
    } else if (sortBy === 'city') {
      qb.addSelect("ISNULL(pa.city, '')", 'sort_physical_city');
      qb.orderBy('sort_physical_city', sortDir);
      addStableTieBreak();
    } else if (sortBy === 'state' || sortBy === 'stateprovince') {
      qb.addSelect("ISNULL(pa.stateProvince, '')", 'sort_state_province');
      qb.orderBy('sort_state_province', sortDir);
      addStableTieBreak();
    } else if (sortBy === 'dma' || sortBy === 'market') {
      qb.addSelect("ISNULL(d.marketName, '')", 'sort_dma_market');
      qb.orderBy('sort_dma_market', sortDir);
      addStableTieBreak();
    } else {
      qb.orderBy('c.companyName', sortDir).addOrderBy('c.companyId', 'ASC');
    }

    const q = (search ?? '').trim();
    if (q) {
      this.searchTokens(q).forEach((token, index) => {
        const param = `companySearch${index}`;
        qb.andWhere(
          `(
            LOWER(c.companyName) LIKE LOWER(:${param}) ESCAPE '\\'
            OR LOWER(ISNULL(pa.city, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR LOWER(ISNULL(pa.stateProvince, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR LOWER(ISNULL(d.marketName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR LOWER(ISNULL(ct.companyTypeName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            OR EXISTS (
              SELECT 1
              FROM dbo.CompanyCompanyType cctSearch
              INNER JOIN dbo.CompanyType ctSearch ON ctSearch.CompanyTypeID = cctSearch.CompanyTypeID
              WHERE cctSearch.CompanyID = c.CompanyID
                AND LOWER(ISNULL(ctSearch.CompanyTypeName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            )
          )`,
          { [param]: `%${this.escapeLikePattern(token)}%` },
        );
      });
    }
    if (typeName && typeName !== 'All') {
      if (normalizedTypeName === 'venue') {
        /**
         * Keep "Companies filtered to Venue" aligned with "All Venues":
         * both are now driven by actual dbo.Venue rows.
         */
        qb.andWhere(
          `EXISTS (
            SELECT 1
            FROM [dbo].[Venue] vfl
            WHERE vfl.CompanyID = c.CompanyID
          )`,
        );
      } else {
        const linkTable = await this.resolveCompanyTypeLinkTableName();
        if (linkTable) {
          const safeTable = this.safeDbIdentifier(linkTable);
          qb.andWhere(
            `(
              LOWER(LTRIM(RTRIM(ct.companyTypeName))) = :typeNameNormalized
              OR EXISTS (
                SELECT 1
                FROM [dbo].${safeTable} ctm
                INNER JOIN [dbo].[CompanyType] ctt
                  ON ctt.CompanyTypeID = ctm.CompanyTypeID
                WHERE ctm.CompanyID = c.CompanyID
                  AND LOWER(LTRIM(RTRIM(ctt.CompanyTypeName))) = :typeNameNormalized
              )
            )`,
            { typeNameNormalized: normalizedTypeName },
          );
        } else {
          qb.andWhere(
            'LOWER(LTRIM(RTRIM(ct.companyTypeName))) = :typeNameNormalized',
            {
              typeNameNormalized: normalizedTypeName,
            },
          );
        }
      }
    }

    let total = 0;
    let rows: Company[] = [];
    try {
      total = await qb.getCount();
      rows = await qb.skip(offset).take(limit).getMany();
    } catch (error) {
      const shouldFallbackToDefaultSort =
        error instanceof QueryFailedError && sortBy.length > 0;
      if (!shouldFallbackToDefaultSort) throw error;

      this.logger.warn(
        `Company list sort failed for sortBy="${sortBy}" sortDir="${sortDir}". Falling back to default sort. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.findAllPaginated(
        offset,
        limit,
        search,
        companyType,
        undefined,
        undefined,
      );
    }
    const companyIds = rows.map((row) => row.companyId);
    const typeMap = await this.collectCompanyTypesByCompanyId(companyIds);
    const serviceMap = await this.collectCompanyServicesByCompanyId(companyIds);
    const serviceAreaMap =
      await this.collectCompanyServiceAreasByCompanyId(companyIds);
    const allDmasMetaMap = await this.buildAllDmasMetaMap(
      this.dataSource.manager,
      serviceAreaMap,
    );

    return {
      data: rows.map((c) =>
        this.mapCompanyToDetail(
          c,
          typeMap,
          serviceMap,
          serviceAreaMap,
          allDmasMetaMap,
        ),
      ),
      total,
    };
  }

  async findOne(companyId: number): Promise<CompanyDetail> {
    const c = await this.companyRepo.findOne({
      where: { companyId },
      relations: {
        companyType: true,
        physicalAddress: true,
        mailingAddress: true,
        dma: true,
      },
    });
    if (!c) throw new NotFoundException(`Company ${companyId} not found`);
    const companyIds = [c.companyId];
    const typeMap = await this.collectCompanyTypesByCompanyId(companyIds);
    const serviceMap = await this.collectCompanyServicesByCompanyId(companyIds);
    const serviceAreaMap =
      await this.collectCompanyServiceAreasByCompanyId(companyIds);
    const allDmasMetaMap = await this.buildAllDmasMetaMap(
      this.dataSource.manager,
      serviceAreaMap,
    );
    return this.mapCompanyToDetail(
      c,
      typeMap,
      serviceMap,
      serviceAreaMap,
      allDmasMetaMap,
    );
  }

  async create(dto: CreateCompanyDto): Promise<CompanyDetail> {
    const companyTypeIds = this.normalizeCompanyTypeIds(
      dto.companyTypeIds,
      dto.companyTypeId,
    );
    if (companyTypeIds.length === 0) {
      throw new BadRequestException({
        message: 'Pick at least one company type.',
      });
    }
    const knownTypes = await this.companyTypeRepo.find({
      where: { companyTypeId: In(companyTypeIds) },
    });
    if (knownTypes.length !== companyTypeIds.length) {
      throw new BadRequestException({
        message:
          'Selected company type is not valid. Pick from the company type list.',
      });
    }
    const primaryCompanyTypeId = companyTypeIds[0];
    const serviceProvidedIds = this.normalizeServiceProvidedIds(
      dto.serviceProvidedIds,
    );
    if (serviceProvidedIds.length > 0) {
      const knownServiceCount = await this.serviceProvidedRepo.count({
        where: { serviceProvidedId: In(serviceProvidedIds) },
      });
      if (knownServiceCount !== serviceProvidedIds.length) {
        throw new BadRequestException({
          message:
            'One or more selected company services are not valid. Pick from the company services list.',
        });
      }
    }
    await this.assertCompanyServicesAllowedForTypes(
      companyTypeIds,
      serviceProvidedIds,
      'company services',
    );
    const requestedServiceAreas = this.normalizeServiceAreas(
      (dto as any).serviceAreas,
    );
    const serviceAreaServiceIds = [
      ...requestedServiceAreas.map((row) => row.serviceProvidedId),
      ...((dto as any).allDmasServiceProvidedId
        ? [Number((dto as any).allDmasServiceProvidedId)]
        : []),
    ];
    await this.assertCompanyServicesAllowedForTypes(
      companyTypeIds,
      serviceAreaServiceIds,
      'service area services',
    );

    const dmaId =
      dto.dmaId ??
      (await this.resolveDmaId(dto.physical.postalCode, dto.physical.country));
    if (dmaId == null) {
      throw new BadRequestException(
        'Could not resolve DMAID from the physical postal code. Use a postal code that exists in dbo.DMA, or pass dmaId explicitly.',
      );
    }

    if (dto.mailingSameAsPhysical === false && !dto.mailing) {
      throw new BadRequestException(
        'Mailing address is required when mailingSameAsPhysical is false.',
      );
    }

    const saved = await this.dataSource.transaction(async (em) => {
      const savedPhysical = await this.getOrCreateAddress(em, dto.physical);

      let mailingId = savedPhysical.addressId;
      const same =
        dto.mailingSameAsPhysical !== false &&
        (!dto.mailing || dto.mailingSameAsPhysical === true);
      if (!same && dto.mailing) {
        const savedMailing = await this.getOrCreateAddress(em, dto.mailing);
        mailingId = savedMailing.addressId;
      }

      const company = em.create(Company, {
        companyName: dto.companyName.trim(),
        isInternal: dto.isInternal ?? false,
        companyTypeId: primaryCompanyTypeId,
        physicalAddressId: savedPhysical.addressId,
        mailingAddressId: mailingId,
        dmaid: dmaId,
      });
      const row = await em.save(Company, company);
      await this.syncCompanyTypes(em, row.companyId, companyTypeIds);
      await this.syncCompanyServices(em, row.companyId, serviceProvidedIds);
      await this.syncCompanyServiceAreas(
        em,
        row.companyId,
        {
          allDmas: (dto as any).allDmas,
          allDmasServiceProvidedId: (dto as any).allDmasServiceProvidedId,
          serviceAreas: (dto as any).serviceAreas,
        },
        companyTypeIds,
      );
      await this.ensureVenueRowForCompanyTypes(
        em,
        row.companyId,
        row.companyName,
        companyTypeIds,
      );
      return row;
    });

    /**
     * Return the full detail row (same shape as GET /companies items) so the
     * frontend can patch its cache in-place without a follow-up fetch.
     */
    const detail = await this.findOne(saved.companyId);
    this.hubSpotService.queueCompanySync(saved.companyId);
    return detail;
  }

  /** Default dbo.Venue row when registering a company whose type is Venue (1:1 with Company). */
  private newVenuePayload(
    companyId: number,
    companyName: string,
  ): Partial<Venue> {
    return {
      companyId,
      venueName: companyName.trim().slice(0, 200),
      seatingCapacity: 0,
      salesTaxRate: null,
      taxInCart: false,
      insuranceLanguage: null,
      insurancePolicyCopyRequirements: null,
      venueRelationshipIae: 'Standard',
      venueTypeId: null,
      seatingTypeId: null,
      loadDockAddressId: null,
      nonResidentWithholdingId: null,
    };
  }

  private async getResolvedVenueTicketingColumns(): Promise<ResolvedVenueTicketingWebsiteColumns> {
    if (this.venueTicketingColCache) {
      return this.venueTicketingColCache;
    }
    try {
      const r = await resolveVenueTicketingWebsiteColumns(
        this.dataSource,
        this.configService,
      );
      this.venueTicketingColCache = r;
      this.logger.log(
        `Resolved dbo.Venue ticketing/website string columns: ticketing→${r.ticketing ?? 'none'}, website→${r.website ?? 'none'}`,
      );
      return r;
    } catch (e) {
      const empty: ResolvedVenueTicketingWebsiteColumns = {
        ticketing: null,
        website: null,
      };
      this.venueTicketingColCache = empty;
      this.logger.warn(
        `Could not resolve venue ticketing/website column names: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return empty;
    }
  }

  /**
   * Read ticketing / website from dbo.Venue using names resolved at runtime
   * (env VENUE_COL_* or auto-detect from existing string columns; see venue-ticketing-columns.resolver.ts).
   */
  private async loadVenueTicketingWebsiteColumns(
    companyId: number,
  ): Promise<{ ticketingSystem: string | null; venueWebsite: string | null }> {
    const cid = Number(companyId);
    if (!Number.isInteger(cid) || cid <= 0) {
      return { ticketingSystem: null, venueWebsite: null };
    }
    const cols = await this.getResolvedVenueTicketingColumns();
    if (!cols.ticketing && !cols.website) {
      return { ticketingSystem: null, venueWebsite: null };
    }
    const tPart = cols.ticketing
      ? `[${String(cols.ticketing).replace(/\]/g, ']]')}]`
      : 'CAST(NULL AS NVARCHAR(200))';
    const wPart = cols.website
      ? `[${String(cols.website).replace(/\]/g, ']]')}]`
      : 'CAST(NULL AS NVARCHAR(4000))';
    try {
      const sql = `SELECT ${tPart} AS [ts], ${wPart} AS [vw] FROM [dbo].[Venue] WITH (NOLOCK) WHERE [CompanyID] = ${cid}`;
      const rows = await this.dataSource.query(sql);
      const r = rows[0];
      if (!r) {
        return { ticketingSystem: null, venueWebsite: null };
      }
      const pv = (k: string) =>
        r[k] ?? r[k.toLowerCase()] ?? r[k.toUpperCase()];
      const t = pv('ts') != null ? String(pv('ts')).trim() : '';
      const w = pv('vw') != null ? String(pv('vw')).trim() : '';
      return {
        ticketingSystem: t || null,
        venueWebsite: w ? w.slice(0, 2048) : null,
      };
    } catch (e) {
      this.logger.warn(
        `Could not read venue ticketing/website (companyId=${cid}): ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return { ticketingSystem: null, venueWebsite: null };
    }
  }

  private async updateVenueTicketingWebsiteColumns(
    companyId: number,
    patch: { ticketingSystem?: string | null; venueWebsite?: string | null },
  ): Promise<void> {
    if (
      patch.ticketingSystem === undefined &&
      patch.venueWebsite === undefined
    ) {
      return;
    }
    const cid = Number(companyId);
    if (!Number.isInteger(cid) || cid <= 0) {
      return;
    }
    const col = await this.getResolvedVenueTicketingColumns();
    const setParts: string[] = [];
    if (patch.ticketingSystem !== undefined && col.ticketing) {
      const t =
        patch.ticketingSystem == null
          ? null
          : String(patch.ticketingSystem).trim().slice(0, 200) || null;
      setParts.push(
        `[${String(col.ticketing).replace(/\]/g, ']]')}] = ${sqlNVarCharLiteral(t)}`,
      );
    }
    if (patch.venueWebsite !== undefined && col.website) {
      const w =
        patch.venueWebsite == null
          ? null
          : String(patch.venueWebsite).trim().slice(0, 2048) || null;
      setParts.push(
        `[${String(col.website).replace(/\]/g, ']]')}] = ${sqlNVarCharLiteral(w)}`,
      );
    }
    if (setParts.length === 0) {
      this.logger.warn(
        'Venue ticketing/website not updated: no string columns resolved for the fields you sent. Set VENUE_COL_TICKETING_SYSTEM and/or VENUE_COL_VENUE_WEBSITE to the exact column names in dbo.Venue.',
      );
      return;
    }
    const sql = `UPDATE [dbo].[Venue] SET ${setParts.join(', ')} WHERE [CompanyID] = ${cid}`;
    try {
      await this.dataSource.query(sql);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Venue ticketing/website update failed: ${msg}`);
      throw new BadRequestException({
        message: `Could not update venue ticketing/website. Set VENUE_COL_TICKETING_SYSTEM / VENUE_COL_VENUE_WEBSITE to your dbo.Venue column names if needed. ${msg.slice(0, 300)}`,
      });
    }
  }

  private async ensureVenueRowForCompanyTypes(
    em: EntityManager,
    companyId: number,
    companyName: string,
    companyTypeIds: number[],
  ): Promise<void> {
    const types = await em.find(CompanyType, {
      where: { companyTypeId: In(companyTypeIds) },
    });
    const isVenue = types.some(
      (type) => type.companyTypeName.trim().toLowerCase() === 'venue',
    );
    if (!isVenue) {
      return;
    }
    const existing = await em.findOne(Venue, {
      where: { companyId },
    });
    if (existing) return;
    const venue = em.create(
      Venue,
      this.newVenuePayload(companyId, companyName),
    );
    await em.save(Venue, venue);
  }

  private async assertVenueCompanyForProfile(
    companyId: number,
  ): Promise<Company> {
    const c = await this.companyRepo.findOne({
      where: { companyId },
      relations: { companyType: true },
    });
    if (!c) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }
    const typeIds = await this.loadEffectiveCompanyTypeIds(
      companyId,
      c.companyTypeId,
    );
    const types = await this.companyTypeRepo.find({
      where: { companyTypeId: In(typeIds) },
    });
    const isVenue = types.some(
      (type) => type.companyTypeName.trim().toLowerCase() === 'venue',
    );
    if (!isVenue) {
      throw new BadRequestException(
        'Venue profile is only available for companies with type Venue.',
      );
    }
    return c;
  }

  /**
   * Builds the venue profile read model from an already-loaded `Venue` row (with the same
   * relations as `getVenueProfile`). Used by `getVenueProfile` and `getVenueDetails` so the
   * latter does not re-query the same venue profile work twice in one request.
   */
  private async buildVenueProfileReadModel(companyId: number, venue: Venue) {
    /** DB may contain legacy multiple rows; product rule is one complex per venue. */
    const entertainmentComplexCompanyIds = (
      await this.getVenueComplexCompanyIds(companyId)
    ).slice(0, 1);
    const entertainmentComplexCompanies =
      entertainmentComplexCompanyIds.length > 0
        ? await this.findCompaniesByIdsChunked(
            this.companyRepo,
            entertainmentComplexCompanyIds,
          )
        : [];
    const byId = new Map(
      entertainmentComplexCompanies.map((row) => [row.companyId, row]),
    );
    const entertainmentComplexes = entertainmentComplexCompanyIds.map((id) => {
      const c = byId.get(id);
      return {
        companyId: id,
        companyName: (c?.companyName ?? '').trim(),
      };
    });
    const tw = await this.loadVenueTicketingWebsiteColumns(companyId);
    const venueBrandRows = await this.venueBrandRepo.find({
      where: { venueCompanyId: companyId },
      order: { brandId: 'ASC' },
    });
    const brandIds = venueBrandRows.map((r) => r.brandId);
    return {
      missing: false as const,
      companyId: venue.companyId,
      venueName: venue.venueName,
      seatingCapacity: venue.seatingCapacity,
      salesTaxRate:
        venue.salesTaxRate != null && venue.salesTaxRate !== ''
          ? String(venue.salesTaxRate)
          : null,
      taxInCart: venue.taxInCart,
      insuranceLanguage: venue.insuranceLanguage,
      insurancePolicyCopyRequirements: venue.insurancePolicyCopyRequirements,
      venueRelationshipIae: venue.venueRelationshipIae,
      venueTypeId: venue.venueTypeId,
      venueTypeName: venue.venueType?.venueTypeName ?? null,
      entertainmentComplexCompanyIds,
      entertainmentComplexes,
      seatingTypeId: venue.seatingTypeId,
      seatingTypeName: venue.seatingType?.seatingName ?? null,
      ticketingSystem: tw.ticketingSystem,
      venueWebsite: tw.venueWebsite,
      brandIds,
      loadDockAddress: venue.loadDockAddress
        ? {
            addressId: venue.loadDockAddress.addressId,
            addressLine1: venue.loadDockAddress.addressLine1,
            addressLine2: venue.loadDockAddress.addressLine2,
            city: venue.loadDockAddress.city,
            stateProvince: venue.loadDockAddress.stateProvince,
            postalCode: venue.loadDockAddress.postalCode,
            country: venue.loadDockAddress.country,
          }
        : null,
    };
  }

  async getVenueProfile(companyId: number) {
    await this.assertVenueCompanyForProfile(companyId);
    const venue = await this.venueRepo.findOne({
      where: { companyId },
      relations: { venueType: true, seatingType: true, loadDockAddress: true },
    });
    if (!venue) {
      return { missing: true as const };
    }
    return this.buildVenueProfileReadModel(companyId, venue);
  }

  /** MSSQL limits ~2100 parameters per request; `In([...])` uses one param per id. */
  private async findCompaniesByIdsChunked(
    repo: Repository<Company>,
    companyIds: number[],
    chunkSize = 500,
  ): Promise<Company[]> {
    const unique = Array.from(
      new Set(
        companyIds
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );
    if (unique.length === 0) {
      return [];
    }
    const out: Company[] = [];
    for (let i = 0; i < unique.length; i += chunkSize) {
      const slice = unique.slice(i, i + chunkSize);
      const rows = await repo.find({
        where: { companyId: In(slice) },
        relations: { companyType: true },
      });
      out.push(...rows);
    }
    return out;
  }

  private async getVenueComplexCompanyIds(
    venueCompanyId: number,
    em?: EntityManager,
  ): Promise<number[]> {
    const repo = em
      ? em.getRepository(VenueComplexMember)
      : this.venueComplexMemberRepo;
    const rows = await repo.find({ where: { venueCompanyId } });
    return Array.from(
      new Set(
        rows
          .map((r) => Number(r.complexCompanyId))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ).sort((a, b) => a - b);
  }

  /**
   * Stores venue ↔ entertainment complex links using dbo.VenueComplexMember (one row per pair).
   * dbo.VenueComplex is ensured for each complex company id so the relationship matches the DB model.
   * Only dbo.Company rows whose type name is "Entertainment Complex" may be linked (EMS contract).
   */
  private async updateVenueComplexMembership(
    em: EntityManager,
    venueCompanyId: number,
    nextComplexCompanyIds: number[] | undefined,
  ): Promise<void> {
    if (nextComplexCompanyIds === undefined) {
      return;
    }

    const memberRepo = em.getRepository(VenueComplexMember);
    const complexRepo = em.getRepository(VenueComplex);

    const next = Array.from(
      new Set(
        nextComplexCompanyIds
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ).sort((a, b) => a - b);

    if (next.length > 1) {
      throw new BadRequestException({
        message: 'Only one entertainment complex may be linked to each venue.',
      });
    }

    if (next.includes(venueCompanyId)) {
      throw new BadRequestException({
        message:
          'A venue cannot be linked to itself as an entertainment complex.',
      });
    }

    for (const complexId of next) {
      const complexCompany = await em.findOne(Company, {
        where: { companyId: complexId },
        relations: { companyType: true },
      });
      if (!complexCompany) {
        throw new BadRequestException({
          message:
            'One of the selected entertainment complexes was not found. Refresh and try again.',
        });
      }
      const kind = this.normalizeCompanyTypeName(
        complexCompany.companyType?.companyTypeName,
      );
      if (kind !== ENTERTAINMENT_COMPLEX_COMPANY_TYPE) {
        throw new BadRequestException({
          message: `Only companies with type "${ENTERTAINMENT_COMPLEX_COMPANY_TYPE}" may be linked as an entertainment complex (company #${complexId}).`,
        });
      }
      const complexRow = await complexRepo.findOne({
        where: { companyId: complexId },
      });
      if (!complexRow) {
        await complexRepo.save(
          complexRepo.create({
            companyId: complexId,
            complexName: complexCompany.companyName.trim().slice(0, 200),
          }),
        );
      }
    }

    // Serialize writes per venue row to avoid duplicate inserts when concurrent
    // saves race with delete+insert operations.
    await em.query(
      `SELECT [ComplexCompanyID]
       FROM [dbo].[VenueComplexMember] WITH (UPDLOCK, HOLDLOCK)
       WHERE [VenueCompanyID] = @0`,
      [venueCompanyId],
    );

    const existingRows = await memberRepo.find({ where: { venueCompanyId } });
    const existingComplexIds = Array.from(
      new Set(existingRows.map((r) => r.complexCompanyId)),
    );
    const nextSet = new Set(next);

    const same =
      existingComplexIds.length === next.length &&
      existingComplexIds.every((id) => nextSet.has(id));
    if (same) {
      return;
    }

    const toRemove = existingComplexIds.filter((id) => !nextSet.has(id));
    const existingSet = new Set(existingComplexIds);
    const toAdd = next.filter((id) => !existingSet.has(id));

    // One DELETE per row — TypeORM/array delete criteria for composite keys is unreliable.
    for (const complexCompanyId of toRemove) {
      await memberRepo.delete({ venueCompanyId, complexCompanyId });
    }
    // One INSERT per row — bulk INSERT + swallowing duplicate-key errors can drop every
    // new row in the batch (SQL Server fails the whole statement on one conflict).
    for (const complexCompanyId of toAdd) {
      await memberRepo.insert({ venueCompanyId, complexCompanyId });
    }

    const persisted = (
      await this.getVenueComplexCompanyIds(venueCompanyId, em)
    ).sort((a, b) => a - b);
    const expected = [...next].sort((a, b) => a - b);
    if (persisted.join(',') !== expected.join(',')) {
      throw new BadRequestException({
        message:
          'Could not save all entertainment complex links. Refresh the page and try again.',
        detail: `Expected complex company ids [${expected.join(', ')}] but database has [${persisted.join(', ')}].`,
      });
    }
  }

  async provisionVenueProfile(
    companyId: number,
  ): Promise<{ created: boolean }> {
    const c = await this.assertVenueCompanyForProfile(companyId);
    const existing = await this.venueRepo.findOne({ where: { companyId } });
    if (existing) {
      return { created: false };
    }
    const venue = this.venueRepo.create(
      this.newVenuePayload(companyId, c.companyName),
    );
    await this.venueRepo.save(venue);
    return { created: true };
  }

  async updateVenueProfile(
    companyId: number,
    dto: UpdateVenueProfileDto,
  ): Promise<void> {
    await this.assertVenueCompanyForProfile(companyId);
    const venue = await this.venueRepo.findOne({ where: { companyId } });
    if (!venue) {
      throw new NotFoundException({
        message:
          'No venue profile exists for this company yet. Use Create venue profile first.',
      });
    }
    if (dto.venueName !== undefined) {
      venue.venueName = dto.venueName.trim().slice(0, 200);
    }
    if (dto.seatingCapacity !== undefined) {
      venue.seatingCapacity = dto.seatingCapacity;
    }
    if (dto.salesTaxRate !== undefined) {
      const raw = dto.salesTaxRate;
      venue.salesTaxRate =
        raw === null || raw === undefined ? null : String(raw).trim() || null;
    }
    if (dto.taxInCart !== undefined) {
      venue.taxInCart = dto.taxInCart;
    }
    if (dto.insuranceLanguage !== undefined) {
      venue.insuranceLanguage = dto.insuranceLanguage?.trim() || null;
    }
    if (dto.insurancePolicyCopyRequirements !== undefined) {
      venue.insurancePolicyCopyRequirements =
        dto.insurancePolicyCopyRequirements?.trim() || null;
    }
    if (dto.venueRelationshipIae !== undefined) {
      venue.venueRelationshipIae = dto.venueRelationshipIae
        .trim()
        .slice(0, 100);
    }
    if (dto.venueTypeId !== undefined) {
      venue.venueTypeId = dto.venueTypeId;
    }
    if (dto.seatingTypeId !== undefined) {
      venue.seatingTypeId = dto.seatingTypeId;
    }
    if (dto.loadDockAddress !== undefined) {
      if (dto.loadDockAddress === null) {
        venue.loadDockAddressId = null;
      } else {
        const loadDockAddress = await this.getOrCreateAddress(
          this.dataSource.manager,
          dto.loadDockAddress,
        );
        venue.loadDockAddressId = loadDockAddress.addressId;
      }
    }
    await this.venueRepo.save(venue);
    if (dto.entertainmentComplexCompanyIds !== undefined) {
      await this.dataSource.transaction(async (em) => {
        await this.updateVenueComplexMembership(
          em,
          companyId,
          dto.entertainmentComplexCompanyIds,
        );
      });
    }
    if (dto.ticketingSystem !== undefined || dto.venueWebsite !== undefined) {
      await this.updateVenueTicketingWebsiteColumns(companyId, {
        ticketingSystem: dto.ticketingSystem,
        venueWebsite: dto.venueWebsite,
      });
    }
    if (dto.brandIds !== undefined) {
      await this.dataSource.transaction(async (em) => {
        await em.delete(VenueBrand, { venueCompanyId: companyId });
        const next = Array.from(new Set(dto.brandIds)).filter(
          (x) => Number.isInteger(x) && x > 0,
        );
        if (next.length) {
          await em.insert(
            VenueBrand,
            next.map((brandId) => ({ venueCompanyId: companyId, brandId })),
          );
        }
      });
    }
  }

  private normalizeCompanyTypeName(name: string | null | undefined): string {
    return (name ?? '').trim().toLowerCase();
  }

  private async typeIdsIncludeVenue(typeIds: number[]): Promise<boolean> {
    if (typeIds.length === 0) return false;
    const rows = await this.companyTypeRepo.find({
      where: { companyTypeId: In(typeIds) },
    });
    return rows.some(
      (type) => this.normalizeCompanyTypeName(type.companyTypeName) === 'venue',
    );
  }

  /**
   * Block company-type changes that would contradict how the row is already used
   * (venue profile, engagement venues, project venues).
   */
  private async assertCompanyTypeChangeAllowed(
    companyId: number,
    nextCompanyTypeIds: number[],
  ): Promise<void> {
    if (nextCompanyTypeIds.length === 0) {
      throw new BadRequestException({
        message: 'Pick at least one company type.',
      });
    }
    const nextTypes = await this.companyTypeRepo.find({
      where: { companyTypeId: In(nextCompanyTypeIds) },
    });
    if (nextTypes.length !== nextCompanyTypeIds.length) {
      throw new BadRequestException({
        message: 'That company type is not valid. Pick a type from the list.',
      });
    }
    const includesVenue = nextTypes.some(
      (type) => this.normalizeCompanyTypeName(type.companyTypeName) === 'venue',
    );

    const engagementVenueCount = await this.engagementVenueRepo.count({
      where: { venueCompanyId: companyId },
    });
    const projectVenueCount = await this.engagementProjectVenueRepo.count({
      where: { venueCompanyId: companyId },
    });

    if (!includesVenue && (engagementVenueCount > 0 || projectVenueCount > 0)) {
      const reasons: string[] = [];
      if (engagementVenueCount > 0) {
        reasons.push(
          `it is linked to ${engagementVenueCount} engagement venue${engagementVenueCount === 1 ? '' : 's'}`,
        );
      }
      if (projectVenueCount > 0) {
        reasons.push(
          `it is used on ${projectVenueCount} project venue link${projectVenueCount === 1 ? '' : 's'}`,
        );
      }
      throw new ConflictException({
        message: `This company can’t be switched away from Venue because ${reasons.join(' and ')}. Remove those links first.`,
      });
    }
  }

  private async deleteVenueProfileForCompany(
    em: EntityManager,
    companyId: number,
  ): Promise<void> {
    await em.delete(VenueServiceProvider, { venueCompanyId: companyId });
    await em.delete(VenueTax, { venueCompanyId: companyId });
    await em.delete(VenueBrand, { venueCompanyId: companyId });
    await em.delete(VenueComplexMember, { venueCompanyId: companyId });
    await em.delete(Venue, { companyId });
  }

  async update(
    companyId: number,
    dto: UpdateCompanyDto,
  ): Promise<CompanyDetail> {
    const existing = await this.companyRepo.findOne({
      where: { companyId },
      relations: { physicalAddress: true, mailingAddress: true },
    });
    if (!existing)
      throw new NotFoundException(`Company ${companyId} not found`);
    const existingCompanyTypeIds = await this.loadEffectiveCompanyTypeIds(
      companyId,
      existing.companyTypeId,
    );

    const oldPhysicalId = existing.physicalAddressId;
    const oldMailingId = existing.mailingAddressId;

    // Never UPDATE dbo.Address in place when the new values might match another row —
    // UX_Address dedupes on (line1, city, state, country, postal) and SQL Server
    // rejects updates that would duplicate. Reuse the same get-or-create path as create().
    let physicalAddressId = oldPhysicalId;
    if (dto.physical) {
      const resolved = await this.getOrCreateAddress(
        this.dataSource.manager,
        dto.physical,
      );
      physicalAddressId = resolved.addressId;
    }

    let mailingAddressId = oldMailingId;
    if (dto.mailingSameAsPhysical === true) {
      mailingAddressId = physicalAddressId;
    } else if (dto.mailing) {
      const resolved = await this.getOrCreateAddress(
        this.dataSource.manager,
        dto.mailing,
      );
      mailingAddressId = resolved.addressId;
    } else if (dto.physical && oldMailingId === oldPhysicalId) {
      mailingAddressId = physicalAddressId;
    }

    if (dto.companyName !== undefined) {
      existing.companyName = dto.companyName.trim();
    }
    if (dto.isInternal !== undefined) {
      existing.isInternal = Boolean(dto.isInternal);
    }
    const nextCompanyTypeIds =
      dto.companyTypeIds !== undefined
        ? this.normalizeCompanyTypeIds(dto.companyTypeIds, dto.companyTypeId)
        : dto.companyTypeId != null
          ? this.normalizeCompanyTypeIds([dto.companyTypeId], dto.companyTypeId)
          : existingCompanyTypeIds;
    const nextPrimaryCompanyTypeId =
      nextCompanyTypeIds[0] ?? existing.companyTypeId;
    const hadVenueTypeBefore = await this.typeIdsIncludeVenue(
      existingCompanyTypeIds,
    );
    const hasVenueTypeAfter =
      await this.typeIdsIncludeVenue(nextCompanyTypeIds);
    const companyTypesChanged =
      nextCompanyTypeIds.length !== existingCompanyTypeIds.length ||
      nextCompanyTypeIds.some((id) => !existingCompanyTypeIds.includes(id));
    const primaryCompanyTypeChanged =
      nextPrimaryCompanyTypeId !== existing.companyTypeId;
    if (companyTypesChanged || primaryCompanyTypeChanged) {
      await this.assertCompanyTypeChangeAllowed(companyId, nextCompanyTypeIds);
      existing.companyTypeId = nextPrimaryCompanyTypeId;
    }

    const requestedServiceProvidedIds = dto.serviceProvidedIds;
    const nextServiceProvidedIds =
      requestedServiceProvidedIds != null
        ? this.normalizeServiceProvidedIds(requestedServiceProvidedIds)
        : null;
    if (nextServiceProvidedIds != null && nextServiceProvidedIds.length > 0) {
      const knownServiceCount = await this.serviceProvidedRepo.count({
        where: { serviceProvidedId: In(nextServiceProvidedIds) },
      });
      if (knownServiceCount !== nextServiceProvidedIds.length) {
        throw new BadRequestException({
          message:
            'One or more selected company services are not valid. Pick from the company services list.',
        });
      }
    }
    if (nextServiceProvidedIds != null) {
      await this.assertCompanyServicesAllowedForTypes(
        nextCompanyTypeIds,
        nextServiceProvidedIds,
        'company services',
      );
    }
    if (
      (dto as any).serviceAreas !== undefined ||
      (dto as any).allDmas !== undefined ||
      (dto as any).allDmasServiceProvidedId !== undefined
    ) {
      const requestedServiceAreas = this.normalizeServiceAreas(
        (dto as any).serviceAreas,
      );
      const serviceAreaServiceIds = [
        ...requestedServiceAreas.map((row) => row.serviceProvidedId),
        ...((dto as any).allDmasServiceProvidedId
          ? [Number((dto as any).allDmasServiceProvidedId)]
          : []),
      ];
      await this.assertCompanyServicesAllowedForTypes(
        nextCompanyTypeIds,
        serviceAreaServiceIds,
        'service area services',
      );
    }

    /** Do not clear DMA: ignore null/0 from client; keep existing when re-resolution fails. */
    let nextDmaId: number | null = existing.dmaid ?? null;
    if (
      typeof dto.dmaId === 'number' &&
      Number.isInteger(dto.dmaId) &&
      dto.dmaId > 0
    ) {
      nextDmaId = dto.dmaId;
    } else if (dto.physical) {
      const resolved = await this.resolveDmaId(
        dto.physical.postalCode,
        dto.physical.country,
      );
      if (resolved != null) {
        nextDmaId = resolved;
      }
    }
    existing.dmaid = nextDmaId;
    existing.physicalAddressId = physicalAddressId;
    existing.mailingAddressId = mailingAddressId;

    // TypeORM can persist the loaded ManyToOne relations and overwrite PhysicalAddressID /
    // MailingAddressID with the stale in-memory join rows. Point relations at the rows that
    // match the IDs we just computed (otherwise DB and GET /companies stay on old e.g. street 880).
    if (physicalAddressId !== oldPhysicalId) {
      const pa = await this.addressRepo.findOneBy({
        addressId: physicalAddressId,
      });
      if (pa) existing.physicalAddress = pa;
    }
    if (mailingAddressId !== oldMailingId) {
      if (mailingAddressId === physicalAddressId) {
        existing.mailingAddress = existing.physicalAddress;
      } else {
        const ma = await this.addressRepo.findOneBy({
          addressId: mailingAddressId,
        });
        if (ma) existing.mailingAddress = ma;
      }
    }

    await this.companyRepo.save(existing);
    if (
      companyTypesChanged ||
      primaryCompanyTypeChanged ||
      nextServiceProvidedIds != null
    ) {
      await this.dataSource.transaction(async (em) => {
        if (companyTypesChanged || primaryCompanyTypeChanged) {
          await this.syncCompanyTypes(em, companyId, nextCompanyTypeIds);
        }
        await this.ensureVenueRowForCompanyTypes(
          em,
          companyId,
          existing.companyName,
          nextCompanyTypeIds,
        );
        if (hadVenueTypeBefore && !hasVenueTypeAfter) {
          await this.deleteVenueProfileForCompany(em, companyId);
        }
        if (nextServiceProvidedIds != null) {
          await this.syncCompanyServices(em, companyId, nextServiceProvidedIds);
        } else if (companyTypesChanged || primaryCompanyTypeChanged) {
          const allowed = await this.allowedServiceIdsForCompanyTypes(
            nextCompanyTypeIds,
            em,
          );
          const existingServices = await em
            .getRepository(CompanyServiceEntity)
            .find({ where: { companyId } });
          const filteredServiceIds = existingServices
            .map((row) => row.serviceProvidedId)
            .filter((serviceProvidedId) => allowed.has(serviceProvidedId));
          if (filteredServiceIds.length !== existingServices.length) {
            await this.syncCompanyServices(em, companyId, filteredServiceIds);
          }
        }
      });
    }

    if (
      (dto as any).serviceAreas !== undefined ||
      (dto as any).allDmas !== undefined ||
      (dto as any).allDmasServiceProvidedId !== undefined
    ) {
      await this.dataSource.transaction(async (em) => {
        await this.syncCompanyServiceAreas(
          em,
          companyId,
          {
            allDmas: (dto as any).allDmas,
            allDmasServiceProvidedId: (dto as any).allDmasServiceProvidedId,
            serviceAreas: (dto as any).serviceAreas,
          },
          nextCompanyTypeIds,
        );
      });
    }

    /**
     * Always return the freshly-joined detail row so the frontend can patch
     * its list cache in place (type name, DMA market name, nested addresses).
     */
    const detail = await this.findOne(companyId);
    this.hubSpotService.queueCompanySync(companyId);
    return detail;
  }

  async remove(companyId: number): Promise<void> {
    const existing = await this.companyRepo.findOne({ where: { companyId } });
    if (!existing) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: 'This company was already removed or could not be found.',
        detail: 'The company was not found during delete.',
      });
    }

    const engagementVenueCount = await this.engagementVenueRepo.count({
      where: { venueCompanyId: companyId },
    });
    if (engagementVenueCount > 0) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: `This company can’t be removed because it is linked to ${engagementVenueCount} engagement venue(s). Remove it from those engagements (or the venue list on each engagement) first, then try again.`,
        detail: `engagement_venue_venueCompanyId=${companyId} count=${engagementVenueCount}`,
      });
    }
    const projectVenueCount = await this.engagementProjectVenueRepo.count({
      where: { venueCompanyId: companyId },
    });
    if (projectVenueCount > 0) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: `This company can’t be removed because it is used on ${projectVenueCount} project venue link(s). Remove or change those project venues first, then try again.`,
        detail: `engagement_project_venue_venueCompanyId=${companyId} count=${projectVenueCount}`,
      });
    }
    // Remove company-contact assignments first, and clean up orphaned contacts.
    const assignments = await this.assignmentRepo.find({
      where: { companyId },
      select: { contactAssignmentId: true },
    });
    for (const asg of assignments) {
      await this.removeContact(asg.contactAssignmentId);
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        // Attractions can reference this company as "attraction management" (nullable FK).
        // There may be no tours/engagements/projects, but this link still blocks dbo.Company
        // delete unless cleared first.
        await manager.update(
          Attraction,
          { attractionManagementLinkId: companyId },
          { attractionManagementLinkId: null },
        );
        // Legacy/CRM cross-refs: dbo.CompanyXref(CompanyID) -> Company(CompanyID).
        // Not the same as dbo.Engagement; rows here still block Company DELETE.
        const cid = Number(companyId);
        if (!Number.isInteger(cid) || cid <= 0) {
          throw new BadRequestException('Invalid company id for delete.');
        }
        await manager.query(
          `DELETE FROM [dbo].[CompanyXref] WHERE [CompanyID] = ${cid}`,
        );
        await manager.delete(CompanyServiceEntity, { companyId });
        await manager.delete(CompanyServiceArea, { companyId });
        // Venue-type companies get a dbo.Venue row (1:1 on CompanyID). Remove it
        // before Company or SQL Server will block the delete with an FK error.
        await manager.delete(Venue, { companyId });
        await manager.delete(Company, { companyId });
      });
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `Company delete blocked (companyId=${companyId}): ${detail}`,
      );
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message:
          'This company can’t be removed because it’s still linked to other records.',
        detail,
      });
    }

    // Intentionally keep address / lookup records untouched on company delete.
    // This protects pre-existing shared data from accidental removal.
  }

  /**
   * Contacts assigned to this company (role + department via dbo.ContactAssignment).
   * Venue / complex pickers use this list — typically staff employed or linked to that company in SQL.
   */
  async listContacts(
    companyId: number,
    filters?: { roleId?: number; roleName?: string },
  ): Promise<CompanyContactRow[]> {
    await this.ensureCompany(companyId);
    const qb = this.assignmentRepo
      .createQueryBuilder('ca')
      .innerJoin('ca.contact', 'ct')
      .innerJoin('ct.contactInfo', 'ci')
      .innerJoin('ca.role', 'r')
      .innerJoin('ca.department', 'd')
      .where('ca.companyId = :cid', { cid: companyId })
      .select([
        'ca.contactAssignmentId AS contactAssignmentId',
        'ca.contactId AS contactId',
        'ci.contactInfoId AS contactInfoId',
        'ci.firstName AS firstName',
        'ci.lastName AS lastName',
        'ci.email AS email',
        'ci.cellPhone AS cellPhone',
        'ci.workPhone AS workPhone',
        'r.roleId AS roleId',
        'r.roleName AS roleName',
        'd.departmentId AS departmentId',
        'd.departmentName AS departmentName',
      ]);

    if (
      filters?.roleId != null &&
      Number.isInteger(filters.roleId) &&
      filters.roleId > 0
    ) {
      qb.andWhere('ca.roleId = :roleId', { roleId: filters.roleId });
    } else if ((filters?.roleName ?? '').trim().length > 0) {
      qb.andWhere('LOWER(LTRIM(RTRIM(r.roleName))) = LOWER(:roleName)', {
        roleName: filters?.roleName?.trim(),
      });
    }

    const raw = await qb
      .orderBy('ci.lastName', 'ASC')
      .addOrderBy('ci.firstName', 'ASC')
      .getRawMany();

    return raw.map((row) =>
      this.mapRawContactRow(row as Record<string, unknown>),
    );
  }

  async listLinkedVenueContactsForComplex(
    companyId: number,
  ): Promise<CompanyVenueLinkedContactsSection[]> {
    const company = await this.companyRepo.findOne({
      where: { companyId },
      relations: { companyType: true },
    });
    if (!company) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: 'This company was not found.',
        detail: 'The company record does not exist.',
      });
    }
    const typeIds = await this.loadEffectiveCompanyTypeIds(
      companyId,
      company.companyTypeId,
    );
    const types = await this.companyTypeRepo.find({
      where: { companyTypeId: In(typeIds) },
    });
    const isEntertainmentComplex = types.some(
      (type) =>
        type.companyTypeName.trim().toLowerCase() ===
        ENTERTAINMENT_COMPLEX_COMPANY_TYPE,
    );
    if (!isEntertainmentComplex) {
      return [];
    }

    const raw = await this.assignmentRepo
      .createQueryBuilder('ca')
      .innerJoin('ca.contact', 'ct')
      .innerJoin('ct.contactInfo', 'ci')
      .innerJoin('ca.role', 'r')
      .innerJoin('ca.department', 'd')
      .innerJoin(Company, 'vc', 'vc.companyId = ca.companyId')
      .innerJoin(
        VenueComplexMember,
        'vcm',
        'vcm.venueCompanyId = vc.companyId AND vcm.complexCompanyId = :cid',
        { cid: companyId },
      )
      .select([
        'ca.contactAssignmentId AS contactAssignmentId',
        'ca.contactId AS contactId',
        'ci.contactInfoId AS contactInfoId',
        'ci.firstName AS firstName',
        'ci.lastName AS lastName',
        'ci.email AS email',
        'ci.cellPhone AS cellPhone',
        'ci.workPhone AS workPhone',
        'r.roleId AS roleId',
        'r.roleName AS roleName',
        'd.departmentId AS departmentId',
        'd.departmentName AS departmentName',
        'vc.companyId AS venueCompanyId',
        'vc.companyName AS venueCompanyName',
      ])
      .orderBy('vc.companyName', 'ASC')
      .addOrderBy('ci.lastName', 'ASC')
      .addOrderBy('ci.firstName', 'ASC')
      .getRawMany();

    const byVenue = new Map<number, CompanyVenueLinkedContactsSection>();
    for (const row of raw as Record<string, unknown>[]) {
      const venueCompanyId = Number(
        pickRawRowValue(row, 'venueCompanyId') ?? 0,
      );
      if (!Number.isFinite(venueCompanyId) || venueCompanyId < 1) continue;
      const venueCompanyName = String(
        pickRawRowValue(row, 'venueCompanyName') ?? `Venue #${venueCompanyId}`,
      ).trim();
      const contact = this.mapRawContactRow(row);
      if (!byVenue.has(venueCompanyId)) {
        byVenue.set(venueCompanyId, {
          venueCompanyId,
          venueCompanyName,
          contacts: [],
        });
      }
      byVenue.get(venueCompanyId)!.contacts.push(contact);
    }
    return [...byVenue.values()];
  }

  private mapRawContactRow(row: Record<string, unknown>): CompanyContactRow {
    return {
      contactAssignmentId: Number(pickRawRowValue(row, 'contactAssignmentId')),
      contactId: Number(pickRawRowValue(row, 'contactId')),
      contactInfoId: Number(pickRawRowValue(row, 'contactInfoId')),
      firstName: String(pickRawRowValue(row, 'firstName') ?? ''),
      lastName: String(pickRawRowValue(row, 'lastName') ?? ''),
      email: String(pickRawRowValue(row, 'email') ?? ''),
      cellPhone: (() => {
        const v = pickRawRowValue(row, 'cellPhone');
        if (v == null) return null;
        return String(v);
      })(),
      workPhone: (() => {
        const v = pickRawRowValue(row, 'workPhone');
        if (v == null) return null;
        return String(v);
      })(),
      roleId: Number(pickRawRowValue(row, 'roleId')),
      roleName: String(pickRawRowValue(row, 'roleName') ?? ''),
      departmentId: Number(pickRawRowValue(row, 'departmentId')),
      departmentName: String(pickRawRowValue(row, 'departmentName') ?? ''),
    };
  }

  private uniquePositiveInts(values: unknown[] | undefined | null): number[] {
    if (!Array.isArray(values)) return [];
    return [
      ...new Set(
        values
          .map(Number)
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    ];
  }

  private async ensureManagedContactAssignments(
    em: EntityManager,
    contactId: number,
    companyId: number | null | undefined,
    roleIds: number[] | undefined,
    departmentIds: number[] | undefined,
  ): Promise<boolean> {
    const companyIdNum = Number(companyId ?? 0);
    const hasCompany = Number.isInteger(companyIdNum) && companyIdNum > 0;
    await em.delete(ContactAssignment, { contactId });
    if (!hasCompany) return false;

    const company = await em.getRepository(Company).findOne({
      where: { companyId: companyIdNum },
    });
    if (!company) {
      throw new NotFoundException(`Company ${companyIdNum} was not found.`);
    }
    const roleIdList = this.uniquePositiveInts(roleIds);
    const departmentIdList = this.uniquePositiveInts(departmentIds);
    if (roleIdList.length === 0 || departmentIdList.length === 0) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message:
          'Select at least one role and one department when linking a contact to a company.',
      });
    }
    for (const roleId of roleIdList) await this.ensureRole(roleId, em);
    for (const departmentId of departmentIdList) {
      await this.ensureDepartment(departmentId, em);
    }

    const assignments: ContactAssignment[] = [];
    for (const roleId of roleIdList) {
      for (const departmentId of departmentIdList) {
        assignments.push(
          em.create(ContactAssignment, {
            contactId,
            companyId: companyIdNum,
            roleId,
            departmentId,
          }),
        );
      }
    }
    await em.save(ContactAssignment, assignments);
    return Boolean(company.isInternal);
  }

  private async getOrCreateManagedContact(
    em: EntityManager,
    dto: ManageContactDto | UpdateManagedContactDto,
    existingContactId?: number,
  ): Promise<Contact> {
    if (dto.workPhone !== undefined) {
      assertOptionalE164Phone(dto.workPhone, 'work phone');
    }
    if (dto.cellPhone !== undefined) {
      assertOptionalE164Phone(dto.cellPhone, 'cell phone');
    }

    const infoRepo = em.getRepository(ContactInfo);
    const contactRepo = em.getRepository(Contact);

    const existingContact =
      existingContactId != null
        ? await contactRepo.findOne({
            where: { contactId: existingContactId },
            relations: { contactInfo: true },
          })
        : null;
    if (existingContactId != null && !existingContact) {
      throw new NotFoundException(
        `Contact ${existingContactId} was not found.`,
      );
    }

    const email = dto.email?.trim();
    let info = existingContact?.contactInfo ?? null;
    if (email) {
      const infoForEmail = await infoRepo
        .createQueryBuilder('ci')
        .where('LOWER(ci.email) = LOWER(:email)', { email })
        .getOne();
      if (
        infoForEmail &&
        info &&
        infoForEmail.contactInfoId !== info.contactInfoId
      ) {
        const contactForEmail = await contactRepo.findOne({
          where: { contactInfoId: infoForEmail.contactInfoId },
        });
        if (
          contactForEmail &&
          contactForEmail.contactId !== existingContactId
        ) {
          throw new ConflictException({
            statusCode: HttpStatus.CONFLICT,
            error: 'Conflict',
            message: 'A contact already exists for this email address.',
          });
        }
        info = infoForEmail;
      } else if (infoForEmail) {
        info = infoForEmail;
      }
    }

    if (!info) {
      info = infoRepo.create({
        firstName: dto.firstName?.trim() ?? '',
        lastName: dto.lastName?.trim() ?? '',
        email: email ?? '',
        cellPhone: dto.cellPhone?.trim() || null,
        workPhone: dto.workPhone?.trim() || null,
      });
    } else {
      if (dto.firstName !== undefined) info.firstName = dto.firstName.trim();
      if (dto.lastName !== undefined) info.lastName = dto.lastName.trim();
      if (email !== undefined) info.email = email;
      if (dto.cellPhone !== undefined) {
        info.cellPhone = dto.cellPhone?.trim() || null;
      }
      if (dto.workPhone !== undefined) {
        info.workPhone = dto.workPhone?.trim() || null;
      }
    }
    const savedInfo = await infoRepo.save(info);

    if (existingContact) {
      existingContact.contactInfoId = savedInfo.contactInfoId;
      return contactRepo.save(existingContact);
    }

    let contact = await contactRepo.findOne({
      where: { contactInfoId: savedInfo.contactInfoId },
    });
    if (!contact) {
      contact = contactRepo.create({
        contactInfoId: savedInfo.contactInfoId,
      });
    }
    return contactRepo.save(contact);
  }

  async listManagedContacts(
    offset = 0,
    limit = 25,
    q?: string,
    companyId?: number,
  ): Promise<{ data: ManagedContactRow[]; total: number }> {
    const safeOffset = Math.max(0, Number(offset) || 0);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 25));

    const baseQb = this.contactRepo
      .createQueryBuilder('ct')
      .innerJoin('ct.contactInfo', 'ci')
      .leftJoin(ContactAssignment, 'ca', 'ca.contactId = ct.contactId')
      .leftJoin(Company, 'c', 'c.companyId = ca.companyId')
      .leftJoin(Role, 'rSearch', 'rSearch.roleId = ca.roleId')
      .leftJoin(Department, 'dSearch', 'dSearch.departmentId = ca.departmentId')
      .leftJoin('c.physicalAddress', 'paSearch')
      .leftJoin('c.dma', 'dmaSearch')
      .leftJoin('c.companyType', 'ctSearch');

    if (companyId != null && Number.isInteger(companyId) && companyId > 0) {
      baseQb.andWhere('ca.companyId = :companyId', { companyId });
    }
    const trimmed = q?.trim();
    if (trimmed) {
      this.searchTokens(trimmed).forEach((token, index) => {
        const param = `contactSearch${index}`;
        baseQb.andWhere(
          `(
            LOWER(ISNULL(ci.firstName, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR
            LOWER(ISNULL(ci.lastName, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR
            LOWER(ISNULL(CONCAT(ci.firstName, ' ', ci.lastName), '')) LIKE LOWER(:${param}) ESCAPE '\\' OR
            LOWER(ISNULL(ci.email, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR
            LOWER(ISNULL(ci.workPhone, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR
            LOWER(ISNULL(ci.cellPhone, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR
            LOWER(ISNULL(c.companyName, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR
            LOWER(ISNULL(rSearch.roleName, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR
            LOWER(ISNULL(dSearch.departmentName, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR
            LOWER(ISNULL(paSearch.city, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR
            LOWER(ISNULL(paSearch.stateProvince, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR
            LOWER(ISNULL(dmaSearch.marketName, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR
            LOWER(ISNULL(ctSearch.companyTypeName, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR
            EXISTS (
              SELECT 1
              FROM dbo.CompanyCompanyType cctContactSearch
              INNER JOIN dbo.CompanyType ctContactSearch ON ctContactSearch.CompanyTypeID = cctContactSearch.CompanyTypeID
              WHERE cctContactSearch.CompanyID = c.CompanyID
                AND LOWER(ISNULL(ctContactSearch.CompanyTypeName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
            )
          )`,
          { [param]: `%${this.escapeLikePattern(token)}%` },
        );
      });
    }

    const totalRows = await baseQb
      .clone()
      .select('COUNT(DISTINCT ct.contactId)', 'count')
      .getRawOne<{ count: number | string }>();
    const total = Number(totalRows?.count ?? 0);

    const idsRaw = await baseQb
      .clone()
      .select('ct.contactId', 'contactId')
      .addSelect('MIN(ci.lastName)', 'lastName')
      .addSelect('MIN(ci.firstName)', 'firstName')
      .groupBy('ct.contactId')
      .orderBy('MIN(ci.lastName)', 'ASC')
      .addOrderBy('MIN(ci.firstName)', 'ASC')
      .offset(safeOffset)
      .limit(safeLimit)
      .getRawMany<Record<string, unknown>>();
    const ids = idsRaw
      .map((row) => Number(pickRawRowValue(row, 'contactId')))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (ids.length === 0) return { data: [], total };

    const raw = await this.contactRepo
      .createQueryBuilder('ct')
      .innerJoin('ct.contactInfo', 'ci')
      .leftJoin(ContactAssignment, 'ca', 'ca.contactId = ct.contactId')
      .leftJoin(Company, 'c', 'c.companyId = ca.companyId')
      .leftJoin(Role, 'r', 'r.roleId = ca.roleId')
      .leftJoin(Department, 'd', 'd.departmentId = ca.departmentId')
      .where('ct.contactId IN (:...ids)', { ids })
      .select([
        'ct.contactId AS contactId',
        'ci.contactInfoId AS contactInfoId',
        'ci.firstName AS firstName',
        'ci.lastName AS lastName',
        'ci.email AS email',
        'ci.cellPhone AS cellPhone',
        'ci.workPhone AS workPhone',
        'c.isInternal AS companyIsInternal',
        'c.companyId AS companyId',
        'c.companyName AS companyName',
        'r.roleId AS roleId',
        'r.roleName AS roleName',
        'd.departmentId AS departmentId',
        'd.departmentName AS departmentName',
      ])
      .orderBy('ci.lastName', 'ASC')
      .addOrderBy('ci.firstName', 'ASC')
      .getRawMany<Record<string, unknown>>();

    const byContact = new Map<number, ManagedContactRow>();
    const pushUnique = <T>(list: T[], value: T | null | undefined) => {
      if (value == null) return;
      if (!list.includes(value)) list.push(value);
    };
    for (const row of raw) {
      const contactId = Number(pickRawRowValue(row, 'contactId'));
      if (!Number.isInteger(contactId) || contactId < 1) continue;
      let item = byContact.get(contactId);
      if (!item) {
        item = {
          contactId,
          contactInfoId: Number(pickRawRowValue(row, 'contactInfoId')),
          firstName: String(pickRawRowValue(row, 'firstName') ?? ''),
          lastName: String(pickRawRowValue(row, 'lastName') ?? ''),
          email: String(pickRawRowValue(row, 'email') ?? ''),
          cellPhone:
            pickRawRowValue(row, 'cellPhone') == null
              ? null
              : String(pickRawRowValue(row, 'cellPhone')),
          workPhone:
            pickRawRowValue(row, 'workPhone') == null
              ? null
              : String(pickRawRowValue(row, 'workPhone')),
          isStaff: isTruthyBit(pickRawRowValue(row, 'companyIsInternal')),
          companyIds: [],
          companyNames: [],
          roleIds: [],
          roleNames: [],
          departmentIds: [],
          departmentNames: [],
        };
        byContact.set(contactId, item);
      }
      const companyIdValue = Number(pickRawRowValue(row, 'companyId'));
      if (Number.isInteger(companyIdValue) && companyIdValue > 0) {
        item.isStaff =
          item.isStaff || isTruthyBit(pickRawRowValue(row, 'companyIsInternal'));
        pushUnique(item.companyIds, companyIdValue);
        pushUnique(
          item.companyNames,
          String(pickRawRowValue(row, 'companyName') ?? '').trim(),
        );
      }
      const roleIdValue = Number(pickRawRowValue(row, 'roleId'));
      if (Number.isInteger(roleIdValue) && roleIdValue > 0) {
        pushUnique(item.roleIds, roleIdValue);
        pushUnique(
          item.roleNames,
          String(pickRawRowValue(row, 'roleName') ?? '').trim(),
        );
      }
      const departmentIdValue = Number(pickRawRowValue(row, 'departmentId'));
      if (Number.isInteger(departmentIdValue) && departmentIdValue > 0) {
        pushUnique(item.departmentIds, departmentIdValue);
        pushUnique(
          item.departmentNames,
          String(pickRawRowValue(row, 'departmentName') ?? '').trim(),
        );
      }
    }

    return {
      data: ids
        .map((id) => byContact.get(id))
        .filter((row): row is ManagedContactRow => Boolean(row)),
      total,
    };
  }

  private async getManagedContactRowById(
    contactId: number,
    em?: EntityManager,
  ): Promise<ManagedContactRow | null> {
    const raw = await (em?.getRepository(Contact) ?? this.contactRepo)
      .createQueryBuilder('ct')
      .innerJoin('ct.contactInfo', 'ci')
      .leftJoin(ContactAssignment, 'ca', 'ca.contactId = ct.contactId')
      .leftJoin(Company, 'c', 'c.companyId = ca.companyId')
      .leftJoin(Role, 'r', 'r.roleId = ca.roleId')
      .leftJoin(Department, 'd', 'd.departmentId = ca.departmentId')
      .where('ct.contactId = :contactId', { contactId })
      .select([
        'ct.contactId AS contactId',
        'ci.contactInfoId AS contactInfoId',
        'ci.firstName AS firstName',
        'ci.lastName AS lastName',
        'ci.email AS email',
        'ci.cellPhone AS cellPhone',
        'ci.workPhone AS workPhone',
        'c.isInternal AS companyIsInternal',
        'c.companyId AS companyId',
        'c.companyName AS companyName',
        'r.roleId AS roleId',
        'r.roleName AS roleName',
        'd.departmentId AS departmentId',
        'd.departmentName AS departmentName',
      ])
      .getRawMany<Record<string, unknown>>();
    if (raw.length === 0) return null;
    const first = raw[0];
    const out: ManagedContactRow = {
      contactId: Number(pickRawRowValue(first, 'contactId')),
      contactInfoId: Number(pickRawRowValue(first, 'contactInfoId')),
      firstName: String(pickRawRowValue(first, 'firstName') ?? ''),
      lastName: String(pickRawRowValue(first, 'lastName') ?? ''),
      email: String(pickRawRowValue(first, 'email') ?? ''),
      cellPhone:
        pickRawRowValue(first, 'cellPhone') == null
          ? null
          : String(pickRawRowValue(first, 'cellPhone')),
      workPhone:
        pickRawRowValue(first, 'workPhone') == null
          ? null
          : String(pickRawRowValue(first, 'workPhone')),
      isStaff: isTruthyBit(pickRawRowValue(first, 'companyIsInternal')),
      companyIds: [],
      companyNames: [],
      roleIds: [],
      roleNames: [],
      departmentIds: [],
      departmentNames: [],
    };
    const pushUnique = <T>(list: T[], value: T | null | undefined) => {
      if (value == null) return;
      if (!list.includes(value)) list.push(value);
    };
    for (const row of raw) {
      const companyIdValue = Number(pickRawRowValue(row, 'companyId'));
      if (Number.isInteger(companyIdValue) && companyIdValue > 0) {
        out.isStaff =
          out.isStaff || isTruthyBit(pickRawRowValue(row, 'companyIsInternal'));
        pushUnique(out.companyIds, companyIdValue);
        pushUnique(
          out.companyNames,
          String(pickRawRowValue(row, 'companyName') ?? '').trim(),
        );
      }
      const roleIdValue = Number(pickRawRowValue(row, 'roleId'));
      if (Number.isInteger(roleIdValue) && roleIdValue > 0) {
        pushUnique(out.roleIds, roleIdValue);
        pushUnique(
          out.roleNames,
          String(pickRawRowValue(row, 'roleName') ?? '').trim(),
        );
      }
      const departmentIdValue = Number(pickRawRowValue(row, 'departmentId'));
      if (Number.isInteger(departmentIdValue) && departmentIdValue > 0) {
        pushUnique(out.departmentIds, departmentIdValue);
        pushUnique(
          out.departmentNames,
          String(pickRawRowValue(row, 'departmentName') ?? '').trim(),
        );
      }
    }
    return out;
  }

  async createManagedContact(
    dto: ManageContactDto,
  ): Promise<ManagedContactRow> {
    const row = await this.dataSource.transaction(async (em) => {
      const contact = await this.getOrCreateManagedContact(em, dto);
      await this.ensureManagedContactAssignments(
        em,
        contact.contactId,
        dto.companyId,
        dto.roleIds,
        dto.departmentIds,
      );
      const row = await this.getManagedContactRowById(contact.contactId, em);
      if (!row) {
        throw new BadRequestException(
          'Contact was saved but could not be loaded.',
        );
      }
      return row;
    });
    this.hubSpotService.queueContactSync(row.contactId);
    return row;
  }

  async updateManagedContact(
    contactId: number,
    dto: UpdateManagedContactDto,
  ): Promise<ManagedContactRow> {
    const row = await this.dataSource.transaction(async (em) => {
      const contact = await this.getOrCreateManagedContact(em, dto, contactId);
      const nextCompany =
        dto.companyId !== undefined
          ? dto.companyId
          : ((
              await em.getRepository(ContactAssignment).findOne({
                where: { contactId },
              })
            )?.companyId ?? null);
      await this.ensureManagedContactAssignments(
        em,
        contact.contactId,
        nextCompany,
        dto.roleIds,
        dto.departmentIds,
      );
      const row = await this.getManagedContactRowById(contact.contactId, em);
      if (!row) {
        throw new BadRequestException(
          'Contact was updated but could not be loaded.',
        );
      }
      return row;
    });
    this.hubSpotService.queueContactSync(row.contactId);
    return row;
  }

  async getContactConnections(contactId: number): Promise<{ engagements: { engagementId: number; tourName: string }[]; tours: { tourId: number; tourName: string }[] }> {
    const contact = await this.contactRepo.findOne({
      where: { contactId },
    });
    if (!contact) {
      throw new NotFoundException(`Contact ${contactId} was not found.`);
    }

    const engagements = await this.dataSource.getRepository(EngagementIAEContact)
      .createQueryBuilder('eic')
      .innerJoin(Engagement, 'e', 'e.engagementId = eic.engagementId')
      .innerJoin(Tour, 't', 't.tourId = e.tourId')
      .where('eic.contactId = :contactId', { contactId })
      .select(['e.engagementId AS engagementId', 't.tourName AS tourName'])
      .getRawMany();

    const tours = await this.dataSource.getRepository(TourTalentAgent)
      .createQueryBuilder('tta')
      .innerJoin(Tour, 't', 't.tourId = tta.tourId')
      .where('tta.contactId = :contactId', { contactId })
      .select(['t.tourId AS tourId', 't.tourName AS tourName'])
      .getRawMany();

    return {
      engagements: engagements.map((row) => ({
        engagementId: Number(pickRawRowValue(row, 'engagementId')),
        tourName: String(pickRawRowValue(row, 'tourName') ?? ''),
      })),
      tours: tours.map((row) => ({
        tourId: Number(pickRawRowValue(row, 'tourId')),
        tourName: String(pickRawRowValue(row, 'tourName') ?? ''),
      })),
    };
  }

  async removeManagedContact(contactId: number): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      const contact = await em.getRepository(Contact).findOne({
        where: { contactId },
      });
      if (!contact)
        throw new NotFoundException(`Contact ${contactId} was not found.`);

      // Get contact assignment IDs to delete from EmployeePhoneExtension
      const assignments = await em.getRepository(ContactAssignment).find({
        where: { contactId },
      });
      const assignmentIds = assignments.map((a) => a.contactAssignmentId);
      if (assignmentIds.length > 0) {
        await em.query(
          `DELETE FROM dbo.EmployeePhoneExtension WHERE ContactAssignmentID IN (${assignmentIds.join(',')})`,
        );
      }

      await em.getRepository(EngagementIAEContact).delete({ contactId });
      await em.getRepository(TourTalentAgent).delete({ contactId });
      await em.delete(ContactAssignment, { contactId });
      await em.delete(Contact, { contactId });
      const stillUsed = await em.getRepository(Contact).count({
        where: { contactInfoId: contact.contactInfoId },
      });
      if (stillUsed === 0) {
        await em.delete(ContactInfo, { contactInfoId: contact.contactInfoId });
      }
    });
  }

  async addContact(
    companyId: number,
    dto: CreateCompanyContactDto,
  ): Promise<CompanyContactRow> {
    await this.ensureCompany(companyId);
    assertOptionalE164Phone(dto.workPhone ?? null, 'work phone');
    assertOptionalE164Phone(dto.cellPhone ?? null, 'cell phone');

    const row = await this.dataSource.transaction(async (em) => {
      await this.ensureRole(dto.roleId, em);
      await this.ensureDepartment(dto.departmentId, em);

      const email = dto.email.trim();
      const existingInfo = await em
        .createQueryBuilder(ContactInfo, 'ci')
        .where('LOWER(ci.email) = LOWER(:email)', { email })
        .getOne();
      const savedInfo = existingInfo
        ? await em.save(
            ContactInfo,
            Object.assign(existingInfo, {
              firstName: dto.firstName.trim(),
              lastName: dto.lastName.trim(),
              email,
              ...(dto.cellPhone !== undefined
                ? { cellPhone: dto.cellPhone?.trim() || null }
                : {}),
              ...(dto.workPhone !== undefined
                ? { workPhone: dto.workPhone?.trim() || null }
                : {}),
            }),
          )
        : await em.save(
            ContactInfo,
            em.create(ContactInfo, {
              firstName: dto.firstName.trim(),
              lastName: dto.lastName.trim(),
              email,
              cellPhone: dto.cellPhone?.trim() || null,
              workPhone: dto.workPhone?.trim() || null,
            }),
          );

      const existingContact = await em.findOne(Contact, {
        where: { contactInfoId: savedInfo.contactInfoId },
      });
      const savedContact =
        existingContact ??
        (await em.save(
          Contact,
          em.create(Contact, {
            contactInfoId: savedInfo.contactInfoId,
          }),
        ));

      const existingAssignment = await em.findOne(ContactAssignment, {
        where: { companyId, contactId: savedContact.contactId },
      });
      if (existingAssignment) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'This contact is already linked to this company.',
          detail:
            'A contact assignment already exists for this company/contact pair.',
        });
      }

      const assignment = em.create(ContactAssignment, {
        contactId: savedContact.contactId,
        companyId,
        roleId: dto.roleId,
        departmentId: dto.departmentId,
      });
      let savedAsg: ContactAssignment;
      try {
        savedAsg = await em.save(ContactAssignment, assignment);
      } catch (e: unknown) {
        if (e instanceof QueryFailedError) {
          const detail = String(
            (e as QueryFailedError).driverError ?? e.message,
          );
          throw new BadRequestException({
            statusCode: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message:
              'Could not save this contact assignment. Check role and department, then try again.',
            detail,
          });
        }
        throw e;
      }

      const row = await this.getContactRow(savedAsg.contactAssignmentId, em);
      if (!row) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message:
              'The contact was saved but could not be loaded. Refresh the contacts list.',
            detail:
              'The contact row could not be loaded immediately after save. Check contact role/department links and joins.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      return row;
    });
    this.hubSpotService.queueContactSync(row.contactId);
    return row;
  }

  async updateContact(
    contactAssignmentId: number,
    dto: UpdateCompanyContactDto,
  ): Promise<CompanyContactRow> {
    const row = await this.dataSource.transaction(async (em) => {
      const asgRepo = em.getRepository(ContactAssignment);
      const infoRepo = em.getRepository(ContactInfo);
      const contactRepo = em.getRepository(Contact);

      const asg = await asgRepo.findOne({
        where: { contactAssignmentId },
        relations: { contact: { contactInfo: true } },
      });
      if (!asg) {
        throw new NotFoundException(
          `Contact assignment ${contactAssignmentId} not found`,
        );
      }

      if (dto.workPhone !== undefined) {
        assertOptionalE164Phone(dto.workPhone, 'work phone');
      }
      if (dto.cellPhone !== undefined) {
        assertOptionalE164Phone(dto.cellPhone, 'cell phone');
      }
      if (dto.roleId !== undefined) {
        await this.ensureRole(dto.roleId, em);
      }
      if (dto.departmentId !== undefined) {
        await this.ensureDepartment(dto.departmentId, em);
      }

      const oldContactId = asg.contactId;
      const oldContactInfoId = asg.contact.contactInfoId;
      const currentInfo = asg.contact.contactInfo;
      let targetInfo = currentInfo;

      const currentEmail = currentInfo.email.trim().toLowerCase();
      const nextEmail = dto.email?.trim();
      const emailChanged =
        nextEmail !== undefined && nextEmail.toLowerCase() !== currentEmail;

      if (emailChanged && nextEmail) {
        const existingInfo = await infoRepo
          .createQueryBuilder('ci')
          .where('LOWER(ci.email) = LOWER(:email)', { email: nextEmail })
          .getOne();

        if (existingInfo) {
          if (dto.firstName !== undefined) {
            existingInfo.firstName = dto.firstName.trim();
          }
          if (dto.lastName !== undefined) {
            existingInfo.lastName = dto.lastName.trim();
          }
          if (dto.cellPhone !== undefined) {
            existingInfo.cellPhone = dto.cellPhone?.trim() || null;
          }
          if (dto.workPhone !== undefined) {
            existingInfo.workPhone = dto.workPhone?.trim() || null;
          }
          await infoRepo.save(existingInfo);
          let existingContact = await contactRepo.findOne({
            where: { contactInfoId: existingInfo.contactInfoId },
          });
          if (!existingContact) {
            existingContact = await contactRepo.save(
              contactRepo.create({ contactInfoId: existingInfo.contactInfoId }),
            );
          }
          const duplicateAssignment = await asgRepo.findOne({
            where: {
              companyId: asg.companyId,
              contactId: existingContact.contactId,
            },
          });
          if (
            duplicateAssignment &&
            duplicateAssignment.contactAssignmentId !== asg.contactAssignmentId
          ) {
            throw new ConflictException({
              statusCode: HttpStatus.CONFLICT,
              error: 'Conflict',
              message: 'This contact is already linked to this company.',
              detail:
                'A contact assignment already exists for this company/contact pair.',
            });
          }
          // Email changed to an existing person: switch this company assignment to that person.
          targetInfo = existingInfo;
          asg.contactId = existingContact.contactId;
          asg.contact = existingContact;
        } else {
          // Email changed to a new person: create a new contact identity and switch assignment.
          const createdInfo = infoRepo.create({
            firstName:
              dto.firstName !== undefined
                ? dto.firstName.trim()
                : currentInfo.firstName,
            lastName:
              dto.lastName !== undefined
                ? dto.lastName.trim()
                : currentInfo.lastName,
            email: nextEmail,
            cellPhone:
              dto.cellPhone !== undefined
                ? dto.cellPhone?.trim() || null
                : currentInfo.cellPhone,
            workPhone:
              dto.workPhone !== undefined
                ? dto.workPhone?.trim() || null
                : currentInfo.workPhone,
          });
          let savedInfo: ContactInfo;
          try {
            savedInfo = await infoRepo.save(createdInfo);
          } catch (e: unknown) {
            if (e instanceof QueryFailedError) {
              const detail = String(
                (e as QueryFailedError).driverError ?? e.message,
              );
              throw new BadRequestException({
                statusCode: HttpStatus.BAD_REQUEST,
                error: 'Bad Request',
                message:
                  'Could not create a contact for this email. Check the entered values and try again.',
                detail,
              });
            }
            throw e;
          }
          const savedContact = await contactRepo.save(
            contactRepo.create({ contactInfoId: savedInfo.contactInfoId }),
          );
          targetInfo = savedInfo;
          asg.contactId = savedContact.contactId;
          asg.contact = savedContact;
        }
      } else {
        if (dto.firstName !== undefined)
          targetInfo.firstName = dto.firstName.trim();
        if (dto.lastName !== undefined)
          targetInfo.lastName = dto.lastName.trim();
        if (dto.email !== undefined) targetInfo.email = dto.email.trim();
        if (dto.cellPhone !== undefined) {
          targetInfo.cellPhone = dto.cellPhone?.trim() || null;
        }
        if (dto.workPhone !== undefined) {
          targetInfo.workPhone = dto.workPhone?.trim() || null;
        }

        try {
          await infoRepo.save(targetInfo);
        } catch (e: unknown) {
          if (e instanceof QueryFailedError) {
            const detail = String(
              (e as QueryFailedError).driverError ?? e.message,
            );
            throw new BadRequestException({
              statusCode: HttpStatus.BAD_REQUEST,
              error: 'Bad Request',
              message:
                'Could not update contact information. Check the entered values and try again.',
              detail,
            });
          }
          throw e;
        }
      }

      if (dto.roleId !== undefined) asg.roleId = dto.roleId;
      if (dto.departmentId !== undefined) asg.departmentId = dto.departmentId;
      try {
        await asgRepo.save(asg);
      } catch (e: unknown) {
        if (e instanceof QueryFailedError) {
          const detail = String(
            (e as QueryFailedError).driverError ?? e.message,
          );
          throw new BadRequestException({
            statusCode: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message:
              'Could not update this contact assignment. Check role and department, then try again.',
            detail,
          });
        }
        throw e;
      }

      if (asg.contactId !== oldContactId) {
        const remaining = await asgRepo.count({
          where: { contactId: oldContactId },
        });
        if (remaining === 0) {
          await contactRepo.delete({ contactId: oldContactId });
          const stillUsed = await contactRepo.count({
            where: { contactInfoId: oldContactInfoId },
          });
          if (stillUsed === 0) {
            await infoRepo.delete({ contactInfoId: oldContactInfoId });
          }
        }
      }

      const row = await this.getContactRow(contactAssignmentId, em);
      if (!row) throw new NotFoundException('Contact row missing after update');
      return row;
    });
    this.hubSpotService.queueContactSync(row.contactId);
    return row;
  }

  async removeContact(contactAssignmentId: number): Promise<void> {
    const asg = await this.assignmentRepo.findOne({
      where: { contactAssignmentId },
      relations: { contact: true },
    });
    if (!asg) {
      throw new NotFoundException(
        `Contact assignment ${contactAssignmentId} not found`,
      );
    }

    const contactId = asg.contactId;
    await this.assignmentRepo.delete({ contactAssignmentId });

    const remaining = await this.assignmentRepo.count({
      where: { contactId },
    });
    if (remaining === 0) {
      const contactInfoId = asg.contact.contactInfoId;
      await this.contactRepo.delete({ contactId });
      await this.contactInfoRepo.delete({ contactInfoId });
    }
  }

  async removeContactCompletely(contactAssignmentId: number): Promise<void> {
    const asg = await this.assignmentRepo.findOne({
      where: { contactAssignmentId },
      relations: { contact: true },
    });
    if (!asg) {
      throw new NotFoundException(
        `Contact assignment ${contactAssignmentId} not found`,
      );
    }

    const contactId = asg.contactId;
    const contactInfoId = asg.contact.contactInfoId;
    const allAsgs = await this.assignmentRepo.find({
      where: { contactId },
      select: { contactAssignmentId: true },
    });

    if (allAsgs.length > 1) {
      await this.assignmentRepo.delete({ contactId });
    } else {
      await this.assignmentRepo.delete({ contactAssignmentId });
    }

    await this.contactRepo.delete({ contactId });
    await this.contactInfoRepo.delete({ contactInfoId });
  }

  /**
   * When called inside a transaction, pass `em` so the query sees uncommitted rows.
   */
  private async getContactRow(
    contactAssignmentId: number,
    em?: EntityManager,
  ): Promise<CompanyContactRow | null> {
    const assignmentRepo = em
      ? em.getRepository(ContactAssignment)
      : this.assignmentRepo;
    const raw = await assignmentRepo
      .createQueryBuilder('ca')
      .innerJoin('ca.contact', 'ct')
      .innerJoin('ct.contactInfo', 'ci')
      .innerJoin('ca.role', 'r')
      .innerJoin('ca.department', 'd')
      .where('ca.contactAssignmentId = :id', { id: contactAssignmentId })
      .select([
        'ca.contactAssignmentId AS contactAssignmentId',
        'ca.contactId AS contactId',
        'ci.contactInfoId AS contactInfoId',
        'ci.firstName AS firstName',
        'ci.lastName AS lastName',
        'ci.email AS email',
        'ci.cellPhone AS cellPhone',
        'ci.workPhone AS workPhone',
        'r.roleId AS roleId',
        'r.roleName AS roleName',
        'd.departmentId AS departmentId',
        'd.departmentName AS departmentName',
      ])
      .getRawOne();
    if (!raw) return null;
    const r = raw as Record<string, unknown>;
    return {
      contactAssignmentId: Number(pickRawRowValue(r, 'contactAssignmentId')),
      contactId: Number(pickRawRowValue(r, 'contactId')),
      contactInfoId: Number(pickRawRowValue(r, 'contactInfoId')),
      firstName: String(pickRawRowValue(r, 'firstName') ?? ''),
      lastName: String(pickRawRowValue(r, 'lastName') ?? ''),
      email: String(pickRawRowValue(r, 'email') ?? ''),
      cellPhone: (() => {
        const v = pickRawRowValue(r, 'cellPhone');
        if (v == null) return null;
        return String(v);
      })(),
      workPhone: (() => {
        const v = pickRawRowValue(r, 'workPhone');
        if (v == null) return null;
        return String(v);
      })(),
      roleId: Number(pickRawRowValue(r, 'roleId')),
      roleName: String(pickRawRowValue(r, 'roleName') ?? ''),
      departmentId: Number(pickRawRowValue(r, 'departmentId')),
      departmentName: String(pickRawRowValue(r, 'departmentName') ?? ''),
    };
  }

  async listEngagements(companyId: number): Promise<EngagementListRow[]> {
    await this.ensureCompany(companyId);
    return this.engagementService.listByCompany(companyId);
  }

  async getCompanyLinks(companyId: number) {
    await this.ensureCompany(companyId);

    // Engagement venues (this company is a venue on engagements)
    const engagementVenueRows: {
      engagementId: number;
      attractionName: string | null;
      tourName: string | null;
    }[] = await this.dataSource.query(
      `SELECT ev.EngagementID AS engagementId, a.AttractionName AS attractionName, t.TourName AS tourName
         FROM [dbo].[EngagementVenue] ev
         INNER JOIN [dbo].[Engagement] e ON e.EngagementID = ev.EngagementID
         LEFT JOIN [dbo].[Tour] t ON t.TourID = e.TourID
         LEFT JOIN [dbo].[Attraction] a ON a.AttractionID = t.AttractionID
         WHERE ev.VenueCompanyID = @0`,
      [companyId],
    );

    // Project venues (this company is a venue on projects)
    const projectVenueRows: {
      projectId: number;
      attractionName: string | null;
      tourName: string | null;
    }[] = await this.dataSource.query(
      `SELECT pv.EngagementProjectID AS projectId, a.AttractionName AS attractionName, t.TourName AS tourName
         FROM [dbo].[EngagementProjectVenue] pv
         INNER JOIN [dbo].[EngagementProject] p ON p.EngagementProjectID = pv.EngagementProjectID
         LEFT JOIN [dbo].[Tour] t ON t.TourID = p.TourID
         LEFT JOIN [dbo].[Attraction] a ON a.AttractionID = t.AttractionID
         WHERE pv.VenueCompanyID = @0`,
      [companyId],
    );

    // Tours where this company is talent agency or tour management
    const tourRows: {
      tourId: number;
      tourName: string | null;
      attractionName: string | null;
      isTalentAgency: number;
      isTourManagement: number;
    }[] = await this.dataSource.query(
      `SELECT t.TourID AS tourId, t.TourName AS tourName, a.AttractionName AS attractionName,
                CASE WHEN t.TalentAgencyCompanyID = @0 THEN 1 ELSE 0 END AS isTalentAgency,
                CASE WHEN t.TourManagementCompanyID = @0 THEN 1 ELSE 0 END AS isTourManagement
         FROM [dbo].[Tour] t
         LEFT JOIN [dbo].[Attraction] a ON a.AttractionID = t.AttractionID
         WHERE t.TalentAgencyCompanyID = @0 OR t.TourManagementCompanyID = @0`,
      [companyId],
    );

    // Attractions where this company is attraction management
    const attractionRows = await this.dataSource
      .getRepository(Attraction)
      .find({ where: { attractionManagementLinkId: companyId } });

    // Service provider links (this company provides services to other venues)
    const serviceProviderRows: {
      venueCompanyId: number;
      venueCompanyName: string | null;
    }[] = await this.dataSource.query(
      `SELECT DISTINCT vsp.VenueCompanyID AS venueCompanyId, c.CompanyName AS venueCompanyName
         FROM [dbo].[VenueServiceProvider] vsp
         INNER JOIN [dbo].[Company] c ON c.CompanyID = vsp.VenueCompanyID
         WHERE vsp.ProviderCompanyID = @0`,
      [companyId],
    );

    // Entertainment complex membership (this company is a venue in a complex)
    const complexMemberRows: {
      complexCompanyId: number;
      complexCompanyName: string | null;
    }[] = await this.dataSource.query(
      `SELECT vcm.ComplexCompanyID AS complexCompanyId, c.CompanyName AS complexCompanyName
         FROM [dbo].[VenueComplexMember] vcm
         INNER JOIN [dbo].[Company] c ON c.CompanyID = vcm.ComplexCompanyID
         WHERE vcm.VenueCompanyID = @0`,
      [companyId],
    );

    // Venues in this complex (this company IS the complex)
    const complexVenueRows: {
      venueCompanyId: number;
      venueCompanyName: string | null;
    }[] = await this.dataSource.query(
      `SELECT vcm.VenueCompanyID AS venueCompanyId, c.CompanyName AS venueCompanyName
         FROM [dbo].[VenueComplexMember] vcm
         INNER JOIN [dbo].[Company] c ON c.CompanyID = vcm.VenueCompanyID
         WHERE vcm.ComplexCompanyID = @0`,
      [companyId],
    );

    return {
      engagements: engagementVenueRows.map((r) => {
        const fallback = `Engagement #${r.engagementId}`;
        return {
          engagementId: r.engagementId,
          title: r.attractionName || r.tourName || fallback,
          subtitle: r.attractionName ? r.tourName || fallback : null,
          label: r.attractionName
            ? `${r.attractionName} — ${r.tourName || fallback}`
            : r.tourName || fallback,
        };
      }),
      projects: projectVenueRows.map((r) => {
        const fallback = `Project #${r.projectId}`;
        return {
          projectId: r.projectId,
          title: r.attractionName || r.tourName || fallback,
          subtitle: r.attractionName ? r.tourName || fallback : null,
          label: r.attractionName
            ? `${r.attractionName} — ${r.tourName || fallback}`
            : r.tourName || fallback,
        };
      }),
      tours: tourRows.map((r) => {
        const fallback = `Tour #${r.tourId}`;
        return {
          tourId: r.tourId,
          title: r.attractionName || r.tourName || fallback,
          subtitle: r.attractionName ? r.tourName || fallback : null,
          label: r.attractionName
            ? `${r.attractionName} — ${r.tourName || fallback}`
            : r.tourName || fallback,
          role:
            r.isTalentAgency && r.isTourManagement
              ? 'Talent Agency & Tour Management'
              : r.isTalentAgency
                ? 'Talent Agency'
                : 'Tour Management',
        };
      }),
      attractions: attractionRows.map((r) => ({
        attractionId: r.attractionId,
        title: r.attractionName || `Attraction #${r.attractionId}`,
        subtitle: null,
        label: r.attractionName || `Attraction #${r.attractionId}`,
        role: 'Attraction Management',
      })),
      serviceProviderFor: serviceProviderRows.map((r) => ({
        venueCompanyId: r.venueCompanyId,
        title: r.venueCompanyName || `Company #${r.venueCompanyId}`,
        subtitle: null,
        label: r.venueCompanyName || `Company #${r.venueCompanyId}`,
      })),
      entertainmentComplexes: complexMemberRows.map((r) => ({
        complexCompanyId: r.complexCompanyId,
        title: r.complexCompanyName || `Company #${r.complexCompanyId}`,
        subtitle: null,
        label: r.complexCompanyName || `Company #${r.complexCompanyId}`,
      })),
      complexVenues: complexVenueRows.map((r) => ({
        venueCompanyId: r.venueCompanyId,
        title: r.venueCompanyName || `Company #${r.venueCompanyId}`,
        subtitle: null,
        label: r.venueCompanyName || `Company #${r.venueCompanyId}`,
      })),
    };
  }

  async updateVenueTicketing(
    companyId: number,
    dto: UpdateVenueTicketingDto,
  ): Promise<{ updated: boolean }> {
    const venue = await this.venueRepo.findOne({ where: { companyId } });
    if (!venue) {
      return { updated: false };
    }
    if (dto.seatingTypeId !== undefined) {
      venue.seatingTypeId = dto.seatingTypeId;
      await this.venueRepo.save(venue);
    }
    if (dto.ticketingSystem !== undefined || dto.venueWebsite !== undefined) {
      await this.updateVenueTicketingWebsiteColumns(companyId, {
        ticketingSystem: dto.ticketingSystem,
        venueWebsite: dto.venueWebsite,
      });
    }
    return { updated: true };
  }

  async getVenueTicketing(companyId: number): Promise<{
    seatingTypeId: number | null;
    seatingTypeName: string | null;
    ticketingSystem: string | null;
    venueWebsite: string | null;
  } | null> {
    const venue = await this.venueRepo.findOne({
      where: { companyId },
      relations: { seatingType: true },
    });
    if (!venue) return null;
    const tw = await this.loadVenueTicketingWebsiteColumns(companyId);
    return {
      seatingTypeId: venue.seatingTypeId,
      seatingTypeName: venue.seatingType?.seatingName ?? null,
      ticketingSystem: tw.ticketingSystem,
      venueWebsite: tw.venueWebsite,
    };
  }

  private searchTokens(value: string): string[] {
    return [
      ...new Set(
        String(value ?? '')
          .trim()
          .split(/[^a-zA-Z0-9]+/)
          .map((token) => token.trim())
          .filter(Boolean),
      ),
    ].slice(0, 8);
  }

  private escapeLikePattern(value: string): string {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');
  }

  private async ensureCompany(companyId: number): Promise<void> {
    const n = await this.companyRepo.count({ where: { companyId } });
    if (!n) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: 'This company was not found.',
        detail: 'The company record does not exist.',
      });
    }
  }
}
