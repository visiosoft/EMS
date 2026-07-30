declare class AddressDto {
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
}
export declare class CreateEngagementTravelHotelDto {
    bookedBy?: string | null;
    hotelCompanyId?: number | null;
    numberOfRooms?: number | null;
    roomTypes?: string | null;
    checkInDate?: string | null;
    checkOutDate?: string | null;
    occupantContactId?: number | null;
}
export declare class UpdateEngagementTravelHotelDto extends CreateEngagementTravelHotelDto {
}
export declare class CreateEngagementTravelCarServiceDto {
    bookedBy?: string | null;
    originAddressId?: number | null;
    originAddress?: AddressDto | null;
    destinationAddressId?: number | null;
    destinationAddress?: AddressDto | null;
    pickupDateTime?: string | null;
}
export declare class UpdateEngagementTravelCarServiceDto extends CreateEngagementTravelCarServiceDto {
}
export {};
