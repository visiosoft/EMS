import { EngagementVipPdfService } from './engagement-vip-pdf.service';
declare class UpdateEngagementVipPdfDto {
    vipPdfUrl?: string | null;
    vipPdfName?: string | null;
    removeVipPdf?: boolean;
}
export declare class EngagementVipPdfController {
    private readonly svc;
    constructor(svc: EngagementVipPdfService);
    get(id: number): Promise<import("./engagement-vip-pdf.service").EngagementVipPdfResponse>;
    update(id: number, dto: UpdateEngagementVipPdfDto, vipPdfFile?: Express.Multer.File): Promise<import("./engagement-vip-pdf.service").EngagementVipPdfResponse>;
}
export {};
