import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Address } from '../entities/address.entity';
import { Attraction } from '../entities/attraction.entity';
import { Class } from '../entities/class.entity';
import { Company } from '../entities/company.entity';
import { Contact } from '../entities/contact.entity';
import { ContactAssignment } from '../entities/contact-assignment.entity';
import { Engagement } from '../entities/engagement.entity';
import { EngagementVenue } from '../entities/engagement-venue.entity';
import { Performance } from '../entities/performance.entity';
import { PerformanceTicketing } from '../entities/performance-ticketing.entity';
import { TicketingSales } from '../entities/ticketing-sales.entity';
import { Tour } from '../entities/tour.entity';
import { Venue } from '../entities/venue.entity';
import { AuditRequestContext } from '../audit/audit-request-context.service';
import { EngagementService } from '../engagements/engagement.service';
import { normalizeEngagementStatus } from '../engagements/engagement-status.util';

function ymdAddDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function numOrZero(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'object' && v !== null && 'toString' in v) {
    const s = (v as { toString: () => string }).toString();
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }
  return typeof v === 'number' && Number.isFinite(v)
    ? v
    : parseFloat(String(v)) || 0;
}

function pickRow<T>(
  row: Record<string, unknown> | null | undefined,
  name: string,
): T | undefined {
  if (row == null) return undefined;
  if (name in row) return row[name] as T;
  const l = name.toLowerCase();
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === l) return row[k] as T;
  }
  return undefined;
}

function parsePositiveIntCsv(raw: string | undefined): number[] {
  if (!raw) return [];
  const out = new Set<number>();
  for (const token of raw.split(',')) {
    const n = Number(token.trim());
    if (Number.isInteger(n) && n > 0) out.add(n);
  }
  return [...out];
}

export interface DailySalesRow {
  performanceId: number;
  engagementId: number;
  salesDate: string;
  performanceDate: string;
  performanceTime: string;
  performanceStatus: string;
  engagementStatus: string;
  ticketsSold: number | null;
  revenue: number | null;
  tourId: number | null;
  tourName: string | null;
  attractionId: number | null;
  attractionName: string | null;
  venueCompanyId: number | null;
  venueCompanyName: string | null;
  venueName: string | null;
  city: string | null;
  stateProvince: string | null;
  dmaMarketName: string | null;
}

/** Row returned by GET /daily-sales/by-performance — one row per Engagement */
export interface PerformanceSalesRow {
  performanceId: number;
  engagementId: number;
  performanceDate: string; // YYYY-MM-DD
  performanceTime: string; // HH:MM:SS
  performanceStatus: string;
  engagementStatus: string;
  attractionId: number | null;
  attractionName: string | null;
  genre: string | null;
  tourName: string | null;
  venueCompanyName: string | null;
  venueName: string | null;
  city: string | null;
  stateProvince: string | null;
  /** Today's ISO date string YYYY-MM-DD */
  todayDate: string;
  todayTicketsSold: number | null;
  todayRevenue: number | null;
  /** Yesterday's ISO date string YYYY-MM-DD */
  yesterdayDate: string;
  yesterdayTicketsSold: number | null;
  yesterdayRevenue: number | null;
  soldYesterday: number;
  totalSold: number;
  totalRevenue: number;
  daysOnSale: number;
  contactName: string | null;
  /** Engagement baseline (same for every row in this engagement); used for UI hints. */
  engagementSellableCapacity: number | null;
  engagementGrossPotential: number | null;
  entertainmentComplexNames: string | null;
}

export interface PerformanceCompanyFilterOption {
  companyId: number;
  companyName: string;
  companyTypeNames: string[];
  physicalCity: string | null;
  physicalStateProvince: string | null;
  dmaMarketName: string | null;
}

/** Paged by-performance list + global totals (same filter as the table). */
export interface PerformanceSalesPageResult {
  items: PerformanceSalesRow[];
  total: number;
  page: number;
  pageSize: number;
  todayDate: string;
  yesterdayDate: string;
  summary: {
    todayTickets: number;
    todayRevenue: number;
    yesterdayTickets: number;
    yesterdayRevenue: number;
    totalTickets: number;
    totalRevenue: number;
  };
  /** Distinct attractions in the current report (same filters as the table); used for sales summary links. */
  attractions: Array<{ attractionId: number; attractionName: string }>;
  filterOptions: {
    genres: string[];
    tours: string[];
    companies: PerformanceCompanyFilterOption[];
    venues: string[];
    contacts: string[];
  };
}

/** GET /daily-sales/engagement-dashboard — KPIs + daily series for one engagement */
export interface EngagementSalesDashboardDto {
  engagementId: number;
  asOfDate: string;
  header: {
    attractionName: string | null;
    tourName: string;
    entertainmentComplexNames: string | null;
    venueLabel: string;
    city: string | null;
    stateProvince: string | null;
    showDate: string | null;
    showTime: string | null;
  };
  sellableCapacity: number | null;
  grossPotential: number | null;
  marketingWindow: {
    preSaleDate: string | null;
    onSaleDate: string | null;
  };
  kpis: {
    totalRevenue: number;
    ticketsDistributed: number;
    pctSold: number | null;
    revenueLast7Days: number;
    ticketsLast7Days: number;
    daysUntilOpening: number;
    pctRevenueVsPotential: number | null;
  };
  series: Array<{
    date: string;
    /** Cumulative tickets sold through this calendar day. */
    totalTickets: number;
    /** Cumulative revenue through this calendar day. */
    totalRevenue: number;
    /** New tickets sold on this calendar day only (per-day delta). */
    dailyTickets: number;
    /** New revenue on this calendar day only (per-day delta). */
    dailyRevenue: number;
  }>;
  summary: Array<{
    date: string;
    totalTicketsSold: number;
    totalValueSold: number;
    /** New tickets sold on this calendar day only. */
    dailyTicketsSold: number;
    /** New revenue on this calendar day only. */
    dailyValueSold: number;
    seatsSoldPct: number | null;
    seatsRemaining: number | null;
    revenueRemaining: number | null;
  }>;
  /** Echo of the optional performance filter (null when the whole engagement is rolled up). */
  performanceId: number | null;
}

/** One engagement’s seat / revenue caps — used on attraction roll-up to explain summed totals */
export interface AttractionEngagementBaselineRow {
  engagementId: number;
  tourName: string;
  sellableCapacity: number | null;
  grossPotential: number | null;
}

/** GET /daily-sales/attraction-sales-summary — roll-up across all engagements for tours on this attraction */
export type AttractionSalesDashboardDto = Omit<
  EngagementSalesDashboardDto,
  'engagementId'
> & {
  attractionId: number;
  engagementCount: number;
  /** Each engagement’s own limits; sellableCapacity / grossPotential on this DTO are the sum of these rows */
  engagementBaselines: AttractionEngagementBaselineRow[];
};

function toYmdString(v: unknown): string {
  if (v == null || v === '') return '';
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return '';
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

function timeToHhmmss(v: unknown): string | null {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const h = String(Math.min(23, Math.max(0, parseInt(m[1], 10)))).padStart(
      2,
      '0',
    );
    const min = m[2].padStart(2, '0');
    const sec = (m[3] ?? '00').padStart(2, '0');
    return `${h}:${min}:${sec}`;
  }
  return null;
}

function venueLabelFromEngagement(e: {
  venueName: string | null;
  venueCompanyName: string | null;
}): string {
  const vn = e.venueName?.trim();
  const cn = e.venueCompanyName?.trim();
  if (vn) return vn;
  if (cn) return cn;
  return '—';
}

function totalsForReportingDay(
  perfIds: number[],
  byPerf: Map<
    number,
    { salesDate: string; tickets: number; revenue: number }[]
  >,
  day: string,
): { tickets: number; revenue: number } {
  let tickets = 0;
  let revenue = 0;
  for (const pid of perfIds) {
    const rows = [...(byPerf.get(pid) ?? [])].sort((a, b) =>
      a.salesDate.localeCompare(b.salesDate),
    );
    let latest: { salesDate: string; tickets: number; revenue: number } | null =
      null;
    for (const row of rows) {
      if (row.salesDate > day) break;
      latest = row;
    }
    if (latest) {
      tickets += latest.tickets;
      revenue += latest.revenue;
    }
  }
  return { tickets, revenue };
}

/** % of baseline (capacity or gross potential); can exceed 100 when totals are over the goal. */
function pctVsCap(total: number, cap: number): number {
  if (!(cap > 0) || !Number.isFinite(total)) return 0;
  return (total / cap) * 100;
}

function seatsRemainingDisplay(cap: number, totalTickets: number): number {
  return Math.max(0, cap - totalTickets);
}

function revenueRemainingDisplay(
  potential: number,
  totalRevenue: number,
): number {
  return Math.max(0, potential - totalRevenue);
}

/**
 * One point per calendar day from earliest sale to `asOf`.
 * - `totalTickets` / `totalRevenue` = cumulative through this day across the requested performances.
 * - `dailyTickets` / `dailyRevenue` = positive change from the previous calendar day.
 * Each stored dbo.TicketingSales row is the cumulative snapshot as of that sales date.
 */
function buildDailySeries(
  asOf: string,
  perfIds: number[],
  byPerf: Map<
    number,
    { salesDate: string; tickets: number; revenue: number }[]
  >,
): Array<{
  date: string;
  totalTickets: number;
  totalRevenue: number;
  dailyTickets: number;
  dailyRevenue: number;
}> {
  let minD: string | null = null;
  const cursors = new Map<
    number,
    {
      rows: { salesDate: string; tickets: number; revenue: number }[];
      index: number;
      tickets: number;
      revenue: number;
    }
  >();
  for (const pid of perfIds) {
    const rows = [...(byPerf.get(pid) ?? [])].sort((a, b) =>
      a.salesDate.localeCompare(b.salesDate),
    );
    if (!rows?.length) continue;
    for (const r of rows) {
      if (!minD || r.salesDate < minD) minD = r.salesDate;
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
  const out: Array<{
    date: string;
    totalTickets: number;
    totalRevenue: number;
    dailyTickets: number;
    dailyRevenue: number;
  }> = [];
  let prevTickets = 0;
  let prevRevenue = 0;
  for (let d = minD; d <= asOf; d = ymdAddDays(d, 1)) {
    let totalTickets = 0;
    let totalRevenue = 0;
    for (const cursor of cursors.values()) {
      while (
        cursor.index < cursor.rows.length &&
        cursor.rows[cursor.index].salesDate <= d
      ) {
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

@Injectable()
export class DailySalesService {
  private readonly logger = new Logger(DailySalesService.name);
  private lastConvertedProjectPerformanceRepairAt = 0;

  constructor(
    @InjectRepository(TicketingSales)
    private readonly salesRepo: Repository<TicketingSales>,
    @InjectRepository(Performance)
    private readonly performanceRepo: Repository<Performance>,
    @InjectRepository(PerformanceTicketing)
    private readonly performanceTicketingRepo: Repository<PerformanceTicketing>,
    @InjectRepository(Engagement)
    private readonly engagementRepo: Repository<Engagement>,
    @InjectRepository(Attraction)
    private readonly attractionRepo: Repository<Attraction>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    private readonly engagementService: EngagementService,
    private readonly auditContext: AuditRequestContext,
  ) {}

  /**
   * Older project conversions can leave Engagement rows without dbo.Performance rows.
   * Daily Sales and Sales Summary are performance-date driven, so those engagements
   * are invisible until their saved project show dates are copied into Performance.
   */
  private async ensureConvertedProjectPerformancesFromOptions(): Promise<void> {
    const now = Date.now();
    if (now - this.lastConvertedProjectPerformanceRepairAt < 30_000) return;
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
              WHEN po.OptionStatus IN (N'Public', N'Private') THEN po.OptionStatus
              ELSE N'Public'
            END AS PerformanceStatus
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
          PerformanceStatus,
          PerformanceDate,
          PerformanceTime,
          created_by,
          created_at
        )
        SELECT
          c.EngagementID,
          c.PerformanceStatus,
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
        this.logger.log(
          `Backfilled ${inserted} missing performance row(s) for converted project engagement(s).`,
        );
      }
    } catch (error) {
      this.lastConvertedProjectPerformanceRepairAt = 0;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Could not repair converted-project performance rows for Daily Sales: ${message}`,
      );
    }
  }

  private async getMarketingWindowForPerformances(perfIds: number[]): Promise<{
    preSaleDate: string | null;
    onSaleDate: string | null;
  }> {
    if (perfIds.length === 0) {
      return { preSaleDate: null, onSaleDate: null };
    }

    const rows: PerformanceTicketing[] = [];
    const chunkSize = 1000;
    for (let i = 0; i < perfIds.length; i += chunkSize) {
      const chunk = perfIds.slice(i, i + chunkSize);
      const chunkRows = await this.performanceTicketingRepo.find({
        where: { performanceId: In(chunk) },
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

    const firstByPerformance = new Map<number, PerformanceTicketing>();
    for (const row of rows) {
      if (!firstByPerformance.has(row.performanceId)) {
        firstByPerformance.set(row.performanceId, row);
      }
    }

    const preSaleDates: string[] = [];
    const onSaleDates: string[] = [];
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

  private searchTokens(value: string | null | undefined): string[] {
    return [
      ...new Set(
        String(value ?? '')
          .trim()
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .map((token) => token.trim())
          .filter(Boolean),
      ),
    ].slice(0, 8);
  }

  /**
   * Map the signed-in Entra user to dbo.Contact via dbo.ContactInfo.Email.
   * IAE staff on engagements are stored as ContactID in dbo.EngagementIAEContact.
   */
  private async resolveIaeContactIdForSignedInUser(): Promise<number | null> {
    const emails = this.auditContext
      .getUserEmailCandidates()
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (emails.length === 0) return null;
    const row = await this.contactRepo
      .createQueryBuilder('c')
      .innerJoin('c.contactInfo', 'ci')
      .innerJoin(ContactAssignment, 'ca', 'ca.contactId = c.contactId')
      .innerJoin(Company, 'internalCompany', 'internalCompany.companyId = ca.companyId')
      .where('LOWER(LTRIM(RTRIM(ci.email))) IN (:...emails)', { emails })
      .andWhere('internalCompany.isInternal = :isInternal', {
        isInternal: true,
      })
      .select('c.contactId', 'contactId')
      .getRawOne<{ contactId: number | string }>();
    if (row?.contactId == null) return null;
    const id = Number(row.contactId);
    return Number.isFinite(id) && id >= 1 ? id : null;
  }

  // ─── GET /daily-sales (legacy flat list) ──────────────────────────────────

  async findAll(engagementId?: number): Promise<DailySalesRow[]> {
    await this.ensureConvertedProjectPerformancesFromOptions();

    const qb = this.salesRepo
      .createQueryBuilder('ts')
      .innerJoin(Performance, 'p', 'p.performanceId = ts.performanceId')
      .innerJoin(Engagement, 'e', 'e.engagementId = p.engagementId')
      .leftJoin(Tour, 't', 't.tourId = e.tourId')
      .leftJoin(Attraction, 'a', 'a.attractionId = t.attractionId')
      .leftJoin(
        EngagementVenue,
        'ev',
        'ev.engagementId = e.engagementId AND ev.isPrimary = :prim',
        { prim: true },
      )
      .leftJoin(Venue, 'v', 'v.companyId = ev.venueCompanyId')
      .leftJoin(Company, 'vc', 'vc.companyId = ev.venueCompanyId')
      .leftJoin(Address, 'addr', 'addr.addressId = vc.physicalAddressId')
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

    const raw = await qb.getRawMany<Record<string, unknown>>();
    return raw.map((r) => ({
      performanceId: Number(r['performanceId']),
      engagementId: Number(r['engagementId']),
      salesDate: String(r['salesDate'] ?? ''),
      performanceDate: String(r['performanceDate'] ?? ''),
      performanceTime: String(r['performanceTime'] ?? ''),
      performanceStatus: String(r['performanceStatus'] ?? ''),
      engagementStatus: normalizeEngagementStatus(
        String(r['engagementStatus'] ?? ''),
      ),
      ticketsSold: r['ticketsSold'] != null ? Number(r['ticketsSold']) : null,
      revenue: r['revenue'] != null ? Number(r['revenue']) : null,
      tourId: r['tourId'] != null ? Number(r['tourId']) : null,
      tourName: r['tourName'] != null ? String(r['tourName']) : null,
      attractionId:
        r['attractionId'] != null ? Number(r['attractionId']) : null,
      attractionName:
        r['attractionName'] != null ? String(r['attractionName']) : null,
      venueCompanyId:
        r['venueCompanyId'] != null ? Number(r['venueCompanyId']) : null,
      venueCompanyName:
        r['venueCompanyName'] != null ? String(r['venueCompanyName']) : null,
      venueName: r['venueName'] != null ? String(r['venueName']) : null,
      city: r['city'] != null ? String(r['city']) : null,
      stateProvince:
        r['stateProvince'] != null ? String(r['stateProvince']) : null,
      dmaMarketName:
        r['dmaMarketName'] != null ? String(r['dmaMarketName']) : null,
    }));
  }

  // ─── GET /daily-sales/by-performance (paged) ────────────────────────────
  /**
   * One page of engagements for Daily Sales. Sales columns still respect asOf;
   * show timing filters still determine which performances make an engagement eligible (default: upcoming).
   */
  async findByPerformancePage(
    asOfDateParam: string | undefined,
    pageIn: number,
    pageSizeIn: number,
    searchRaw: string | undefined,
    attractionName: string | undefined,
    performanceDateRaw?: string,
    startDateRaw?: string,
    endDateRaw?: string,
    genreRaw?: string,
    tourRaw?: string,
    companyRaw?: string,
    venueRaw?: string,
    contactRaw?: string,
    sortByRaw?: string,
    sortDirRaw?: string,
    eventsScopeRaw?: string,
    iaeContactIdsRaw?: string,
  ): Promise<PerformanceSalesPageResult> {
    const asOf = await this.resolveAsOfDateString(asOfDateParam);
    const page = Math.max(1, Number.isFinite(pageIn) ? Math.floor(pageIn) : 1);
    const pageSize = Math.min(
      10_000,
      Math.max(1, Number.isFinite(pageSizeIn) ? Math.floor(pageSizeIn) : 25),
    );
    const search = (searchRaw ?? '').trim() || undefined;
    const performanceDate = this.normalizeOptionalYmd(performanceDateRaw);
    const startDate = this.normalizeOptionalYmd(startDateRaw);
    const endDate = this.normalizeOptionalYmd(endDateRaw);
    const companyToken = companyRaw?.trim() || undefined;
    const parsedCompanyId = Number(companyToken);
    const companyId =
      companyToken && Number.isInteger(parsedCompanyId) && parsedCompanyId > 0
        ? parsedCompanyId
        : undefined;

    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException({
        message: 'Performance range end cannot be before range start.',
      });
    }
    if (
      performanceDate &&
      startDate &&
      endDate &&
      (performanceDate < startDate || performanceDate > endDate)
    ) {
      throw new BadRequestException({
        message:
          'Single performance day must fall within the selected start and end range.',
      });
    }

    await this.ensureConvertedProjectPerformancesFromOptions();

    const yesterdayDate = ymdAddDays(asOf, -1);
    const eventsScope = (eventsScopeRaw ?? '').trim().toLowerCase();
    const mineOnly = eventsScope === 'mine' || eventsScope === 'my';
    const explicitIaeContactIds = parsePositiveIntCsv(iaeContactIdsRaw);
    let myIaeContactId: number | null = null;
    if (mineOnly) {
      const userEmail = this.auditContext.getUserEmail()?.trim().toLowerCase();
      if (!userEmail) {
        throw new BadRequestException({
          message:
            'Cannot filter to My Events without a signed-in user email. Sign in again or choose All Events.',
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
      // Keep old bookmarked report URLs working while the UI moves to IDs.
      companyName: companyId == null ? companyToken : undefined,
      venueName: venueRaw?.trim() || undefined,
      contactName: contactRaw?.trim() || undefined,
      myIaeContactId: myIaeContactId ?? undefined,
      iaeContactIds:
        explicitIaeContactIds.length > 0 ? explicitIaeContactIds : undefined,
    });

    const sortBy = (sortByRaw ?? '').trim().toLowerCase();
    const sortDir: 'ASC' | 'DESC' =
      (sortDirRaw ?? '').trim().toLowerCase() === 'desc' ? 'DESC' : 'ASC';
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
      .addSelect(
        'COALESCE(SUM(CAST(ts_today.performanceSalesQuantity AS BIGINT)), 0)',
        'sortTodayTickets',
      )
      .addSelect(
        'COALESCE(SUM(CAST(ts_today.performanceSalesRevenue AS decimal(18,2))), 0)',
        'sortTodayRevenue',
      )
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
    } else if (sortBy === 'tour') {
      engagementSortQb
        .orderBy('sortTourName', sortDir)
        .addOrderBy('sortPerformanceDate', 'ASC')
        .addOrderBy('sortPerformanceTime', 'ASC')
        .addOrderBy('sortPerformanceId', 'ASC');
    } else if (sortBy === 'venue') {
      engagementSortQb
        .orderBy('sortVenueCompanyName', sortDir)
        .addOrderBy('sortVenueName', sortDir)
        .addOrderBy('sortPerformanceDate', 'ASC')
        .addOrderBy('sortPerformanceTime', 'ASC')
        .addOrderBy('sortPerformanceId', 'ASC');
    } else if (sortBy === 'city') {
      engagementSortQb
        .orderBy('sortCity', sortDir)
        .addOrderBy('sortPerformanceDate', 'ASC')
        .addOrderBy('sortPerformanceTime', 'ASC')
        .addOrderBy('sortPerformanceId', 'ASC');
    } else if (sortBy === 'state') {
      engagementSortQb
        .orderBy('sortStateProvince', sortDir)
        .addOrderBy('sortPerformanceDate', 'ASC')
        .addOrderBy('sortPerformanceTime', 'ASC')
        .addOrderBy('sortPerformanceId', 'ASC');
    } else if (sortBy === 'status' || sortBy === 'engagement') {
      engagementSortQb
        .orderBy('sortEngagementStatus', sortDir)
        .addOrderBy('sortPerformanceDate', 'ASC')
        .addOrderBy('sortPerformanceTime', 'ASC')
        .addOrderBy('sortPerformanceId', 'ASC');
    } else if (sortBy === 'todaytickets') {
      engagementSortQb
        .orderBy('sortTodayTickets', sortDir)
        .addOrderBy('sortPerformanceDate', 'ASC')
        .addOrderBy('sortPerformanceTime', 'ASC')
        .addOrderBy('sortPerformanceId', 'ASC');
    } else if (sortBy === 'todayrevenue') {
      engagementSortQb
        .orderBy('sortTodayRevenue', sortDir)
        .addOrderBy('sortPerformanceDate', 'ASC')
        .addOrderBy('sortPerformanceTime', 'ASC')
        .addOrderBy('sortPerformanceId', 'ASC');
    } else {
      engagementSortQb
        .orderBy('sortPerformanceDate', sortDir)
        .addOrderBy('sortPerformanceTime', sortDir)
        .addOrderBy('sortPerformanceId', 'ASC');
    }

    // Run in parallel: count + rollups + page each scan the same join pattern.
    const [attractions, totalRaw, agg, pagedEngagementRows, filterOptions] =
      await Promise.all([
        this.getDistinctAttractionsFromBase(baseQb),
        baseQb
          .clone()
          .select('COUNT(DISTINCT e.engagementId)', 'total')
          .getRawOne<{ total: string | number }>(),
        this.sumSalesForByPerformanceQuery(baseQb.clone(), asOf),
        engagementSortQb
          .clone()
          .offset((page - 1) * pageSize)
          .limit(pageSize)
          .getRawMany<Record<string, unknown>>(),
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

    const rawItems: Record<string, unknown>[] = [];
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
        .getRawMany<Record<string, unknown>>();
      rawItems.push(...chunkItems);
    }

    const mappedItems: PerformanceSalesRow[] = rawItems.map((r) => {
      const todayTickets =
        r['todayTicketsSold'] != null ? Number(r['todayTicketsSold']) : null;
      const ydayTickets =
        r['yesterdayTicketsSold'] != null
          ? Number(r['yesterdayTicketsSold'])
          : null;
      const todayRev =
        r['todayRevenue'] != null ? Number(r['todayRevenue']) : null;
      const cumTicketsThruAsOf = numOrZero(r['cumTicketsThruAsOf']);
      const cumTicketsThruPrior = numOrZero(r['cumTicketsThruPrior']);
      const cumRevenueThruAsOf = numOrZero(r['cumRevenueThruAsOf']);
      const cumRevenueThruPrior = numOrZero(r['cumRevenueThruPrior']);
      const firstSalesDate =
        r['firstSalesDate'] != null ? String(r['firstSalesDate']) : null;

      return {
        performanceId: Number(r['performanceId']),
        engagementId: Number(r['engagementId']),
        performanceDate: String(r['performanceDate'] ?? ''),
        performanceTime: String(r['performanceTime'] ?? ''),
        performanceStatus: String(r['performanceStatus'] ?? ''),
        engagementStatus: normalizeEngagementStatus(
          String(r['engagementStatus'] ?? ''),
        ),
        attractionName:
          r['attractionName'] != null ? String(r['attractionName']) : null,
        attractionId:
          r['attractionId'] != null ? Number(r['attractionId']) : null,
        genre: r['genre'] != null ? String(r['genre']) : null,
        tourName: r['tourName'] != null ? String(r['tourName']) : null,
        venueCompanyName:
          r['venueCompanyName'] != null ? String(r['venueCompanyName']) : null,
        venueName: r['venueName'] != null ? String(r['venueName']) : null,
        city: r['city'] != null ? String(r['city']) : null,
        stateProvince:
          r['stateProvince'] != null ? String(r['stateProvince']) : null,
        entertainmentComplexNames:
          r['entertainmentComplexNames'] != null
            ? String(r['entertainmentComplexNames'])
            : null,
        todayDate: String(r['todayDate'] ?? ''),
        todayTicketsSold: todayTickets,
        todayRevenue: todayRev,
        yesterdayDate: String(r['yesterdayDate'] ?? yesterdayDate),
        yesterdayTicketsSold: ydayTickets,
        yesterdayRevenue:
          r['yesterdayRevenue'] != null ? Number(r['yesterdayRevenue']) : null,
        soldYesterday: Math.max(0, cumTicketsThruAsOf - cumTicketsThruPrior),
        totalSold: cumTicketsThruAsOf,
        totalRevenue: cumRevenueThruAsOf,
        daysOnSale:
          firstSalesDate && /^\d{4}-\d{2}-\d{2}$/.test(firstSalesDate)
            ? Math.max(
                1,
                Math.floor(
                  (new Date(asOf + 'T00:00:00').getTime() -
                    new Date(firstSalesDate + 'T00:00:00').getTime()) /
                    86_400_000,
                ) + 1,
              )
            : 0,
        contactName: r['contactName'] != null ? String(r['contactName']) : null,
        engagementSellableCapacity: (() => {
          const v = r['engagementSellableCapacity'];
          if (v == null) return null;
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        })(),
        engagementGrossPotential: (() => {
          const v = r['engagementGrossPotential'];
          if (v == null || v === '') return null;
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        })(),
      };
    });
    const engagementOrder = new Map<number, number>(
      pagedEngagementIds.map((engagementId, idx) => [engagementId, idx]),
    );
    const byEngagement = new Map<number, PerformanceSalesRow>();
    const timeOrMax = (s: string): string =>
      s && /^\d{2}:\d{2}:\d{2}$/.test(s) ? s : '99:99:99';
    for (const item of mappedItems) {
      const existing = byEngagement.get(item.engagementId);
      if (!existing) {
        byEngagement.set(item.engagementId, item);
        continue;
      }
      const shouldReplace =
        item.performanceDate < existing.performanceDate ||
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

  private createByPerformanceBaseQb(
    asOf: string,
    options: {
      search?: string;
      attractionName?: string;
      performanceDate?: string;
      startDate?: string;
      endDate?: string;
      genre?: string;
      tourName?: string;
      companyId?: number;
      companyName?: string;
      venueName?: string;
      contactName?: string;
      /** dbo.Contact.ContactID for the signed-in user (from ContactInfo.Email). */
      myIaeContactId?: number;
      /** Optional multi-select filter from UI (dbo.Contact.ContactID values). */
      iaeContactIds?: number[];
    },
  ): SelectQueryBuilder<Performance> {
    const qb = this.performanceRepo
      .createQueryBuilder('p')
      .innerJoin(Engagement, 'e', 'e.engagementId = p.engagementId')
      .leftJoin(Tour, 't', 't.tourId = e.tourId')
      .leftJoin(Attraction, 'a', 'a.attractionId = t.attractionId')
      .leftJoin(Class, 'cls', 'cls.classId = t.classId')
      .leftJoin(
        EngagementVenue,
        'ev',
        'ev.engagementId = e.engagementId AND ev.isPrimary = :prim',
        { prim: true },
      )
      .leftJoin(Venue, 'v', 'v.companyId = ev.venueCompanyId')
      .leftJoin(Company, 'vc', 'vc.companyId = ev.venueCompanyId')
      .leftJoin(Address, 'addr', 'addr.addressId = vc.physicalAddressId')
      .leftJoin(
        TicketingSales,
        'ts_today',
        'ts_today.performanceId = p.performanceId AND ' +
          'CONVERT(date, ts_today.salesDate) = CAST(:asOf AS date)',
      )
      .leftJoin(
        TicketingSales,
        'ts_yesterday',
        'ts_yesterday.performanceId = p.performanceId AND ' +
          'CONVERT(date, ts_yesterday.salesDate) = DATEADD(day, -1, CAST(:asOf AS date))',
      )
      .setParameter('asOf', asOf);

    const hasExplicitPerfDateFilter = Boolean(
      options.performanceDate || options.startDate || options.endDate,
    );
    if (!hasExplicitPerfDateFilter) {
      qb.andWhere('CONVERT(date, p.performanceDate) >= CAST(:asOf AS date)');
    }

    if (options.performanceDate) {
      qb.andWhere('CONVERT(date, p.performanceDate) = CAST(:perfDay AS date)', {
        perfDay: options.performanceDate,
      });
    }
    if (options.startDate) {
      qb.andWhere(
        'CONVERT(date, p.performanceDate) >= CAST(:startDate AS date)',
        {
          startDate: options.startDate,
        },
      );
    }
    if (options.endDate) {
      qb.andWhere(
        'CONVERT(date, p.performanceDate) <= CAST(:endDate AS date)',
        {
          endDate: options.endDate,
        },
      );
    }

    if (options.attractionName) {
      qb.andWhere(
        'LOWER(LTRIM(RTRIM(a.attractionName))) = LOWER(LTRIM(RTRIM(:attName)))',
        {
          attName: options.attractionName,
        },
      );
    }
    if (options.genre) {
      qb.andWhere(
        'LOWER(LTRIM(RTRIM(cls.className))) = LOWER(LTRIM(RTRIM(:genreName)))',
        { genreName: options.genre },
      );
    }
    if (options.tourName) {
      qb.andWhere(
        'LOWER(LTRIM(RTRIM(t.tourName))) = LOWER(LTRIM(RTRIM(:tourName)))',
        { tourName: options.tourName },
      );
    }
    if (options.companyId != null) {
      qb.andWhere('vc.companyId = :companyId', {
        companyId: options.companyId,
      });
    } else if (options.companyName) {
      qb.andWhere(
        'LOWER(LTRIM(RTRIM(vc.companyName))) = LOWER(LTRIM(RTRIM(:companyName)))',
        {
          companyName: options.companyName,
        },
      );
    }
    if (options.venueName) {
      qb.andWhere(
        'LOWER(LTRIM(RTRIM(v.venueName))) = LOWER(LTRIM(RTRIM(:venueName)))',
        { venueName: options.venueName },
      );
    }
    if (options.contactName) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM dbo.ContactAssignment ca
          INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
          INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
          WHERE ca.CompanyID = ev.venueCompanyId
            AND LOWER(LTRIM(RTRIM(CONCAT(ci.FirstName, N' ', ci.LastName)))) = LOWER(LTRIM(RTRIM(:contactName)))
        )`,
        { contactName: options.contactName },
      );
    }

    if (options.myIaeContactId != null) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM dbo.EngagementIAEContact eic
          WHERE eic.EngagementID = e.engagementId
            AND eic.ContactID = :myIaeContactId
        )`,
        { myIaeContactId: options.myIaeContactId },
      );
    }

    if (options.iaeContactIds?.length) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM dbo.EngagementIAEContact eic
          WHERE eic.EngagementID = e.engagementId
            AND eic.ContactID IN (:...iaeContactIds)
        )`,
        { iaeContactIds: options.iaeContactIds },
      );
    }

    this.searchTokens(options.search).forEach((token, index) => {
      // Unique bind names avoid the mssql/TypeORM issue with repeated parameters.
      const param = `dailySalesSearch${index}`;
      qb.andWhere(
        `CHARINDEX(:${param}, LOWER(CONCAT(
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
        ))) > 0`,
        { [param]: token },
      );
    });

    return qb;
  }

  private async getByPerformanceFilterOptions(
    asOf: string,
    options: { performanceDate?: string; startDate?: string; endDate?: string },
  ): Promise<{
    genres: string[];
    tours: string[];
    companies: PerformanceCompanyFilterOption[];
    venues: string[];
    contacts: string[];
  }> {
    const base = this.performanceRepo
      .createQueryBuilder('p')
      .innerJoin(Engagement, 'e', 'e.engagementId = p.engagementId')
      .leftJoin(Tour, 't', 't.tourId = e.tourId')
      .leftJoin(Class, 'cls', 'cls.classId = t.classId')
      .leftJoin(
        EngagementVenue,
        'ev',
        'ev.engagementId = e.engagementId AND ev.isPrimary = :prim',
        { prim: true },
      )
      .leftJoin(Venue, 'v', 'v.companyId = ev.venueCompanyId')
      .leftJoin(Company, 'vc', 'vc.companyId = ev.venueCompanyId')
      .setParameter('asOf', asOf);

    const hasExplicitPerfDateFilter = Boolean(
      options.performanceDate || options.startDate || options.endDate,
    );
    if (!hasExplicitPerfDateFilter) {
      base.andWhere('CONVERT(date, p.performanceDate) >= CAST(:asOf AS date)');
    }

    if (options.performanceDate) {
      base.andWhere(
        'CONVERT(date, p.performanceDate) = CAST(:perfDay AS date)',
        { perfDay: options.performanceDate },
      );
    }
    if (options.startDate) {
      base.andWhere(
        'CONVERT(date, p.performanceDate) >= CAST(:startDate AS date)',
        {
          startDate: options.startDate,
        },
      );
    }
    if (options.endDate) {
      base.andWhere(
        'CONVERT(date, p.performanceDate) <= CAST(:endDate AS date)',
        {
          endDate: options.endDate,
        },
      );
    }

    const [genres, tours, companies, venues, contacts] = await Promise.all([
      base
        .clone()
        .select('cls.className', 'value')
        .andWhere('cls.className IS NOT NULL')
        .distinct(true)
        .orderBy('cls.className', 'ASC')
        .getRawMany<{ value: string }>(),
      base
        .clone()
        .select('t.tourName', 'value')
        .andWhere('t.tourName IS NOT NULL')
        .distinct(true)
        .orderBy('t.tourName', 'ASC')
        .getRawMany<{ value: string }>(),
      base
        .clone()
        .leftJoin(
          Address,
          'companyAddr',
          'companyAddr.addressId = vc.physicalAddressId',
        )
        .leftJoin('vc.companyType', 'legacyCompanyType')
        .select('vc.companyId', 'companyId')
        .addSelect('vc.companyName', 'companyName')
        .addSelect('companyAddr.city', 'physicalCity')
        .addSelect('companyAddr.stateProvince', 'physicalStateProvince')
        .addSelect(
          `COALESCE(
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
          )`,
          'companyTypeNames',
        )
        .andWhere('vc.companyId IS NOT NULL')
        .andWhere('vc.companyName IS NOT NULL')
        .distinct(true)
        .orderBy('vc.companyName', 'ASC')
        .addOrderBy('companyAddr.city', 'ASC')
        .getRawMany<{
          companyId: number | string;
          companyName: string;
          companyTypeNames: string | null;
          physicalCity: string | null;
          physicalStateProvince: string | null;
        }>(),
      base
        .clone()
        .select('v.venueName', 'value')
        .andWhere('v.venueName IS NOT NULL')
        .distinct(true)
        .orderBy('v.venueName', 'ASC')
        .getRawMany<{ value: string }>(),
      base
        .clone()
        .select(
          `(
            SELECT TOP 1 CONCAT(ci.FirstName, N' ', ci.LastName)
            FROM dbo.ContactAssignment ca
            INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
            INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
            WHERE ca.CompanyID = ev.venueCompanyId
            ORDER BY ci.FirstName, ci.LastName
          )`,
          'value',
        )
        .distinct(true)
        .orderBy('value', 'ASC')
        .getRawMany<{ value: string | null }>(),
    ]);

    const mapValues = (rows: Array<{ value: string | null }>) =>
      rows
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
              if (!name) return false;
              const key = name.toLowerCase();
              return (
                list.findIndex(
                  (candidate) => candidate.toLowerCase() === key,
                ) === index
              );
            }),
          physicalCity:
            row.physicalCity == null ? null : String(row.physicalCity).trim(),
          physicalStateProvince:
            row.physicalStateProvince == null
              ? null
              : String(row.physicalStateProvince).trim(),
          dmaMarketName: null,
        }))
        .filter(
          (company) =>
            Number.isInteger(company.companyId) &&
            company.companyId > 0 &&
            company.companyName.length > 0,
        ),
      venues: mapValues(venues),
      contacts: mapValues(contacts),
    };
  }

  /**
   * Sum tickets/revenue for the reporting day and prior day only (not cumulative through those dates).
   * Uses a flat SUM on TicketingSales (SQL Server forbids SUM(subquery containing SUM)).
   */
  private async sumSalesForByPerformanceQuery(
    base: SelectQueryBuilder<Performance>,
    asOf: string,
  ): Promise<Record<string, unknown>> {
    const yest = ymdAddDays(asOf, -1);
    const subQuery = base
      .clone()
      .select('p.performanceId', 'performanceId')
      .orderBy();

    const one = await this.salesRepo
      .createQueryBuilder('ts')
      .select(
        'COALESCE(SUM(CASE WHEN CONVERT(date, ts.salesDate) = CAST(:asOf AS date) THEN CAST(ts.performanceSalesQuantity AS BIGINT) ELSE 0 END), 0)',
        'sumTixT',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN CONVERT(date, ts.salesDate) = CAST(:asOf AS date) THEN CAST(ts.performanceSalesRevenue AS decimal(18,2)) ELSE 0 END), 0)',
        'sumRevT',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN CONVERT(date, ts.salesDate) = CAST(:yestDay AS date) THEN CAST(ts.performanceSalesQuantity AS BIGINT) ELSE 0 END), 0)',
        'sumTixY',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN CONVERT(date, ts.salesDate) = CAST(:yestDay AS date) THEN CAST(ts.performanceSalesRevenue AS decimal(18,2)) ELSE 0 END), 0)',
        'sumRevY',
      )
      .addSelect(
        'COALESCE(SUM(CAST(ts.performanceSalesQuantity AS BIGINT)), 0)',
        'sumTotalTickets',
      )
      .addSelect(
        'COALESCE(SUM(CAST(ts.performanceSalesRevenue AS decimal(18,2))), 0)',
        'sumTotalRevenue',
      )
      .where(`ts.performanceId IN (${subQuery.getQuery()})`)
      .setParameters(subQuery.getParameters())
      .setParameter('yestDay', yest)
      .getRawOne<Record<string, unknown>>();
    return (one as Record<string, unknown>) ?? {};
  }

  private async getDistinctAttractionsFromBase(
    baseQb: SelectQueryBuilder<Performance>,
  ): Promise<Array<{ attractionId: number; attractionName: string }>> {
    const raw = await baseQb
      .clone()
      .select('a.attractionId', 'attractionId')
      .addSelect('a.attractionName', 'attractionName')
      .distinct(true)
      .andWhere('a.attractionId IS NOT NULL')
      .orderBy('a.attractionName', 'ASC')
      .getRawMany<Record<string, unknown>>();
    return raw
      .map((r) => ({
        attractionId: Number(r['attractionId']),
        attractionName: String(r['attractionName'] ?? '').trim(),
      }))
      .filter(
        (x) =>
          Number.isFinite(x.attractionId) &&
          x.attractionId > 0 &&
          x.attractionName.length > 0,
      );
  }

  async getByPerformanceSuggestions(
    asOfDateParam: string | undefined,
    query: string | undefined,
    performanceDateRaw?: string,
    startDateRaw?: string,
    endDateRaw?: string,
  ): Promise<Array<{ label: string; sublabel: string }>> {
    const q = (query ?? '').trim().toLowerCase();
    if (!q) return [];
    const asOf = await this.resolveAsOfDateString(asOfDateParam);
    const performanceDate = this.normalizeOptionalYmd(performanceDateRaw);
    const startDate = this.normalizeOptionalYmd(startDateRaw);
    const endDate = this.normalizeOptionalYmd(endDateRaw);
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException({
        message: 'Performance range end cannot be before range start.',
      });
    }
    const like = `%${q}%`;

    const baseQb = this.performanceRepo
      .createQueryBuilder('p')
      .innerJoin(Engagement, 'e', 'e.engagementId = p.engagementId')
      .leftJoin(Tour, 't', 't.tourId = e.tourId')
      .leftJoin(Attraction, 'a', 'a.attractionId = t.attractionId')
      .leftJoin(
        EngagementVenue,
        'ev',
        'ev.engagementId = e.engagementId AND ev.isPrimary = :prim',
        { prim: true },
      )
      .leftJoin(Venue, 'v', 'v.companyId = ev.venueCompanyId')
      .leftJoin(Company, 'vc', 'vc.companyId = ev.venueCompanyId')
      .leftJoin(Address, 'addr', 'addr.addressId = vc.physicalAddressId')
      .setParameter('asOf', asOf);

    const hasExplicitPerfDateFilter = Boolean(
      performanceDate || startDate || endDate,
    );
    if (!hasExplicitPerfDateFilter) {
      baseQb.andWhere(
        'CONVERT(date, p.performanceDate) >= CAST(:asOf AS date)',
      );
    }
    if (performanceDate) {
      baseQb.andWhere(
        'CONVERT(date, p.performanceDate) = CAST(:perfDay AS date)',
        {
          perfDay: performanceDate,
        },
      );
    }
    if (startDate) {
      baseQb.andWhere(
        'CONVERT(date, p.performanceDate) >= CAST(:startDate AS date)',
        {
          startDate,
        },
      );
    }
    if (endDate) {
      baseQb.andWhere(
        'CONVERT(date, p.performanceDate) <= CAST(:endDate AS date)',
        {
          endDate,
        },
      );
    }

    const limitQb = (qb: SelectQueryBuilder<Performance>) =>
      qb.addOrderBy('1').limit(6);

    const [attractions, tours, venues, companies, cities] = await Promise.all([
      limitQb(
        baseQb
          .clone()
          .select('a.attractionName', 'label')
          .addSelect('t.tourName', 'sublabel')
          .distinct(true)
          .andWhere('LOWER(a.attractionName) LIKE :q', { q: like }),
      ).getRawMany(),
      limitQb(
        baseQb
          .clone()
          .select('t.tourName', 'label')
          .addSelect('vc.companyName', 'sublabel')
          .distinct(true)
          .andWhere('LOWER(t.tourName) LIKE :q', { q: like }),
      ).getRawMany(),
      limitQb(
        baseQb
          .clone()
          .select('v.venueName', 'label')
          .addSelect('addr.city', 'sublabel')
          .distinct(true)
          .andWhere('LOWER(v.venueName) LIKE :q', { q: like }),
      ).getRawMany(),
      limitQb(
        baseQb
          .clone()
          .select('vc.companyName', 'label')
          .addSelect('addr.city', 'sublabel')
          .distinct(true)
          .andWhere('LOWER(vc.companyName) LIKE :q', { q: like }),
      ).getRawMany(),
      limitQb(
        baseQb
          .clone()
          .select('addr.city', 'label')
          .addSelect('addr.stateProvince', 'sublabel')
          .distinct(true)
          .andWhere('LOWER(addr.city) LIKE :q', { q: like }),
      ).getRawMany(),
    ]);

    const clean = (rows: Array<{ label?: unknown; sublabel?: unknown }>) =>
      rows
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
    const seen = new Set<string>();
    return all
      .filter((r) => {
        const key = r.label.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10);
  }

  /** Optional performance calendar day filter (YYYY-MM-DD); invalid values ignored. */
  private normalizeOptionalYmd(raw?: string): string | undefined {
    const s = (raw ?? '').trim();
    if (!s) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return undefined;
  }

  /** YYYY-MM-DD or fetch from server via GETDATE() for consistency with SQL. */
  private async resolveAsOfDateString(input?: string): Promise<string> {
    if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return input;
    }
    if (input) {
      throw new BadRequestException({
        message: 'asOfDate must be YYYY-MM-DD when provided.',
      });
    }
    const r = await this.performanceRepo.query(
      'SELECT CONVERT(varchar(10), CAST(GETDATE() AS date), 120) AS d',
    );
    return r[0]?.d ?? new Date().toISOString().slice(0, 10);
  }

  /**
   * Sales KPIs, cumulative daily series, and summary rows for performances
   * under one engagement. Each TicketingSales row = cumulative snapshot as of
   * that sales date. When `performanceId` is provided, the dashboard
   * is scoped to that single show only (used by Sales Summary row-click → detail);
   * otherwise it rolls up every performance under the engagement.
   */
  async getEngagementDashboard(
    engagementId: number,
    asOfDateParam?: string,
    performanceIdFilter?: number,
  ): Promise<EngagementSalesDashboardDto> {
    const asOf = await this.resolveAsOfDateString(asOfDateParam);
    await this.ensureConvertedProjectPerformancesFromOptions();

    let engagement: Awaited<ReturnType<EngagementService['getOne']>>;
    try {
      engagement = await this.engagementService.getOne(engagementId);
    } catch {
      throw new NotFoundException({
        message: `Engagement #${engagementId} not found.`,
      });
    }

    const allPerfs = await this.performanceRepo.find({
      where: { engagementId },
      order: { performanceDate: 'ASC', performanceTime: 'ASC' },
    });

    let perfs = allPerfs;
    if (performanceIdFilter != null) {
      const match = allPerfs.find(
        (p) => p.performanceId === performanceIdFilter,
      );
      if (!match) {
        throw new NotFoundException({
          message: `Performance #${performanceIdFilter} does not belong to engagement #${engagementId}.`,
        });
      }
      perfs = [match];
    }
    const perfIds = perfs.map((p) => p.performanceId);
    const performanceCount = perfs.length;
    const marketingWindow =
      await this.getMarketingWindowForPerformances(perfIds);

    const byPerf = new Map<
      number,
      { salesDate: string; tickets: number; revenue: number }[]
    >();
    for (const id of perfIds) byPerf.set(id, []);

    if (perfIds.length > 0) {
      const rows: TicketingSales[] = [];
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
        if (!ymd) continue;
        const arr = byPerf.get(row.performanceId)!;
        arr.push({
          salesDate: ymd,
          tickets: row.performanceSalesQuantity ?? 0,
          revenue:
            row.performanceSalesRevenue != null
              ? Number(row.performanceSalesRevenue)
              : 0,
        });
      }
    }

    const series = buildDailySeries(asOf, perfIds, byPerf);
    const endTotals = totalsForReportingDay(perfIds, byPerf, asOf);
    const baselineDay = ymdAddDays(asOf, -7);
    const baselineTotals = totalsForReportingDay(perfIds, byPerf, baselineDay);

    const ticketsLast7Days = Math.max(
      0,
      endTotals.tickets - baselineTotals.tickets,
    );
    const revenueLast7Days = Math.max(
      0,
      endTotals.revenue - baselineTotals.revenue,
    );

    /**
     * `engagement.sellableCapacity` / `grossPotential` are stored per-show on the engagement
     * (one venue, repeated for each performance). When we roll up the whole engagement
     * (no `performanceIdFilter`), scale the caps by the number of performances so the
     * "% sold" / "% revenue vs potential" KPIs make sense across all shows.
     */
    const perShowCapRaw = engagement.sellableCapacity;
    const perShowGrossRaw = (() => {
      const v = engagement.grossPotential as string | number | null | undefined;
      if (v == null) return null;
      if (typeof v === 'string' && v.trim() === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    })();
    const cap =
      perShowCapRaw != null && performanceCount > 0
        ? perShowCapRaw * performanceCount
        : perShowCapRaw;
    const grossPotentialNum =
      perShowGrossRaw != null && performanceCount > 0
        ? perShowGrossRaw * performanceCount
        : perShowGrossRaw;
    const pctSold =
      cap != null && cap > 0 ? pctVsCap(endTotals.tickets, cap) : null;
    const pctRevenueVsPotential =
      grossPotentialNum != null && grossPotentialNum > 0
        ? pctVsCap(endTotals.revenue, grossPotentialNum)
        : null;

    const openingYmd =
      (perfs[0] && toYmdString(perfs[0].performanceDate)) ||
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
      const seatsSoldPct =
        cap != null && cap > 0 ? pctVsCap(pt.totalTickets, cap) : null;
      const seatsRemaining =
        cap != null ? seatsRemainingDisplay(cap, pt.totalTickets) : null;
      const revenueRemaining =
        grossPotentialNum != null && grossPotentialNum > 0
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

  /**
   * Same KPI/series logic as {@link getEngagementDashboard}, but aggregates all
   * performances under every engagement whose tour belongs to this attraction.
   */
  async getAttractionSalesSummary(
    attractionId: number,
    asOfDateParam?: string,
  ): Promise<AttractionSalesDashboardDto> {
    const asOf = await this.resolveAsOfDateString(asOfDateParam);
    await this.ensureConvertedProjectPerformancesFromOptions();

    const att = await this.attractionRepo.findOne({ where: { attractionId } });
    if (!att) {
      throw new NotFoundException({
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
    const tourNames = new Set<string>();
    const engagementBaselines: AttractionEngagementBaselineRow[] = engagements
      .slice()
      .sort((a, b) => a.engagementId - b.engagementId)
      .map((e) => {
        const tn = e.tour?.tourName?.trim();
        if (tn) tourNames.add(tn);
        const gpRaw = e.grossPotential;
        const gpNum =
          gpRaw != null && gpRaw !== '' && Number.isFinite(Number(gpRaw))
            ? Number(Number(gpRaw).toFixed(2))
            : null;
        return {
          engagementId: e.engagementId,
          tourName: tn || `Engagement #${e.engagementId}`,
          sellableCapacity:
            e.sellableCapacity != null &&
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
      const gp =
        e.grossPotential != null && e.grossPotential !== ''
          ? Number(e.grossPotential)
          : null;
      if (gp != null && Number.isFinite(gp)) {
        grossSum += gp;
        grossAny = true;
      }
    }
    const sellableCapacity = sellableAny ? sellableSum : null;
    const grossPotential = grossAny ? grossSum : null;

    const perfs: Performance[] = [];
    if (engagementIds.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < engagementIds.length; i += chunkSize) {
        const chunk = engagementIds.slice(i, i + chunkSize);
        const chunkPerfs = await this.performanceRepo.find({
          where: { engagementId: In(chunk) },
          order: { performanceDate: 'ASC', performanceTime: 'ASC' },
        });
        perfs.push(...chunkPerfs);
      }
      perfs.sort((a, b) => {
        const dateA = a.performanceDate ? String(a.performanceDate) : '';
        const dateB = b.performanceDate ? String(b.performanceDate) : '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);

        const timeA = a.performanceTime ? String(a.performanceTime) : '';
        const timeB = b.performanceTime ? String(b.performanceTime) : '';
        if (timeA !== timeB) return timeA.localeCompare(timeB);

        return a.performanceId - b.performanceId;
      });
    }
    const perfIds = perfs.map((p) => p.performanceId);
    const marketingWindow =
      await this.getMarketingWindowForPerformances(perfIds);

    const byPerf = new Map<
      number,
      { salesDate: string; tickets: number; revenue: number }[]
    >();
    for (const id of perfIds) byPerf.set(id, []);

    if (perfIds.length > 0) {
      const rows: TicketingSales[] = [];
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
        if (!ymd) continue;
        const arr = byPerf.get(row.performanceId)!;
        arr.push({
          salesDate: ymd,
          tickets: row.performanceSalesQuantity ?? 0,
          revenue:
            row.performanceSalesRevenue != null
              ? Number(row.performanceSalesRevenue)
              : 0,
        });
      }
    }

    const series = buildDailySeries(asOf, perfIds, byPerf);
    const endTotals = totalsForReportingDay(perfIds, byPerf, asOf);
    const baselineDay = ymdAddDays(asOf, -7);
    const baselineTotals = totalsForReportingDay(perfIds, byPerf, baselineDay);

    const ticketsLast7Days = Math.max(
      0,
      endTotals.tickets - baselineTotals.tickets,
    );
    const revenueLast7Days = Math.max(
      0,
      endTotals.revenue - baselineTotals.revenue,
    );

    const cap = sellableCapacity;
    const potential = grossPotential;
    const pctSold =
      cap != null && cap > 0 ? pctVsCap(endTotals.tickets, cap) : null;
    const pctRevenueVsPotential =
      potential != null && potential > 0
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
      const seatsSoldPct =
        cap != null && cap > 0 ? pctVsCap(pt.totalTickets, cap) : null;
      const seatsRemaining =
        cap != null ? seatsRemainingDisplay(cap, pt.totalTickets) : null;
      const revenueRemaining =
        potential != null && potential > 0
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

    const sortedTours = [...tourNames].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
    const tourRollup =
      sortedTours.length === 0
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

  private normalizePatchSalesDateYmd(raw: string): string {
    const s = (raw ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      throw new BadRequestException(
        'Sales date must be a calendar day in YYYY-MM-DD format.',
      );
    }
    return s;
  }

  /**
   * Sales may be entered on or before this performance's show date (presale / on-sale),
   * but not after the performance calendar day.
   */
  private assertTicketingSalesDateOnOrBeforePerformance(
    performanceDateRaw: unknown,
    salesDateYmd: string,
  ): void {
    const cap = toYmdString(performanceDateRaw);
    if (!cap || !/^\d{4}-\d{2}-\d{2}$/.test(cap)) return;
    if (salesDateYmd > cap) {
      throw new BadRequestException({
        message: `Ticket sales cannot be saved for ${salesDateYmd}: sales can only be entered on or before this show's performance date (${cap}).`,
      });
    }
  }

  // ─── PATCH — upsert sales for a specific performance + date ──────────────
  /**
   * Creates or updates the single dbo.TicketingSales row for (PerformanceID, SalesDate).
   * Each row stores the cumulative ticket/revenue snapshot as of that sales date.
   */
  async updateSales(
    performanceId: number,
    salesDate: string,
    body: { ticketsSold?: number | null; revenue?: number | null },
  ): Promise<void> {
    if (body.ticketsSold !== undefined && body.ticketsSold !== null) {
      if (!Number.isInteger(body.ticketsSold) || body.ticketsSold < 0) {
        throw new BadRequestException(
          'Tickets sold must be a whole number that is zero or greater.',
        );
      }
    }
    if (body.revenue !== undefined && body.revenue !== null) {
      if (body.revenue < 0 || !Number.isFinite(body.revenue)) {
        throw new BadRequestException(
          'Revenue must be a valid number that is zero or greater.',
        );
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
      throw new NotFoundException(
        `Performance #${performanceId} was not found.`,
      );
    }

    this.assertTicketingSalesDateOnOrBeforePerformance(
      perf.performanceDate,
      ymd,
    );

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

    const mergedTickets =
      body.ticketsSold !== undefined
        ? (body.ticketsSold ?? 0)
        : (row.performanceSalesQuantity ?? 0);
    const mergedRevenue =
      body.revenue !== undefined
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
    const engagementSellableCapacity =
      Number.isFinite(rawSellableCapacity) && rawSellableCapacity > 0
        ? Math.floor(rawSellableCapacity)
        : 0;
    const engagementGrossPotential = (() => {
      const n = Number(engagement?.grossPotential ?? 0);
      return Number.isFinite(n) && n > 0 ? Number(n.toFixed(2)) : 0;
    })();

    const formatMoney = (value: number) =>
      value.toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

    const violations: string[] = [];
    if (mergedTickets > engagementSellableCapacity) {
      violations.push(
        engagementSellableCapacity > 0
          ? `Tickets sold exceed the engagement sellable capacity (${mergedTickets.toLocaleString()} of ${engagementSellableCapacity.toLocaleString()}).`
          : 'Set engagement sellable capacity before saving tickets sold.',
      );
    }
    if (mergedRevenue > engagementGrossPotential) {
      violations.push(
        engagementGrossPotential > 0
          ? `Revenue exceeds the engagement gross potential (${formatMoney(mergedRevenue)} of ${formatMoney(engagementGrossPotential)}).`
          : 'Set engagement gross potential before saving revenue.',
      );
    }

    if (violations.length > 0) {
      throw new BadRequestException({
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
}
