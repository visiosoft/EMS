import { ConfigService } from '@nestjs/config';
import { type JWTPayload } from 'jose';
export type EntraRequestUser = JWTPayload & {
    name?: string;
    oid?: string;
    email?: string;
    preferred_username?: string;
    upn?: string;
    roles?: string[];
};
export declare class EntraTokenVerifier {
    private readonly configService;
    constructor(configService: ConfigService);
    verify(token: string): Promise<EntraRequestUser>;
    buildTokenValidationDetail(token: string, error: unknown): string;
    private getConfigValue;
    private getTenantId;
    private getClientId;
    private getAudienceCandidates;
}
export declare function getBearerToken(headerValue: string | string[] | undefined): string;
export declare function getOptionalBearerToken(headerValue: string | string[] | undefined): string | null;
