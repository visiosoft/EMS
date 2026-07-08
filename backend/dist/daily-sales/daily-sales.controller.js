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
exports.DailySalesController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const daily_sales_service_1 = require("./daily-sales.service");
class UpdateSalesDto {
    ticketsSold;
    revenue;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Object)
], UpdateSalesDto.prototype, "ticketsSold", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Object)
], UpdateSalesDto.prototype, "revenue", void 0);
let DailySalesController = class DailySalesController {
    dailySalesService;
    constructor(dailySalesService) {
        this.dailySalesService = dailySalesService;
    }
    getEngagementDashboard(engagementIdRaw, asOfDate, performanceIdRaw) {
        const id = engagementIdRaw != null ? Number(engagementIdRaw) : NaN;
        if (!Number.isFinite(id) || id < 1) {
            throw new common_1.BadRequestException({
                message: 'Query parameter engagementId is required and must be a positive integer.',
            });
        }
        let performanceId;
        if (performanceIdRaw != null && performanceIdRaw !== '') {
            const pid = Number(performanceIdRaw);
            if (!Number.isFinite(pid) || pid < 1 || !Number.isInteger(pid)) {
                throw new common_1.BadRequestException({
                    message: 'Query parameter performanceId, when provided, must be a positive integer.',
                });
            }
            performanceId = pid;
        }
        return this.dailySalesService.getEngagementDashboard(id, asOfDate, performanceId);
    }
    getAttractionSalesSummary(attractionIdRaw, asOfDate) {
        const id = attractionIdRaw != null ? Number(attractionIdRaw) : NaN;
        if (!Number.isFinite(id) || id < 1) {
            throw new common_1.BadRequestException({
                message: 'Query parameter attractionId is required and must be a positive integer.',
            });
        }
        return this.dailySalesService.getAttractionSalesSummary(id, asOfDate);
    }
    findByPerformance(asOfDate, page, pageSize, search, attraction, performanceDate, startDate, endDate, genre, tour, company, venue, contact, sortBy, sortDir, eventsScope, iaeContactIds) {
        return this.dailySalesService.findByPerformancePage(asOfDate, page != null && page !== '' ? Number(page) : 1, pageSize != null && pageSize !== '' ? Number(pageSize) : 25, search, attraction, performanceDate, startDate, endDate, genre, tour, company, venue, contact, sortBy, sortDir, eventsScope, iaeContactIds);
    }
    getByPerformanceSuggestions(asOfDate, q, performanceDate, startDate, endDate) {
        return this.dailySalesService.getByPerformanceSuggestions(asOfDate, q, performanceDate, startDate, endDate);
    }
    findAll(engagementId) {
        const id = engagementId ? Number(engagementId) : undefined;
        return this.dailySalesService.findAll(id);
    }
    updateSales(performanceId, salesDate, body) {
        return this.dailySalesService.updateSales(Number(performanceId), salesDate, body);
    }
};
exports.DailySalesController = DailySalesController;
__decorate([
    (0, common_1.Get)('engagement-dashboard'),
    __param(0, (0, common_1.Query)('engagementId')),
    __param(1, (0, common_1.Query)('asOfDate')),
    __param(2, (0, common_1.Query)('performanceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], DailySalesController.prototype, "getEngagementDashboard", null);
__decorate([
    (0, common_1.Get)(['attraction-sales-summary', 'attraction-dashboard']),
    __param(0, (0, common_1.Query)('attractionId')),
    __param(1, (0, common_1.Query)('asOfDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DailySalesController.prototype, "getAttractionSalesSummary", null);
__decorate([
    (0, common_1.Get)('by-performance'),
    __param(0, (0, common_1.Query)('asOfDate')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('attraction')),
    __param(5, (0, common_1.Query)('performanceDate')),
    __param(6, (0, common_1.Query)('startDate')),
    __param(7, (0, common_1.Query)('endDate')),
    __param(8, (0, common_1.Query)('genre')),
    __param(9, (0, common_1.Query)('tour')),
    __param(10, (0, common_1.Query)('company')),
    __param(11, (0, common_1.Query)('venue')),
    __param(12, (0, common_1.Query)('contact')),
    __param(13, (0, common_1.Query)('sortBy')),
    __param(14, (0, common_1.Query)('sortDir')),
    __param(15, (0, common_1.Query)('eventsScope')),
    __param(16, (0, common_1.Query)('iaeContactIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], DailySalesController.prototype, "findByPerformance", null);
__decorate([
    (0, common_1.Get)('by-performance/suggestions'),
    __param(0, (0, common_1.Query)('asOfDate')),
    __param(1, (0, common_1.Query)('q')),
    __param(2, (0, common_1.Query)('performanceDate')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], DailySalesController.prototype, "getByPerformanceSuggestions", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('engagementId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DailySalesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(':performanceId/:salesDate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('performanceId')),
    __param(1, (0, common_1.Param)('salesDate')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdateSalesDto]),
    __metadata("design:returntype", void 0)
], DailySalesController.prototype, "updateSales", null);
exports.DailySalesController = DailySalesController = __decorate([
    (0, common_1.Controller)('daily-sales'),
    __metadata("design:paramtypes", [daily_sales_service_1.DailySalesService])
], DailySalesController);
//# sourceMappingURL=daily-sales.controller.js.map