import { HubSpotService } from './hubspot.service';
export declare class HubSpotController {
    private readonly hubSpotService;
    constructor(hubSpotService: HubSpotService);
    syncExternalContacts(dryRun: boolean, limit: number): Promise<import("./hubspot.service").HubSpotContactSyncResult>;
}
