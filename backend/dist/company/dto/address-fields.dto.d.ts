export declare class AddressFieldsDto {
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
}
export declare class AddressPayloadDto {
    physical: AddressFieldsDto;
    mailingSameAsPhysical?: boolean;
    mailing?: AddressFieldsDto;
}
