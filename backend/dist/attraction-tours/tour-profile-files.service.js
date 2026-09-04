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
exports.TourProfileFilesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const link_entity_1 = require("../entities/link.entity");
const tour_entity_1 = require("../entities/tour.entity");
const FIELDS = [
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
let TourProfileFilesService = class TourProfileFilesService {
    tourRepo;
    linkRepo;
    constructor(tourRepo, linkRepo) {
        this.tourRepo = tourRepo;
        this.linkRepo = linkRepo;
    }
    async get(tourId) {
        const tour = await this.tourRepo.findOne({ where: { tourId } });
        if (!tour)
            throw new common_1.NotFoundException(`Tour ${tourId} not found`);
        const tourAny = tour;
        const linkIds = FIELDS.map((f) => tourAny[f.entityProp])
            .filter((id) => typeof id === 'number');
        const links = linkIds.length > 0 ? await this.linkRepo.findByIds(linkIds) : [];
        const byId = new Map(links.map((l) => [l.linkId, l]));
        const result = {
            tourId: tour.tourId,
            seatHoldRequirements: tourAny.seatHoldRequirements ?? null,
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
            result[f.key] =
                {
                    linkId: typeof linkId === 'number' ? linkId : null,
                    linkUrl: link?.linkUrl ?? null,
                    linkName: link?.linkName ?? null,
                };
        }
        return result;
    }
    async update(tourId, dto, files = {}) {
        const tour = await this.tourRepo.findOne({ where: { tourId } });
        if (!tour)
            throw new common_1.NotFoundException(`Tour ${tourId} not found`);
        const tourAny = tour;
        if (dto.seatHoldRequirements !== undefined) {
            const v = trimOrNull(dto.seatHoldRequirements);
            tourAny.seatHoldRequirements = v == null ? null : v.slice(0, 500);
        }
        if (dto.bookingDocumentTypes !== undefined) {
            tourAny.bookingDocumentTypes = JSON.stringify(parseBookingDocumentTypes(dto.bookingDocumentTypes));
        }
        for (const spec of FIELDS) {
            const uploaded = files[spec.fileField]?.[0];
            const removeFlag = dto[spec.removeField] === true;
            const urlProvided = dto[spec.urlField] !== undefined;
            const nameProvided = dto[spec.nameField] !== undefined;
            const touched = !!uploaded || removeFlag || urlProvided || nameProvided;
            if (!touched)
                continue;
            if (uploaded) {
                const publicPath = `/uploads/tour-profile-files/${uploaded.filename}`.slice(0, 2048);
                const safeName = sanitizeFileName(dto[spec.nameField] ??
                    uploaded.originalname ??
                    spec.defaultName);
                const link = await this.linkRepo.save(this.linkRepo.create({
                    linkType: spec.linkType,
                    linkUrl: publicPath,
                    linkPath: publicPath.slice(0, 1024),
                    linkName: safeName.slice(0, 255) || spec.defaultName,
                }));
                tourAny[spec.entityProp] = link.linkId;
                continue;
            }
            if (removeFlag) {
                tourAny[spec.entityProp] = null;
                continue;
            }
            if (urlProvided) {
                const url = trimOrNull(dto[spec.urlField]);
                if (!url) {
                    tourAny[spec.entityProp] = null;
                }
                else {
                    const name = (nameProvided
                        ? trimOrNull(dto[spec.nameField])
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
                    const link = await this.linkRepo.save(this.linkRepo.create({
                        linkType: spec.linkType,
                        linkUrl: url.slice(0, 2048),
                        linkPath: url.slice(0, 1024),
                        linkName: name.slice(0, 255),
                    }));
                    tourAny[spec.entityProp] = link.linkId;
                }
            }
            else if (nameProvided) {
                const existingId = tourAny[spec.entityProp];
                if (typeof existingId === 'number') {
                    const existing = await this.linkRepo.findOne({
                        where: { linkId: existingId },
                    });
                    if (existing) {
                        const name = trimOrNull(dto[spec.nameField]) ??
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
};
exports.TourProfileFilesService = TourProfileFilesService;
exports.TourProfileFilesService = TourProfileFilesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tour_entity_1.Tour)),
    __param(1, (0, typeorm_1.InjectRepository)(link_entity_1.Link)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], TourProfileFilesService);
function emptyField() {
    return { linkId: null, linkUrl: null, linkName: null };
}
function trimOrNull(v) {
    if (v == null)
        return null;
    const t = String(v).trim();
    return t.length > 0 ? t : null;
}
function sanitizeFileName(name) {
    const s = String(name ?? '')
        .replace(/[\x00-\x1f]/g, '')
        .trim();
    if (!s)
        throw new common_1.BadRequestException('File name is required.');
    return s;
}
function parseBookingDocumentTypes(value) {
    if (typeof value !== 'string' || value.trim() === '')
        return [];
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed))
            return [];
        return [...new Set(parsed.filter((key) => typeof key === 'string' && BOOKING_DOCUMENT_KEYS.has(key)))];
    }
    catch {
        throw new common_1.BadRequestException('Booking document types must be a JSON array.');
    }
}
//# sourceMappingURL=tour-profile-files.service.js.map