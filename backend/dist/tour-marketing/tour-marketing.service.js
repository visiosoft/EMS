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
exports.TourMarketingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tour_entity_1 = require("../entities/tour.entity");
const tour_ticketing_offer_code_entity_1 = require("../entities/tour-ticketing-offer-code.entity");
const save_tour_marketing_dto_1 = require("./dto/save-tour-marketing.dto");
let TourMarketingService = class TourMarketingService {
    tourRepo;
    offerCodeRepo;
    dataSource;
    constructor(tourRepo, offerCodeRepo, dataSource) {
        this.tourRepo = tourRepo;
        this.offerCodeRepo = offerCodeRepo;
        this.dataSource = dataSource;
    }
    getOfferCodeOptions() {
        return {
            assignedToOptions: save_tour_marketing_dto_1.OFFER_CODE_ASSIGNED_TO_VALUES,
            iaeSmsOptions: save_tour_marketing_dto_1.OFFER_CODE_IAESMS_VALUES,
            purposeOptions: save_tour_marketing_dto_1.OFFER_CODE_PURPOSE_VALUES,
        };
    }
    async getTourMarketing(tourId) {
        const tour = await this.tourRepo.findOne({ where: { tourId } });
        if (!tour)
            throw new common_1.NotFoundException(`Tour ${tourId} not found`);
        const directorRows = tour.talentAgencyCompanyId
            ? await this.dataSource.query(`SELECT TOP 1
            ci.[FirstName] + ' ' + ci.[LastName] AS fullName,
            ci.[Email] AS email,
            COALESCE(ci.[WorkPhone], ci.[CellPhone]) AS phone
           FROM dbo.ContactAssignment ca
           JOIN dbo.Contact c ON c.[ContactID] = ca.[ContactID]
           JOIN dbo.ContactInfo ci ON ci.[ContactInfoID] = c.[ContactInfoID]
           JOIN dbo.Role r ON r.[RoleID] = ca.[RoleID]
           WHERE ca.[CompanyID] = @0 AND r.[RoleName] = 'Marketing Director'
           ORDER BY ca.[ContactAssignmentID] ASC`, [tour.talentAgencyCompanyId])
            : [];
        const director = directorRows.length > 0 ? directorRows[0] : null;
        const ageRangeRows = await this.dataSource.query(`SELECT ar.[AgeRangeID] AS ageRangeId, ar.[AgeRangeLabel] AS ageRangeLabel
         FROM dbo.TourAudienceAgeRange tar
         JOIN dbo.AgeRange ar ON ar.[AgeRangeID] = tar.[AgeRangeID]
         WHERE tar.[TourID] = @0
         ORDER BY ar.[SortOrder]`, [tourId]);
        const mediaMixRows = await this.dataSource.query(`SELECT
        tmm.[TourMediaMixID] AS tourMediaMixId,
        tmm.[AdvertisingSubTypeID] AS advertisingSubTypeId,
        ast.[SubTypeName] AS subTypeName,
        ast.[ParentCategory] AS parentCategory,
        tmm.[CompanyID] AS companyId,
        c.[CompanyName] AS companyName
       FROM dbo.TourMediaMix tmm
       LEFT JOIN dbo.AdvertisingSubType ast ON ast.[AdvertisingSubTypeID] = tmm.[AdvertisingSubTypeID]
       LEFT JOIN dbo.Company c ON c.[CompanyID] = tmm.[CompanyID]
       WHERE tmm.[TourID] = @0
       ORDER BY ast.[ParentCategory], ast.[SubTypeName]`, [tourId]);
        const offerCodes = await this.offerCodeRepo.find({
            where: { tourId },
            order: { offerCodeId: 'ASC' },
        });
        return {
            tourId: tour.tourId,
            marketingDirector: director
                ? {
                    name: director.fullName?.trim() || null,
                    email: director.email?.trim() || null,
                    phone: director.phone?.trim() || null,
                }
                : null,
            audienceGender: tour.audienceGender,
            audienceAgeRangeIds: ageRangeRows.map((r) => r.ageRangeId),
            audienceAgeRangeLabels: ageRangeRows.map((r) => r.ageRangeLabel),
            mediaMix: mediaMixRows.map((r) => ({
                tourMediaMixId: Number(r.tourMediaMixId),
                advertisingSubTypeId: Number(r.advertisingSubTypeId),
                subTypeName: String(r.subTypeName ?? ''),
                parentCategory: r.parentCategory ? String(r.parentCategory).trim() : null,
                companyId: r.companyId != null ? Number(r.companyId) : null,
                companyName: r.companyName ? String(r.companyName).trim() : null,
            })),
            offerCodes: offerCodes.map((c) => ({
                offerCodeId: c.offerCodeId,
                code: c.code,
                assignedTo: c.assignedTo,
                iaeSms: c.iaeSms,
                purpose: c.purpose,
            })),
        };
    }
    async saveTourMarketing(tourId, dto) {
        const tour = await this.tourRepo.findOne({ where: { tourId } });
        if (!tour)
            throw new common_1.NotFoundException(`Tour ${tourId} not found`);
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            if (dto.audienceGender !== undefined) {
                tour.audienceGender = dto.audienceGender ?? null;
                await queryRunner.manager.save(tour);
            }
            if (dto.audienceAgeRangeIds !== undefined) {
                await queryRunner.query(`DELETE FROM dbo.TourAudienceAgeRange WHERE [TourID] = @0`, [tourId]);
                for (const ageRangeId of dto.audienceAgeRangeIds) {
                    await queryRunner.query(`INSERT INTO dbo.TourAudienceAgeRange ([TourID], [AgeRangeID]) VALUES (@0, @1)`, [tourId, ageRangeId]);
                }
                const labelRows = dto.audienceAgeRangeIds.length
                    ? await queryRunner.query(`SELECT [AgeRangeLabel] AS label FROM dbo.AgeRange WHERE [AgeRangeID] IN (${dto.audienceAgeRangeIds.map((_, i) => `@${i}`).join(',')}) ORDER BY [SortOrder]`, dto.audienceAgeRangeIds)
                    : [];
                const ageRangeStr = labelRows.map((r) => r.label).filter(Boolean).join(', ') || null;
                await queryRunner.query(`UPDATE dbo.Tour SET [AudienceAgeRange] = @0 WHERE [TourID] = @1`, [ageRangeStr, tourId]);
            }
            if (dto.mediaMix !== undefined) {
                await queryRunner.query(`DELETE FROM dbo.TourMediaMix WHERE [TourID] = @0`, [tourId]);
                for (const entry of dto.mediaMix) {
                    await queryRunner.query(`INSERT INTO dbo.TourMediaMix ([TourID], [AdvertisingSubTypeID], [CompanyID])
             VALUES (@0, @1, @2)`, [tourId, entry.advertisingSubTypeId, entry.companyId ?? null]);
                }
            }
            if (dto.offerCodes !== undefined) {
                const existingCodes = await this.offerCodeRepo.find({ where: { tourId } });
                const incomingIds = dto.offerCodes
                    .filter((c) => c.offerCodeId != null)
                    .map((c) => c.offerCodeId);
                const toDelete = existingCodes.filter((c) => !incomingIds.includes(c.offerCodeId));
                if (toDelete.length > 0) {
                    await queryRunner.manager.delete(tour_ticketing_offer_code_entity_1.TourTicketingOfferCode, {
                        offerCodeId: (0, typeorm_2.In)(toDelete.map((c) => c.offerCodeId)),
                    });
                }
                for (const codeDto of dto.offerCodes) {
                    if (codeDto.offerCodeId) {
                        await queryRunner.manager.update(tour_ticketing_offer_code_entity_1.TourTicketingOfferCode, codeDto.offerCodeId, {
                            code: codeDto.code,
                            assignedTo: codeDto.assignedTo ?? null,
                            iaeSms: codeDto.iaeSms ?? null,
                            purpose: codeDto.purpose ?? null,
                        });
                    }
                    else {
                        const newCode = this.offerCodeRepo.create({
                            tourId,
                            code: codeDto.code,
                            assignedTo: codeDto.assignedTo ?? null,
                            iaeSms: codeDto.iaeSms ?? null,
                            purpose: codeDto.purpose ?? null,
                        });
                        await queryRunner.manager.save(newCode);
                    }
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
        return this.getTourMarketing(tourId);
    }
    async deleteOfferCode(tourId, offerCodeId) {
        const code = await this.offerCodeRepo.findOne({
            where: { offerCodeId, tourId },
        });
        if (!code) {
            throw new common_1.NotFoundException(`Offer code ${offerCodeId} not found for tour ${tourId}`);
        }
        await this.offerCodeRepo.delete({ offerCodeId });
    }
};
exports.TourMarketingService = TourMarketingService;
exports.TourMarketingService = TourMarketingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tour_entity_1.Tour)),
    __param(1, (0, typeorm_1.InjectRepository)(tour_ticketing_offer_code_entity_1.TourTicketingOfferCode)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], TourMarketingService);
//# sourceMappingURL=tour-marketing.service.js.map