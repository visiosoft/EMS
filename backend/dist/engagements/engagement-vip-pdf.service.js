"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngagementVipPdfService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const engagement_entity_1 = require("../entities/engagement.entity");
const link_entity_1 = require("../entities/link.entity");
const tour_entity_1 = require("../entities/tour.entity");
let EngagementVipPdfService = class EngagementVipPdfService {
    engagementRepo;
    tourRepo;
    linkRepo;
    constructor(engagementRepo, tourRepo, linkRepo) {
        this.engagementRepo = engagementRepo;
        this.tourRepo = tourRepo;
        this.linkRepo = linkRepo;
    }
    async get(engagementId) {
        const engagement = await this.engagementRepo.findOne({
            where: { engagementId },
        });
        if (!engagement)
            throw new common_1.NotFoundException(`Engagement ${engagementId} not found`);
        const engagementAny = engagement;
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
        const tourAny = tour;
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
    async update(engagementId, input) {
        const engagement = await this.engagementRepo.findOne({
            where: { engagementId },
        });
        if (!engagement)
            throw new common_1.NotFoundException(`Engagement ${engagementId} not found`);
        if (input.removeVipPdf || input.vipPdfUrl === '') {
            engagement.vipPdfLinkId = null;
        }
        else if (input.uploadedFile) {
            const publicPath = `/uploads/tour-profile-files/${input.uploadedFile.filename}`;
            const link = await this.linkRepo.save(this.linkRepo.create({
                linkType: 'Document',
                linkUrl: publicPath,
                linkPath: publicPath,
                linkName: (input.vipPdfName?.trim() || input.uploadedFile.originalname || 'VIP PDF').slice(0, 255),
            }));
            engagement.vipPdfLinkId = link.linkId;
        }
        else if (input.vipPdfUrl !== undefined) {
            const url = input.vipPdfUrl?.trim() ?? '';
            if (!url) {
                engagement.vipPdfLinkId = null;
            }
            else {
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
        }
        else if (input.vipPdfName !== undefined && engagement.vipPdfLinkId) {
            const link = await this.linkRepo.findOne({ where: { linkId: engagement.vipPdfLinkId } });
            if (!link)
                throw new common_1.BadRequestException('VIP PDF link was not found.');
            link.linkName = (input.vipPdfName?.trim() || 'VIP PDF').slice(0, 255);
            await this.linkRepo.save(link);
        }
        await this.engagementRepo.save(engagement);
        const isAddOrEdit = !input.removeVipPdf &&
            input.vipPdfUrl !== '' &&
            (input.uploadedFile !== undefined ||
                input.vipPdfUrl !== undefined ||
                input.vipPdfName !== undefined);
        if (isAddOrEdit && typeof engagement.vipPdfLinkId === 'number') {
            const tour = await this.tourRepo.findOne({
                where: { tourId: engagement.tourId },
            });
            if (!tour)
                throw new common_1.NotFoundException(`Tour ${engagement.tourId} not found`);
            tour.vipPdfLinkId = engagement.vipPdfLinkId;
            tour.bookingDocumentTypes = JSON.stringify(addBookingDocumentType(tour.bookingDocumentTypes, 'vipPdf'));
            await this.tourRepo.save(tour);
        }
        return this.get(engagementId);
    }
};
exports.EngagementVipPdfService = EngagementVipPdfService;
exports.EngagementVipPdfService = EngagementVipPdfService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(engagement_entity_1.Engagement)),
    __param(1, (0, typeorm_1.InjectRepository)(tour_entity_1.Tour)),
    __param(2, (0, typeorm_1.InjectRepository)(link_entity_1.Link)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], EngagementVipPdfService);
function addBookingDocumentType(value, documentType) {
    if (!value)
        return [documentType];
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed))
            return [documentType];
        const types = parsed.filter((item) => typeof item === 'string');
        return types.includes(documentType) ? types : [...types, documentType];
    }
    catch {
        return [documentType];
    }
}
//# sourceMappingURL=engagement-vip-pdf.service.js.map