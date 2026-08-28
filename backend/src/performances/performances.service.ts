import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Address } from '../entities/address.entity';
import { Attraction } from '../entities/attraction.entity';
import { Company } from '../entities/company.entity';
import { Engagement } from '../entities/engagement.entity';
import { EngagementProduction } from '../entities/engagement-production.entity';
import { EngagementVenue } from '../entities/engagement-venue.entity';
import { Performance } from '../entities/performance.entity';
import { PerformanceTicketing } from '../entities/performance-ticketing.entity';
import { Tour } from '../entities/tour.entity';
import { Venue } from '../entities/venue.entity';
import { normalizeEngagementStatus } from '../engagements/engagement-status.util';

export interface PerformanceCalendarRow {
  performanceId: number;
  engagementId: number;
  performanceStatus: string;
  performanceDate: string; // YYYY-MM-DD — Engagement/Show date
  performanceTime: string; // HH:MM:SS
  engagementStatus: string;
  tourId: number | null;
  tourName: string | null;
  attractionId: number | null;
  attractionName: string | null;
  venueCompanyId: number | null;
  venueCompanyName: string | null;
  venueName: string | null;
  city: string | null;
  stateProvince: string | null;
  /** dbo.EngagementProduction.AnnouncementDate — one per engagement (may repeat across performances). */
  announcementDate: string | null;
  /** dbo.PerformanceTicketing.PreSaleDate */
  presaleStartDate: string | null;
  /** dbo.PerformanceTicketing.PreSaleEndDate — optional column; null when absent from the DB. */
  presaleEndDate: string | null;
  /** dbo.PerformanceTicketing.OnSaleDate */
  onSaleDate: string | null;
}

const CALENDAR_SELECT = [
  'p.performanceId         AS performanceId',
  'p.engagementId          AS engagementId',
  'p.performanceStatus     AS performanceStatus',
  'CONVERT(varchar(10), p.performanceDate, 120) AS performanceDate',
  'CONVERT(varchar(8),  p.performanceTime, 108) AS performanceTime',
  'e.engagementStatus      AS engagementStatus',
  'e.tourId                AS tourId',
  't.tourName              AS tourName',
  't.attractionId          AS attractionId',
  'a.attractionName        AS attractionName',
  'ev.venueCompanyId       AS venueCompanyId',
  'vc.companyName          AS venueCompanyName',
  'v.venueName             AS venueName',
  'addr.city               AS city',
  'addr.stateProvince      AS stateProvince',
  'CONVERT(varchar(10), ep.announcementDate, 120) AS announcementDate',
  'CONVERT(varchar(10), pt.preSaleDate, 120)      AS presaleStartDate',
  'CONVERT(varchar(10), pt.onSaleDate, 120)       AS onSaleDate',
] as const;

@Injectable()
export class PerformancesService {
  /** Optional PreSaleEndDate column on dbo.PerformanceTicketing (may be absent in some environments). */
  private preSaleEndDateColPresent: boolean | null = null;

  constructor(
    @InjectRepository(Performance)
    private readonly performanceRepo: Repository<Performance>,
    private readonly dataSource: DataSource,
  ) {}

  private async performanceTicketingHasPreSaleEndDateColumn(): Promise<boolean> {
    if (this.preSaleEndDateColPresent !== null) return this.preSaleEndDateColPresent;
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'PerformanceTicketing' AND c.name=N'PreSaleEndDate')
        THEN 1 ELSE 0 END AS ok
      `);
      const row0 = (r as Record<string, unknown>[])?.[0];
      const rawOk = row0?.['ok'];
      const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
      this.preSaleEndDateColPresent = ok;
      return ok;
    } catch {
      this.preSaleEndDateColPresent = false;
      return false;
    }
  }

  /**
   * @param broadenDateMatch When true (grid view), a row matches the requested year/month if ANY
   * of its milestone dates (show, announcement, presale start/end, on-sale) falls in that month —
   * not just the performance/show date. Used so e.g. an August show's June announcement date
   * still surfaces when browsing the June calendar.
   */
  private async buildCalendarQuery(
    year?: number,
    month?: number,
    broadenDateMatch = false,
  ): Promise<SelectQueryBuilder<Performance>> {
    const hasPresaleEnd = await this.performanceTicketingHasPreSaleEndDateColumn();
    const select = [
      ...CALENDAR_SELECT,
      hasPresaleEnd
        ? 'CONVERT(varchar(10), pt.[PreSaleEndDate], 120) AS presaleEndDate'
        : 'CAST(NULL AS varchar(10)) AS presaleEndDate',
    ];
    const qb = this.performanceRepo
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
      .leftJoin(EngagementProduction, 'ep', 'ep.engagementId = e.engagementId')
      .leftJoin(PerformanceTicketing, 'pt', 'pt.performanceId = p.performanceId')
      .select(select);

    if (year !== undefined && !isNaN(year)) {
      if (broadenDateMatch && month !== undefined && !isNaN(month)) {
        const dateMatches = [
          '(YEAR(p.performanceDate) = :year AND MONTH(p.performanceDate) = :month)',
          '(YEAR(ep.announcementDate) = :year AND MONTH(ep.announcementDate) = :month)',
          '(YEAR(pt.preSaleDate) = :year AND MONTH(pt.preSaleDate) = :month)',
          '(YEAR(pt.onSaleDate) = :year AND MONTH(pt.onSaleDate) = :month)',
        ];
        if (hasPresaleEnd) {
          dateMatches.push(
            '(YEAR(pt.[PreSaleEndDate]) = :year AND MONTH(pt.[PreSaleEndDate]) = :month)',
          );
        }
        qb.andWhere(`(${dateMatches.join(' OR ')})`, { year, month });
      } else {
        qb.andWhere('YEAR(p.performanceDate) = :year', { year });
        if (month !== undefined && !isNaN(month)) {
          qb.andWhere('MONTH(p.performanceDate) = :month', { month });
        }
      }
    }
    return qb;
  }

  /**
   * Use SELECT list aliases (not raw subqueries with stray dots) so ORDER BY survives
   * TypeORM’s DISTINCT pagination wrapper for skip/take + joins.
   */
  private applyCalendarListSort(
    qb: SelectQueryBuilder<Performance>,
    sortByRaw?: string,
    sortDirRaw?: string,
  ): void {
    const sortBy = (sortByRaw ?? '').trim().toLowerCase();
    const sortDir =
      (sortDirRaw ?? '').trim().toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const tie = () =>
      qb
        .addOrderBy('performanceDate', 'ASC')
        .addOrderBy('performanceTime', 'ASC')
        .addOrderBy('performanceId', 'ASC');
    if (sortBy === 'attraction') {
      qb.orderBy('attractionName', sortDir);
      tie();
    } else if (sortBy === 'tour') {
      qb.orderBy('tourName', sortDir);
      tie();
    } else if (sortBy === 'venue') {
      qb.orderBy('venueCompanyName', sortDir).addOrderBy('venueName', sortDir);
      tie();
    } else if (sortBy === 'city') {
      qb.orderBy('city', sortDir);
      tie();
    } else if (sortBy === 'state') {
      qb.orderBy('stateProvince', sortDir);
      tie();
    } else if (sortBy === 'status') {
      qb.orderBy('engagementStatus', sortDir);
      tie();
    } else {
      qb.orderBy('performanceDate', sortDir)
        .addOrderBy('performanceTime', sortDir)
        .addOrderBy('performanceId', 'ASC');
    }
  }

  /** Optional visibility filter for calendar list (subset of Unknown / Private / Public). */
  private applyVisibilityFilter(
    qb: SelectQueryBuilder<Performance>,
    visibility: string[],
  ): void {
    const allowed = new Set(['Unknown', 'Private', 'Public']);
    const wanted = [...new Set(visibility.map((s) => s.trim()))].filter((s) =>
      allowed.has(s),
    );
    if (wanted.length === 0 || wanted.length >= 3) return;

    const orParts: string[] = [];
    if (wanted.includes('Private')) {
      orParts.push(`e.engagementStatus = 'Private'`);
    }
    if (wanted.includes('Public')) {
      orParts.push(`e.engagementStatus = 'Public'`);
    }
    if (wanted.includes('Unknown')) {
      orParts.push(
        `(e.engagementStatus IS NULL OR e.engagementStatus NOT IN ('Private', 'Public'))`,
      );
    }
    if (orParts.length > 0) {
      qb.andWhere(`(${orParts.join(' OR ')})`);
    }
  }

  private mapCalendarRaw(r: Record<string, unknown>): PerformanceCalendarRow {
    return {
      performanceId: Number(r['performanceId']),
      engagementId: Number(r['engagementId']),
      performanceStatus: String(r['performanceStatus'] ?? ''),
      performanceDate: String(r['performanceDate'] ?? ''),
      performanceTime: String(r['performanceTime'] ?? ''),
      engagementStatus: normalizeEngagementStatus(
        String(r['engagementStatus'] ?? ''),
      ),
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
      announcementDate:
        r['announcementDate'] != null && r['announcementDate'] !== ''
          ? String(r['announcementDate']).slice(0, 10)
          : null,
      presaleStartDate:
        r['presaleStartDate'] != null && r['presaleStartDate'] !== ''
          ? String(r['presaleStartDate']).slice(0, 10)
          : null,
      presaleEndDate:
        r['presaleEndDate'] != null && r['presaleEndDate'] !== ''
          ? String(r['presaleEndDate']).slice(0, 10)
          : null,
      onSaleDate:
        r['onSaleDate'] != null && r['onSaleDate'] !== ''
          ? String(r['onSaleDate']).slice(0, 10)
          : null,
    };
  }

  /** Grid view — unpaginated, matches any milestone date (show/announcement/presale/on-sale) in the month. */
  async findAll(
    year?: number,
    month?: number,
  ): Promise<PerformanceCalendarRow[]> {
    const qb = await this.buildCalendarQuery(year, month, true);
    qb.orderBy('p.performanceDate', 'ASC')
      .addOrderBy('p.performanceTime', 'ASC')
      .addOrderBy('p.performanceId', 'ASC');
    const raw = await qb.getRawMany<Record<string, unknown>>();
    return raw.map((r) => this.mapCalendarRaw(r));
  }

  async findAllPaginated(
    year: number,
    month: number,
    offset: number,
    limit: number,
    visibility: string[],
    sortByRaw?: string,
    sortDirRaw?: string,
  ): Promise<{ data: PerformanceCalendarRow[]; total: number }> {
    const qb = await this.buildCalendarQuery(year, month, false);
    this.applyVisibilityFilter(qb, visibility);
    this.applyCalendarListSort(qb, sortByRaw, sortDirRaw);
    const total = await qb.getCount();
    const raw = await qb
      .offset(offset)
      .limit(limit)
      .getRawMany<Record<string, unknown>>();
    return {
      data: raw.map((r) => this.mapCalendarRaw(r)),
      total,
    };
  }
}
