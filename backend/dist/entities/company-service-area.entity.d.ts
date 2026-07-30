import { Company } from './company.entity';
import { Dma } from './dma.entity';
import { ServiceProvided } from './service-provided.entity';
export declare class CompanyServiceArea {
    companyServiceAreaId: number;
    companyId: number;
    dmaid: number;
    serviceProvidedId: number;
    company: Company;
    dma: Dma;
    serviceProvided: ServiceProvided;
}
