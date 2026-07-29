import { AuditColumns } from '../audit/audit-columns';
import { Address } from './address.entity';
import { CompanyType } from './company-type.entity';
import { Dma } from './dma.entity';
export declare class Company extends AuditColumns {
    companyId: number;
    companyTypeId: number;
    companyType: CompanyType;
    companyName: string;
    physicalAddressId: number;
    physicalAddress: Address;
    mailingAddressId: number;
    mailingAddress: Address;
    dmaid: number | null;
    dma: Dma;
    isInternal: boolean;
}
