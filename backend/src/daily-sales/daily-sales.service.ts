import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Address } from '../entities/address.entity';
import { Attraction } from '../entities/attraction.entity';
import { Class } from '../entities/class.entity';
import { Company } from '../entities/company.entity';
import { Contact } from '../entities/contact.entity';
import { Engagement } from '../entities/engagement.entity';
import { EngagementVenue } from '../entities/engagement-venue.entity';
import { Performance } from '../entities/performance.entity';
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
  };
  /** Distinct attractions in the current report (same filters as the table); used for sales summary links. */
  attractions: Array<{ attractionId: number; attractionName: string }>;
  filterOptions: {
    genres: string[];
    tours: string[];
    companies: string[];
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
    venueLabel: string;
    city: string | null;
    stateProvince: string | null;
    showDate: string | null;
    showTime: string | null;
  };
  sellableCapacity: number | null;
  grossPotential: number | null;
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
    const rows = byPerf.get(pid) ?? [];
    for (const row of rows) {
      if (row.salesDate <= day) {
        tickets += row.tickets;
        revenue += row.revenue;
      }
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
 * - `dailyTickets` / `dailyRevenue` = new sales recorded ON this calendar day only.
 * Each stored dbo.TicketingSales row is the amount for that calendar day only (not a running snapshot).
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
  const dailyTickets = new Map<string, number>();
  const dailyRevenue = new Map<string, number>();
  for (const pid of perfIds) {
    const rows = byPerf.get(pid);
    if (!rows?.length) continue;
    for (const r of rows) {
      if (!minD || r.salesDate < minD) minD = r.salesDate;
      dailyTickets.set(
        r.salesDate,
        (dailyTickets.get(r.salesDate) ?? 0) + r.tickets,
      );
      dailyRevenue.set(
        r.salesDate,
        (dailyRevenue.get(r.salesDate) ?? 0) + r.revenue,
      );
    }
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
  let cumTickets = 0;
  let cumRevenue = 0;
  for (let d = minD; d <= asOf; d = ymdAddDays(d, 1)) {
    const dayT = dailyTickets.get(d) ?? 0;
    const dayR = dailyRevenue.get(d) ?? 0;
    cumTickets += dayT;
    cumRevenue += dayR;
    out.push({
      date: d,
      totalTickets: cumTickets,
      totalRevenue: cumRevenue,
      dailyTickets: dayT,
      dailyRevenue: dayR,
    });
  }
  return out;
}

@Injectable()
export class DailySalesService {
  constructor(
    @InjectRepository(TicketingSales)
    private readonly salesRepo: Repository<TicketingSales>,
    @InjectRepository(Performance)
    private readonly performanceRepo: Repository<Performance>,
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
   * Map the signed-in Entra user to dbo.Contact via dbo.ContactInfo.Email.
   * IAE staff on engagements are stored as ContactID in dbo.EngagementIAEContact.
   */
  private async resolveIaeContactIdForSignedInUser(): Promise<number | null> {
    const email = this.auditContext.getUserEmail()?.trim().toLowerCase();
    if (!email) return null;
    const row = await this.contactRepo
      .createQueryBuilder('c')
      .innerJoin('c.contactInfo', 'ci')
      .where('LOWER(LTRIM(RTRIM(ci.email))) = :email', { email })
      .select('c.contactId', 'contactId')
      .getRawOne<{ contactId: number | string }>();
    if (row?.contactId == null) return null;
    const id = Number(row.contactId);
    return Number.isFinite(id) && id >= 1 ? id : null;
  }

  // ─── GET /daily-sales (legacy flat list) ──────────────────────────────────

  async findAll(engagementId?: number): Promise<DailySalesRow[]> {
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
      companyName: companyRaw?.trim() || undefined,
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
          .skip((page - 1) * pageSize)
          .take(pageSize)
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
        },
        attractions,
        filterOptions,
      };
    }

    const rawItems = await baseQb
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
        engagementIds: pagedEngagementIds,
      })
      .setParameter('asOf', asOf)
      .getRawMany<Record<string, unknown>>();

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
      qb.andWhere('a.attractionName = :attName', {
        attName: options.attractionName,
      });
    }
    if (options.genre) {
      qb.andWhere('cls.className = :genreName', { genreName: options.genre });
    }
    if (options.tourName) {
      qb.andWhere('t.tourName = :tourName', { tourName: options.tourName });
    }
    if (options.companyName) {
      qb.andWhere('vc.companyName = :companyName', {
        companyName: options.companyName,
      });
    }
    if (options.venueName) {
      qb.andWhere('v.venueName = :venueName', { venueName: options.venueName });
    }
    if (options.contactName) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM dbo.ContactAssignment ca
          INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
          INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
          WHERE ca.CompanyID = ev.venueCompanyId
            AND LOWER(CONCAT(ci.FirstName, N' ', ci.LastName)) = LOWER(:contactName)
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

    if (options.search) {
      // Single :searchT bind — repeating the same named param breaks some mssql/TypeORM drivers.
      const s = options.search.toLowerCase();
      qb.andWhere(
        `CHARINDEX(:searchT, LOWER(CONCAT(
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
        { searchT: s },
      );
    }

    return qb;
  }

  private async getByPerformanceFilterOptions(
    asOf: string,
    options: { performanceDate?: string; startDate?: string; endDate?: string },
  ): Promise<{
    genres: string[];
    tours: string[];
    companies: string[];
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
        .select('vc.companyName', 'value')
        .andWhere('vc.companyName IS NOT NULL')
        .distinct(true)
        .orderBy('vc.companyName', 'ASC')
        .getRawMany<{ value: string }>(),
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
      companies: mapValues(companies),
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
    const idRows = await base
      .clone()
      .select('p.performanceId', 'performanceId')
      .distinct(true)
      .getRawMany<{ performanceId: string | number }>();
    const ids = idRows
      .map((r) => Number(r.performanceId))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) {
      return {
        sumTixT: 0,
        sumRevT: 0,
        sumTixY: 0,
        sumRevY: 0,
      };
    }

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
      .where('ts.performanceId IN (:...ids)', { ids })
      .setParameter('asOf', asOf)
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
   * under one engagement. Each TicketingSales row = that calendar day's amount;
   * totals sum through each day. When `performanceId` is provided, the dashboard
   * is scoped to that single show only (used by Sales Summary row-click → detail);
   * otherwise it rolls up every performance under the engagement.
   */
  async getEngagementDashboard(
    engagementId: number,
    asOfDateParam?: string,
    performanceIdFilter?: number,
  ): Promise<EngagementSalesDashboardDto> {
    const asOf = await this.resolveAsOfDateString(asOfDateParam);
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

    const byPerf = new Map<
      number,
      { salesDate: string; tickets: number; revenue: number }[]
    >();
    for (const id of perfIds) byPerf.set(id, []);

    if (perfIds.length > 0) {
      const rows = await this.salesRepo
        .createQueryBuilder('ts')
        .where('ts.performanceId IN (:...ids)', { ids: perfIds })
        .andWhere('CONVERT(date, ts.salesDate) <= CAST(:asOf AS date)', {
          asOf,
        })
        .orderBy('ts.performanceId', 'ASC')
        .addOrderBy('ts.salesDate', 'ASC')
        .getMany();

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
        venueLabel: venueLabelFromEngagement(engagement),
        city: engagement.city,
        stateProvince: engagement.stateProvince,
        showDate,
        showTime,
      },
      sellableCapacity: cap,
      grossPotential: grossPotentialNum,
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

    let perfs: Performance[] = [];
    if (engagementIds.length > 0) {
      perfs = await this.performanceRepo.find({
        where: { engagementId: In(engagementIds) },
        order: { performanceDate: 'ASC', performanceTime: 'ASC' },
      });
    }
    const perfIds = perfs.map((p) => p.performanceId);

    const byPerf = new Map<
      number,
      { salesDate: string; tickets: number; revenue: number }[]
    >();
    for (const id of perfIds) byPerf.set(id, []);

    if (perfIds.length > 0) {
      const rows = await this.salesRepo
        .createQueryBuilder('ts')
        .where('ts.performanceId IN (:...ids)', { ids: perfIds })
        .andWhere('CONVERT(date, ts.salesDate) <= CAST(:asOf AS date)', {
          asOf,
        })
        .orderBy('ts.performanceId', 'ASC')
        .addOrderBy('ts.salesDate', 'ASC')
        .getMany();

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
        venueLabel: 'Roll-up (all engagements)',
        city: null,
        stateProvince: null,
        showDate,
        showTime,
      },
      sellableCapacity: cap,
      grossPotential: potential,
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
   * Each row holds tickets/revenue for that calendar SalesDate only (daily amounts). Dashboards
   * sum rows through a date to get cumulative totals.
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
