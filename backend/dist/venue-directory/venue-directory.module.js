"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VenueDirectoryModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const company_type_entity_1 = require("../entities/company-type.entity");
const dma_entity_1 = require("../entities/dma.entity");
const address_entity_1 = require("../entities/address.entity");
const venue_entity_1 = require("../entities/venue.entity");
const venue_type_entity_1 = require("../entities/venue-type.entity");
const venue_directory_controller_1 = require("./venue-directory.controller");
const venue_directory_service_1 = require("./venue-directory.service");
let VenueDirectoryModule = class VenueDirectoryModule {
};
exports.VenueDirectoryModule = VenueDirectoryModule;
exports.VenueDirectoryModule = VenueDirectoryModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([venue_entity_1.Venue, company_type_entity_1.CompanyType, dma_entity_1.Dma, address_entity_1.Address, venue_type_entity_1.VenueType]),
        ],
        controllers: [venue_directory_controller_1.VenueDirectoryController],
        providers: [venue_directory_service_1.VenueDirectoryService],
        exports: [venue_directory_service_1.VenueDirectoryService],
    })
], VenueDirectoryModule);
//# sourceMappingURL=venue-directory.module.js.map