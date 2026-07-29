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
var EngagementController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngagementController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const promises_1 = require("fs/promises");
const seating_chart_multer_config_1 = require("./seating-chart-multer.config");
const contract_multer_config_1 = require("./contract-multer.config");
const contract_extraction_service_1 = require("./contract-extraction.service");
const save_performance_contract_dto_1 = require("./dto/save-performance-contract.dto");
const add_engagement_venue_dto_1 = require("./dto/add-engagement-venue.dto");
const update_engagement_venue_tab_dto_1 = require("./dto/update-engagement-venue-tab.dto");
const create_engagement_dto_1 = require("./dto/create-engagement.dto");
const create_engagement_iae_contact_dto_1 = require("./dto/create-engagement-iae-contact.dto");
const create_performance_dto_1 = require("./dto/create-performance.dto");
const update_engagement_dto_1 = require("./dto/update-engagement.dto");
const update_engagement_finance_dto_1 = require("./dto/update-engagement-finance.dto");
const update_engagement_iae_contact_dto_1 = require("./dto/update-engagement-iae-contact.dto");
const update_non_resident_withholding_links_dto_1 = require("./dto/update-non-resident-withholding-links.dto");
const update_performance_ticketing_dto_1 = require("./dto/update-performance-ticketing.dto");
const update_iae_ticketing_manager_dto_1 = require("./dto/update-iae-ticketing-manager.dto");
const update_iae_marketing_team_dto_1 = require("./dto/update-iae-marketing-team.dto");
const update_tour_marketing_team_dto_1 = require("./dto/update-tour-marketing-team.dto");
const create_engagement_retail_partner_dto_1 = require("./dto/create-engagement-retail-partner.dto");
const engagement_travel_dto_1 = require("./dto/engagement-travel.dto");
const engagement_service_1 = require("./engagement.service");
let EngagementController = EngagementController_1 = class EngagementController {
    engagementService;
    contractExtractionService;
    logger = new common_1.Logger(EngagementController_1.name);
    constructor(engagementService, contractExtractionService) {
        this.engagementService = engagementService;
        this.contractExtractionService = contractExtractionService;
    }
    list() {
        return this.engagementService.list();
    }
    filterOptions() {
        return this.engagementService.filterOptions();
    }
    financeLookups() {
        return this.engagementService.getFinanceLookups();
    }
    listByTour(tourId) {
        return this.engagementService.listByTour(tourId);
    }
    iaeContactLookups() {
        return this.engagementService.getEngagementIaeContactLookups();
    }
    listHubSchedule(startDate, endDate) {
        return this.engagementService.listHubSchedule(startDate, endDate);
    }
    listHubRedAlerts() {
        return this.engagementService.listHubRedAlerts();
    }
    updateWithholdingLinks(withholdingId, dto) {
        return this.engagementService.updateNonResidentWithholdingLinks(withholdingId, dto);
    }
    createWithholdingForEngagement(id) {
        return this.engagementService.createWithholdingForEngagement(id);
    }
    getFinance(id) {
        return this.engagementService.getFinance(id);
    }
    updateFinance(id, dto) {
        return this.engagementService.upsertFinance(id, dto);
    }
    getDepositTerms(id) {
        return this.engagementService.getDepositTerms(id);
    }
    updateDepositTerms(id, dto) {
        return this.engagementService.updateDepositTerms(id, dto);
    }
    updateNonResidentWithholding(nrwId, dto) {
        return this.engagementService.updateNonResidentWithholding(nrwId, dto);
    }
    listPaged(offset, limit, q, engagementId, status, attraction, dma, venue, timing, mine, sortBy, sortDir, dateFrom, dateTo) {
        const t = timing === 'upcoming' || timing === 'past' ? timing : 'all';
        return this.engagementService.listPaginated(offset, limit, {
            q,
            engagementId: Number(engagementId),
            status,
            attractionName: attraction,
            dmaMarketName: dma,
            venueLabel: venue,
            timing: t,
            mine: mine === '1' || mine === 'true',
            sortBy,
            sortDir,
            dateFrom,
            dateTo,
        });
    }
    getOne(id) {
        return this.engagementService.getOne(id);
    }
    create(dto) {
        return this.engagementService.create(dto);
    }
    update(id, dto) {
        return this.engagementService.update(id, dto);
    }
    listIaeContacts(id) {
        return this.engagementService.listEngagementIaeContacts(id);
    }
    addIaeContact(id, dto) {
        return this.engagementService.addEngagementIaeContact(id, dto);
    }
    updateIaeContact(id, eicId, dto) {
        return this.engagementService.updateEngagementIaeContact(id, eicId, dto);
    }
    removeIaeContact(id, eicId) {
        return this.engagementService.removeEngagementIaeContact(id, eicId);
    }
    getDeleteImpact(id) {
        return this.engagementService.getEngagementDeleteImpact(id);
    }
    remove(id) {
        return this.engagementService.remove(id);
    }
    listVenues(id) {
        return this.engagementService.listVenues(id);
    }
    getVenueTabData(id) {
        return this.engagementService.getVenueTabData(id);
    }
    addVenue(id, dto) {
        return this.engagementService.addVenue(id, dto);
    }
    removeVenue(id, venueCompanyId) {
        return this.engagementService.removeVenue(id, venueCompanyId);
    }
    updateVenueTab(id, venueCompanyId, dto) {
        return this.engagementService.updateVenueTabPerVenue(id, venueCompanyId, dto);
    }
    uploadSeatingChart(id, venueCompanyId, file) {
        return this.engagementService.uploadSeatingChart(id, venueCompanyId, file);
    }
    removeSeatingChart(id, venueCompanyId) {
        return this.engagementService.removeSeatingChart(id, venueCompanyId);
    }
    upsertEngagementLink(id, dto) {
        return this.engagementService.upsertEngagementLink(id, dto);
    }
    removeEngagementLink(id, engagementLinkId) {
        return this.engagementService.removeEngagementLink(id, engagementLinkId);
    }
    listServiceProviders(id) {
        return this.engagementService.listServiceProviders(id);
    }
    addServiceProvider(id, dto) {
        return this.engagementService.addServiceProvider(id, dto.providerCompanyId);
    }
    removeServiceProvider(id, providerCompanyId) {
        return this.engagementService.removeServiceProvider(id, providerCompanyId);
    }
    listPerformances(id) {
        return this.engagementService.listPerformances(id);
    }
    createPerformance(id, dto) {
        return this.engagementService.createPerformance(id, dto);
    }
    updatePerformance(id, performanceId, dto) {
        return this.engagementService.updatePerformance(id, performanceId, dto);
    }
    deletePerformance(id, performanceId) {
        return this.engagementService.deletePerformance(id, performanceId);
    }
    getPerformancesTicketingSummary(id) {
        return this.engagementService.getPerformancesWithTicketingSummary(id);
    }
    getPerformanceTicketing(id, performanceId) {
        return this.engagementService.getPerformanceTicketing(id, performanceId);
    }
    updatePerformanceTicketing(id, performanceId, dto) {
        return this.engagementService.upsertPerformanceTicketing(id, performanceId, dto);
    }
    getIaeTicketingManager(id) {
        return this.engagementService.getIaeTicketingManager(id);
    }
    updateIaeTicketingManager(id, dto) {
        return this.engagementService.updateIaeTicketingManager(id, dto.iaeTicketingManagerContactId ?? null);
    }
    getMarketingMeta(id) {
        return this.engagementService.getMarketingMeta(id);
    }
    updateIaeMarketingTeam(id, dto) {
        return this.engagementService.updateIaeMarketingTeam(id, dto);
    }
    updateTourMarketingTeam(id, dto) {
        return this.engagementService.updateTourMarketingTeam(id, dto);
    }
    listRetailPartners(id) {
        return this.engagementService.listRetailPartners(id);
    }
    addRetailPartner(id, dto) {
        return this.engagementService.addRetailPartner(id, dto);
    }
    removeRetailPartner(id, retailPartnerId) {
        return this.engagementService.removeRetailPartner(id, retailPartnerId);
    }
    getPartner(id) {
        return this.engagementService.getEngagementPartner(id);
    }
    updatePartner(id, body) {
        return this.engagementService.upsertEngagementPartner(id, body);
    }
    listTravel(id) {
        return this.engagementService.listEngagementTravel(id);
    }
    addTravelHotel(id, dto) {
        return this.engagementService.addEngagementTravelHotel(id, dto);
    }
    updateTravelHotel(id, travelId, dto) {
        return this.engagementService.updateEngagementTravelHotel(id, travelId, dto);
    }
    addTravelCarService(id, dto) {
        return this.engagementService.addEngagementTravelCarService(id, dto);
    }
    updateTravelCarService(id, carServiceTravelId, dto) {
        return this.engagementService.updateEngagementTravelCarService(id, carServiceTravelId, dto);
    }
    deleteTravel(id, travelId) {
        return this.engagementService.deleteEngagementTravel(id, travelId);
    }
    getContracts(id) {
        return this.engagementService.getPerformanceContracts(id);
    }
    async uploadContract(id, file) {
        try {
            const { data, fieldMeta } = await this.contractExtractionService.extractFromFile(file.path);
            return {
                extracted: data,
                fieldMeta,
                originalFilename: file.originalname,
                annotatedPdfBlobName: '',
            };
        }
        finally {
            await (0, promises_1.unlink)(file.path).catch(() => {
                this.logger.warn(`Failed to delete uploaded contract file: ${file.path}`);
            });
        }
    }
    saveContract(id, dto) {
        return this.engagementService.savePerformanceContract(id, dto);
    }
    updateContract(id, contractId, dto) {
        return this.engagementService.updatePerformanceContract(id, contractId, dto);
    }
    deleteContract(id, contractId) {
        return this.engagementService.deletePerformanceContract(id, contractId);
    }
    getSharePointFolder(id) {
        return this.engagementService.getSharePointFolderLink(id);
    }
    getSharePointFolderStatus(id) {
        return this.engagementService.getSharePointFolderStatus(id);
    }
    createSharePointFolders(id) {
        return this.engagementService.startFolderProvisioning(id);
    }
};
exports.EngagementController = EngagementController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('filter-options'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "filterOptions", null);
__decorate([
    (0, common_1.Get)('finance-lookups'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "financeLookups", null);
__decorate([
    (0, common_1.Get)('by-tour/:tourId'),
    __param(0, (0, common_1.Param)('tourId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "listByTour", null);
__decorate([
    (0, common_1.Get)('iae-contact-lookups'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "iaeContactLookups", null);
__decorate([
    (0, common_1.Get)('hub-schedule'),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "listHubSchedule", null);
__decorate([
    (0, common_1.Get)('hub-red-alerts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "listHubRedAlerts", null);
__decorate([
    (0, common_1.Patch)('withholdings/:withholdingId/links'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('withholdingId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_non_resident_withholding_links_dto_1.UpdateNonResidentWithholdingLinksDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "updateWithholdingLinks", null);
__decorate([
    (0, common_1.Post)(':id/withholding'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "createWithholdingForEngagement", null);
__decorate([
    (0, common_1.Get)(':id/finance'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "getFinance", null);
__decorate([
    (0, common_1.Patch)(':id/finance'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_engagement_finance_dto_1.UpdateEngagementFinanceDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "updateFinance", null);
__decorate([
    (0, common_1.Get)(':id/deposit-terms'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "getDepositTerms", null);
__decorate([
    (0, common_1.Patch)(':id/deposit-terms'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "updateDepositTerms", null);
__decorate([
    (0, common_1.Patch)('non-resident-withholding/:nrwId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('nrwId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "updateNonResidentWithholding", null);
__decorate([
    (0, common_1.Get)('paged'),
    __param(0, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(25), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('q')),
    __param(3, (0, common_1.Query)('engagementId')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('attraction')),
    __param(6, (0, common_1.Query)('dma')),
    __param(7, (0, common_1.Query)('venue')),
    __param(8, (0, common_1.Query)('timing')),
    __param(9, (0, common_1.Query)('mine')),
    __param(10, (0, common_1.Query)('sortBy')),
    __param(11, (0, common_1.Query)('sortDir')),
    __param(12, (0, common_1.Query)('dateFrom')),
    __param(13, (0, common_1.Query)('dateTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "listPaged", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_engagement_dto_1.CreateEngagementDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_engagement_dto_1.UpdateEngagementDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(':id/iae-contacts'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "listIaeContacts", null);
__decorate([
    (0, common_1.Post)(':id/iae-contacts'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_engagement_iae_contact_dto_1.CreateEngagementIaeContactDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "addIaeContact", null);
__decorate([
    (0, common_1.Patch)(':id/iae-contacts/:eicId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('eicId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, update_engagement_iae_contact_dto_1.UpdateEngagementIaeContactDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "updateIaeContact", null);
__decorate([
    (0, common_1.Delete)(':id/iae-contacts/:eicId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('eicId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "removeIaeContact", null);
__decorate([
    (0, common_1.Get)(':id/delete-impact'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "getDeleteImpact", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/venues'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "listVenues", null);
__decorate([
    (0, common_1.Get)(':id/venue-tab-data'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "getVenueTabData", null);
__decorate([
    (0, common_1.Post)(':id/venues'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, add_engagement_venue_dto_1.AddEngagementVenueDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "addVenue", null);
__decorate([
    (0, common_1.Delete)(':id/venues/:venueCompanyId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('venueCompanyId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "removeVenue", null);
__decorate([
    (0, common_1.Patch)(':id/venues/:venueCompanyId/tab'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('venueCompanyId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, update_engagement_venue_tab_dto_1.UpdateEngagementVenueTabDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "updateVenueTab", null);
__decorate([
    (0, common_1.Post)(':id/venues/:venueCompanyId/seating-chart'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('seatingChart', (0, seating_chart_multer_config_1.seatingChartMulterOptions)())),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('venueCompanyId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "uploadSeatingChart", null);
__decorate([
    (0, common_1.Delete)(':id/venues/:venueCompanyId/seating-chart'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('venueCompanyId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "removeSeatingChart", null);
__decorate([
    (0, common_1.Post)(':id/links'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "upsertEngagementLink", null);
__decorate([
    (0, common_1.Delete)(':id/links/:engagementLinkId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('engagementLinkId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "removeEngagementLink", null);
__decorate([
    (0, common_1.Get)(':id/service-providers'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "listServiceProviders", null);
__decorate([
    (0, common_1.Post)(':id/service-providers'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "addServiceProvider", null);
__decorate([
    (0, common_1.Delete)(':id/service-providers/:providerCompanyId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('providerCompanyId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "removeServiceProvider", null);
__decorate([
    (0, common_1.Get)(':id/performances'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "listPerformances", null);
__decorate([
    (0, common_1.Post)(':id/performances'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_performance_dto_1.CreatePerformanceDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "createPerformance", null);
__decorate([
    (0, common_1.Patch)(':id/performances/:performanceId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('performanceId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "updatePerformance", null);
__decorate([
    (0, common_1.Delete)(':id/performances/:performanceId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('performanceId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "deletePerformance", null);
__decorate([
    (0, common_1.Get)(':id/performances/ticketing-summary'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "getPerformancesTicketingSummary", null);
__decorate([
    (0, common_1.Get)(':id/performances/:performanceId/ticketing'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('performanceId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "getPerformanceTicketing", null);
__decorate([
    (0, common_1.Patch)(':id/performances/:performanceId/ticketing'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('performanceId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, update_performance_ticketing_dto_1.UpdatePerformanceTicketingDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "updatePerformanceTicketing", null);
__decorate([
    (0, common_1.Get)(':id/iae-ticketing-manager'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "getIaeTicketingManager", null);
__decorate([
    (0, common_1.Patch)(':id/iae-ticketing-manager'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_iae_ticketing_manager_dto_1.UpdateIaeTicketingManagerDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "updateIaeTicketingManager", null);
__decorate([
    (0, common_1.Get)(':id/marketing-meta'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "getMarketingMeta", null);
__decorate([
    (0, common_1.Patch)(':id/iae-marketing-team'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_iae_marketing_team_dto_1.UpdateIaeMarketingTeamDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "updateIaeMarketingTeam", null);
__decorate([
    (0, common_1.Patch)(':id/tour-marketing-team'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_tour_marketing_team_dto_1.UpdateTourMarketingTeamDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "updateTourMarketingTeam", null);
__decorate([
    (0, common_1.Get)(':id/retail-partners'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "listRetailPartners", null);
__decorate([
    (0, common_1.Post)(':id/retail-partners'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_engagement_retail_partner_dto_1.CreateEngagementRetailPartnerDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "addRetailPartner", null);
__decorate([
    (0, common_1.Delete)(':id/retail-partners/:retailPartnerId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('retailPartnerId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "removeRetailPartner", null);
__decorate([
    (0, common_1.Get)(':id/partner'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "getPartner", null);
__decorate([
    (0, common_1.Patch)(':id/partner'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "updatePartner", null);
__decorate([
    (0, common_1.Get)(':id/travel'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "listTravel", null);
__decorate([
    (0, common_1.Post)(':id/travel/hotel'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, engagement_travel_dto_1.CreateEngagementTravelHotelDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "addTravelHotel", null);
__decorate([
    (0, common_1.Patch)(':id/travel/:travelId/hotel'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('travelId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, engagement_travel_dto_1.UpdateEngagementTravelHotelDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "updateTravelHotel", null);
__decorate([
    (0, common_1.Post)(':id/travel/car-service'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, engagement_travel_dto_1.CreateEngagementTravelCarServiceDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "addTravelCarService", null);
__decorate([
    (0, common_1.Patch)(':id/travel/car-service/:carServiceTravelId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('carServiceTravelId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, engagement_travel_dto_1.UpdateEngagementTravelCarServiceDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "updateTravelCarService", null);
__decorate([
    (0, common_1.Delete)(':id/travel/:travelId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('travelId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "deleteTravel", null);
__decorate([
    (0, common_1.Get)(':id/contracts'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "getContracts", null);
__decorate([
    (0, common_1.Post)(':id/contracts/upload'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('contractFile', (0, contract_multer_config_1.contractMulterOptions)())),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], EngagementController.prototype, "uploadContract", null);
__decorate([
    (0, common_1.Post)(':id/contracts'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, save_performance_contract_dto_1.SavePerformanceContractDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "saveContract", null);
__decorate([
    (0, common_1.Patch)(':id/contracts/:contractId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('contractId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, save_performance_contract_dto_1.SavePerformanceContractDto]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "updateContract", null);
__decorate([
    (0, common_1.Delete)(':id/contracts/:contractId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('contractId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "deleteContract", null);
__decorate([
    (0, common_1.Get)(':id/sharepoint-folder'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "getSharePointFolder", null);
__decorate([
    (0, common_1.Get)(':id/sharepoint-folder/status'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "getSharePointFolderStatus", null);
__decorate([
    (0, common_1.Post)(':id/create-sharepoint-folders'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementController.prototype, "createSharePointFolders", null);
exports.EngagementController = EngagementController = EngagementController_1 = __decorate([
    (0, common_1.Controller)('engagements'),
    __metadata("design:paramtypes", [engagement_service_1.EngagementService,
        contract_extraction_service_1.ContractExtractionService])
], EngagementController);
//# sourceMappingURL=engagement.controller.js.map