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
exports.InternalMarketsService = void 0;
const common_1 = require("@nestjs/common");
const lookups_service_1 = require("../lookups/lookups.service");
const venue_directory_service_1 = require("../venue-directory/venue-directory.service");
let InternalMarketsService = class InternalMarketsService {
    lookupsService;
    venueDirectoryService;
    constructor(lookupsService, venueDirectoryService) {
        this.lookupsService = lookupsService;
        this.venueDirectoryService = venueDirectoryService;
    }
    listMarkets(offset, limit, query) {
        return this.lookupsService.findDmaHubMarketsPaginated(offset, limit, query?.trim() ?? '');
    }
    suggestMarkets(query, limit) {
        return this.lookupsService.findDmaHubMarketSuggestions(query, limit);
    }
    listVenuesForMarket(dmaid, offset, limit) {
        return this.venueDirectoryService.listAllVenues(offset, limit, {
            dmaIds: [dmaid],
            sortBy: 'city',
            sortDir: 'asc',
        });
    }
};
exports.InternalMarketsService = InternalMarketsService;
exports.InternalMarketsService = InternalMarketsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [lookups_service_1.LookupsService,
        venue_directory_service_1.VenueDirectoryService])
], InternalMarketsService);
//# sourceMappingURL=internal-markets.service.js.map