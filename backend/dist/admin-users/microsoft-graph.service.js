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
var MicrosoftGraphService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicrosoftGraphService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const SKU_FRIENDLY_NAMES = {
    O365_BUSINESS_ESSENTIALS: 'Microsoft 365 Business Basic',
    O365_BUSINESS_PREMIUM: 'Microsoft 365 Business Standard',
    SPB: 'Microsoft 365 Business Premium',
    ENTERPRISEPACK: 'Office 365 E3',
    ENTERPRISEPREMIUM: 'Office 365 E5',
    ENTERPRISEPREMIUM_NOPSTNCONF: 'Office 365 E5 (without Audio Conferencing)',
    SPE_E3: 'Microsoft 365 E3',
    SPE_E5: 'Microsoft 365 E5',
    SPE_F1: 'Microsoft 365 F3',
    FLOW_FREE: 'Power Automate Free',
    FLOW_PER_USER: 'Power Automate per user',
    POWERAPPS_VIRAL: 'Power Apps Trial',
    POWERAPPS_PER_USER: 'Power Apps per user',
    POWER_BI_STANDARD: 'Power BI Free',
    POWER_BI_PRO: 'Power BI Pro',
    POWER_BI_PREMIUM_PER_USER: 'Power BI Premium per user',
    PROJECTPREMIUM: 'Project Plan 5',
    PROJECTPROFESSIONAL: 'Project Plan 3',
    VISIOCLIENT: 'Visio Plan 2',
    AAD_PREMIUM: 'Microsoft Entra ID P1',
    AAD_PREMIUM_P2: 'Microsoft Entra ID P2',
    EMSPREMIUM: 'Enterprise Mobility + Security E5',
    EMS: 'Enterprise Mobility + Security E3',
    RIGHTSMANAGEMENT: 'Azure Information Protection Plan 1',
    EXCHANGESTANDARD: 'Exchange Online (Plan 1)',
    EXCHANGEENTERPRISE: 'Exchange Online (Plan 2)',
    TEAMS_EXPLORATORY: 'Microsoft Teams Exploratory',
    STREAM: 'Microsoft Stream',
    WIN_DEF_ATP: 'Microsoft Defender for Endpoint',
    IDENTITY_THREAT_PROTECTION: 'Microsoft 365 E5 Security',
    WINDOWS_STORE: 'Windows Store for Business',
    INTUNE_A: 'Microsoft Intune Plan 1',
};
let MicrosoftGraphService = MicrosoftGraphService_1 = class MicrosoftGraphService {
    configService;
    logger = new common_1.Logger(MicrosoftGraphService_1.name);
    cachedToken = null;
    constructor(configService) {
        this.configService = configService;
    }
    async getUserLicenses(userEmail) {
        try {
            const token = await this.getAppToken();
            const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/licenseDetails`, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) {
                this.logger.warn(`Graph licenseDetails failed (${response.status}) for ${userEmail}`);
                return [];
            }
            const data = (await response.json());
            return (data.value ?? []).map((lic) => {
                const friendly = SKU_FRIENDLY_NAMES[lic.skuPartNumber];
                return friendly || lic.skuPartNumber;
            });
        }
        catch (err) {
            this.logger.error(`Failed to fetch licenses for ${userEmail}`, err);
            return [];
        }
    }
    async getUserGroups(userEmail) {
        try {
            const token = await this.getAppToken();
            const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/memberOf?$select=displayName,@odata.type&$top=200`, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) {
                this.logger.warn(`Graph memberOf failed (${response.status}) for ${userEmail}`);
                return [];
            }
            const data = (await response.json());
            return (data.value ?? [])
                .filter((m) => m['@odata.type'] === '#microsoft.graph.group' && m.displayName)
                .map((m) => m.displayName)
                .sort();
        }
        catch (err) {
            this.logger.error(`Failed to fetch groups for ${userEmail}`, err);
            return [];
        }
    }
    async getAppToken() {
        if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
            return this.cachedToken.token;
        }
        const tenantId = this.configService.get('ENTRA_TENANT_ID');
        const clientId = this.configService.get('ENTRA_CLIENT_ID');
        const clientSecret = this.configService.get('ENTRA_CLIENT_SECRET');
        if (!tenantId || !clientId || !clientSecret) {
            throw new Error('Missing ENTRA_TENANT_ID, ENTRA_CLIENT_ID, or ENTRA_CLIENT_SECRET for Graph API.');
        }
        const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
        const body = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            scope: 'https://graph.microsoft.com/.default',
        });
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to acquire Graph app token: ${response.status} ${text}`);
        }
        const tokenData = (await response.json());
        this.cachedToken = {
            token: tokenData.access_token,
            expiresAt: Date.now() + (tokenData.expires_in - 300) * 1000,
        };
        return tokenData.access_token;
    }
};
exports.MicrosoftGraphService = MicrosoftGraphService;
exports.MicrosoftGraphService = MicrosoftGraphService = MicrosoftGraphService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MicrosoftGraphService);
//# sourceMappingURL=microsoft-graph.service.js.map