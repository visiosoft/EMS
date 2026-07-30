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
var HubSpotSignatureService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HubSpotSignatureService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
let HubSpotSignatureService = HubSpotSignatureService_1 = class HubSpotSignatureService {
    configService;
    logger = new common_1.Logger(HubSpotSignatureService_1.name);
    constructor(configService) {
        this.configService = configService;
    }
    verify(signatureHeader, signatureVersion, requestBody, requestUrl, httpMethod) {
        const clientSecret = this.configService.get('HUBSPOT_CLIENT_SECRET');
        if (!clientSecret) {
            this.logger.error('HUBSPOT_CLIENT_SECRET is not configured. Cannot verify webhook signatures.');
            return false;
        }
        if (!signatureHeader) {
            return false;
        }
        try {
            let sourceString;
            if (signatureVersion === 'v2') {
                sourceString =
                    clientSecret +
                        (httpMethod || 'POST') +
                        (requestUrl || '') +
                        requestBody;
            }
            else {
                sourceString = clientSecret + requestBody;
            }
            const hash = (0, crypto_1.createHmac)('sha256', clientSecret)
                .update(sourceString)
                .digest('hex');
            const expected = Buffer.from(hash, 'utf8');
            const received = Buffer.from(signatureHeader, 'utf8');
            if (expected.length !== received.length) {
                return false;
            }
            return (0, crypto_1.timingSafeEqual)(expected, received);
        }
        catch (error) {
            this.logger.error('Error verifying HubSpot signature', error);
            return false;
        }
    }
};
exports.HubSpotSignatureService = HubSpotSignatureService;
exports.HubSpotSignatureService = HubSpotSignatureService = HubSpotSignatureService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], HubSpotSignatureService);
//# sourceMappingURL=hubspot-signature.service.js.map