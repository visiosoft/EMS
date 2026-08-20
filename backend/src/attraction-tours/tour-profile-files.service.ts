import {
  BadRequestException,
  Injectable,
  NotImplementedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Link } from '../entities/link.entity';
import { Tour } from '../entities/tour.entity';
import { UpdateTourProfileFilesDto } from './dto/update-tour-profile-files.dto';
import type { TourProfileFileKey } from './tour-profile-file-multer.config';

export interface TourProfileFileField {
  linkId: number | null;
  linkUrl: string | null;
  linkName: string | null;
}

export interface TourProfileFilesResponse {
  tourId: number;
  techRider: TourProfileFileField;
  dealSheet: TourProfileFileField;
  agencySales: TourProfileFileField;
  marketingManual: TourProfileFileField;
  marketingMaterial: TourProfileFileField;
  vipPdf: TourProfileFileField;
  preSalePasscode: string | null;
  seatHoldRequirements: string | null;
}

interface FieldSpec {
  key: keyof TourProfileFilesResponse & string;
  /** Property on the Tour entity that stores the LinkID. */
  entityProp: string;
  urlField: keyof UpdateTourProfileFilesDto;
  nameField: keyof UpdateTourProfileFilesDto;
  removeField: keyof UpdateTourProfileFilesDto;
  fileField: TourProfileFileKey;
  defaultName: string;
  linkType: string;
  /** False for fields whose DB column hasn't been migrated yet. */
  migrated: boolean;
}

/**
 * Only fields marked `migrated: true` are backed by a real DB column today.
 * After running backend/migrations/2026-08-20-tour-profile-tabs.sql, re-add
 * the corresponding @Column decorators on Tour/Engagement and flip the flags.
 */
const FIELDS: FieldSpec[] = [
  {
    key: 'techRider',
    entityProp: 'techRiderLinkId',
    urlField: 'techRiderUrl',
    nameField: 'techRiderName',
    removeField: 'removeTechRider',
    fileField: 'techRiderFile',
    defaultName: 'Tech Rider Link',
    linkType: 'Document',
    migrated: true,
  },
  {
    key: 'dealSheet',
    entityProp: 'dealSheetLinkId',
    urlField: 'dealSheetUrl',
    nameField: 'dealSheetName',
    removeField: 'removeDealSheet',
    fileField: 'dealSheetFile',
    defaultName: 'Deal Sheet',
    linkType: 'Document',
    migrated: false,
  },
  {
    key: 'agencySales',
    entityProp: 'agencySalesLinkId',
    urlField: 'agencySalesUrl',
    nameField: 'agencySalesName',
    removeField: 'removeAgencySales',
    fileField: 'agencySalesFile',
    defaultName: 'Agency Sales Link',
    linkType: 'Document',
    migrated: false,
  },
  {
    key: 'marketingManual',
    entityProp: 'marketingManualLinkId',
    urlField: 'marketingManualUrl',
    nameField: 'marketingManualName',
    removeField: 'removeMarketingManual',
    fileField: 'marketingManualFile',
    defaultName: 'Marketing Manual',
    linkType: 'Document',
    migrated: false,
  },
  {
    key: 'marketingMaterial',
    entityProp: 'marketingMaterialLinkId',
    urlField: 'marketingMaterialUrl',
    nameField: 'marketingMaterialName',
    removeField: 'removeMarketingMaterial',
    fileField: 'marketingMaterialFile',
    defaultName: 'Marketing Material',
    linkType: 'Document',
    migrated: false,
  },
  {
    key: 'vipPdf',
    entityProp: 'vipPdfLinkId',
    urlField: 'vipPdfUrl',
    nameField: 'vipPdfName',
    removeField: 'removeVipPdf',
    fileField: 'vipPdfFile',
    defaultName: 'VIP PDF',
    linkType: 'Document',
    migrated: false,
  },
];

const PRESALE_PASSCODE_MIGRATED = false;
const SEAT_HOLD_REQUIREMENTS_MIGRATED = false;

const MIGRATION_MSG =
  'Requires backend/migrations/2026-08-20-tour-profile-tabs.sql to be applied.';

@Injectable()
export class TourProfileFilesService {
  constructor(
    @InjectRepository(Tour) private readonly tourRepo: Repository<Tour>,
    @InjectRepository(Link) private readonly linkRepo: Repository<Link>,
  ) {}

  async get(tourId: number): Promise<TourProfileFilesResponse> {
    const tour = await this.tourRepo.findOne({ where: { tourId } });
    if (!tour) throw new NotFoundException(`Tour ${tourId} not found`);
    const tourAny = tour as unknown as Record<string, unknown>;

    const linkIds = FIELDS.filter((f) => f.migrated)
      .map((f) => tourAny[f.entityProp])
      .filter((id): id is number => typeof id === 'number');
    const links =
      linkIds.length > 0 ? await this.linkRepo.findByIds(linkIds) : [];
    const byId = new Map(links.map((l) => [l.linkId, l]));

    const result: TourProfileFilesResponse = {
      tourId: tour.tourId,
      preSalePasscode: PRESALE_PASSCODE_MIGRATED
        ? ((tourAny.preSalePasscode as string | null) ?? null)
        : null,
      seatHoldRequirements: SEAT_HOLD_REQUIREMENTS_MIGRATED
        ? ((tourAny.seatHoldRequirements as string | null) ?? null)
        : null,
      techRider: emptyField(),
      dealSheet: emptyField(),
      agencySales: emptyField(),
      marketingManual: emptyField(),
      marketingMaterial: emptyField(),
      vipPdf: emptyField(),
    };
    for (const f of FIELDS) {
      if (!f.migrated) continue;
      const linkId = tourAny[f.entityProp];
      const link = typeof linkId === 'number' ? byId.get(linkId) : undefined;
      (result[f.key as keyof TourProfileFilesResponse] as TourProfileFileField) =
        {
          linkId: typeof linkId === 'number' ? linkId : null,
          linkUrl: link?.linkUrl ?? null,
          linkName: link?.linkName ?? null,
        };
    }
    return result;
  }

  async update(
    tourId: number,
    dto: UpdateTourProfileFilesDto,
    files: Partial<Record<TourProfileFileKey, Express.Multer.File[]>> = {},
  ): Promise<TourProfileFilesResponse> {
    const tour = await this.tourRepo.findOne({ where: { tourId } });
    if (!tour) throw new NotFoundException(`Tour ${tourId} not found`);
    const tourAny = tour as unknown as Record<string, unknown>;

    if (dto.preSalePasscode !== undefined && !PRESALE_PASSCODE_MIGRATED) {
      throw new NotImplementedException(
        `Pre-Sale Passcode is pending DB migration. ${MIGRATION_MSG}`,
      );
    }
    if (
      dto.seatHoldRequirements !== undefined &&
      !SEAT_HOLD_REQUIREMENTS_MIGRATED
    ) {
      throw new NotImplementedException(
        `Seat Hold Requirements is pending DB migration. ${MIGRATION_MSG}`,
      );
    }

    if (dto.preSalePasscode !== undefined && PRESALE_PASSCODE_MIGRATED) {
      const v = trimOrNull(dto.preSalePasscode);
      tourAny.preSalePasscode = v == null ? null : v.slice(0, 200);
    }
    if (
      dto.seatHoldRequirements !== undefined &&
      SEAT_HOLD_REQUIREMENTS_MIGRATED
    ) {
      const v = trimOrNull(dto.seatHoldRequirements);
      tourAny.seatHoldRequirements = v == null ? null : v.slice(0, 500);
    }

    for (const spec of FIELDS) {
      const uploaded = files[spec.fileField]?.[0];
      const removeFlag = dto[spec.removeField] === true;
      const urlProvided = spec.urlField in dto;
      const nameProvided = spec.nameField in dto;

      const touched = !!uploaded || removeFlag || urlProvided || nameProvided;
      if (!touched) continue;

      if (!spec.migrated) {
        throw new NotImplementedException(
          `${spec.defaultName} is pending DB migration. ${MIGRATION_MSG}`,
        );
      }

      if (uploaded) {
        const publicPath =
          `/uploads/tour-profile-files/${uploaded.filename}`.slice(0, 2048);
        const safeName = sanitizeFileName(
          (dto[spec.nameField] as string | null | undefined) ??
            uploaded.originalname ??
            spec.defaultName,
        );
        const link = await this.linkRepo.save(
          this.linkRepo.create({
            linkType: spec.linkType,
            linkUrl: publicPath,
            linkPath: publicPath.slice(0, 1024),
            linkName: safeName.slice(0, 255) || spec.defaultName,
          }),
        );
        tourAny[spec.entityProp] = link.linkId;
        continue;
      }

      if (removeFlag) {
        tourAny[spec.entityProp] = null;
        continue;
      }

      if (urlProvided) {
        const url = trimOrNull(dto[spec.urlField] as string | null);
        if (!url) {
          tourAny[spec.entityProp] = null;
        } else {
          const name =
            (nameProvided
              ? trimOrNull(dto[spec.nameField] as string | null)
              : null) ?? spec.defaultName;
          const existingId = tourAny[spec.entityProp];
          if (typeof existingId === 'number') {
            const existing = await this.linkRepo.findOne({
              where: { linkId: existingId },
            });
            if (existing) {
              existing.linkUrl = url.slice(0, 2048);
              existing.linkPath = url.slice(0, 1024);
              existing.linkName = name.slice(0, 255);
              existing.linkType = spec.linkType;
              await this.linkRepo.save(existing);
              continue;
            }
          }
          const link = await this.linkRepo.save(
            this.linkRepo.create({
              linkType: spec.linkType,
              linkUrl: url.slice(0, 2048),
              linkPath: url.slice(0, 1024),
              linkName: name.slice(0, 255),
            }),
          );
          tourAny[spec.entityProp] = link.linkId;
        }
      } else if (nameProvided) {
        const existingId = tourAny[spec.entityProp];
        if (typeof existingId === 'number') {
          const existing = await this.linkRepo.findOne({
            where: { linkId: existingId },
          });
          if (existing) {
            const name =
              trimOrNull(dto[spec.nameField] as string | null) ??
              spec.defaultName;
            existing.linkName = name.slice(0, 255);
            await this.linkRepo.save(existing);
          }
        }
      }
    }

    await this.tourRepo.save(tour);
    return this.get(tourId);
  }
}

function emptyField(): TourProfileFileField {
  return { linkId: null, linkUrl: null, linkName: null };
}

function trimOrNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length > 0 ? t : null;
}

function sanitizeFileName(name: string | null | undefined): string {
  const s = String(name ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f]/g, '')
    .trim();
  if (!s) throw new BadRequestException('File name is required.');
  return s;
}
