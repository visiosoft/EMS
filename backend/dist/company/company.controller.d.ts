import { CompanyService } from './company.service';
import { CreateCompanyContactDto, UpdateCompanyContactDto } from './dto/create-company-contact.dto';
import { ManageContactDto, UpdateManagedContactDto } from './dto/manage-contact.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateVenueTicketingDto } from './dto/update-venue-ticketing.dto';
import { UpdateVenueProfileDto } from './dto/update-venue-profile.dto';
import { UpdateVenueDetailsDto } from './dto/update-venue-details.dto';
export declare class CompanyController {
    private readonly companyService;
    constructor(companyService: CompanyService);
    findAll(offset: number, limit: number, q?: string, companyType?: string, sortBy?: string, sortDir?: string): Promise<{
        data: import("./company.service").CompanyDetail[];
        total: number;
    }>;
    create(dto: CreateCompanyDto): Promise<import("./company.service").CompanyDetail>;
    listContacts(id: number, roleIdRaw?: string, roleName?: string): Promise<import("./company.service").CompanyContactRow[]>;
    listLinkedVenueContacts(id: number): Promise<import("./company.service").CompanyVenueLinkedContactsSection[]>;
    addContact(id: number, dto: CreateCompanyContactDto): Promise<import("./company.service").CompanyContactRow>;
    listEngagements(id: number): Promise<import("../engagements/engagement.service").EngagementListRow[]>;
    getCompanyLinks(id: number): Promise<{
        engagements: {
            engagementId: number;
            title: string;
            subtitle: string | null;
            label: string;
        }[];
        projects: {
            projectId: number;
            title: string;
            subtitle: string | null;
            label: string;
        }[];
        tours: {
            tourId: number;
            title: string;
            subtitle: string | null;
            label: string;
            role: string;
        }[];
        attractions: {
            attractionId: number;
            title: string;
            subtitle: null;
            label: string;
            role: string;
        }[];
        serviceProviderFor: {
            venueCompanyId: number;
            title: string;
            subtitle: null;
            label: string;
        }[];
        entertainmentComplexes: {
            complexCompanyId: number;
            title: string;
            subtitle: null;
            label: string;
        }[];
        complexVenues: {
            venueCompanyId: number;
            title: string;
            subtitle: null;
            label: string;
        }[];
    }>;
    getVenueTicketing(id: number): Promise<{
        seatingTypeId: number | null;
        seatingTypeName: string | null;
        ticketingSystem: string | null;
        venueWebsite: string | null;
    } | null>;
    updateVenueTicketing(id: number, dto: UpdateVenueTicketingDto): Promise<{
        updated: boolean;
    }>;
    getVenueProfile(id: number): Promise<{
        missing: false;
        companyId: number;
        venueName: string;
        seatingCapacity: number;
        salesTaxRate: string | null;
        taxInCart: boolean;
        insuranceLanguage: string | null;
        insurancePolicyCopyRequirements: string | null;
        venueRelationshipIae: string;
        venueTypeId: number | null;
        venueTypeName: string | null;
        entertainmentComplexCompanyIds: number[];
        entertainmentComplexes: {
            companyId: number;
            companyName: string;
        }[];
        seatingTypeId: number | null;
        seatingTypeName: string | null;
        ticketingSystem: string | null;
        venueWebsite: string | null;
        brandIds: number[];
        loadDockAddress: {
            addressId: number;
            addressLine1: string;
            addressLine2: string | null;
            city: string;
            stateProvince: string;
            postalCode: string;
            country: string;
        } | null;
    } | {
        missing: true;
    }>;
    provisionVenueProfile(id: number): Promise<{
        created: boolean;
    }>;
    updateVenueProfile(id: number, dto: UpdateVenueProfileDto): Promise<void>;
    getVenueDetails(id: number): Promise<{
        missing: true;
        venueProfile?: undefined;
        brandIds?: undefined;
        taxIds?: undefined;
        stagehandProviderCompanyId?: undefined;
        nonResidentWithholdingId?: undefined;
        hasStateTaxOnTickets?: undefined;
        hasCityTaxOnTickets?: undefined;
        financeDirectors?: undefined;
        settlementManagers?: undefined;
        marketingDirectors?: undefined;
        technicalDirectors?: undefined;
        ticketingManagers?: undefined;
        bookingDirectors?: undefined;
        rentalManagers?: undefined;
        calendarManagers?: undefined;
        contractManagers?: undefined;
        stagehandProviderContacts?: undefined;
        nonResidentWithholding?: undefined;
    } | {
        missing: false;
        venueProfile: {
            missing: false;
            companyId: number;
            venueName: string;
            seatingCapacity: number;
            salesTaxRate: string | null;
            taxInCart: boolean;
            insuranceLanguage: string | null;
            insurancePolicyCopyRequirements: string | null;
            venueRelationshipIae: string;
            venueTypeId: number | null;
            venueTypeName: string | null;
            entertainmentComplexCompanyIds: number[];
            entertainmentComplexes: {
                companyId: number;
                companyName: string;
            }[];
            seatingTypeId: number | null;
            seatingTypeName: string | null;
            ticketingSystem: string | null;
            venueWebsite: string | null;
            brandIds: number[];
            loadDockAddress: {
                addressId: number;
                addressLine1: string;
                addressLine2: string | null;
                city: string;
                stateProvince: string;
                postalCode: string;
                country: string;
            } | null;
        };
        brandIds: number[];
        taxIds: number[];
        stagehandProviderCompanyId: number | null;
        nonResidentWithholdingId: number | null;
        hasStateTaxOnTickets: number;
        hasCityTaxOnTickets: number;
        financeDirectors: {
            contactId: number;
            contactInfoId: number;
            fullName: string;
            email: string;
            phone: string | null;
            cellPhone: string | null;
        }[];
        settlementManagers: {
            contactId: number;
            contactInfoId: number;
            fullName: string;
            email: string;
            phone: string | null;
            cellPhone: string | null;
        }[];
        marketingDirectors: {
            contactId: number;
            contactInfoId: number;
            fullName: string;
            email: string;
            phone: string | null;
            cellPhone: string | null;
        }[];
        technicalDirectors: {
            contactId: number;
            contactInfoId: number;
            fullName: string;
            email: string;
            phone: string | null;
            cellPhone: string | null;
        }[];
        ticketingManagers: {
            contactId: number;
            contactInfoId: number;
            fullName: string;
            email: string;
            phone: string | null;
            cellPhone: string | null;
        }[];
        bookingDirectors: {
            contactId: number;
            contactInfoId: number;
            fullName: string;
            email: string;
            phone: string | null;
            cellPhone: string | null;
        }[];
        rentalManagers: {
            contactId: number;
            contactInfoId: number;
            fullName: string;
            email: string;
            phone: string | null;
            cellPhone: string | null;
        }[];
        calendarManagers: {
            contactId: number;
            contactInfoId: number;
            fullName: string;
            email: string;
            phone: string | null;
            cellPhone: string | null;
        }[];
        contractManagers: {
            contactId: number;
            contactInfoId: number;
            fullName: string;
            email: string;
            phone: string | null;
            cellPhone: string | null;
        }[];
        stagehandProviderContacts: {
            contactId: number;
            contactInfoId: number;
            fullName: string;
            email: string;
            phone: string | null;
            cellPhone: string | null;
        }[];
        nonResidentWithholding: {
            withholdingId: number;
            withholdingTaxRate: string;
            dmaid: number | null | undefined;
            taxAgencyId: number | null;
            withholdingLink: {
                linkId: number;
                linkType: string;
                linkUrl: string;
                linkName: string;
                linkPath: string;
            } | null;
            artistWaiverInstructions: {
                linkId: number;
                linkType: string;
                linkUrl: string;
                linkName: string;
                linkPath: string;
            } | null;
            iaeWaiverInstructions: {
                linkId: number;
                linkType: string;
                linkUrl: string;
                linkName: string;
                linkPath: string;
            } | null;
        } | null;
    }>;
    updateVenueDetails(id: number, dto: UpdateVenueDetailsDto): Promise<{
        updated: true;
    }>;
    findOne(id: number): Promise<import("./company.service").CompanyDetail>;
    update(id: number, dto: UpdateCompanyDto): Promise<import("./company.service").CompanyDetail>;
    remove(id: number): Promise<void>;
}
export declare class ContactAssignmentsController {
    private readonly companyService;
    constructor(companyService: CompanyService);
    updateContact(assignmentId: number, dto: UpdateCompanyContactDto): Promise<import("./company.service").CompanyContactRow>;
    removeContact(assignmentId: number): Promise<void>;
}
export declare class ContactsController {
    private readonly companyService;
    constructor(companyService: CompanyService);
    list(offset: number, limit: number, q?: string, companyIdRaw?: string): Promise<{
        data: import("./company.service").ManagedContactRow[];
        total: number;
    }>;
    create(dto: ManageContactDto): Promise<import("./company.service").ManagedContactRow>;
    update(id: number, dto: UpdateManagedContactDto): Promise<import("./company.service").ManagedContactRow>;
    getConnections(id: number): Promise<{
        engagements: {
            engagementId: number;
            tourName: string;
        }[];
        tours: {
            tourId: number;
            tourName: string;
        }[];
    }>;
    findOne(id: number): Promise<import("./company.service").ManagedContactRow>;
    remove(id: number): Promise<void>;
}
