import { Request } from 'express';
import { HubSpotWebhookEventDto } from './dto/hubspot-webhook-event.dto';
import { HubSpotSignatureService } from './hubspot-signature.service';
import { HubSpotService } from './hubspot.service';
export declare class HubSpotController {
    private readonly hubSpotService;
    private readonly signatureService;
    private readonly logger;
    constructor(hubSpotService: HubSpotService, signatureService: HubSpotSignatureService);
    syncExternalContacts(dryRun: boolean, limit: number): Promise<import("./hubspot.service").HubSpotContactSyncResult>;
    handleWebhook(signature: string, signatureVersion: string, req: Request & {
        rawBody?: Buffer;
    }, events: HubSpotWebhookEventDto[]): {
        received: boolean;
    };
}
