import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Engagement } from '../entities/engagement.entity';
import { Link } from '../entities/link.entity';
import { Tour } from '../entities/tour.entity';

export interface EngagementVipPdfResponse {
  engagementId: number;
  linkId: number | null;
  linkUrl: string | null;
  linkName: string | null;
  source: 'engagement' | 'tour' | 'none';
  hasOverride: boolean;
}

export interface UpdateEngagementVipPdfInput {
  vipPdfUrl?: string | null;
  vipPdfName?: string | null;
  removeVipPdf?: boolean;
  uploadedFile?: Express.Multer.File;
}

/**
 * VIP PDF override lives on dbo.Engagement.VipPdfLinkID, and its Tour default
 * lives on dbo.Tour.VipPdfLinkID.
 */
@Injectable()
export class EngagementVipPdfService {
  constructor(
    @InjectRepository(Engagement)
    private readonly engagementRepo: Repository<Engagement>,
    @InjectRepository(Tour) private readonly tourRepo: Repository<Tour>,
    @InjectRepository(Link) private readonly linkRepo: Repository<Link>,
  ) {}

  async get(engagementId: number): Promise<EngagementVipPdfResponse> {
    const engagement = await this.engagementRepo.findOne({
      where: { engagementId },
    });
    if (!engagement)
      throw new NotFoundException(`Engagement ${engagementId} not found`);

    const engagementAny = engagement as unknown as Record<string, unknown>;
    const engVipPdfLinkId = engagementAny.vipPdfLinkId;
    if (typeof engVipPdfLinkId === 'number') {
      const link = await this.linkRepo.findOne({
        where: { linkId: engVipPdfLinkId },
      });
      return {
        engagementId,
        linkId: engVipPdfLinkId,
        linkUrl: link?.linkUrl ?? null,
        linkName: link?.linkName ?? null,
        source: 'engagement',
        hasOverride: true,
      };
    }

    const tour = await this.tourRepo.findOne({
      where: { tourId: engagement.tourId },
    });
    const tourAny = tour as unknown as Record<string, unknown> | null;
    const tourVipPdfLinkId = tourAny?.vipPdfLinkId;
    if (typeof tourVipPdfLinkId === 'number') {
      const link = await this.linkRepo.findOne({
        where: { linkId: tourVipPdfLinkId },
      });
      return {
        engagementId,
        linkId: tourVipPdfLinkId,
        linkUrl: link?.linkUrl ?? null,
        linkName: link?.linkName ?? null,
        source: 'tour',
        hasOverride: false,
      };
    }

    return {
      engagementId,
      linkId: null,
      linkUrl: null,
      linkName: null,
      source: 'none',
      hasOverride: false,
    };
  }

  async update(
    engagementId: number,
    input: UpdateEngagementVipPdfInput,
  ): Promise<EngagementVipPdfResponse> {
    const engagement = await this.engagementRepo.findOne({
      where: { engagementId },
    });
    if (!engagement)
      throw new NotFoundException(`Engagement ${engagementId} not found`);

    if (input.removeVipPdf || input.vipPdfUrl === '') {
      engagement.vipPdfLinkId = null;
    } else if (input.uploadedFile) {
      const publicPath = `/uploads/tour-profile-files/${input.uploadedFile.filename}`;
      const link = await this.linkRepo.save(this.linkRepo.create({
        linkType: 'Document',
        linkUrl: publicPath,
        linkPath: publicPath,
        linkName: (input.vipPdfName?.trim() || input.uploadedFile.originalname || 'VIP PDF').slice(0, 255),
      }));
      engagement.vipPdfLinkId = link.linkId;
    } else if (input.vipPdfUrl !== undefined) {
      const url = input.vipPdfUrl?.trim() ?? '';
      if (!url) {
        engagement.vipPdfLinkId = null;
      } else {
        const matchingLink = await this.linkRepo.findOne({
          where: { linkUrl: url.slice(0, 2048) },
        });
        const existing = engagement.vipPdfLinkId
          ? await this.linkRepo.findOne({ where: { linkId: engagement.vipPdfLinkId } })
          : null;
        const link = matchingLink ?? existing ??
          this.linkRepo.create({ linkType: 'Document', linkUrl: url, linkPath: url, linkName: 'VIP PDF' });
        link.linkType = 'Document';
        link.linkUrl = url.slice(0, 2048);
        link.linkPath = url.slice(0, 1024);
        link.linkName = (input.vipPdfName?.trim() || link.linkName || 'VIP PDF').slice(0, 255);
        const saved = await this.linkRepo.save(link);
        engagement.vipPdfLinkId = saved.linkId;
      }
    } else if (input.vipPdfName !== undefined && engagement.vipPdfLinkId) {
      const link = await this.linkRepo.findOne({ where: { linkId: engagement.vipPdfLinkId } });
      if (!link) throw new BadRequestException('VIP PDF link was not found.');
      link.linkName = (input.vipPdfName?.trim() || 'VIP PDF').slice(0, 255);
      await this.linkRepo.save(link);
    }
    await this.engagementRepo.save(engagement);

    const isAddOrEdit =
      !input.removeVipPdf &&
      input.vipPdfUrl !== '' &&
      (input.uploadedFile !== undefined ||
        input.vipPdfUrl !== undefined ||
        input.vipPdfName !== undefined);
    if (isAddOrEdit && typeof engagement.vipPdfLinkId === 'number') {
      const tour = await this.tourRepo.findOne({
        where: { tourId: engagement.tourId },
      });
      if (!tour) throw new NotFoundException(`Tour ${engagement.tourId} not found`);
      tour.vipPdfLinkId = engagement.vipPdfLinkId;
      tour.bookingDocumentTypes = JSON.stringify(
        addBookingDocumentType(tour.bookingDocumentTypes, 'vipPdf'),
      );
      await this.tourRepo.save(tour);
    }
    return this.get(engagementId);
  }
}

function addBookingDocumentType(
  value: string | null,
  documentType: string,
): string[] {
  if (!value) return [documentType];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [documentType];
    const types = parsed.filter((item): item is string => typeof item === 'string');
    return types.includes(documentType) ? types : [...types, documentType];
  } catch {
    return [documentType];
  }
}
