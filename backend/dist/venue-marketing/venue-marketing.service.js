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
exports.VenueMarketingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const venue_style_guide_entity_1 = require("../entities/venue-style-guide.entity");
const venue_marketing_specs_entity_1 = require("../entities/venue-marketing-specs.entity");
const venue_marketing_specs_localization_entity_1 = require("../entities/venue-marketing-specs-localization.entity");
const venue_marketing_specs_tag_entity_1 = require("../entities/venue-marketing-specs-tag.entity");
const venue_marketing_specs_file_spec_entity_1 = require("../entities/venue-marketing-specs-file-spec.entity");
const placement_category_entity_1 = require("../entities/placement-category.entity");
const medium_entity_1 = require("../entities/medium.entity");
const localization_option_entity_1 = require("../entities/localization-option.entity");
const tag_option_entity_1 = require("../entities/tag-option.entity");
const file_spec_option_entity_1 = require("../entities/file-spec-option.entity");
const file_format_option_entity_1 = require("../entities/file-format-option.entity");
const link_entity_1 = require("../entities/link.entity");
let VenueMarketingService = class VenueMarketingService {
    styleGuideRepo;
    specsRepo;
    localizationRepo;
    tagRepo;
    fileSpecRepo;
    placementCategoryRepo;
    mediumRepo;
    localizationOptionRepo;
    tagOptionRepo;
    fileSpecOptionRepo;
    fileFormatOptionRepo;
    linkRepo;
    dataSource;
    constructor(styleGuideRepo, specsRepo, localizationRepo, tagRepo, fileSpecRepo, placementCategoryRepo, mediumRepo, localizationOptionRepo, tagOptionRepo, fileSpecOptionRepo, fileFormatOptionRepo, linkRepo, dataSource) {
        this.styleGuideRepo = styleGuideRepo;
        this.specsRepo = specsRepo;
        this.localizationRepo = localizationRepo;
        this.tagRepo = tagRepo;
        this.fileSpecRepo = fileSpecRepo;
        this.placementCategoryRepo = placementCategoryRepo;
        this.mediumRepo = mediumRepo;
        this.localizationOptionRepo = localizationOptionRepo;
        this.tagOptionRepo = tagOptionRepo;
        this.fileSpecOptionRepo = fileSpecOptionRepo;
        this.fileFormatOptionRepo = fileFormatOptionRepo;
        this.linkRepo = linkRepo;
        this.dataSource = dataSource;
    }
    async getPlacementCategories() {
        return this.placementCategoryRepo.find({
            relations: ['medium'],
            order: { sortOrder: 'ASC', placementName: 'ASC' },
        });
    }
    async getMediums() {
        return this.mediumRepo.find({ order: { mediumName: 'ASC' } });
    }
    async getLocalizationOptions() {
        return this.localizationOptionRepo.find({ order: { sortOrder: 'ASC', localizationName: 'ASC' } });
    }
    async getTagOptions() {
        return this.tagOptionRepo.find({ order: { sortOrder: 'ASC', tagName: 'ASC' } });
    }
    async getFileSpecOptions() {
        return this.fileSpecOptionRepo.find({ order: { sortOrder: 'ASC', fileSpecName: 'ASC' } });
    }
    async getFileFormatOptions() {
        return this.fileFormatOptionRepo.find({ order: { sortOrder: 'ASC', fileFormatName: 'ASC' } });
    }
    async getVenueMarketing(venueId) {
        const specs = await this.specsRepo.find({
            where: { venueId },
            relations: ['placementCategory', 'placementCategory.medium', 'fileFormat', 'venueStyleGuide'],
            order: { venueMarketingSpecsId: 'ASC' },
        });
        const styleGuide = specs.find((s) => s.venueStyleGuide)?.venueStyleGuide ?? null;
        let logoUrl = null;
        if (styleGuide) {
            if (styleGuide.logoLinkId) {
                const logoLink = await this.linkRepo.findOne({
                    where: { linkId: styleGuide.logoLinkId },
                });
                logoUrl = logoLink?.linkUrl ?? null;
            }
            else {
                const logoLink = await this.linkRepo.findOne({
                    where: { linkName: 'VenueStyleGuideLogoUrl', linkPath: String(styleGuide.venueStyleGuideId) },
                });
                logoUrl = logoLink?.linkUrl ?? null;
            }
        }
        const specIds = specs.map((s) => s.venueMarketingSpecsId);
        let localizations = [];
        let tags = [];
        let fileSpecs = [];
        if (specIds.length > 0) {
            [localizations, tags, fileSpecs] = await Promise.all([
                this.localizationRepo.find({
                    where: { venueMarketingSpecsId: (0, typeorm_2.In)(specIds) },
                    relations: ['localizationOption'],
                }),
                this.tagRepo.find({
                    where: { venueMarketingSpecsId: (0, typeorm_2.In)(specIds) },
                    relations: ['tagOption'],
                }),
                this.fileSpecRepo.find({
                    where: { venueMarketingSpecsId: (0, typeorm_2.In)(specIds) },
                    relations: ['fileSpecOption'],
                }),
            ]);
        }
        return {
            styleGuideEnabled: specs.length > 0 ? specs[0].styleGuideEnabled : false,
            styleGuide: styleGuide
                ? {
                    venueStyleGuideId: styleGuide.venueStyleGuideId,
                    font: styleGuide.font,
                    primaryColors: styleGuide.primaryColors,
                    accentColors: styleGuide.accentColors,
                    notes: styleGuide.notes,
                    logoUrl,
                }
                : null,
            specs: specs.map((spec) => ({
                venueMarketingSpecsId: spec.venueMarketingSpecsId,
                fileName: spec.fileName,
                placementCategoryId: spec.placementCategoryId,
                placementCategoryName: spec.placementCategory?.placementName ?? null,
                mediumName: spec.placementCategory?.medium?.mediumName ?? null,
                sizeUnit: spec.placementCategory?.sizeUnit ?? null,
                graphicSizeHorizontal: spec.graphicSizeHorizontal,
                graphicSizeVertical: spec.graphicSizeVertical,
                fileFormatOptionId: spec.fileFormatOptionId,
                fileFormatName: spec.fileFormat?.fileFormatName ?? null,
                notes: spec.notes,
                localizations: localizations
                    .filter((l) => l.venueMarketingSpecsId === spec.venueMarketingSpecsId)
                    .map((l) => ({
                    localizationOptionId: l.localizationOptionId,
                    localizationName: l.localizationOption?.localizationName ?? null,
                    customValue: l.customValue,
                })),
                tags: tags
                    .filter((t) => t.venueMarketingSpecsId === spec.venueMarketingSpecsId)
                    .map((t) => ({
                    tagOptionId: t.tagOptionId,
                    tagName: t.tagOption?.tagName ?? null,
                })),
                fileSpecs: fileSpecs
                    .filter((f) => f.venueMarketingSpecsId === spec.venueMarketingSpecsId)
                    .map((f) => ({
                    fileSpecOptionId: f.fileSpecOptionId,
                    fileSpecName: f.fileSpecOption?.fileSpecName ?? null,
                    customValue: f.customValue,
                })),
            })),
        };
    }
    async saveVenueMarketing(venueId, dto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            let styleGuideId = null;
            if (dto.styleGuideEnabled && dto.styleGuide) {
                const existingSpec = await this.specsRepo.findOne({
                    where: { venueId },
                    relations: ['venueStyleGuide'],
                });
                const existing = existingSpec?.venueStyleGuide ?? null;
                if (existing) {
                    existing.font = dto.styleGuide.font ?? null;
                    existing.primaryColors = dto.styleGuide.primaryColors ?? null;
                    existing.accentColors = dto.styleGuide.accentColors ?? null;
                    existing.notes = dto.styleGuide.notes ?? null;
                    const saved = await queryRunner.manager.save(existing);
                    styleGuideId = saved.venueStyleGuideId;
                    await this.upsertLogoLink(queryRunner, saved, dto.styleGuide.logoUrl);
                }
                else {
                    const newGuide = this.styleGuideRepo.create({
                        font: dto.styleGuide.font ?? null,
                        primaryColors: dto.styleGuide.primaryColors ?? null,
                        accentColors: dto.styleGuide.accentColors ?? null,
                        notes: dto.styleGuide.notes ?? null,
                    });
                    const saved = await queryRunner.manager.save(newGuide);
                    styleGuideId = saved.venueStyleGuideId;
                    await this.upsertLogoLink(queryRunner, saved, dto.styleGuide.logoUrl);
                }
            }
            const existingSpecs = await this.specsRepo.find({ where: { venueId } });
            const incomingIds = dto.specs
                .filter((s) => s.venueMarketingSpecsId != null)
                .map((s) => s.venueMarketingSpecsId);
            const toDelete = existingSpecs.filter((s) => !incomingIds.includes(s.venueMarketingSpecsId));
            if (toDelete.length > 0) {
                const deleteIds = toDelete.map((s) => s.venueMarketingSpecsId);
                await queryRunner.manager.delete(venue_marketing_specs_localization_entity_1.VenueMarketingSpecsLocalization, {
                    venueMarketingSpecsId: (0, typeorm_2.In)(deleteIds),
                });
                await queryRunner.manager.delete(venue_marketing_specs_tag_entity_1.VenueMarketingSpecsTag, {
                    venueMarketingSpecsId: (0, typeorm_2.In)(deleteIds),
                });
                await queryRunner.manager.delete(venue_marketing_specs_file_spec_entity_1.VenueMarketingSpecsFileSpec, {
                    venueMarketingSpecsId: (0, typeorm_2.In)(deleteIds),
                });
                await queryRunner.manager.delete(venue_marketing_specs_entity_1.VenueMarketingSpecs, {
                    venueMarketingSpecsId: (0, typeorm_2.In)(deleteIds),
                });
            }
            if (dto.styleGuideEnabled && styleGuideId && dto.specs.length === 0) {
                const existingSpecForVenue = await this.specsRepo.findOne({ where: { venueId } });
                if (!existingSpecForVenue) {
                    const headerSpec = this.specsRepo.create({
                        venueId,
                        styleGuideEnabled: true,
                        venueStyleGuideId: styleGuideId,
                    });
                    await queryRunner.manager.save(headerSpec);
                }
                else {
                    await queryRunner.manager.update(venue_marketing_specs_entity_1.VenueMarketingSpecs, existingSpecForVenue.venueMarketingSpecsId, {
                        styleGuideEnabled: true,
                        venueStyleGuideId: styleGuideId,
                    });
                }
            }
            for (const specDto of dto.specs) {
                let specId;
                if (specDto.venueMarketingSpecsId) {
                    await queryRunner.manager.update(venue_marketing_specs_entity_1.VenueMarketingSpecs, specDto.venueMarketingSpecsId, {
                        styleGuideEnabled: dto.styleGuideEnabled,
                        venueStyleGuideId: styleGuideId,
                        fileName: specDto.fileName ?? null,
                        placementCategoryId: specDto.placementCategoryId ?? null,
                        graphicSizeHorizontal: specDto.graphicSizeHorizontal ?? null,
                        graphicSizeVertical: specDto.graphicSizeVertical ?? null,
                        fileFormatOptionId: specDto.fileFormatOptionId ?? null,
                        notes: specDto.notes ?? null,
                    });
                    specId = specDto.venueMarketingSpecsId;
                }
                else {
                    const newSpec = this.specsRepo.create({
                        venueId,
                        styleGuideEnabled: dto.styleGuideEnabled,
                        venueStyleGuideId: styleGuideId,
                        fileName: specDto.fileName ?? null,
                        placementCategoryId: specDto.placementCategoryId ?? null,
                        graphicSizeHorizontal: specDto.graphicSizeHorizontal ?? null,
                        graphicSizeVertical: specDto.graphicSizeVertical ?? null,
                        fileFormatOptionId: specDto.fileFormatOptionId ?? null,
                        notes: specDto.notes ?? null,
                    });
                    const saved = await queryRunner.manager.save(newSpec);
                    specId = saved.venueMarketingSpecsId;
                }
                await queryRunner.manager.delete(venue_marketing_specs_localization_entity_1.VenueMarketingSpecsLocalization, {
                    venueMarketingSpecsId: specId,
                });
                await queryRunner.manager.delete(venue_marketing_specs_tag_entity_1.VenueMarketingSpecsTag, {
                    venueMarketingSpecsId: specId,
                });
                await queryRunner.manager.delete(venue_marketing_specs_file_spec_entity_1.VenueMarketingSpecsFileSpec, {
                    venueMarketingSpecsId: specId,
                });
                if (specDto.localizations?.length) {
                    const rows = specDto.localizations.map((l) => this.localizationRepo.create({
                        venueMarketingSpecsId: specId,
                        localizationOptionId: l.localizationOptionId,
                        customValue: l.customValue ?? null,
                    }));
                    await queryRunner.manager.save(rows);
                }
                if (specDto.tags?.length) {
                    const rows = specDto.tags.map((t) => this.tagRepo.create({
                        venueMarketingSpecsId: specId,
                        tagOptionId: t.tagOptionId,
                    }));
                    await queryRunner.manager.save(rows);
                }
                if (specDto.fileSpecs?.length) {
                    const rows = specDto.fileSpecs.map((f) => this.fileSpecRepo.create({
                        venueMarketingSpecsId: specId,
                        fileSpecOptionId: f.fileSpecOptionId,
                        customValue: f.customValue ?? null,
                    }));
                    await queryRunner.manager.save(rows);
                }
            }
            await queryRunner.commitTransaction();
        }
        catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        }
        finally {
            await queryRunner.release();
        }
        return this.getVenueMarketing(venueId);
    }
    async deleteSpec(venueId, specId) {
        const spec = await this.specsRepo.findOne({
            where: { venueMarketingSpecsId: specId, venueId },
        });
        if (!spec) {
            throw new common_1.NotFoundException(`Spec ${specId} not found for venue ${venueId}`);
        }
        await this.localizationRepo.delete({ venueMarketingSpecsId: specId });
        await this.tagRepo.delete({ venueMarketingSpecsId: specId });
        await this.fileSpecRepo.delete({ venueMarketingSpecsId: specId });
        await this.specsRepo.delete({ venueMarketingSpecsId: specId });
    }
    async upsertLogoLink(queryRunner, styleGuide, logoUrl) {
        const trimmed = logoUrl?.trim() || null;
        const styleGuideIdStr = String(styleGuide.venueStyleGuideId);
        const existingLink = await this.linkRepo.findOne({
            where: { linkName: 'VenueStyleGuideLogoUrl', linkPath: styleGuideIdStr },
        });
        if (trimmed) {
            if (existingLink) {
                existingLink.linkUrl = trimmed;
                const savedLink = await queryRunner.manager.save(existingLink);
                styleGuide.logoLinkId = savedLink.linkId;
            }
            else {
                const newLink = this.linkRepo.create({
                    linkName: 'VenueStyleGuideLogoUrl',
                    linkType: 'URL',
                    linkUrl: trimmed,
                    linkPath: styleGuideIdStr,
                });
                const savedLink = await queryRunner.manager.save(newLink);
                styleGuide.logoLinkId = savedLink.linkId;
            }
        }
        else if (existingLink) {
            await queryRunner.manager.remove(existingLink);
            styleGuide.logoLinkId = null;
        }
        else {
            styleGuide.logoLinkId = null;
        }
        await queryRunner.manager.save(styleGuide);
    }
};
exports.VenueMarketingService = VenueMarketingService;
exports.VenueMarketingService = VenueMarketingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(venue_style_guide_entity_1.VenueStyleGuide)),
    __param(1, (0, typeorm_1.InjectRepository)(venue_marketing_specs_entity_1.VenueMarketingSpecs)),
    __param(2, (0, typeorm_1.InjectRepository)(venue_marketing_specs_localization_entity_1.VenueMarketingSpecsLocalization)),
    __param(3, (0, typeorm_1.InjectRepository)(venue_marketing_specs_tag_entity_1.VenueMarketingSpecsTag)),
    __param(4, (0, typeorm_1.InjectRepository)(venue_marketing_specs_file_spec_entity_1.VenueMarketingSpecsFileSpec)),
    __param(5, (0, typeorm_1.InjectRepository)(placement_category_entity_1.PlacementCategory)),
    __param(6, (0, typeorm_1.InjectRepository)(medium_entity_1.Medium)),
    __param(7, (0, typeorm_1.InjectRepository)(localization_option_entity_1.LocalizationOption)),
    __param(8, (0, typeorm_1.InjectRepository)(tag_option_entity_1.TagOption)),
    __param(9, (0, typeorm_1.InjectRepository)(file_spec_option_entity_1.FileSpecOption)),
    __param(10, (0, typeorm_1.InjectRepository)(file_format_option_entity_1.FileFormatOption)),
    __param(11, (0, typeorm_1.InjectRepository)(link_entity_1.Link)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], VenueMarketingService);
//# sourceMappingURL=venue-marketing.service.js.map