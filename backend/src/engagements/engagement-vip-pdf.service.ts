import {
  Injectable,
  NotImplementedException,
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
 * lives on dbo.Tour.VipPdfLinkID. Both columns are pending
 * backend/migrations/2026-08-20-tour-profile-tabs.sql. Until the migration is
 * applied, GET returns "no VIP PDF" and PATCH rejects with 501.
 */
const MIGRATED = false;

const MIGRATION_MSG =
  'Requires backend/migrations/2026-08-20-tour-profile-tabs.sql to be applied.';

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

    if (!MIGRATED) {
      return {
        engagementId,
        linkId: null,
        linkUrl: null,
        linkName: null,
        source: 'none',
        hasOverride: false,
      };
    }

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
    _input: UpdateEngagementVipPdfInput,
  ): Promise<EngagementVipPdfResponse> {
    if (!MIGRATED) {
      throw new NotImplementedException(
        `VIP PDF override is pending DB migration. ${MIGRATION_MSG}`,
      );
    }
    // When MIGRATED flips true, re-add the @Column decorators on
    // Engagement.vipPdfLinkId + Tour.vipPdfLinkId and restore the full
    // update logic (see git history for 2026-08-20-tour-profile-tabs).
    throw new NotImplementedException(
      'VIP PDF override update path is disabled until entities are re-decorated.',
    );
  }
}
