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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalVenuesService = void 0;
const common_1 = require("@nestjs/common");
const venue_directory_service_1 = require("../venue-directory/venue-directory.service");
let InternalVenuesService = class InternalVenuesService {
    venueDirectoryService;
    constructor(venueDirectoryService) {
        this.venueDirectoryService = venueDirectoryService;
    }
    listVenues(offset, limit, query) {
        return this.venueDirectoryService.listAllVenues(offset, limit, {
            q: query?.trim() ?? '',
            sortBy: 'venue',
            sortDir: 'asc',
        });
    }
    async suggestVenues(query, limit) {
        const safeLimit = Math.min(20, Math.max(1, Math.floor(limit)));
        const { data } = await this.venueDirectoryService.listAllVenues(0, safeLimit, {
            q: query.trim(),
            sortBy: 'venue',
            sortDir: 'asc',
        });
        return data;
    }
};
exports.InternalVenuesService = InternalVenuesService;
exports.InternalVenuesService = InternalVenuesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [venue_directory_service_1.VenueDirectoryService])
], InternalVenuesService);
//# sourceMappingURL=internal-venues.service.js.map