import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { Address } from '../entities/address.entity';
import { CompanyType } from '../entities/company-type.entity';
import { Company } from '../entities/company.entity';
import { ContactAssignment } from '../entities/contact-assignment.entity';
import { ContactInfo } from '../entities/contact-info.entity';
import { Contact } from '../entities/contact.entity';
import { Dma } from '../entities/dma.entity';
import { EngagementProjectVenue } from '../entities/engagement-project-venue.entity';
import { EngagementVenue } from '../entities/engagement-venue.entity';
import { Department } from '../entities/department.entity';
import { Role } from '../entities/role.entity';
import { Venue } from '../entities/venue.entity';
import { VenueBrand } from '../entities/venue-brand.entity';
import { Brand } from '../entities/brand.entity';
import { VenueTax } from '../entities/venue-tax.entity';
import { Tax } from '../entities/tax.entity';
import { ServiceProvided } from '../entities/service-provided.entity';
import { CompanyService as CompanyServiceEntity } from '../entities/company-service.entity';
import { CompanyServiceArea } from '../entities/company-service-area.entity';
import { CompanyTypeService } from '../entities/company-type-service.entity';
import { VenueServiceProvider } from '../entities/venue-service-provider.entity';
import { NonResidentWithholding } from '../entities/non-resident-withholding.entity';
import { EngagementService, EngagementListRow } from '../engagements/engagement.service';
import { Link } from '../entities/link.entity';
import { VenueComplex } from '../entities/venue-complex.entity';
import { VenueComplexMember } from '../entities/venue-complex-member.entity';
import { CreateCompanyContactDto } from './dto/create-company-contact.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyContactDto } from './dto/create-company-contact.dto';
import { ManageContactDto, UpdateManagedContactDto } from './dto/manage-contact.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateVenueTicketingDto } from './dto/update-venue-ticketing.dto';
import { UpdateVenueProfileDto } from './dto/update-venue-profile.dto';
import { UpdateVenueDetailsDto } from './dto/update-venue-details.dto';
import { HubSpotService } from '../hubspot/hubspot.service';
export interface CompanyListRow {
    companyId: number;
    companyName: string;
    isInternal: boolean;
    companyTypeId: number;
    companyTypeName: string;
    companyTypeIds: number[];
    companyTypeNames: string[];
    serviceProvidedIds: number[];
    serviceProvidedNames: string[];
    physicalCity: string;
    physicalStateProvince: string;
    dmaId: number | null;
    dmaMarketName: string;
}
export interface CompanyDetail extends CompanyListRow {
    physicalAddress: Address;
    mailingAddress: Address;
    serviceAreas: {
        dmaid: number;
        dmaMarketName: string;
        serviceProvidedId: number;
        serviceName: string;
    }[];
    allDmas: boolean;
    allDmasServiceProvidedId: number | null;
}
export interface CompanyContactRow {
    contactAssignmentId: number;
    contactId: number;
    contactInfoId: number;
    firstName: string;
    lastName: string;
    email: string;
    cellPhone: string | null;
    workPhone: string | null;
    roleId: number;
    roleName: string;
    departmentId: number;
    departmentName: string;
}
export interface ManagedContactRow {
    contactId: number;
    contactInfoId: number;
    firstName: string;
    lastName: string;
    email: string;
    cellPhone: string | null;
    workPhone: string | null;
    isStaff: boolean;
    companyIds: number[];
    companyNames: string[];
    roleIds: number[];
    roleNames: string[];
    departmentIds: number[];
    departmentNames: string[];
}
export interface CompanyVenueLinkedContactsSection {
    venueCompanyId: number;
    venueCompanyName: string;
    contacts: CompanyContactRow[];
}
export declare class CompanyService {
    private readonly configService;
    private readonly hubSpotService;
    private readonly dataSource;
    private readonly companyRepo;
    private readonly addressRepo;
    private readonly dmaRepo;
    private readonly assignmentRepo;
    private readonly contactInfoRepo;
    private readonly contactRepo;
    private readonly venueRepo;
    private readonly venueComplexRepo;
    private readonly venueComplexMemberRepo;
    private readonly venueBrandRepo;
    private readonly brandRepo;
    private readonly venueTaxRepo;
    private readonly taxRepo;
    private readonly serviceProvidedRepo;
    private readonly companyServiceRepo;
    private readonly companyTypeServiceRepo;
    private readonly companyServiceAreaRepo;
    private readonly venueServiceProviderRepo;
    private readonly nonResidentWithholdingRepo;
    private readonly linkRepo;
    private readonly engagementVenueRepo;
    private readonly engagementProjectVenueRepo;
    private readonly companyTypeRepo;
    private readonly roleRepo;
    private readonly departmentRepo;
    private readonly engagementService;
    private readonly logger;
    private venueTicketingColCache;
    private companyTypeLinkTableCache;
    constructor(configService: ConfigService, hubSpotService: HubSpotService, dataSource: DataSource, companyRepo: Repository<Company>, addressRepo: Repository<Address>, dmaRepo: Repository<Dma>, assignmentRepo: Repository<ContactAssignment>, contactInfoRepo: Repository<ContactInfo>, contactRepo: Repository<Contact>, venueRepo: Repository<Venue>, venueComplexRepo: Repository<VenueComplex>, venueComplexMemberRepo: Repository<VenueComplexMember>, venueBrandRepo: Repository<VenueBrand>, brandRepo: Repository<Brand>, venueTaxRepo: Repository<VenueTax>, taxRepo: Repository<Tax>, serviceProvidedRepo: Repository<ServiceProvided>, companyServiceRepo: Repository<CompanyServiceEntity>, companyTypeServiceRepo: Repository<CompanyTypeService>, companyServiceAreaRepo: Repository<CompanyServiceArea>, venueServiceProviderRepo: Repository<VenueServiceProvider>, nonResidentWithholdingRepo: Repository<NonResidentWithholding>, linkRepo: Repository<Link>, engagementVenueRepo: Repository<EngagementVenue>, engagementProjectVenueRepo: Repository<EngagementProjectVenue>, companyTypeRepo: Repository<CompanyType>, roleRepo: Repository<Role>, departmentRepo: Repository<Department>, engagementService: EngagementService);
    private safeDbIdentifier;
    private assertSingleInternalCompany;
    private canQueryCompanyTypeLinkTable;
    private normalizeServiceProvidedIds;
    private normalizeCompanyTypeIds;
    private allowedServiceIdsForCompanyTypes;
    private assertCompanyServicesAllowedForTypes;
    private resolveCompanyTypeLinkTableName;
    private collectCompanyTypesByCompanyId;
    private collectCompanyServicesByCompanyId;
    private mapCompanyToDetail;
    private listAllDmaMarketIds;
    private buildAllDmasMetaMap;
    private syncCompanyServices;
    private normalizeServiceAreas;
    private syncCompanyServiceAreas;
    private collectCompanyServiceAreasByCompanyId;
    private syncCompanyTypes;
    private loadEffectiveCompanyTypeIds;
    private getStagehandsServiceId;
    private getRoleIdByName;
    private getDepartmentIdByName;
    private upsertVenueContactByRoleDept;
    private contactNamePartForDisplay;
    private mapContactInfoToVenueRoleRow;
    private getVenueContactByRoleDept;
    private getVenueContactsByRoleDept;
    private insertVenueContactAssignment;
    private replaceVenueContactsByRoleDept;
    private upsertLink;
    getVenueDetails(companyId: number): Promise<{
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
    updateVenueDetails(companyId: number, dto: UpdateVenueDetailsDto): Promise<{
        updated: true;
    }>;
    private ensureRole;
    private ensureDepartment;
    normalizePostal(postalCode: string, country: string): string;
    resolveDmaId(postalCode: string, country: string): Promise<number | null>;
    private normalizeAddressPayload;
    private getOrCreateAddress;
    findAll(): Promise<CompanyDetail[]>;
    findAllPaginated(offset: number, limit: number, search?: string, companyType?: string, sortByRaw?: string, sortDirRaw?: string): Promise<{
        data: CompanyDetail[];
        total: number;
    }>;
    findOne(companyId: number): Promise<CompanyDetail>;
    create(dto: CreateCompanyDto): Promise<CompanyDetail>;
    private newVenuePayload;
    private getResolvedVenueTicketingColumns;
    private loadVenueTicketingWebsiteColumns;
    private updateVenueTicketingWebsiteColumns;
    private ensureVenueRowForCompanyTypes;
    private assertVenueCompanyForProfile;
    private buildVenueProfileReadModel;
    getVenueProfile(companyId: number): Promise<{
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
    private findCompaniesByIdsChunked;
    private getVenueComplexCompanyIds;
    private updateVenueComplexMembership;
    provisionVenueProfile(companyId: number): Promise<{
        created: boolean;
    }>;
    updateVenueProfile(companyId: number, dto: UpdateVenueProfileDto): Promise<void>;
    private normalizeCompanyTypeName;
    private typeIdsIncludeVenue;
    private assertCompanyTypeChangeAllowed;
    private deleteVenueProfileForCompany;
    update(companyId: number, dto: UpdateCompanyDto): Promise<CompanyDetail>;
    remove(companyId: number): Promise<void>;
    listContacts(companyId: number, filters?: {
        roleId?: number;
        roleName?: string;
    }): Promise<CompanyContactRow[]>;
    listLinkedVenueContactsForComplex(companyId: number): Promise<CompanyVenueLinkedContactsSection[]>;
    private mapRawContactRow;
    private uniquePositiveInts;
    private ensureManagedContactAssignments;
    private getOrCreateManagedContact;
    listManagedContacts(offset?: number, limit?: number, q?: string, companyId?: number): Promise<{
        data: ManagedContactRow[];
        total: number;
    }>;
    private getManagedContactRowById;
    createManagedContact(dto: ManageContactDto): Promise<ManagedContactRow>;
    updateManagedContact(contactId: number, dto: UpdateManagedContactDto): Promise<ManagedContactRow>;
    getContactConnections(contactId: number): Promise<{
        engagements: {
            engagementId: number;
            tourName: string;
        }[];
        tours: {
            tourId: number;
            tourName: string;
        }[];
    }>;
    removeManagedContact(contactId: number): Promise<void>;
    addContact(companyId: number, dto: CreateCompanyContactDto): Promise<CompanyContactRow>;
    updateContact(contactAssignmentId: number, dto: UpdateCompanyContactDto): Promise<CompanyContactRow>;
    removeContact(contactAssignmentId: number): Promise<void>;
    removeContactCompletely(contactAssignmentId: number): Promise<void>;
    private getContactRow;
    listEngagements(companyId: number): Promise<EngagementListRow[]>;
    getCompanyLinks(companyId: number): Promise<{
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
    updateVenueTicketing(companyId: number, dto: UpdateVenueTicketingDto): Promise<{
        updated: boolean;
    }>;
    getVenueTicketing(companyId: number): Promise<{
        seatingTypeId: number | null;
        seatingTypeName: string | null;
        ticketingSystem: string | null;
        venueWebsite: string | null;
    } | null>;
    private searchTokens;
    private escapeLikePattern;
    private ensureCompany;
}
