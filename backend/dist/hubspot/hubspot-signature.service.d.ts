import { ConfigService } from '@nestjs/config';
export declare class HubSpotSignatureService {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    verify(signatureHeader: string, signatureVersion: string, requestBody: string, requestUrl?: string, httpMethod?: string): boolean;
}
