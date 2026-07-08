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
exports.HubSpotController = void 0;
const common_1 = require("@nestjs/common");
const hubspot_service_1 = require("./hubspot.service");
let HubSpotController = class HubSpotController {
    hubSpotService;
    constructor(hubSpotService) {
        this.hubSpotService = hubSpotService;
    }
    syncExternalContacts(dryRun, limit) {
        return this.hubSpotService.syncExternalContacts({ dryRun, limit });
    }
};
exports.HubSpotController = HubSpotController;
__decorate([
    (0, common_1.Post)('contacts/sync'),
    __param(0, (0, common_1.Query)('dryRun', new common_1.DefaultValuePipe(true), common_1.ParseBoolPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(1000), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean, Number]),
    __metadata("design:returntype", void 0)
], HubSpotController.prototype, "syncExternalContacts", null);
exports.HubSpotController = HubSpotController = __decorate([
    (0, common_1.Controller)('internal/hubspot'),
    __metadata("design:paramtypes", [hubspot_service_1.HubSpotService])
], HubSpotController);
//# sourceMappingURL=hubspot.controller.js.map