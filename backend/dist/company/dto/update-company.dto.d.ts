import { AddressFieldsDto } from './address-fields.dto';
import { CompanyServiceAreaDto } from './company-service-area.dto';
export declare class UpdateCompanyDto {
    companyName?: string;
    isInternal?: boolean;
    companyTypeId?: number;
    companyTypeIds?: number[];
    serviceProvidedIds?: number[];
    serviceAreas?: CompanyServiceAreaDto[];
    allDmas?: boolean;
    allDmasServiceProvidedId?: number;
    dmaId?: number;
    physical?: AddressFieldsDto;
    mailing?: AddressFieldsDto;
    mailingSameAsPhysical?: boolean;
}
