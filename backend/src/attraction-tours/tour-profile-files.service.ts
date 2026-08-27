import {
  BadRequestException,
  Injectable,
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
  stagehandList: TourProfileFileField;
  linesetSchedule: TourProfileFileField;
  cateringRider: TourProfileFileField;
  stageDimensions: TourProfileFileField;
  travelRequirements: TourProfileFileField;
  soundRequirements: TourProfileFileField;
  videoRequirements: TourProfileFileField;
  lightingRequirements: TourProfileFileField;
  heavyEquipmentRequirements: TourProfileFileField;
  marketingManual: TourProfileFileField;
  marketingMaterial: TourProfileFileField;
  vipPdf: TourProfileFileField;
  seatHoldRequirements: string | null;
  bookingDocumentTypes: string[];
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
}

/**
 * All fields are backed by nullable dbo.Tour LinkID columns.
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
  },
  {
    key: 'stagehandList', entityProp: 'stagehandListLinkId', urlField: 'stagehandListUrl', nameField: 'stagehandListName', removeField: 'removeStagehandList', fileField: 'stagehandListFile', defaultName: 'Stagehand List', linkType: 'Document',
  },
  {
    key: 'linesetSchedule', entityProp: 'linesetScheduleLinkId', urlField: 'linesetScheduleUrl', nameField: 'linesetScheduleName', removeField: 'removeLinesetSchedule', fileField: 'linesetScheduleFile', defaultName: 'Lineset Schedule', linkType: 'Document',
  },
  {
    key: 'cateringRider', entityProp: 'cateringRiderLinkId', urlField: 'cateringRiderUrl', nameField: 'cateringRiderName', removeField: 'removeCateringRider', fileField: 'cateringRiderFile', defaultName: 'Catering Rider', linkType: 'Document',
  },
  {
    key: 'stageDimensions', entityProp: 'stageDimensionsLinkId', urlField: 'stageDimensionsUrl', nameField: 'stageDimensionsName', removeField: 'removeStageDimensions', fileField: 'stageDimensionsFile', defaultName: 'Stage Dimensions', linkType: 'Document',
  },
  {
    key: 'travelRequirements', entityProp: 'travelRequirementsLinkId', urlField: 'travelRequirementsUrl', nameField: 'travelRequirementsName', removeField: 'removeTravelRequirements', fileField: 'travelRequirementsFile', defaultName: 'Travel Requirements', linkType: 'Document',
  },
  {
    key: 'soundRequirements', entityProp: 'soundRequirementsLinkId', urlField: 'soundRequirementsUrl', nameField: 'soundRequirementsName', removeField: 'removeSoundRequirements', fileField: 'soundRequirementsFile', defaultName: 'Sound Requirements', linkType: 'Document',
  },
  {
    key: 'videoRequirements', entityProp: 'videoRequirementsLinkId', urlField: 'videoRequirementsUrl', nameField: 'videoRequirementsName', removeField: 'removeVideoRequirements', fileField: 'videoRequirementsFile', defaultName: 'Video Requirements', linkType: 'Document',
  },
  {
    key: 'lightingRequirements', entityProp: 'lightingRequirementsLinkId', urlField: 'lightingRequirementsUrl', nameField: 'lightingRequirementsName', removeField: 'removeLightingRequirements', fileField: 'lightingRequirementsFile', defaultName: 'Lighting Requirements', linkType: 'Document',
  },
  {
    key: 'heavyEquipmentRequirements', entityProp: 'heavyEquipmentRequirementsLinkId', urlField: 'heavyEquipmentRequirementsUrl', nameField: 'heavyEquipmentRequirementsName', removeField: 'removeHeavyEquipmentRequirements', fileField: 'heavyEquipmentRequirementsFile', defaultName: 'Heavy Equipment Requirements', linkType: 'Document',
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
  },
];

const BOOKING_DOCUMENT_KEYS = new Set([
  'stagehandList', 'linesetSchedule', 'cateringRider', 'stageDimensions',
  'travelRequirements', 'soundRequirements', 'videoRequirements',
  'lightingRequirements', 'heavyEquipmentRequirements', 'dealSheet',
  'agencySales', 'vipPdf',
]);

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

    const linkIds = FIELDS.map((f) => tourAny[f.entityProp])
      .filter((id): id is number => typeof id === 'number');
    const links =
      linkIds.length > 0 ? await this.linkRepo.findByIds(linkIds) : [];
    const byId = new Map(links.map((l) => [l.linkId, l]));

    const result: TourProfileFilesResponse = {
      tourId: tour.tourId,
      seatHoldRequirements: (tourAny.seatHoldRequirements as string | null) ?? null,
      bookingDocumentTypes: parseBookingDocumentTypes(tourAny.bookingDocumentTypes),
      techRider: emptyField(),
      dealSheet: emptyField(),
      agencySales: emptyField(),
      stagehandList: emptyField(),
      linesetSchedule: emptyField(),
      cateringRider: emptyField(),
      stageDimensions: emptyField(),
      travelRequirements: emptyField(),
      soundRequirements: emptyField(),
      videoRequirements: emptyField(),
      lightingRequirements: emptyField(),
      heavyEquipmentRequirements: emptyField(),
      marketingManual: emptyField(),
      marketingMaterial: emptyField(),
      vipPdf: emptyField(),
    };
    for (const f of FIELDS) {
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

    if (dto.seatHoldRequirements !== undefined) {
      const v = trimOrNull(dto.seatHoldRequirements);
      tourAny.seatHoldRequirements = v == null ? null : v.slice(0, 500);
    }
    if (dto.bookingDocumentTypes !== undefined) {
      tourAny.bookingDocumentTypes = JSON.stringify(
        parseBookingDocumentTypes(dto.bookingDocumentTypes),
      );
    }

    for (const spec of FIELDS) {
      const uploaded = files[spec.fileField]?.[0];
      const removeFlag = dto[spec.removeField] === true;
      // Optional DTO properties can exist with an undefined value after
      // transformation. Only an actual multipart value may update a link.
      const urlProvided = dto[spec.urlField] !== undefined;
      const nameProvided = dto[spec.nameField] !== undefined;

      const touched = !!uploaded || removeFlag || urlProvided || nameProvided;
      if (!touched) continue;

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
          const matchingLink = await this.linkRepo.findOne({
            where: { linkUrl: url.slice(0, 2048) },
          });
          if (matchingLink) {
            tourAny[spec.entityProp] = matchingLink.linkId;
            continue;
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

function parseBookingDocumentTypes(value: unknown): string[] {
  if (typeof value !== 'string' || value.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((key): key is string =>
      typeof key === 'string' && BOOKING_DOCUMENT_KEYS.has(key),
    ))];
  } catch {
    throw new BadRequestException('Booking document types must be a JSON array.');
  }
}
