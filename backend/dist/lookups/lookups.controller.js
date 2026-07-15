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
exports.LookupsController = void 0;
const common_1 = require("@nestjs/common");
const lookups_service_1 = require("./lookups.service");
const manage_lookup_row_dto_1 = require("./dto/manage-lookup-row.dto");
const entra_auth_guard_1 = require("../admin-users/entra-auth.guard");
const access_level_guard_1 = require("../common/access-level.guard");
const access_level_enum_1 = require("../common/access-level.enum");
const require_access_level_decorator_1 = require("../common/require-access-level.decorator");
let LookupsController = class LookupsController {
    lookupsService;
    constructor(lookupsService) {
        this.lookupsService = lookupsService;
    }
    companyTypes() {
        return this.lookupsService.findCompanyTypes();
    }
    roles() {
        return this.lookupsService.findRoles();
    }
    departments() {
        return this.lookupsService.findDepartments();
    }
    seatingTypes() {
        return this.lookupsService.findSeatingTypes();
    }
    classes() {
        return this.lookupsService.findClasses();
    }
    venueTypes() {
        return this.lookupsService.findVenueTypes();
    }
    brands() {
        return this.lookupsService.findBrands();
    }
    taxes() {
        return this.lookupsService.findTaxes();
    }
    servicesProvided() {
        return this.lookupsService.findServicesProvided();
    }
    companyTypeServicesAllowed(companyTypeIds) {
        return this.lookupsService.findServicesAllowedForCompanyTypes(companyTypeIds);
    }
    stagehandProviders() {
        return this.lookupsService.findStagehandProviders();
    }
    nonResidentWithholdings() {
        return this.lookupsService.findNonResidentWithholdings();
    }
    async dmaByPostal(postalCode) {
        const row = await this.lookupsService.findDmaByPostal(postalCode);
        return row ?? null;
    }
    async dmaByPostalQuery(postalCode) {
        const row = await this.lookupsService.findDmaByPostal(postalCode ?? '');
        return row ?? null;
    }
    async searchDmaMarkets(query, limit) {
        const raw = limit ? Number(limit) : 50;
        const safeLimit = Number.isFinite(raw)
            ? Math.min(100, Math.max(1, Math.floor(raw)))
            : 50;
        return this.lookupsService.searchDmaMarkets(query?.trim() ?? '', safeLimit);
    }
    dmaMarkets(offset, limit, query) {
        const safeLimit = Number.isFinite(limit)
            ? Math.min(500, Math.max(1, Math.floor(limit)))
            : 25;
        const safeOffset = Math.max(0, offset);
        return this.lookupsService.findDmaMarketsPaginated(safeOffset, safeLimit, query?.trim() ?? '');
    }
    listManagedLookupRows(table, offset, limit, q, sortBy, sortDir) {
        const safeLimit = Number.isFinite(limit)
            ? Math.min(500, Math.max(1, Math.floor(limit)))
            : 25;
        const safeOffset = Math.max(0, offset);
        return this.lookupsService.listManagedLookupRows(table, {
            offset: safeOffset,
            limit: safeLimit,
            q: q?.trim(),
            sortBy: sortBy?.trim(),
            sortDir: sortDir?.trim(),
        });
    }
    createManagedLookupRow(table, dto) {
        return this.lookupsService.createManagedLookupRow(table, dto);
    }
    updateManagedLookupRow(table, id, dto) {
        return this.lookupsService.updateManagedLookupRow(table, id, dto);
    }
    removeManagedLookupRow(table, id) {
        return this.lookupsService.removeManagedLookupRow(table, id);
    }
};
exports.LookupsController = LookupsController;
__decorate([
    (0, common_1.Get)('company-types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "companyTypes", null);
__decorate([
    (0, common_1.Get)('roles'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "roles", null);
__decorate([
    (0, common_1.Get)('departments'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "departments", null);
__decorate([
    (0, common_1.Get)('seating-types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "seatingTypes", null);
__decorate([
    (0, common_1.Get)('classes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "classes", null);
__decorate([
    (0, common_1.Get)('venue-types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "venueTypes", null);
__decorate([
    (0, common_1.Get)('brands'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "brands", null);
__decorate([
    (0, common_1.Get)('taxes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "taxes", null);
__decorate([
    (0, common_1.Get)('services-provided'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "servicesProvided", null);
__decorate([
    (0, common_1.Get)('company-type-services/allowed'),
    __param(0, (0, common_1.Query)('companyTypeIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "companyTypeServicesAllowed", null);
__decorate([
    (0, common_1.Get)('stagehand-providers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "stagehandProviders", null);
__decorate([
    (0, common_1.Get)('non-resident-withholdings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "nonResidentWithholdings", null);
__decorate([
    (0, common_1.Get)('dma-by-postal/:postalCode'),
    __param(0, (0, common_1.Param)('postalCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LookupsController.prototype, "dmaByPostal", null);
__decorate([
    (0, common_1.Get)('dma-by-postal'),
    __param(0, (0, common_1.Query)('postalCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LookupsController.prototype, "dmaByPostalQuery", null);
__decorate([
    (0, common_1.Get)('dma-markets/search'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LookupsController.prototype, "searchDmaMarkets", null);
__decorate([
    (0, common_1.Get)('dma-markets'),
    __param(0, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(25), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "dmaMarkets", null);
__decorate([
    (0, common_1.Get)('manage/:table'),
    (0, common_1.UseGuards)(entra_auth_guard_1.EntraAuthGuard, access_level_guard_1.AccessLevelGuard),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __param(0, (0, common_1.Param)('table')),
    __param(1, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(25), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('q')),
    __param(4, (0, common_1.Query)('sortBy')),
    __param(5, (0, common_1.Query)('sortDir')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String, String]),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "listManagedLookupRows", null);
__decorate([
    (0, common_1.Post)('manage/:table'),
    (0, common_1.UseGuards)(entra_auth_guard_1.EntraAuthGuard, access_level_guard_1.AccessLevelGuard),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __param(0, (0, common_1.Param)('table')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, manage_lookup_row_dto_1.CreateLookupRowDto]),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "createManagedLookupRow", null);
__decorate([
    (0, common_1.Patch)('manage/:table/:id'),
    (0, common_1.UseGuards)(entra_auth_guard_1.EntraAuthGuard, access_level_guard_1.AccessLevelGuard),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __param(0, (0, common_1.Param)('table')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, manage_lookup_row_dto_1.UpdateLookupRowDto]),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "updateManagedLookupRow", null);
__decorate([
    (0, common_1.Delete)('manage/:table/:id'),
    (0, common_1.UseGuards)(entra_auth_guard_1.EntraAuthGuard, access_level_guard_1.AccessLevelGuard),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('table')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], LookupsController.prototype, "removeManagedLookupRow", null);
exports.LookupsController = LookupsController = __decorate([
    (0, common_1.Controller)('lookups'),
    __metadata("design:paramtypes", [lookups_service_1.LookupsService])
], LookupsController);
//# sourceMappingURL=lookups.controller.js.map