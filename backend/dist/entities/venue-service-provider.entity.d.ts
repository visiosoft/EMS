import { Company } from './company.entity';
import { ServiceProvided } from './service-provided.entity';
import { Venue } from './venue.entity';
export declare class VenueServiceProvider {
    venueCompanyId: number;
    serviceId: number;
    providerCompanyId: number;
    venue: Venue;
    service: ServiceProvided;
    providerCompany: Company;
}
