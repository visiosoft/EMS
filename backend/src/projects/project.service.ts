import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  EntityManager,
  In,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { AdminUsersService } from '../admin-users/admin-users.service';
import { EngagementProject } from '../entities/engagement-project.entity';
import { EngagementProjectDma } from '../entities/engagement-project-dma.entity';
import { EngagementProjectVenue } from '../entities/engagement-project-venue.entity';
import { EngagementProjectPerformanceOption } from '../entities/engagement-project-performance-option.entity';
import { Attraction } from '../entities/attraction.entity';
import { Company } from '../entities/company.entity';
import { Dma } from '../entities/dma.entity';
import { Tour } from '../entities/tour.entity';
import { Venue } from '../entities/venue.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectVenueDto } from './dto/add-project-venue.dto';
import { UpdateProjectVenueDto } from './dto/update-project-venue.dto';
import { AddPerformanceOptionDto } from './dto/add-performance-option.dto';
import { UpdatePerformanceOptionDto } from './dto/update-performance-option.dto';
import { AuditRequestContext } from '../audit/audit-request-context.service';
import {
  isAllowedProjectStage,
  PROJECT_STAGE_VALUES,
} from './project-stage.constants';

const ENGAGEMENT_VENUE_OPTION_STATUS_ALLOWLIST = [
  'Confirmed',
  'Pending',
  'Inactive',
] as const;
const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);
  private static readonly VENUE_STATUS_LIST_TTL_MS = 60_000;
  private venueStatusListCache: {
    at: number;
    result: {
      values: string[];
      source: 'application' | 'environment';
    };
  } | null = null;

  private static readonly OPTION_STATUS_LIST_TTL_MS = 60_000;
  private optionStatusListCache: {
    at: number;
    result: {
      values: string[];
      source: 'application' | 'environment';
    };
  } | null = null;
  private agentContactColumnNameCache: string | null | undefined = undefined;
  private companyTypeLinkTableCache: string | null | undefined = undefined;
  private static readonly CREATED_BY_NAME_CACHE_TTL_MS = 5 * 60_000;
  private createdByNameCache: {
    at: number;
    byOid: Map<string, string>;
  } | null = null;

  constructor(
    @InjectRepository(EngagementProject)
    private readonly projectRepo: Repository<EngagementProject>,
    @InjectRepository(EngagementProjectVenue)
    private readonly projectVenueRepo: Repository<EngagementProjectVenue>,
    @InjectRepository(EngagementProjectPerformanceOption)
    private readonly optionRepo: Repository<EngagementProjectPerformanceOption>,
    @InjectRepository(EngagementProjectDma)
    private readonly projectDmaRepo: Repository<EngagementProjectDma>,
    @InjectRepository(Tour)
    private readonly tourRepo: Repository<Tour>,
    @InjectRepository(Attraction)
    private readonly attractionRepo: Repository<Attraction>,
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly dataSource: DataSource,
    private readonly auditContext: AuditRequestContext,
    private readonly adminUsersService: AdminUsersService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private safeDbIdentifier(name: string): string {
    return `[${String(name).replace(/\]/g, ']]')}]`;
  }

  private async canQueryCompanyTypeLinkTable(
    tableName: string,
  ): Promise<boolean> {
    try {
      await this.dataSource.query(
        `SELECT TOP 1 1 AS [ok] FROM [dbo].${this.safeDbIdentifier(tableName)}`,
      );
      return true;
    } catch {
      return false;
    }
  }

  private normalizeTime(t: string | null | undefined): string | null {
    if (!t) return null;
    const parts = t.trim().split(':');
    if (parts.length === 2)
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    if (parts.length === 3)
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0').slice(0, 2)}`;
    throw new BadRequestException({
      message: 'Invalid time format. Use HH:MM or HH:MM:SS.',
    });
  }

  private formatTime(t: string | null): string | null {
    if (!t) return null;
    // DB may return HH:MM:SS or HH:MM, normalize to HH:MM for response
    const parts = t.split(':');
    if (parts.length >= 2)
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    return t;
  }

  /**
   * Project stages are fixed in this application: Under Construction, Confirmed, Pending, Inactive
   * (aligned with dbo.EngagementProject.ProjectStage CHECK; DTOs validate with @IsIn).
   */
  async getProjectStageMeta(): Promise<{
    projectStages: string[];
    source: 'application';
  }> {
    return { projectStages: [...PROJECT_STAGE_VALUES], source: 'application' };
  }

  private parseVenueStatusEnvAllowlist(): string[] {
    const raw = process.env.VENUE_STATUS_ALLOWLIST?.trim();
    if (!raw) return [];
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private async resolveVenueStatusAllowlist(): Promise<{
    values: string[];
    source: 'application' | 'environment';
  }> {
    const fromEnv = this.parseVenueStatusEnvAllowlist();
    if (fromEnv.length > 0) {
      return { values: fromEnv, source: 'environment' };
    }
    return {
      values: [...ENGAGEMENT_VENUE_OPTION_STATUS_ALLOWLIST],
      source: 'application',
    };
  }

  /**
   * Allowed `VenueStatus` values for dbo.EngagementProjectVenue — from env
   * `VENUE_STATUS_ALLOWLIST` (comma-separated), else the canonical list (Confirmed, Pending, Inactive).
   */
  async getVenueStatusMeta(): Promise<{
    venueStatuses: string[];
    source: 'application' | 'environment';
  }> {
    const now = Date.now();
    if (
      this.venueStatusListCache &&
      now - this.venueStatusListCache.at <
        ProjectService.VENUE_STATUS_LIST_TTL_MS
    ) {
      const r = this.venueStatusListCache.result;
      return { venueStatuses: r.values, source: r.source };
    }
    const r = await this.resolveVenueStatusAllowlist();
    this.venueStatusListCache = { at: now, result: r };
    return { venueStatuses: r.values, source: r.source };
  }

  private assertValidProjectStage(stage: string): void {
    if (!isAllowedProjectStage(stage)) {
      throw new BadRequestException({
        message: `Invalid project stage "${stage}". Allowed values: ${PROJECT_STAGE_VALUES.join(', ')}.`,
      });
    }
  }

  private normalizeDateOnly(
    value: string | Date | null | undefined,
  ): string | null {
    if (value == null) return null;
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      const y = value.getUTCFullYear();
      const m = String(value.getUTCMonth() + 1).padStart(2, '0');
      const d = String(value.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const t = String(value).trim();
    return t.length > 0 ? t.slice(0, 10) : null;
  }

  private assertValidTourDateRange(
    tourStartDate: string | null,
    tourEndDate: string | null,
  ): void {
    if (!tourStartDate || !tourEndDate) {
      throw new BadRequestException({
        message: 'Tour start date and end date are required.',
      });
    }
    if (tourStartDate > tourEndDate) {
      throw new BadRequestException({
        message: 'Tour start date cannot be after end date.',
      });
    }
  }

  private parseAgentContactId(
    value: string | number | null | undefined,
  ): number | null {
    if (value == null) return null;
    const t = String(value).trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isInteger(n) || n < 1) {
      throw new BadRequestException({
        message: 'Invalid talent agent. Select a valid talent agent contact.',
      });
    }
    return n;
  }

  private async resolveAgentContactColumnName(): Promise<string | null> {
    if (this.agentContactColumnNameCache !== undefined) {
      return this.agentContactColumnNameCache;
    }
    try {
      const rows: Array<{ colName?: string }> = await this.dataSource.query(
        `
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
      `,
      );
      const name = String(rows?.[0]?.colName ?? '').trim();
      this.agentContactColumnNameCache = name.length > 0 ? name : null;
      return this.agentContactColumnNameCache;
    } catch {
      this.agentContactColumnNameCache = null;
      return null;
    }
  }

  private async resolveCompanyTypeLinkTableName(): Promise<string | null> {
    if (this.companyTypeLinkTableCache !== undefined) {
      const cached = this.companyTypeLinkTableCache;
      if (cached && (await this.canQueryCompanyTypeLinkTable(cached))) {
        return cached;
      }
      if (cached) {
        this.companyTypeLinkTableCache = undefined;
      } else {
        return null;
      }
    }
    try {
      const rows = await this.dataSource.query(
        `
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
      `,
      );
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
    } catch {
      this.companyTypeLinkTableCache = null;
      return null;
    }
  }

  private async companyHasTypeName(
    companyId: number,
    expectedTypeName: string,
  ): Promise<boolean> {
    const co = await this.companyRepo.findOne({
      where: { companyId },
      relations: { companyType: true },
    });
    if (!co) {
      throw new BadRequestException({ message: 'Company not found.' });
    }
    const expected = expectedTypeName.trim().toLowerCase();
    const primaryType =
      co.companyType?.companyTypeName?.trim().toLowerCase() ?? '';
    if (primaryType === expected) {
      return true;
    }
    const linkTable = await this.resolveCompanyTypeLinkTableName();
    if (!linkTable) {
      return false;
    }
    const safeTable = this.safeDbIdentifier(linkTable);
    try {
      const rows = await this.dataSource.query(
        `
        SELECT TOP 1 1 AS [ok]
        FROM [dbo].${safeTable} ctm
        INNER JOIN [dbo].[CompanyType] ct
          ON ct.CompanyTypeID = ctm.CompanyTypeID
        WHERE ctm.CompanyID = ${Math.floor(companyId)}
          AND LOWER(LTRIM(RTRIM(ct.CompanyTypeName))) = LOWER(${`N'${expectedTypeName.replace(/'/g, "''")}'`})
      `,
      );
      return rows.length > 0;
    } catch {
      this.companyTypeLinkTableCache = undefined;
      return false;
    }
  }

  private async hasAgentContactColumn(): Promise<boolean> {
    return (await this.resolveAgentContactColumnName()) != null;
  }

  private async getProjectAgentContactId(
    engagementProjectId: number,
  ): Promise<number | null> {
    const col = await this.resolveAgentContactColumnName();
    if (!col) return null;
    const pid = Math.floor(Number(engagementProjectId));
    if (!Number.isFinite(pid) || pid < 1) return null;
    const rows: Array<{ agentContactId?: number | string | null }> =
      await this.dataSource.query(
        `SELECT TOP 1 [${col}] AS agentContactId FROM dbo.EngagementProject WHERE EngagementProjectID = ${pid}`,
      );
    const raw = rows?.[0]?.agentContactId;
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  }

  private async setProjectAgentContactId(
    manager: EntityManager,
    engagementProjectId: number,
    agentContactId: number | null,
  ): Promise<void> {
    const col = await this.resolveAgentContactColumnName();
    if (!col) {
      // Temporary product behavior: Talent Agent is selected in UI but not persisted
      // until an agent-contact column is available on dbo.EngagementProject.
      return;
    }
    const pid = Math.floor(Number(engagementProjectId));
    if (!Number.isFinite(pid) || pid < 1) return;
    const valueSql = agentContactId == null ? 'NULL' : String(agentContactId);
    await manager.query(
      `UPDATE dbo.EngagementProject SET [${col}] = ${valueSql} WHERE EngagementProjectID = ${pid}`,
    );
    const verify = await this.getProjectAgentContactId(pid);
    const expected = agentContactId == null ? null : Number(agentContactId);
    if ((verify ?? null) !== (expected ?? null)) {
      throw new BadRequestException({
        message:
          'Talent agent was not persisted correctly. Please verify EngagementProject agent-contact column mapping.',
      });
    }
  }

  private async assertValidVenueStatus(status: string): Promise<void> {
    const { venueStatuses } = await this.getVenueStatusMeta();
    if (venueStatuses.length === 0) {
      return;
    }
    if (!venueStatuses.includes(status)) {
      throw new BadRequestException({
        message: `Invalid venue status "${status}". Allowed values: ${venueStatuses.join(', ')}.`,
      });
    }
  }

  private parseOptionStatusEnvAllowlist(): string[] {
    const raw = process.env.OPTION_STATUS_ALLOWLIST?.trim();
    if (!raw) return [];
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private async resolveOptionStatusAllowlist(): Promise<{
    values: string[];
    source: 'application' | 'environment';
  }> {
    const fromEnv = this.parseOptionStatusEnvAllowlist();
    if (fromEnv.length > 0) {
      return { values: fromEnv, source: 'environment' };
    }
    return {
      values: [...ENGAGEMENT_VENUE_OPTION_STATUS_ALLOWLIST],
      source: 'application',
    };
  }

  /**
   * Allowed `OptionStatus` values for dbo.EngagementProjectPerformanceOption — from env
   * `OPTION_STATUS_ALLOWLIST` (comma-separated), else the canonical list (Confirmed, Pending, Inactive).
   */
  async getOptionStatusMeta(): Promise<{
    optionStatuses: string[];
    source: 'application' | 'environment';
  }> {
    const now = Date.now();
    if (
      this.optionStatusListCache &&
      now - this.optionStatusListCache.at <
        ProjectService.OPTION_STATUS_LIST_TTL_MS
    ) {
      const r = this.optionStatusListCache.result;
      return { optionStatuses: r.values, source: r.source };
    }
    const r = await this.resolveOptionStatusAllowlist();
    this.optionStatusListCache = { at: now, result: r };
    return { optionStatuses: r.values, source: r.source };
  }

  private async assertValidOptionStatus(status: string): Promise<void> {
    const { optionStatuses } = await this.getOptionStatusMeta();
    if (optionStatuses.length === 0) {
      return;
    }
    if (!optionStatuses.includes(status)) {
      throw new BadRequestException({
        message: `Invalid performance option status "${status}". Allowed values: ${optionStatuses.join(', ')}.`,
      });
    }
  }

  private async assertTourExists(tourId: number): Promise<Tour> {
    const tour = await this.tourRepo.findOne({ where: { tourId } });
    if (!tour) {
      throw new BadRequestException({
        message: `Tour with ID ${tourId} not found.`,
      });
    }
    return tour;
  }

  private async assertCompanyIsTalentAgency(companyId: number): Promise<void> {
    const isTalentAgency = await this.companyHasTypeName(
      companyId,
      'Talent Agency',
    );
    if (!isTalentAgency) {
      throw new BadRequestException({
        message: 'Talent agency must be a company of type Talent Agency.',
      });
    }
  }

  private async assertVenueCompany(venueCompanyId: number): Promise<void> {
    const company = await this.companyRepo.findOne({
      where: { companyId: venueCompanyId },
    });
    if (!company) {
      throw new BadRequestException({
        message: `Company with ID ${venueCompanyId} not found.`,
      });
    }
    const venue = await this.venueRepo.findOne({
      where: { companyId: venueCompanyId },
    });
    if (!venue) {
      throw new BadRequestException({
        message: 'Company exists but is not a venue.',
      });
    }
  }

  private async assertProjectExists(id: number): Promise<EngagementProject> {
    const project = await this.projectRepo.findOne({
      where: { engagementProjectId: id },
    });
    if (!project) {
      throw new NotFoundException({
        message: `Project with ID ${id} not found.`,
      });
    }
    return project;
  }

  private isOidLike(value: string | null | undefined): boolean {
    const trimmed = String(value ?? '').trim();
    return GUID_RE.test(trimmed);
  }

  private async getCreatedByNameMap(): Promise<Map<string, string>> {
    const now = Date.now();
    if (
      this.createdByNameCache &&
      now - this.createdByNameCache.at <
        ProjectService.CREATED_BY_NAME_CACHE_TTL_MS
    ) {
      return this.createdByNameCache.byOid;
    }

    try {
      const users = await this.adminUsersService.listUsers();
      const byOid = new Map<string, string>();
      for (const user of users) {
        const id = String(user.id ?? '')
          .trim()
          .toLowerCase();
        const name = String(user.name ?? '').trim();
        if (!id || !name) continue;
        byOid.set(id, name);
      }
      this.createdByNameCache = { at: now, byOid };
      return byOid;
    } catch (error) {
      this.logger.warn(
        `Could not resolve CreatedBy display names from user directory: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return new Map<string, string>();
    }
  }

  private rememberCreatedByName(oid: string, name: string): void {
    const key = String(oid ?? '').trim().toLowerCase();
    const value = String(name ?? '').trim();
    if (!key || !value) return;
    const now = Date.now();
    if (
      this.createdByNameCache &&
      now - this.createdByNameCache.at <
        ProjectService.CREATED_BY_NAME_CACHE_TTL_MS
    ) {
      this.createdByNameCache.byOid.set(key, value);
      return;
    }
    this.createdByNameCache = {
      at: now,
      byOid: new Map<string, string>([[key, value]]),
    };
  }

  private async resolveCreatedByDisplayValue(
    value: string | null,
    createdByNameMap?: Map<string, string>,
  ): Promise<string | null> {
    if (value == null) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!this.isOidLike(trimmed)) return trimmed;

    const byOid = createdByNameMap ?? (await this.getCreatedByNameMap());
    const oid = trimmed.toLowerCase();
    const mappedName = byOid.get(oid);
    if (mappedName) return mappedName;

    try {
      const user = await this.adminUsersService.findUserById(trimmed);
      const foundName = user?.name?.trim();
      if (foundName) {
        this.rememberCreatedByName(oid, foundName);
        if (createdByNameMap) createdByNameMap.set(oid, foundName);
        return foundName;
      }
    } catch (error) {
      this.logger.warn(
        `Could not resolve CreatedBy name for OID ${trimmed}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const requestOid = this.auditContext.getUserOid()?.trim().toLowerCase();
    if (requestOid && requestOid === oid) {
      const requestName = this.auditContext.getUserDisplayName()?.trim();
      if (requestName) return requestName.slice(0, 200);
    }
    return 'Unknown user';
  }

  private async resolveCreatedByDisplayValuesForRows(
    rows: Array<{ createdBy: string | null }>,
  ): Promise<Map<string, string>> {
    const oids = new Set<string>();
    for (const row of rows) {
      const raw = row.createdBy?.trim();
      if (!raw || !this.isOidLike(raw)) continue;
      oids.add(raw.toLowerCase());
    }
    if (oids.size === 0) return new Map<string, string>();

    const byOid = await this.getCreatedByNameMap();
    const resolved = new Map<string, string>();
    for (const oid of oids) {
      const name = byOid.get(oid);
      if (name) resolved.set(oid, name);
    }
    return resolved;
  }

  /**
   * Persist Entra OID when available; keep payload fallback for backward compatibility.
   */
  private resolveProjectCreatedBy(
    createdByFromPayload: string | null | undefined,
  ): string | null {
    const auditOid = this.auditContext.getUserOid();
    if (auditOid && auditOid.trim().length > 0) {
      return auditOid.trim().slice(0, 200);
    }
    const fallback = createdByFromPayload?.trim();
    if (!fallback) return null;
    return this.isOidLike(fallback) ? fallback.slice(0, 200) : null;
  }

  /** Distinct positive DMA IDs, sorted ascending (for stable inserts / responses). */
  private normalizeDmaIds(ids: number[] | undefined): number[] {
    if (!ids?.length) return [];
    const seen = new Set<number>();
    for (const n of ids) {
      if (typeof n === 'number' && Number.isInteger(n) && n >= 1) seen.add(n);
    }
    return [...seen].sort((a, b) => a - b);
  }

  private async assertDmasExist(
    manager: EntityManager,
    dmaIds: number[],
  ): Promise<void> {
    if (dmaIds.length === 0) return;
    const dmaRepo = manager.getRepository(Dma);
    const cnt = await dmaRepo
      .createQueryBuilder('d')
      .where('d.dmaid IN (:...ids)', { ids: dmaIds })
      .getCount();
    if (cnt !== dmaIds.length) {
      throw new BadRequestException({
        message:
          'One or more selected markets (DMA) are not in the database. Refresh the list and try again.',
      });
    }
  }

  private async insertProjectDmasInTransaction(
    manager: EntityManager,
    projectId: number,
    dmaIds: number[] | undefined,
  ): Promise<void> {
    const normalized = this.normalizeDmaIds(dmaIds);
    if (normalized.length === 0) return;
    await this.assertDmasExist(manager, normalized);
    for (const dmaid of normalized) {
      await manager.save(
        EngagementProjectDma,
        manager.create(EngagementProjectDma, {
          engagementProjectId: projectId,
          dmaid,
        }),
      );
    }
  }

  private async assertVenueInProject(
    projectId: number,
    venueId: number,
  ): Promise<EngagementProjectVenue> {
    const venue = await this.projectVenueRepo.findOne({
      where: {
        engagementProjectId: projectId,
        engagementProjectVenueId: venueId,
      },
    });
    if (!venue) {
      throw new NotFoundException({
        message: `Venue proposal with ID ${venueId} not found in project ${projectId}.`,
      });
    }
    return venue;
  }

  private async assertOptionInProject(
    projectId: number,
    optionId: number,
  ): Promise<EngagementProjectPerformanceOption> {
    const option = await this.optionRepo.findOne({
      where: { engagementProjectId: projectId, performanceOptionId: optionId },
    });
    if (!option) {
      throw new NotFoundException({
        message: `Performance option with ID ${optionId} not found in project ${projectId}.`,
      });
    }
    return option;
  }

  /** Map SQL errors from project venue / option writes to HTTP exceptions (avoids generic 500). */
  private mapProjectVenueQueryFailed(
    op: 'add' | 'mutate',
    projectId: number,
    e: QueryFailedError,
    venueStatus?: string,
  ): never {
    const d = String(e.driverError ?? e.message);
    this.logger.error(
      `Project venue ${op} failed (projectId=${projectId}): ${d}`,
    );

    const driver = e.driverError as
      | { number?: number; message?: string }
      | undefined;
    const n = driver?.number;
    if (
      n === 2627 ||
      n === 2601 ||
      /duplicate key|UNIQUE KEY constraint/i.test(d)
    ) {
      throw new ConflictException({
        message: 'This venue is already added to this project.',
        detail: d,
      });
    }
    if (n === 547 || /FOREIGN KEY/i.test(d)) {
      throw new BadRequestException({
        message:
          'This venue can’t be linked. Check that the company is a valid venue in the system and the project still exists.',
        detail: d,
      });
    }
    if (
      venueStatus &&
      (/CHECK constraint|VenueStatus/i.test(d) || /VenueStatus/i.test(d))
    ) {
      throw new BadRequestException({
        message: `This venue status isn’t accepted by the database: ${venueStatus}.`,
        detail: d,
      });
    }
    throw new BadRequestException({
      message:
        'Could not add the venue. The database rejected the change — check the server log for details.',
      detail: d,
    });
  }

  // ─── Build response shape ─────────────────────────────────────────────────

  private async buildProjectResponse(project: EngagementProject) {
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
    const agentContactId = await this.getProjectAgentContactId(
      project.engagementProjectId,
    );

    const firstVenueId = dbVenues[0]?.engagementProjectVenueId;
    const optionsForVenue = (venueRowId: number) => {
      const linked = options.filter(
        (o) => o.engagementProjectVenueId === venueRowId,
      );
      if (linked.length > 0) return linked;
      /** Legacy rows (no venue FK): surface once on the first venue only. */
      if (venueRowId === firstVenueId) {
        return options.filter((o) => o.engagementProjectVenueId == null);
      }
      return [];
    };

    const venuesWithDetails = await Promise.all(
      dbVenues.map(async (v) => {
        const company = await this.companyRepo.findOne({
          where: { companyId: v.venueCompanyId },
        });
        const venue = await this.venueRepo.findOne({
          where: { companyId: v.venueCompanyId },
        });
        return {
          engagementProjectVenueId: v.engagementProjectVenueId,
          engagementProjectId: v.engagementProjectId,
          venueCompanyId: v.venueCompanyId,
          venueCompanyName: company?.companyName ?? null,
          venueName: venue?.venueName ?? null,
          venueStatus: v.venueStatus,
          // Frontend-only fields returned as null (Option A — we never persisted them)
          configName: null,
          dealType: null,
          guarantee: null,
          splitPct: null,
          breakeven: null,
          marketingCoOp: null,
          engagementId: null,
          performanceOptions: optionsForVenue(v.engagementProjectVenueId).map(
            (o) => ({
              performanceOptionId: o.performanceOptionId,
              engagementProjectId: o.engagementProjectId,
              engagementProjectVenueId: o.engagementProjectVenueId ?? null,
              proposedDate: o.proposedDate,
              proposedTime: this.formatTime(o.proposedTime),
              optionStatus: o.optionStatus,
            }),
          ),
        };
      }),
    );

    const createdBy = await this.resolveCreatedByDisplayValue(
      project.createdBy,
    );

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
      createdDate: project.createdDate,
      createdBy,
      name: null,
      bookerId: null,
      agentContactId,
      dmaIds: projectDmas.map((d) => d.dmaid),
      targetOnSale: null,
      notes: null,
      venues: venuesWithDetails,
    };
  }

  // ─── Project CRUD ─────────────────────────────────────────────────────────

  async create(
    dto: CreateProjectDto,
  ): Promise<{ engagementProjectId: number }> {
    const tourRow = await this.assertTourExists(dto.tourId);
    await this.assertCompanyIsTalentAgency(dto.talentAgencyCompanyId);
    if (
      tourRow.talentAgencyCompanyId != null &&
      tourRow.talentAgencyCompanyId !== dto.talentAgencyCompanyId
    ) {
      throw new BadRequestException({
        message:
          'The selected tour already has a different talent agency on file. Use that agency or update the tour first.',
      });
    }
    this.assertValidProjectStage(dto.projectStage);
    const normalizedTourStartDate = this.normalizeDateOnly(dto.tourStartDate);
    const normalizedTourEndDate = this.normalizeDateOnly(dto.tourEndDate);
    this.assertValidTourDateRange(
      normalizedTourStartDate,
      normalizedTourEndDate,
    );
    const normalizedAgentContactId = this.parseAgentContactId(
      dto.agentContactId,
    );

    if (!dto.venues?.length) {
      throw new BadRequestException({
        message: 'Select at least one venue.',
      });
    }
    for (const v of dto.venues) {
      await this.assertVenueCompany(v.venueCompanyId);
      await this.assertValidVenueStatus(v.venueStatus);
      for (const o of v.performanceOptions ?? []) {
        if ((o.proposedDate ?? '').trim().length === 0) continue;
        await this.assertValidOptionStatus(o.optionStatus);
      }
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const project = manager.create(EngagementProject, {
          tourId: dto.tourId,
          projectStage: dto.projectStage,
          createdDate: new Date(),
          createdBy: this.resolveProjectCreatedBy(dto.createdBy),
        });
        const savedProject = await manager.save(EngagementProject, project);

        await this.insertProjectDmasInTransaction(
          manager,
          savedProject.engagementProjectId,
          dto.dmaIds,
        );

        for (const v of dto.venues ?? []) {
          const pv = manager.create(EngagementProjectVenue, {
            engagementProjectId: savedProject.engagementProjectId,
            venueCompanyId: v.venueCompanyId,
            venueStatus: v.venueStatus,
          });
          const savedPv = await manager.save(EngagementProjectVenue, pv);

          for (const opt of v.performanceOptions ?? []) {
            const o = manager.create(EngagementProjectPerformanceOption, {
              engagementProjectId: savedProject.engagementProjectId,
              engagementProjectVenueId: savedPv.engagementProjectVenueId,
              proposedDate: opt.proposedDate,
              proposedTime: this.normalizeTime(opt.proposedTime),
              optionStatus: opt.optionStatus,
            });
            await manager.save(o);
          }
        }

        await manager.update(
          Tour,
          { tourId: dto.tourId },
          {
            talentAgencyCompanyId: dto.talentAgencyCompanyId,
            tourStartDate: normalizedTourStartDate,
            tourEndDate: normalizedTourEndDate,
          },
        );
        await this.setProjectAgentContactId(
          manager,
          savedProject.engagementProjectId,
          normalizedAgentContactId,
        );

        return { engagementProjectId: savedProject.engagementProjectId };
      });
    } catch (err) {
      if (err instanceof QueryFailedError) {
        const d = String((err as QueryFailedError).driverError ?? err.message);
        this.logger.warn(`Create project failed: ${d}`);
        const isStageCheck =
          /CHECK constraint/i.test(d) && /ProjectStage/i.test(d);
        const isOptionStatusCheck =
          /CHECK constraint/i.test(d) && /OptionStatus/i.test(d);
        throw new BadRequestException({
          message: isStageCheck
            ? `This project stage isn’t accepted by the database. Use one of: ${PROJECT_STAGE_VALUES.join(', ')}.`
            : isOptionStatusCheck
              ? 'A proposed date option used a status the database does not allow. Refresh the page and try again, or ask an administrator which option statuses are valid.'
              : 'Could not create the project. Check that the tour exists and that the information you entered matches your organization’s rules.',
          detail: d,
        });
      }
      throw err;
    }
  }

  async update(id: number, dto: UpdateProjectDto): Promise<void> {
    const project = await this.assertProjectExists(id);
    if (dto.projectStage !== undefined) {
      this.assertValidProjectStage(dto.projectStage);
      project.projectStage = dto.projectStage;
    }
    // CreatedBy is immutable: store creator ID at insert time only.
    if (dto.tourId !== undefined) {
      await this.assertTourExists(dto.tourId);
      project.tourId = dto.tourId;
    }
    if (dto.talentAgencyCompanyId !== undefined) {
      await this.assertCompanyIsTalentAgency(dto.talentAgencyCompanyId);
    }
    const normalizedTourStartDate =
      dto.tourStartDate !== undefined
        ? this.normalizeDateOnly(dto.tourStartDate)
        : undefined;
    const normalizedTourEndDate =
      dto.tourEndDate !== undefined
        ? this.normalizeDateOnly(dto.tourEndDate)
        : undefined;
    const normalizedAgentContactId =
      dto.agentContactId !== undefined
        ? this.parseAgentContactId(dto.agentContactId)
        : undefined;
    try {
      await this.dataSource.transaction(async (manager) => {
        if (dto.dmaIds !== undefined) {
          await manager.delete(EngagementProjectDma, {
            engagementProjectId: id,
          });
          const normalized = this.normalizeDmaIds(dto.dmaIds);
          if (normalized.length > 0) {
            await this.assertDmasExist(manager, normalized);
            for (const dmaid of normalized) {
              await manager.save(
                EngagementProjectDma,
                manager.create(EngagementProjectDma, {
                  engagementProjectId: id,
                  dmaid,
                }),
              );
            }
          }
        }
        if (dto.talentAgencyCompanyId !== undefined) {
          const effectiveTourId = dto.tourId ?? project.tourId;
          await manager.update(
            Tour,
            { tourId: effectiveTourId },
            { talentAgencyCompanyId: dto.talentAgencyCompanyId },
          );
        }
        if (
          normalizedTourStartDate !== undefined ||
          normalizedTourEndDate !== undefined
        ) {
          const effectiveTourId = dto.tourId ?? project.tourId;
          const tourRow = await manager.findOne(Tour, {
            where: { tourId: effectiveTourId },
          });
          if (!tourRow) {
            throw new BadRequestException({
              message: 'Selected tour was not found.',
            });
          }
          const mergedStart =
            normalizedTourStartDate !== undefined
              ? normalizedTourStartDate
              : this.normalizeDateOnly(
                  (tourRow.tourStartDate as string | Date | null | undefined) ??
                    null,
                );
          const mergedEnd =
            normalizedTourEndDate !== undefined
              ? normalizedTourEndDate
              : this.normalizeDateOnly(
                  (tourRow.tourEndDate as string | Date | null | undefined) ??
                    null,
                );
          this.assertValidTourDateRange(mergedStart, mergedEnd);
          await manager.update(
            Tour,
            { tourId: effectiveTourId },
            { tourStartDate: mergedStart, tourEndDate: mergedEnd },
          );
        }
        if (normalizedAgentContactId !== undefined) {
          await this.setProjectAgentContactId(
            manager,
            id,
            normalizedAgentContactId,
          );
        }
        await manager.save(EngagementProject, project);
      });
    } catch (e: unknown) {
      if (e instanceof BadRequestException) throw e;
      if (e instanceof QueryFailedError) {
        const d = String((e as QueryFailedError).driverError ?? e.message);
        this.logger.warn(`Update project failed (id=${id}): ${d}`);
        const isStageCheck =
          /CHECK constraint/i.test(d) && /ProjectStage/i.test(d);
        throw new BadRequestException({
          message: isStageCheck
            ? `This project stage isn’t accepted by the database. Use one of: ${PROJECT_STAGE_VALUES.join(', ')}.`
            : 'Could not update the project. Check the information you entered, or ask your administrator if something is blocked by your system’s rules.',
          detail: d,
        });
      }
      throw e;
    }
  }

  async remove(id: number): Promise<void> {
    await this.assertProjectExists(id);
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(EngagementProjectPerformanceOption, {
          engagementProjectId: id,
        });
        await manager.delete(EngagementProjectVenue, {
          engagementProjectId: id,
        });
        await manager.delete(EngagementProjectDma, {
          engagementProjectId: id,
        });
        await manager.delete(EngagementProject, { engagementProjectId: id });
      });
    } catch (e: unknown) {
      if (e instanceof QueryFailedError) {
        const detail = String((e as QueryFailedError).driverError ?? e.message);
        this.logger.warn(`Project delete blocked (id=${id}): ${detail}`);
        throw new ConflictException({
          message:
            'This project can’t be removed because it’s still linked to other records. Remove or reassign those links first, or ask an administrator for help.',
          detail,
        });
      }
      throw e;
    }
  }

  async listPaginated(
    offset: number,
    limit: number,
    search?: string,
    projectStageFilter?: string,
    sortByRaw?: string,
    sortDirRaw?: string,
  ): Promise<{
    data: Array<{
      engagementProjectId: number;
      tourId: number;
      tourName: string | null;
      tourStartDate: string | null;
      tourEndDate: string | null;
      attractionName: string | null;
      talentAgencyCompanyId: number | null;
      talentAgencyCompanyName: string | null;
      projectStage: string;
      createdDate: Date;
      createdBy: string | null;
      name: null;
      bookerId: null;
      agentContactId: null;
      dmaIds: number[];
      targetOnSale: null;
      notes: null;
    }>;
    total: number;
  }> {
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
      const like = `%${q}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('CAST(ep.engagementProjectId AS VARCHAR(20)) LIKE :like', {
            like,
          })
            .orWhere("LOWER(ISNULL(t.tourName, '')) LIKE LOWER(:like)", {
              like,
            })
            .orWhere("LOWER(ISNULL(a.attractionName, '')) LIKE LOWER(:like)", {
              like,
            })
            .orWhere("LOWER(ISNULL(tmg.companyName, '')) LIKE LOWER(:like)", {
              like,
            })
            .orWhere("LOWER(ISNULL(ep.projectStage, '')) LIKE LOWER(:like)", {
              like,
            })
            .orWhere("LOWER(ISNULL(ep.createdBy, '')) LIKE LOWER(:like)", {
              like,
            })
            .orWhere('CONVERT(VARCHAR(30), ep.createdDate, 126) LIKE :like', {
              like,
            });
        }),
      );
    }

    const sortBy = (sortByRaw ?? '').trim().toLowerCase();
    const sortDir =
      (sortDirRaw ?? '').trim().toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const sortWhitelist: Record<string, string> = {
      attraction: 'a.attractionName',
      tour: 't.tourName',
      tourmgmt: 'tmg.companyName',
      createdby: 'ep.createdBy',
      created: 'ep.createdDate',
    };
    const sortExpr = sortWhitelist[sortBy];
    if (sortExpr) {
      qb.orderBy(sortExpr, sortDir).addOrderBy(
        'ep.engagementProjectId',
        'DESC',
      );
    } else {
      qb.orderBy('ep.engagementProjectId', 'DESC');
    }

    const total = await qb.getCount();
    const rows = await qb.skip(offset).take(limit).getMany();
    const createdByNameMap = await this.resolveCreatedByDisplayValuesForRows(
      rows.map((p) => ({ createdBy: p.createdBy })),
    );

    const projectIds = rows.map((p) => p.engagementProjectId);
    const dmaByProject = new Map<number, number[]>();
    if (projectIds.length > 0) {
      const links = await this.projectDmaRepo.find({
        where: { engagementProjectId: In(projectIds) },
        order: { engagementProjectId: 'ASC', dmaid: 'ASC' },
      });
      for (const link of links) {
        const arr = dmaByProject.get(link.engagementProjectId) ?? [];
        arr.push(link.dmaid);
        dmaByProject.set(link.engagementProjectId, arr);
      }
    }

    return {
      data: await Promise.all(
        rows.map(async (p) => ({
          engagementProjectId: p.engagementProjectId,
          tourId: p.tourId,
          attractionId: p.tour?.attractionId ?? null,
          tourName: p.tour?.tourName ?? null,
          tourStartDate: this.normalizeDateOnly(
            (p.tour?.tourStartDate as string | Date | null | undefined) ?? null,
          ),
          tourEndDate: this.normalizeDateOnly(
            (p.tour?.tourEndDate as string | Date | null | undefined) ?? null,
          ),
          attractionName: p.tour?.attraction?.attractionName ?? null,
          talentAgencyCompanyId: p.tour?.talentAgencyCompanyId ?? null,
          talentAgencyCompanyName:
            p.tour?.talentAgencyCompany?.companyName ?? null,
          projectStage: p.projectStage,
          createdDate: p.createdDate,
          createdBy: await this.resolveCreatedByDisplayValue(
            p.createdBy,
            createdByNameMap,
          ),
          name: null,
          bookerId: null,
          agentContactId: null,
          dmaIds: dmaByProject.get(p.engagementProjectId) ?? [],
          targetOnSale: null,
          notes: null,
        })),
      ),
      total,
    };
  }

  async getOne(id: number) {
    const project = await this.projectRepo.findOne({
      where: { engagementProjectId: id },
      relations: {
        tour: { attraction: true, talentAgencyCompany: true },
      },
    });
    if (!project) {
      throw new NotFoundException({
        message: `Project with ID ${id} not found.`,
      });
    }
    return this.buildProjectResponse(project);
  }

  // ─── Project Venue APIs ───────────────────────────────────────────────────

  async addVenue(
    projectId: number,
    dto: AddProjectVenueDto,
  ): Promise<{ engagementProjectVenueId: number }> {
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
      throw new ConflictException({
        message: 'This venue is already added to this project.',
      });
    }

    for (const opt of dto.performanceOptions ?? []) {
      await this.assertValidOptionStatus(opt.optionStatus);
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const pv = manager.create(EngagementProjectVenue, {
          engagementProjectId: projectId,
          venueCompanyId: dto.venueCompanyId,
          venueStatus: dto.venueStatus,
        });
        const saved = await manager.save(pv);

        for (const opt of dto.performanceOptions ?? []) {
          const o = manager.create(EngagementProjectPerformanceOption, {
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
    } catch (e: unknown) {
      if (
        e instanceof ConflictException ||
        e instanceof BadRequestException ||
        e instanceof NotFoundException
      ) {
        throw e;
      }
      if (e instanceof QueryFailedError) {
        return this.mapProjectVenueQueryFailed(
          'add',
          projectId,
          e,
          dto.venueStatus,
        );
      }
      throw e;
    }
  }

  async updateVenue(
    projectId: number,
    venueId: number,
    dto: UpdateProjectVenueDto,
  ): Promise<void> {
    const pv = await this.assertVenueInProject(projectId, venueId);
    if (dto.venueStatus !== undefined) {
      await this.assertValidVenueStatus(dto.venueStatus);
      pv.venueStatus = dto.venueStatus;
    }
    await this.projectVenueRepo.save(pv);
  }

  async removeVenue(projectId: number, venueId: number): Promise<void> {
    await this.assertVenueInProject(projectId, venueId);
    await this.optionRepo.delete({
      engagementProjectVenueId: venueId,
    });
    await this.projectVenueRepo.delete({
      engagementProjectId: projectId,
      engagementProjectVenueId: venueId,
    });
  }

  // ─── Performance Option APIs ──────────────────────────────────────────────

  async addPerformanceOption(
    projectId: number,
    dto: AddPerformanceOptionDto,
  ): Promise<{ performanceOptionId: number }> {
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

  async updatePerformanceOption(
    projectId: number,
    optionId: number,
    dto: UpdatePerformanceOptionDto,
  ): Promise<void> {
    const opt = await this.assertOptionInProject(projectId, optionId);
    if (dto.proposedDate !== undefined) opt.proposedDate = dto.proposedDate;
    if (dto.proposedTime !== undefined)
      opt.proposedTime = this.normalizeTime(dto.proposedTime);
    if (dto.optionStatus !== undefined) {
      await this.assertValidOptionStatus(dto.optionStatus);
      opt.optionStatus = dto.optionStatus;
    }
    await this.optionRepo.save(opt);
  }

  async removePerformanceOption(
    projectId: number,
    optionId: number,
  ): Promise<void> {
    await this.assertOptionInProject(projectId, optionId);
    await this.optionRepo.delete({
      engagementProjectId: projectId,
      performanceOptionId: optionId,
    });
  }
}
