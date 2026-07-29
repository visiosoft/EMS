import { ConfigService } from '@nestjs/config';
export declare class MicrosoftGraphService {
    private readonly configService;
    private readonly logger;
    private cachedToken;
    constructor(configService: ConfigService);
    getUserLicenses(userEmail: string): Promise<string[]>;
    getUserGroups(userEmail: string): Promise<string[]>;
    private getAppToken;
}
