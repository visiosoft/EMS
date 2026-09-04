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
export declare class EngagementVipPdfService {
    private readonly engagementRepo;
    private readonly tourRepo;
    private readonly linkRepo;
    constructor(engagementRepo: Repository<Engagement>, tourRepo: Repository<Tour>, linkRepo: Repository<Link>);
    get(engagementId: number): Promise<EngagementVipPdfResponse>;
    update(engagementId: number, input: UpdateEngagementVipPdfInput): Promise<EngagementVipPdfResponse>;
}
