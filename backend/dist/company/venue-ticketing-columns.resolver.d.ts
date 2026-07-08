import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
export type ResolvedVenueTicketingWebsiteColumns = {
    ticketing: string | null;
    website: string | null;
};
export declare function resolveVenueTicketingWebsiteColumns(dataSource: DataSource, config: ConfigService): Promise<ResolvedVenueTicketingWebsiteColumns>;
