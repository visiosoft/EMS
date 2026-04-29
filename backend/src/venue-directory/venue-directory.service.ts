import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Venue } from '../entities/venue.entity';

const VENUE_TYPE_NAME = 'venue';

export interface AllVenueDirectoryRow {
  companyId: number;
  /** dbo.Company.CompanyName — the “complex” / org name in the UI. */
  complexName: string;
  venueName: string;
  seatingCapacity: number;
  venueTypeId: number | null;
  venueTypeName: string | null;
  dmaId: number | null;
  dmaMarketName: string | null;
}

export interface EntertainmentComplexRow {
  /** Group key: trimmed dbo.Company.CompanyName. */
  complexName: string;
  venueCount: number;
  totalSeatingCapacity: number;
  dmaId: number | null;
  dmaMarketName: string | null;
  city: string | null;
  stateProvince: string | null;
}

@Injectable()
export class VenueDirectoryService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
  ) {}

  private static applyVenueTypeWhere(
    qb: SelectQueryBuilder<Venue>,
  ): SelectQueryBuilder<Venue> {
    return qb.andWhere('LOWER(LTRIM(RTRIM(ct.companyTypeName))) = :ctVenue', {
      ctVenue: VENUE_TYPE_NAME,
    });
  }

  private baseAllVenuesQuery(
    v: { q?: string; complexName?: string; complexCompanyId?: number } & {
      venueTypeId?: number;
      dmaId?: number;
    },
  ): SelectQueryBuilder<Venue> {
    const qb = this.venueRepo
      .createQueryBuilder('v')
      .innerJoin('v.company', 'c')
      .innerJoin('c.companyType', 'ct')
      .leftJoin('v.venueType', 'vt')
      .leftJoin('c.dma', 'd')
      .leftJoin('c.physicalAddress', 'pa');
    VenueDirectoryService.applyVenueTypeWhere(qb);

    const qVen = (v.q ?? '').trim();
    if (qVen) {
      const likeV = `%${qVen.toLowerCase()}%`;
      qb.andWhere('LOWER(v.venueName) LIKE :qVenue', { qVenue: likeV });
    }
    if (v.complexCompanyId != null && Number.isFinite(v.complexCompanyId)) {
      qb.andWhere('c.companyId = :ccid', { ccid: v.complexCompanyId });
    } else {
      const cName = (v.complexName ?? '').trim();
      if (cName) {
        const likeC = `%${cName.toLowerCase()}%`;
        qb.andWhere('LOWER(LTRIM(RTRIM(c.companyName))) LIKE :qC', { qC: likeC });
      }
    }
    if (v.venueTypeId != null && Number.isFinite(v.venueTypeId)) {
      qb.andWhere('v.venueTypeId = :vtypeId', { vtypeId: v.venueTypeId });
    }
    if (v.dmaId != null && Number.isFinite(v.dmaId)) {
      qb.andWhere('c.dmaid = :dmaF', { dmaF: v.dmaId });
    }
    return qb;
  }

  async listAllVenues(
    offset: number,
    limit: number,
    filters: {
      q?: string;
      complexName?: string;
      complexCompanyId?: number;
      venueTypeId?: number;
      dmaId?: number;
    },
  ): Promise<{ data: AllVenueDirectoryRow[]; total: number }> {
    const safeOffset = Math.max(0, Math.floor(offset) || 0);
    const safeLimit = Math.min(500, Math.max(1, Math.floor(limit) || 25));

    const dataQb = this.baseAllVenuesQuery(filters)
      .select('v.companyId', 'companyId')
      .addSelect('LTRIM(RTRIM(c.companyName))', 'complexName')
      .addSelect('v.venueName', 'venueName')
      .addSelect('v.seatingCapacity', 'seatingCapacity')
      .addSelect('v.venueTypeId', 'venueTypeId')
      .addSelect('vt.venueTypeName', 'venueTypeName')
      .addSelect('c.dmaid', 'dmaId')
      .addSelect('d.marketName', 'dmaMarketName')
      .orderBy('v.venueName', 'ASC');

    const countQb = this.baseAllVenuesQuery(filters).select(
      'COUNT(1)',
      'cnt',
    );
    const totalRow = await countQb.getRawOne<Record<string, string | number>>();
    const total = Math.floor(
      Number(
        (totalRow?.cnt as string | number | undefined) ??
          this.pickRaw(
            (totalRow ?? {}) as Record<string, unknown>,
            'cnt',
            0,
          ) ??
          0,
      ),
    );

    const raw = (await dataQb
      .offset(safeOffset)
      .limit(safeLimit)
      .getRawMany()) as Record<string, unknown>[];

    const data: AllVenueDirectoryRow[] = raw.map((row) => ({
      companyId: Math.floor(Number(this.pickRaw(row, 'companyId', 0))),
      complexName: String(this.pickRaw(row, 'complexName', '')).trim(),
      venueName: String(this.pickRaw(row, 'venueName', '')).trim(),
      seatingCapacity: Math.floor(
        Number(this.pickRaw(row, 'seatingCapacity', 0)),
      ),
      venueTypeId: this.nullableInt(
        this.pickRaw(row, 'venueTypeId', null),
      ),
      venueTypeName: this.nullableStr(
        this.pickRaw(row, 'venueTypeName', null),
      ),
      dmaId: this.nullableInt(this.pickRaw(row, 'dmaId', null)),
      dmaMarketName: this.nullableStr(
        this.pickRaw(row, 'dmaMarketName', null),
      ),
    }));

    return { data, total: Number.isFinite(total) && total > 0 ? total : 0 };
  }

  private pickRaw(
    row: Record<string, unknown>,
    key: string,
    def: string | number | null,
  ): string | number | null {
    const direct = row[key];
    if (direct != null) return direct as string | number;
    const l = key.toLowerCase();
    for (const k of Object.keys(row)) {
      if (k.toLowerCase() === l) return row[k] as string | number;
    }
    return def;
  }

  private nullableInt(
    v: string | number | null,
  ): number | null {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private nullableStr(
    v: string | number | null,
  ): string | null {
    if (v == null) return null;
    const t = String(v).trim();
    return t || null;
  }

  /**
   * One row per distinct `dbo.Company.CompanyName` within Venue companies (trimmed), summing
   * capacities. Multiple `Company` rows with the same name (same operating complex) fold into
   * one line; `city` / `state` / `dma` are representative (MAX) across those rows.
   */
  async listEntertainmentComplexes(
    offset: number,
    limit: number,
    filters: { q?: string; dmaId?: number },
  ): Promise<{ data: EntertainmentComplexRow[]; total: number }> {
    const safeOffset = Math.max(0, Math.floor(offset) || 0);
    const safeLimit = Math.min(500, Math.max(1, Math.floor(limit) || 25));
    const qS = (filters.q ?? '').trim();
    const dmaF = filters.dmaId;
    const likeG =
      qS.length > 0 ? `%${qS.toLowerCase()}%` : null;
    const useDma = dmaF != null && Number.isFinite(dmaF);

    // ---- count distinct complex names
    const countQb = this.venueRepo
      .createQueryBuilder('v')
      .innerJoin('v.company', 'c')
      .innerJoin('c.companyType', 'ct')
      .where('LOWER(LTRIM(RTRIM(ct.companyTypeName))) = :ctv', {
        ctv: VENUE_TYPE_NAME,
      });
    if (likeG) {
      countQb.andWhere('LOWER(LTRIM(RTRIM(c.companyName))) LIKE :likeG', {
        likeG,
      });
    }
    if (useDma) {
      countQb.andWhere('c.dmaid = :dmaC', { dmaC: dmaF! });
    }
    countQb.select(
      'COUNT(DISTINCT (LTRIM(RTRIM(c.companyName))))',
      'cnum',
    );
    const cRow = await countQb.getRawOne<Record<string, string | number>>();
    const total = Math.floor(
      Number(
        cRow?.cnum ?? this.pickRaw((cRow ?? {}) as Record<string, unknown>, 'cnum', 0),
      ) || 0,
    );

    // ---- paged data
    const gexpr = 'LTRIM(RTRIM(c.companyName))';
    const dataQb = this.venueRepo
      .createQueryBuilder('v')
      .innerJoin('v.company', 'c')
      .innerJoin('c.companyType', 'ct')
      .leftJoin('c.dma', 'd')
      .leftJoin('c.physicalAddress', 'pa')
      .where('LOWER(LTRIM(RTRIM(ct.companyTypeName))) = :ctvd', {
        ctvd: VENUE_TYPE_NAME,
      });
    if (likeG) {
      dataQb.andWhere('LOWER(LTRIM(RTRIM(c.companyName))) LIKE :likeG2', {
        likeG2: likeG,
      });
    }
    if (useDma) {
      dataQb.andWhere('c.dmaid = :dmaD', { dmaD: dmaF! });
    }
    dataQb
      .select(gexpr, 'complexName')
      .addSelect('COUNT(1)', 'venueCount')
      .addSelect('SUM(v.seatingCapacity)', 'totalSeatingCapacity')
      .addSelect('MAX(c.dmaid)', 'dmaId')
      .addSelect('MAX(d.marketName)', 'dmaMarketName')
      .addSelect('MAX(pa.city)', 'city')
      .addSelect('MAX(pa.stateProvince)', 'stateProvince')
      .groupBy(gexpr)
      .orderBy(gexpr, 'ASC')
      .offset(safeOffset)
      .limit(safeLimit);

    const raw = (await dataQb.getRawMany()) as Record<string, unknown>[];
    const data: EntertainmentComplexRow[] = raw.map((row) => ({
      complexName: String(this.pickRaw(row, 'complexName', '')).trim(),
      venueCount: Math.floor(
        Number(this.pickRaw(row, 'venueCount', 0)) || 0,
      ),
      totalSeatingCapacity: Math.floor(
        Number(this.pickRaw(row, 'totalSeatingCapacity', 0)) || 0,
      ),
      dmaId: this.nullableInt(this.pickRaw(row, 'dmaId', null)),
      dmaMarketName: this.nullableStr(
        this.pickRaw(row, 'dmaMarketName', null),
      ),
      city: this.nullableStr(this.pickRaw(row, 'city', null)),
      stateProvince: this.nullableStr(
        this.pickRaw(row, 'stateProvince', null),
      ),
    }));

    return { data, total: total > 0 ? total : 0 };
  }
}
