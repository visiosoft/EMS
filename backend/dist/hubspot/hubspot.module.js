"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HubSpotModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const company_entity_1 = require("../entities/company.entity");
const contact_entity_1 = require("../entities/contact.entity");
const hubspot_controller_1 = require("./hubspot.controller");
const hubspot_service_1 = require("./hubspot.service");
const hubspot_signature_service_1 = require("./hubspot-signature.service");
let HubSpotModule = class HubSpotModule {
};
exports.HubSpotModule = HubSpotModule;
exports.HubSpotModule = HubSpotModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([contact_entity_1.Contact, company_entity_1.Company])],
        controllers: [hubspot_controller_1.HubSpotController],
        providers: [hubspot_service_1.HubSpotService, hubspot_signature_service_1.HubSpotSignatureService],
        exports: [hubspot_service_1.HubSpotService],
    })
], HubSpotModule);
//# sourceMappingURL=hubspot.module.js.map