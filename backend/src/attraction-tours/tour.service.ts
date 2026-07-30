import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { Attraction } from '../entities/attraction.entity';
import { AgeRange } from '../entities/age-range.entity';
import { Class } from '../entities/class.entity';
import { Company } from '../entities/company.entity';
import { Contact } from '../entities/contact.entity';
import { ContactAssignment } from '../entities/contact-assignment.entity';
import { Engagement } from '../entities/engagement.entity';
import { EngagementProject } from '../entities/engagement-project.entity';
import { Job } from '../entities/job.entity';
import { Link } from '../entities/link.entity';
import { TourAudienceAgeRange } from '../entities/tour-audience-age-range.entity';
import { Tour } from '../entities/tour.entity';
import { TourTalentAgent } from '../entities/tour-talent-agent.entity';
import { VenueType } from '../entities/venue-type.entity';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { EmsAppCreatedStore } from './ems-app-created.store';

export interface TourMediaMixRow {
  tourMediaMixId: number;
  advertisingSubTypeId: number;
  subTypeName: string;
  parentCategory: string | null;
  companyId: number | null;
  companyName: string | null;
}

export interface AdvertisingSubTypeOption {
  advertisingSubTypeId: number;
  subTypeName: string;
  parentCategory: string | null;
}

export interface TourListRow {
  tourId: number;
  tourName: string;
  attractionId: number;
  attractionName: string;
  classId: number;
  className: string;
  audienceGender: string | null;
  audienceAgeRange: string | null;
  audienceAgeRangeIds: number[];
  audienceAgeRangeLabels: string[];
  ascap: boolean;
  bmi: boolean;
  sesac: boolean;
  gmr: boolean;
  tourInsuranceLanguage: string | null;
  talentAgencyCompanyId: number | null;
  talentAgencyCompanyName: string | null;
  tourManagementCompanyId: number | null;
  tourManagementCompanyName: string | null;
  jobId: number | null;
  jobName: string | null;
  talentAgentContactIds: number[];
  talentAgentNames: string[];
  techRiderLinkId: number | null;
  venueTypePreferenceId: number | null;
  venueTypePreferenceName: string | null;
  tourStartDate: string | null;
  tourEndDate: string | null;
  /** dbo.Link.LinkURL from Tour.BannerLinkID */
  tourBannerImageUrl: string | null;
  /** Media mix entries for the tour (dbo.TourMediaMix). */
  mediaMix: TourMediaMixRow[];
  appCreated: boolean;
  /** Number of EngagementProject rows linked to this tour. */
  projectCount: number;
  /** Number of Engagement rows linked to this tour. */
  engagementCount: number;
  /** Display names for projects (e.g. "Project #12 (Submitted)") */
  projectNames: string[];
  /** Display names for engagements (e.g. "Venue Name (Confirmed)") */
  engagementNames: string[];
}

@Injectable()
export class TourService {
  private readonly logger = new Logger(TourService.name);

  constructor(
    @InjectRepository(Tour)
    private readonly tourRepo: Repository<Tour>,
    @InjectRepository(Attraction)
    private readonly attractionRepo: Repository<Attraction>,
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(AgeRange)
    private readonly ageRangeRepo: Repository<AgeRange>,
    @InjectRepository(TourAudienceAgeRange)
    private readonly tourAudienceAgeRangeRepo: Repository<TourAudienceAgeRange>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(VenueType)
    private readonly venueTypeRepo: Repository<VenueType>,
    @InjectRepository(Engagement)
    private readonly engagementRepo: Repository<Engagement>,
    @InjectRepository(EngagementProject)
    private readonly engagementProjectRepo: Repository<EngagementProject>,
    @InjectRepository(Link)
    private readonly linkRepo: Repository<Link>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(ContactAssignment)
    private readonly contactAssignmentRepo: Repository<ContactAssignment>,
    @InjectRepository(TourTalentAgent)
    private readonly tourTalentAgentRepo: Repository<TourTalentAgent>,
    private readonly emsCreated: EmsAppCreatedStore,
  ) {}

  private async assertTalentAgencyCompany(companyId: number): Promise<void> {
    const co = await this.companyRepo.findOne({
      where: { companyId },
      relations: { companyType: true },
    });
    if (!co) {
      throw new NotFoundException({ message: 'Company not found.' });
    }
    const typeName =
      co.companyType?.companyTypeName?.trim().toLowerCase() ?? '';
    if (typeName === 'talent agency') return;

    let linkedTalentAgency = false;
    try {
      const rows = await this.companyRepo.manager.query(
        `
          SELECT TOP 1 1 AS ok
          FROM dbo.CompanyCompanyType cct
          INNER JOIN dbo.CompanyType ct ON ct.CompanyTypeID = cct.CompanyTypeID
          WHERE cct.CompanyID = ${Number(companyId)}
            AND LOWER(LTRIM(RTRIM(ct.CompanyTypeName))) = 'talent agency'
        `,
      );
      linkedTalentAgency = rows.length > 0;
    } catch (e) {
      this.logger.warn(
        `Could not verify dbo.CompanyCompanyType for talent agency ${companyId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    if (!linkedTalentAgency) {
      throw new BadRequestException({
        message: 'Talent agency must be a company of type Talent Agency.',
      });
    }
  }

  private async assertCompanyExists(
    companyId: number,
    label = 'Company',
  ): Promise<void> {
    const co = await this.companyRepo.findOne({ where: { companyId } });
    if (!co) {
      throw new NotFoundException({ message: `${label} not found.` });
    }
  }

  private searchTokens(value: string | null | undefined): string[] {
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

  private normalizeContactIds(ids?: number[] | null): number[] {
    return [
      ...new Set(
        (Array.isArray(ids) ? ids : [])
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
  }

  private normalizeAgeRangeIds(ids?: number[] | null): number[] {
    return [
      ...new Set(
        (Array.isArray(ids) ? ids : [])
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
  }

  private normalizeAudienceGender(
    value: string | null | undefined,
  ): string | null {
    const t = String(value ?? '').trim();
    if (!t) return null;
    const allowed = new Set(['All', 'Male', 'Female']);
    if (!allowed.has(t)) {
      throw new BadRequestException({
        message: 'Audience gender must be All, Male, or Female.',
      });
    }
    return t;
  }

  private async labelsForAgeRangeIds(ids: number[]): Promise<string[]> {
    const normalized = this.normalizeAgeRangeIds(ids);
    if (!normalized.length) return [];
    const rows = await this.ageRangeRepo.find({
      where: { ageRangeId: In(normalized) },
      order: { sortOrder: 'ASC', ageRangeLabel: 'ASC' },
    });
    if (rows.length !== normalized.length) {
      throw new BadRequestException({
        message: 'One or more audience age ranges are not valid.',
      });
    }
    return rows.map((row) => row.ageRangeLabel);
  }

  private async syncTourAudienceAgeRanges(
    tourId: number,
    ids: number[] | null | undefined,
  ): Promise<string[]> {
    const normalized = this.normalizeAgeRangeIds(ids);
    const labels = await this.labelsForAgeRangeIds(normalized);
    await this.tourAudienceAgeRangeRepo.delete({ tourId });
    if (normalized.length) {
      await this.tourAudienceAgeRangeRepo.save(
        normalized.map((ageRangeId) =>
          this.tourAudienceAgeRangeRepo.create({ tourId, ageRangeId }),
        ),
      );
    }
    await this.tourRepo.update(
      { tourId },
      { audienceAgeRange: labels.length ? labels.join(', ') : null },
    );
    return labels;
  }

  private async tourAgeRangesByTourIds(
    tourIds: number[],
  ): Promise<Map<number, { ids: number[]; labels: string[] }>> {
    const uniq = [...new Set(tourIds)].filter(
      (id) => Number.isInteger(id) && id > 0,
    );
    const map = new Map<number, { ids: number[]; labels: string[] }>();
    for (const id of uniq) map.set(id, { ids: [], labels: [] });
    if (!uniq.length) return map;

    const rows = await this.tourAudienceAgeRangeRepo.find({
      where: { tourId: In(uniq) },
      relations: { ageRange: true },
      order: { ageRange: { sortOrder: 'ASC' } },
    });
    for (const row of rows) {
      const bucket = map.get(row.tourId) ?? { ids: [], labels: [] };
      if (!bucket.ids.includes(row.ageRangeId)) bucket.ids.push(row.ageRangeId);
      const label = row.ageRange?.ageRangeLabel?.trim();
      if (label && !bucket.labels.includes(label)) bucket.labels.push(label);
      map.set(row.tourId, bucket);
    }
    return map;
  }

  private async resolveJobId(
    jobName: string | null | undefined,
  ): Promise<number | null> {
    const name = String(jobName ?? '').trim();
    if (!name) return null;
    const existing = await this.jobRepo
      .createQueryBuilder('j')
      .where('LOWER(LTRIM(RTRIM(j.jobName))) = LOWER(LTRIM(RTRIM(:name)))', {
        name,
      })
      .getOne();
    if (existing) return existing.jobId;
    const created = await this.jobRepo.save(
      this.jobRepo.create({
        jobName: name.slice(0, 255),
        jobCode: null,
        isActive: true,
      }),
    );
    return created.jobId;
  }

  private async assertTalentAgentContactsBelongToAgency(
    contactIds: number[],
    talentAgencyCompanyId: number | null | undefined,
  ): Promise<number[]> {
    const ids = this.normalizeContactIds(contactIds);
    if (ids.length === 0) return ids;
    if (
      talentAgencyCompanyId == null ||
      !Number.isInteger(Number(talentAgencyCompanyId)) ||
      Number(talentAgencyCompanyId) < 1
    ) {
      throw new BadRequestException({
        message: 'Select a talent agency before assigning talent agents.',
      });
    }
    const contactCount = await this.contactRepo.count({
      where: { contactId: In(ids) },
    });
    if (contactCount !== ids.length) {
      throw new BadRequestException({
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
      .getRawMany<{ contactId: number }>();
    const assigned = new Set(rows.map((row) => Number(row.contactId)));
    const missing = ids.filter((id) => !assigned.has(id));
    if (missing.length > 0) {
      throw new BadRequestException({
        message:
          'One or more selected talent agents are not assigned to this talent agency.',
      });
    }
    return ids;
  }

  private async syncTourTalentAgents(
    tourId: number,
    contactIds: number[],
    talentAgencyCompanyId: number | null | undefined,
  ): Promise<void> {
    const ids = await this.assertTalentAgentContactsBelongToAgency(
      contactIds,
      talentAgencyCompanyId,
    );
    await this.tourTalentAgentRepo.delete({ tourId });
    if (ids.length === 0) return;
    await this.tourTalentAgentRepo.save(
      ids.map((contactId) =>
        this.tourTalentAgentRepo.create({ tourId, contactId }),
      ),
    );
  }

  private async tourTalentAgentsByTourIds(
    tourIds: number[],
  ): Promise<Map<number, { ids: number[]; names: string[] }>> {
    const uniq = [...new Set(tourIds)].filter(
      (id) => Number.isInteger(id) && id > 0,
    );
    const map = new Map<number, { ids: number[]; names: string[] }>();
    for (const id of uniq) map.set(id, { ids: [], names: [] });
    if (!uniq.length) return map;

    const rows = await this.tourTalentAgentRepo.find({
      where: { tourId: In(uniq) },
      relations: { contact: { contactInfo: true } },
      order: { tourTalentAgentId: 'ASC' },
    });
    for (const row of rows) {
      const bucket = map.get(row.tourId) ?? { ids: [], names: [] };
      if (!bucket.ids.includes(row.contactId)) bucket.ids.push(row.contactId);
      const info = row.contact?.contactInfo;
      const name = `${info?.firstName ?? ''} ${info?.lastName ?? ''}`.trim();
      if (name && !bucket.names.includes(name)) bucket.names.push(name);
      map.set(row.tourId, bucket);
    }
    return map;
  }

  private dateOnlyString(v: Date | string | null | undefined): string | null {
    if (v == null) return null;
    const s = v instanceof Date ? v.toISOString() : String(v);
    const trimmed = s.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, 10);
  }

  private normalizeTourDateInput(v: string | null | undefined): string | null {
    const t = String(v ?? '').trim();
    return t.length > 0 ? t : null;
  }

  private assertTourDateRange(
    startDate: string | null,
    endDate: string | null,
  ): void {
    if (!startDate || !endDate) return;
    if (startDate > endDate) {
      throw new BadRequestException(
        'Tour start date cannot be after tour end date.',
      );
    }
  }

  private async attachBannerFromUpload(
    tour: Tour,
    file: Express.Multer.File,
  ): Promise<void> {
    const fileName = file.filename;
    if (!fileName?.trim()) {
      throw new BadRequestException('Upload did not produce a filename.');
    }
    const publicPath = `/uploads/tour-banners/${fileName}`.slice(0, 2048);
    const safeName = (file.originalname || 'Tour banner')
      // eslint-disable-next-line no-control-regex
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

  private async tourBannerUrlsByTourIds(
    tourIds: number[],
  ): Promise<Map<number, string | null>> {
    const uniq = [...new Set(tourIds)].filter(
      (id) => Number.isInteger(id) && id > 0,
    );
    const map = new Map<number, string | null>();
    for (const id of uniq) map.set(id, null);
    if (!uniq.length) return map;

    const rows = await this.tourRepo
      .createQueryBuilder('t')
      .leftJoin(Link, 'tb', 'tb.linkId = t.bannerLinkId')
      .select('t.tourId', 'tourId')
      .addSelect('tb.linkUrl', 'tourBannerImageUrl')
      .where('t.tourId IN (:...ids)', { ids: uniq })
      .getRawMany<{ tourId: number; tourBannerImageUrl: string | null }>();

    for (const row of rows) {
      const tid = Number(row.tourId);
      const u =
        row.tourBannerImageUrl != null
          ? String(row.tourBannerImageUrl).trim()
          : '';
      map.set(tid, u || null);
    }
    return map;
  }

  private mapTourEntityToRow(
    t: Tour,
    tourBannerImageUrl: string | null,
    talentAgents?: { ids: number[]; names: string[] },
    ageRanges?: { ids: number[]; labels: string[] },
    mediaMix?: TourMediaMixRow[],
    counts?: { projectCount: number; engagementCount: number; projectNames: string[]; engagementNames: string[] },
  ): TourListRow {
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
      talentAgencyCompanyId:
        t.talentAgencyCompanyId ?? t.talentAgencyCompany?.companyId ?? null,
      talentAgencyCompanyName: t.talentAgencyCompany?.companyName ?? null,
      tourManagementCompanyId:
        t.tourManagementCompanyId ?? t.tourManagementCompany?.companyId ?? null,
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
      projectCount: counts?.projectCount ?? 0,
      engagementCount: counts?.engagementCount ?? 0,
      projectNames: counts?.projectNames ?? [],
      engagementNames: counts?.engagementNames ?? [],
    };
  }

  private toPositiveIntOrNull(v: unknown): number | null {
    const n = Number(v);
    return v != null && v !== '' && Number.isInteger(n) && n > 0 ? n : null;
  }

  private toTrimmedOrNull(v: unknown): string | null {
    return v == null || v === '' ? null : String(v).trim();
  }

  private async tourProjectAndEngagementCounts(
    tourIds: number[],
  ): Promise<Map<number, { projectCount: number; engagementCount: number; projectNames: string[]; engagementNames: string[] }>> {
    const map = new Map<number, { projectCount: number; engagementCount: number; projectNames: string[]; engagementNames: string[] }>();
    const uniq = [...new Set(tourIds)].filter((id) => Number.isInteger(id) && id > 0);
    for (const id of uniq) map.set(id, { projectCount: 0, engagementCount: 0, projectNames: [], engagementNames: [] });
    if (!uniq.length) return map;

    const projectRows: { TourID: number; EngagementProjectID: number; OfferCreationStatus: string }[] =
      await this.engagementProjectRepo.manager.query(
        `SELECT TourID, EngagementProjectID, OfferCreationStatus FROM dbo.EngagementProject WHERE TourID IN (${uniq.join(',')}) ORDER BY CreatedDate DESC`,
      );
    for (const r of projectRows) {
      const entry = map.get(r.TourID);
      if (entry) {
        entry.projectCount++;
        entry.projectNames.push(`Project #${r.EngagementProjectID} (${r.OfferCreationStatus})`);
      }
    }

    const engRows: { TourID: number; EngagementID: number; EngagementStatus: string; displayTitle: string }[] =
      await this.engagementRepo.manager.query(
        `SELECT e.TourID, e.EngagementID, e.EngagementStatus,
          CASE
            WHEN a.AttractionName IS NOT NULL AND vc.CompanyName IS NOT NULL
              THEN a.AttractionName + N' — ' + t.TourName + N' @ ' + vc.CompanyName
            WHEN a.AttractionName IS NOT NULL
              THEN a.AttractionName + N' — ' + t.TourName
            WHEN vc.CompanyName IS NOT NULL
              THEN t.TourName + N' @ ' + vc.CompanyName
            ELSE t.TourName
          END AS displayTitle
        FROM dbo.Engagement e
        INNER JOIN dbo.Tour t ON t.TourID = e.TourID
        LEFT JOIN dbo.Attraction a ON a.AttractionID = t.AttractionID
        LEFT JOIN (
          SELECT ev.EngagementID, c.CompanyName,
            ROW_NUMBER() OVER (PARTITION BY ev.EngagementID ORDER BY ev.VenueCompanyID) AS rn
          FROM dbo.EngagementVenue ev
          INNER JOIN dbo.Company c ON c.CompanyID = ev.VenueCompanyID
        ) vc ON vc.EngagementID = e.EngagementID AND vc.rn = 1
        WHERE e.TourID IN (${uniq.join(',')})
        ORDER BY e.EngagementID DESC`,
      );
    for (const r of engRows) {
      const entry = map.get(r.TourID);
      if (entry) {
        entry.engagementCount++;
        entry.engagementNames.push(`${r.displayTitle} (${r.EngagementStatus})`);
      }
    }

    return map;
  }

  private async tourMediaMixByTourIds(
    tourIds: number[],
  ): Promise<Map<number, TourMediaMixRow[]>> {
    const uniq = [...new Set(tourIds)].filter(
      (id) => Number.isInteger(id) && id > 0,
    );
    const map = new Map<number, TourMediaMixRow[]>();
    for (const id of uniq) map.set(id, []);
    if (!uniq.length) return map;

    const rows = await this.tourRepo.manager.query(
      `SELECT
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
       ORDER BY ast.[ParentCategory], ast.[SubTypeName]`,
    );

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

  /** Active AdvertisingSubType reference rows for the Media Mix picker. */
  async listAdvertisingSubTypes(): Promise<AdvertisingSubTypeOption[]> {
    const rows = await this.tourRepo.manager.query(
      `SELECT [AdvertisingSubTypeID] AS id, [SubTypeName] AS name, [ParentCategory] AS pc
       FROM dbo.AdvertisingSubType
       WHERE [IsActive] = 1
       ORDER BY [ParentCategory], [SortOrder], [SubTypeName]`,
    );
    return rows.map((r) => ({
      advertisingSubTypeId: Number(r.id),
      subTypeName: String(r.name ?? ''),
      parentCategory: this.toTrimmedOrNull(r.pc),
    }));
  }

  private normalizeMediaMix(
    entries:
      | { advertisingSubTypeId: number; companyId: number | null }[]
      | null
      | undefined,
  ): { advertisingSubTypeId: number; companyId: number | null }[] {
    const list = Array.isArray(entries) ? entries : [];
    const out: { advertisingSubTypeId: number; companyId: number | null }[] =
      [];
    const seen = new Set<string>();
    for (const e of list) {
      const ast = Number(e?.advertisingSubTypeId);
      if (!Number.isInteger(ast) || ast < 1) continue;
      const companyId = this.toPositiveIntOrNull(e?.companyId);
      const key = `${ast}:${companyId ?? 0}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ advertisingSubTypeId: ast, companyId });
    }
    return out;
  }

  private async syncTourMediaMix(
    tourId: number,
    entries:
      | { advertisingSubTypeId: number; companyId: number | null }[]
      | null
      | undefined,
  ): Promise<void> {
    const normalized = this.normalizeMediaMix(entries);

    if (normalized.length) {
      const subTypeIds = [
        ...new Set(normalized.map((e) => e.advertisingSubTypeId)),
      ];
      const validRows = await this.tourRepo.manager.query(
        `SELECT [AdvertisingSubTypeID] AS id FROM dbo.AdvertisingSubType
         WHERE [IsActive] = 1 AND [AdvertisingSubTypeID] IN (${subTypeIds.join(',')})`,
      );
      const validSubTypeIds = new Set(validRows.map((r) => Number(r.id)));
      if (validSubTypeIds.size !== subTypeIds.length) {
        throw new BadRequestException({
          message: 'One or more advertising sub-types are not valid.',
        });
      }

      const companyIds = [
        ...new Set(
          normalized
            .map((e) => e.companyId)
            .filter((id): id is number => id != null),
        ),
      ];
      if (companyIds.length) {
        const companyCount = await this.companyRepo.count({
          where: { companyId: In(companyIds) },
        });
        if (companyCount !== companyIds.length) {
          throw new BadRequestException({
            message:
              'One or more advertising outlet companies no longer exist.',
          });
        }
      }
    }

    await this.tourRepo.manager.query(
      `DELETE FROM dbo.TourMediaMix WHERE [TourID] = ${tourId}`,
    );
    for (const e of normalized) {
      const companyVal = e.companyId == null ? 'NULL' : String(e.companyId);
      await this.tourRepo.manager.query(
        `INSERT INTO dbo.TourMediaMix ([TourID], [AdvertisingSubTypeID], [CompanyID])
         VALUES (${tourId}, ${e.advertisingSubTypeId}, ${companyVal})`,
      );
    }
  }

  /** Tour names are globally unique (case-insensitive), across all attractions. */
  private async assertUniqueTourName(
    tourName: string,
    excludeTourId?: number,
  ): Promise<void> {
    const t = tourName.trim();
    if (!t) return;
    const qb = this.tourRepo
      .createQueryBuilder('t')
      .where('LOWER(t.tourName) = LOWER(:tourName)', { tourName: t });
    if (excludeTourId != null) {
      qb.andWhere('t.tourId != :excludeTourId', { excludeTourId });
    }
    const found = await qb.getOne();
    if (found) {
      throw new ConflictException(
        'A tour with this name already exists. Choose a different name.',
      );
    }
  }

  async list(): Promise<TourListRow[]> {
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

    const bannerMap = await this.tourBannerUrlsByTourIds(
      rows.map((t) => t.tourId),
    );
    const agentMap = await this.tourTalentAgentsByTourIds(
      rows.map((t) => t.tourId),
    );
    const ageMap = await this.tourAgeRangesByTourIds(rows.map((t) => t.tourId));
    const mediaMixMap = await this.tourMediaMixByTourIds(
      rows.map((t) => t.tourId),
    );
    const countsMap1 = await this.tourProjectAndEngagementCounts(
      rows.map((t) => t.tourId),
    );
    return rows.map((t) =>
      this.mapTourEntityToRow(
        t,
        bannerMap.get(t.tourId) ?? null,
        agentMap.get(t.tourId),
        ageMap.get(t.tourId),
        mediaMixMap.get(t.tourId),
        countsMap1.get(t.tourId),
      ),
    );
  }

  async listProjectsByTour(tourId: number) {
    const id = Math.floor(tourId);
    if (!Number.isFinite(id) || id < 1) return [];

    const tour = await this.tourRepo.findOne({
      where: { tourId: id },
      relations: { attraction: true, talentAgencyCompany: true },
    });
    const attractionName = tour?.attraction?.attractionName ?? null;
    const tourName = tour?.tourName ?? null;
    const talentAgencyName = tour?.talentAgencyCompany?.companyName ?? null;

    const projects = await this.engagementProjectRepo.find({
      where: { tourId: id },
      order: { createdDate: 'DESC' },
    });
    return projects.map((p) => ({
      engagementProjectId: p.engagementProjectId,
      tourId: p.tourId,
      attractionName,
      tourName,
      talentAgencyName,
      projectStage: p.projectStage,
      offerReviewStatus: p.offerReviewStatus ?? null,
      confirmedOfferLinkId: p.confirmedOfferLinkId ?? null,
      createdDate: p.createdDate,
      createdBy: p.createdBy ?? null,
    }));
  }

  async listPaginated(
    offset: number,
    limit: number,
    q?: string,
    sortByRaw?: string,
    sortDirRaw?: string,
  ): Promise<{ data: TourListRow[]; total: number }> {
    const qb = this.tourRepo
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.attraction', 'a')
      .innerJoinAndSelect('t.class', 'c')
      .leftJoinAndSelect('t.venueTypePreference', 'v')
      .leftJoinAndSelect('t.talentAgencyCompany', 'ta')
      .leftJoinAndSelect('t.tourManagementCompany', 'tm')
      .leftJoinAndSelect('t.job', 'job');

    const sortBy = (sortByRaw ?? '').trim().toLowerCase();
    const sortDir =
      (sortDirRaw ?? '').trim().toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    if (sortBy === 'attraction') {
      qb.orderBy('a.attractionName', sortDir).addOrderBy('t.tourName', 'ASC');
    } else if (sortBy === 'class') {
      qb.orderBy('c.className', sortDir).addOrderBy('t.tourName', 'ASC');
    } else if (sortBy === 'management' || sortBy === 'tourmgmt') {
      qb.orderBy('ta.companyName', sortDir).addOrderBy('t.tourName', 'ASC');
    } else if (sortBy === 'payable' || sortBy === 'payableentity') {
      qb.orderBy('tm.companyName', sortDir).addOrderBy('t.tourName', 'ASC');
    } else {
      qb.orderBy('t.tourName', sortDir).addOrderBy('t.tourId', 'ASC');
    }

    this.searchTokens(q).forEach((token, index) => {
      const param = `tourSearch${index}`;
      qb.andWhere(
        `(
          LOWER(ISNULL(t.tourName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          OR LOWER(ISNULL(a.attractionName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          OR LOWER(ISNULL(c.className, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          OR LOWER(ISNULL(v.venueTypeName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          OR LOWER(ISNULL(ta.companyName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          OR LOWER(ISNULL(tm.companyName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
          OR LOWER(ISNULL(job.jobName, '')) LIKE LOWER(:${param}) ESCAPE '\\'
        )`,
        { [param]: `%${this.escapeLikePattern(token)}%` },
      );
    });

    const total = await qb.getCount();
    const rows = await qb.skip(offset).take(limit).getMany();

    const bannerMap = await this.tourBannerUrlsByTourIds(
      rows.map((t) => t.tourId),
    );
    const agentMap = await this.tourTalentAgentsByTourIds(
      rows.map((t) => t.tourId),
    );
    const ageMap = await this.tourAgeRangesByTourIds(rows.map((t) => t.tourId));
    const mediaMixMap = await this.tourMediaMixByTourIds(
      rows.map((t) => t.tourId),
    );
    const countsMap = await this.tourProjectAndEngagementCounts(
      rows.map((t) => t.tourId),
    );
    return {
      data: rows.map((t) =>
        this.mapTourEntityToRow(
          t,
          bannerMap.get(t.tourId) ?? null,
          agentMap.get(t.tourId),
          ageMap.get(t.tourId),
          mediaMixMap.get(t.tourId),
          countsMap.get(t.tourId),
        ),
      ),
      total,
    };
  }

  /** Company Hub — paginated tours for one attraction (lazy-loaded in hub UI). */
  async listByAttractionPaginated(
    attractionId: number,
    offset: number,
    limit: number,
  ): Promise<{ data: TourListRow[]; total: number }> {
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
    const bannerMap = await this.tourBannerUrlsByTourIds(
      rows.map((t) => t.tourId),
    );
    const agentMap = await this.tourTalentAgentsByTourIds(
      rows.map((t) => t.tourId),
    );
    const ageMap = await this.tourAgeRangesByTourIds(rows.map((t) => t.tourId));
    const mediaMixMap = await this.tourMediaMixByTourIds(
      rows.map((t) => t.tourId),
    );
    const countsMap2 = await this.tourProjectAndEngagementCounts(
      rows.map((t) => t.tourId),
    );

    return {
      data: rows.map((t) =>
        this.mapTourEntityToRow(
          t,
          bannerMap.get(t.tourId) ?? null,
          agentMap.get(t.tourId),
          ageMap.get(t.tourId),
          mediaMixMap.get(t.tourId),
          countsMap2.get(t.tourId),
        ),
      ),
      total,
    };
  }

  async listAgeRanges(): Promise<AgeRange[]> {
    return this.ageRangeRepo.find({
      order: { sortOrder: 'ASC', ageRangeLabel: 'ASC' },
    });
  }

  async create(
    dto: CreateTourDto,
    bannerFile?: Express.Multer.File,
  ): Promise<TourListRow> {
    const attraction = await this.attractionRepo.findOne({
      where: { attractionId: dto.attractionId },
    });
    if (!attraction) {
      throw new NotFoundException({ message: 'Attraction not found.' });
    }
    const cls = await this.classRepo.findOne({
      where: { classId: dto.classId },
    });
    if (!cls) {
      throw new NotFoundException({ message: 'Genre (class) not found.' });
    }
    const tourName = dto.tourName.trim();
    if (!tourName) {
      throw new BadRequestException('Tour name is required.');
    }

    if (dto.talentAgencyCompanyId == null || dto.talentAgencyCompanyId < 1) {
      throw new BadRequestException(
        'Talent agency is required when creating a tour.',
      );
    }
    await this.assertTalentAgencyCompany(dto.talentAgencyCompanyId);
    const talentAgentContactIds =
      await this.assertTalentAgentContactsBelongToAgency(
        dto.talentAgentContactIds ?? [],
        dto.talentAgencyCompanyId,
      );
    const tourStartDate = this.normalizeTourDateInput(dto.tourStartDate);
    const tourEndDate = this.normalizeTourDateInput(dto.tourEndDate);
    this.assertTourDateRange(tourStartDate, tourEndDate);
    const audienceGender = this.normalizeAudienceGender(dto.audienceGender);
    const jobId = await this.resolveJobId(dto.jobName);
    const ageRangeLabels = await this.labelsForAgeRangeIds(
      this.normalizeAgeRangeIds(dto.audienceAgeRangeIds),
    );

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
    await this.syncTourAudienceAgeRanges(
      saved.tourId,
      dto.audienceAgeRangeIds ?? [],
    );
    await this.syncTourTalentAgents(
      saved.tourId,
      talentAgentContactIds,
      dto.talentAgencyCompanyId,
    );
    this.emsCreated.recordTour(saved.tourId);
    if (bannerFile) {
      await this.attachBannerFromUpload(saved, bannerFile);
    }
    return this.buildListRow(saved.tourId);
  }

  async update(
    id: number,
    dto: UpdateTourDto,
    bannerFile?: Express.Multer.File,
  ): Promise<TourListRow> {
    const existing = await this.tourRepo.findOne({ where: { tourId: id } });
    if (!existing) {
      throw new NotFoundException({ message: 'Tour not found.' });
    }
    if (dto.attractionId != null) {
      const a = await this.attractionRepo.findOne({
        where: { attractionId: dto.attractionId },
      });
      if (!a) throw new NotFoundException({ message: 'Attraction not found.' });
      existing.attractionId = dto.attractionId;
    }
    if (dto.classId != null) {
      const c = await this.classRepo.findOne({
        where: { classId: dto.classId },
      });
      if (!c)
        throw new NotFoundException({ message: 'Genre (class) not found.' });
      existing.classId = dto.classId;
    }
    if (dto.tourName !== undefined) {
      existing.tourName = dto.tourName.trim();
    }
    if (dto.ascap !== undefined) existing.ascap = dto.ascap;
    if (dto.bmi !== undefined) existing.bmi = dto.bmi;
    if (dto.sesac !== undefined) existing.sesac = dto.sesac;
    if (dto.gmr !== undefined) existing.gmr = dto.gmr;
    if (dto.audienceGender !== undefined) {
      existing.audienceGender = this.normalizeAudienceGender(
        dto.audienceGender,
      );
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
          throw new NotFoundException({
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
        await this.assertCompanyExists(
          dto.tourManagementCompanyId,
          'Payable entity',
        );
      }
      existing.tourManagementCompanyId = dto.tourManagementCompanyId;
    }
    if (dto.tourStartDate !== undefined) {
      existing.tourStartDate = this.normalizeTourDateInput(dto.tourStartDate);
    }
    if (dto.tourEndDate !== undefined) {
      existing.tourEndDate = this.normalizeTourDateInput(dto.tourEndDate);
    }
    this.assertTourDateRange(
      this.dateOnlyString(existing.tourStartDate),
      this.dateOnlyString(existing.tourEndDate),
    );
    const finalName = existing.tourName.trim();
    if (!finalName) {
      throw new BadRequestException('Tour name is required.');
    }
    existing.tourName = finalName;
    const nextTalentAgencyCompanyId = existing.talentAgencyCompanyId ?? null;
    const agencyChanged = dto.talentAgencyCompanyId !== undefined;
    const nextTalentAgentContactIds =
      dto.talentAgentContactIds !== undefined
        ? await this.assertTalentAgentContactsBelongToAgency(
            dto.talentAgentContactIds,
            nextTalentAgencyCompanyId,
          )
        : null;
    try {
      await this.tourRepo.save(existing);
      if (dto.audienceAgeRangeIds !== undefined) {
        await this.syncTourAudienceAgeRanges(id, dto.audienceAgeRangeIds);
      }
      if (nextTalentAgentContactIds !== null) {
        await this.syncTourTalentAgents(
          id,
          nextTalentAgentContactIds,
          nextTalentAgencyCompanyId,
        );
      } else if (agencyChanged) {
        await this.syncTourTalentAgents(id, [], nextTalentAgencyCompanyId);
      }
      if (dto.mediaMix !== undefined) {
        await this.syncTourMediaMix(id, dto.mediaMix);
      }
    } catch (e: unknown) {
      if (e instanceof QueryFailedError) {
        const d = String((e as QueryFailedError).driverError ?? e.message);
        this.logger.warn(`Tour update failed (tourId=${id}): ${d}`);
        throw new BadRequestException({
          message:
            'Could not update the tour. The talent agent / company may be invalid for this tour, or the change conflicts with existing data.',
          detail: d,
        });
      }
      throw e;
    }

    const refreshed = await this.tourRepo.findOne({ where: { tourId: id } });
    if (!refreshed) {
      throw new NotFoundException({ message: 'Tour not found.' });
    }
    if (bannerFile) {
      await this.attachBannerFromUpload(refreshed, bannerFile);
    } else if (dto.removeBanner) {
      refreshed.bannerLinkId = null;
      await this.tourRepo.save(refreshed);
    }

    return this.buildListRow(id);
  }

  /** Same shape as GET /tours rows, so the client can patch its cache in-place. */
  private async buildListRow(tourId: number): Promise<TourListRow> {
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
      throw new NotFoundException({ message: 'Tour not found.' });
    }
    const bannerMap = await this.tourBannerUrlsByTourIds([tourId]);
    const agentMap = await this.tourTalentAgentsByTourIds([tourId]);
    const ageMap = await this.tourAgeRangesByTourIds([tourId]);
    const mediaMixMap = await this.tourMediaMixByTourIds([tourId]);
    const countsMap3 = await this.tourProjectAndEngagementCounts([tourId]);
    return this.mapTourEntityToRow(
      t,
      bannerMap.get(tourId) ?? null,
      agentMap.get(tourId),
      ageMap.get(tourId),
      mediaMixMap.get(tourId),
      countsMap3.get(tourId),
    );
  }

  async remove(id: number): Promise<void> {
    const existing = await this.tourRepo.findOne({ where: { tourId: id } });
    if (!existing) {
      throw new NotFoundException({ message: 'Tour not found.' });
    }
    const engCount = await this.engagementRepo.count({
      where: { tourId: id },
    });
    if (engCount > 0) {
      throw new ConflictException({
        message:
          'This tour can’t be removed because it’s still linked to one or more engagements. Remove or close those engagements first, then try again.',
      });
    }
    const projectCount = await this.engagementProjectRepo.count({
      where: { tourId: id },
    });
    if (projectCount > 0) {
      throw new ConflictException({
        message:
          'This tour can’t be removed because it is linked to one or more projects. Remove or reassign the project so it no longer uses this tour, then try again.',
      });
    }
    await this.tourTalentAgentRepo.delete({ tourId: id });
    await this.tourAudienceAgeRangeRepo.delete({ tourId: id });
    await this.tourRepo.delete({ tourId: id });
    this.emsCreated.removeTour(id);
  }
}
