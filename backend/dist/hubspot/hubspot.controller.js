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
var HubSpotController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HubSpotController = void 0;
const common_1 = require("@nestjs/common");
const hubspot_signature_service_1 = require("./hubspot-signature.service");
const hubspot_service_1 = require("./hubspot.service");
let HubSpotController = HubSpotController_1 = class HubSpotController {
    hubSpotService;
    signatureService;
    logger = new common_1.Logger(HubSpotController_1.name);
    constructor(hubSpotService, signatureService) {
        this.hubSpotService = hubSpotService;
        this.signatureService = signatureService;
    }
    syncExternalContacts(dryRun, limit) {
        return this.hubSpotService.syncExternalContacts({ dryRun, limit });
    }
    handleWebhook(signature, signatureVersion, req, events) {
        if (signature) {
            if (!req.rawBody) {
                this.logger.error('rawBody not available on request. Ensure NestFactory.create has { rawBody: true }.');
                throw new common_1.UnauthorizedException('Unable to verify webhook signature');
            }
            const rawBody = req.rawBody.toString('utf8');
            if (signatureVersion === 'v3') {
                this.logger.warn('Received v3 signature which is not yet supported. Rejecting.');
                throw new common_1.UnauthorizedException('Signature version v3 is not yet supported');
            }
            const requestUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
            const isValid = this.signatureService.verify(signature, signatureVersion || 'v1', rawBody, requestUrl, req.method);
            if (!isValid) {
                this.logger.warn('HubSpot webhook signature verification failed.');
                throw new common_1.UnauthorizedException('Invalid webhook signature');
            }
        }
        setImmediate(() => {
            this.hubSpotService.handleWebhookEvents(events).catch((error) => {
                this.logger.error('Unhandled error processing webhook events', error instanceof Error ? error.stack : error);
            });
        });
        return { received: true };
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
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Headers)('x-hubspot-signature')),
    __param(1, (0, common_1.Headers)('x-hubspot-signature-version')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Array]),
    __metadata("design:returntype", Object)
], HubSpotController.prototype, "handleWebhook", null);
exports.HubSpotController = HubSpotController = HubSpotController_1 = __decorate([
    (0, common_1.Controller)('internal/hubspot'),
    __metadata("design:paramtypes", [hubspot_service_1.HubSpotService,
        hubspot_signature_service_1.HubSpotSignatureService])
], HubSpotController);
//# sourceMappingURL=hubspot.controller.js.map