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
exports.VenueDirectoryController = void 0;
const common_1 = require("@nestjs/common");
const venue_directory_service_1 = require("./venue-directory.service");
let VenueDirectoryController = class VenueDirectoryController {
    venueDirectoryService;
    constructor(venueDirectoryService) {
        this.venueDirectoryService = venueDirectoryService;
    }
    listAllVenues(offset, limit, q, complexName, complexCompanyIdRaw, venueTypeIdRaw, dmaIdRaw, dmaIdsRaw, sortBy, sortDir) {
        const complexCompanyId = this.parseOptPosInt(complexCompanyIdRaw);
        const venueTypeId = this.parseOptPosInt(venueTypeIdRaw);
        const dmaId = this.parseOptPosInt(dmaIdRaw);
        const dmaIds = this.parseCommaSeparatedPositiveInts(dmaIdsRaw);
        const dmaIdsParamSent = dmaIdsRaw != null && String(dmaIdsRaw).trim().length > 0;
        if (dmaIdsParamSent && dmaIds.length === 0) {
            return { data: [], total: 0 };
        }
        return this.venueDirectoryService.listAllVenues(offset, limit, {
            q,
            complexName,
            complexCompanyId: complexCompanyId ?? undefined,
            venueTypeId: venueTypeId ?? undefined,
            dmaId: dmaId ?? undefined,
            dmaIds: dmaIds.length > 0 ? dmaIds : undefined,
            sortBy,
            sortDir,
        });
    }
    parseCommaSeparatedPositiveInts(raw) {
        if (raw == null || !String(raw).trim())
            return [];
        const out = [];
        for (const part of String(raw).split(',')) {
            const n = parseInt(part.trim(), 10);
            if (Number.isFinite(n) && n >= 1)
                out.push(n);
        }
        return [...new Set(out)];
    }
    parseOptPosInt(raw) {
        if (raw == null || String(raw).trim() === '')
            return undefined;
        const n = parseInt(String(raw), 10);
        if (!Number.isFinite(n) || n < 1)
            return undefined;
        return n;
    }
};
exports.VenueDirectoryController = VenueDirectoryController;
__decorate([
    (0, common_1.Get)('venues'),
    __param(0, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(25), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('q')),
    __param(3, (0, common_1.Query)('complexName')),
    __param(4, (0, common_1.Query)('complexCompanyId')),
    __param(5, (0, common_1.Query)('venueTypeId')),
    __param(6, (0, common_1.Query)('dmaId')),
    __param(7, (0, common_1.Query)('dmaIds')),
    __param(8, (0, common_1.Query)('sortBy')),
    __param(9, (0, common_1.Query)('sortDir')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], VenueDirectoryController.prototype, "listAllVenues", null);
exports.VenueDirectoryController = VenueDirectoryController = __decorate([
    (0, common_1.Controller)('venue-directory'),
    __metadata("design:paramtypes", [venue_directory_service_1.VenueDirectoryService])
], VenueDirectoryController);
//# sourceMappingURL=venue-directory.controller.js.map