"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalMarketsModule = void 0;
const common_1 = require("@nestjs/common");
const admin_users_module_1 = require("../admin-users/admin-users.module");
const company_module_1 = require("../company/company.module");
const venue_directory_module_1 = require("../venue-directory/venue-directory.module");
const internal_markets_controller_1 = require("./internal-markets.controller");
const internal_markets_service_1 = require("./internal-markets.service");
let InternalMarketsModule = class InternalMarketsModule {
};
exports.InternalMarketsModule = InternalMarketsModule;
exports.InternalMarketsModule = InternalMarketsModule = __decorate([
    (0, common_1.Module)({
        imports: [admin_users_module_1.AdminUsersModule, company_module_1.CompanyModule, venue_directory_module_1.VenueDirectoryModule],
        controllers: [internal_markets_controller_1.InternalMarketsController],
        providers: [internal_markets_service_1.InternalMarketsService],
    })
], InternalMarketsModule);
//# sourceMappingURL=internal-markets.module.js.map