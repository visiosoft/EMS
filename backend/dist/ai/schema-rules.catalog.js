"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SCHEMA_TABLE_RULES = void 0;
exports.getFullSchemaTableRules = getFullSchemaTableRules;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
exports.DEFAULT_SCHEMA_TABLE_RULES = [
    {
        tableName: 'Venue',
        category: 'Venues & Facilities',
        columns: ['CompanyID', 'VenueName', 'SeatingCapacity', 'SalesTaxType', 'SalesTaxRate', 'TaxInCart', 'StageDimensions', 'FlySystemSpecs', 'StageType', 'VenueRelationshipIAE', 'VenueTypeID', 'SeatingTypeID'],
        description: 'Physical event venues and theatres. Extends dbo.Company (CompanyID is PK and FK).',
        businessRules: 'Physical capacity is stored in [SeatingCapacity] (never use "Capacity"). Venues join to dbo.Address via dbo.Company.PhysicalAddressID. Always check SeatingCapacity when filtering large vs small venues.',
    },
    {
        tableName: 'Company',
        category: 'Organizations & Directory',
        columns: ['CompanyID', 'CompanyTypeID', 'CompanyName', 'PhysicalAddressID', 'MailingAddressID', 'DMAID', 'is_internal'],
        description: 'Core organizational entity for promoters, agencies, venues, co-promoters, and vendors.',
        businessRules: 'CompanyType is joined via dbo.CompanyType. Physical address is in dbo.Address via PhysicalAddressID. When searching companies, distinguish between internal NKU companies (is_internal = 1) and external partners.',
    },
    {
        tableName: 'Engagement',
        category: 'Bookings & Engagements',
        columns: ['EngagementID', 'EngagementStatus', 'EngagementScaling', 'TourID', 'SellableCapacity', 'GrossPotential', 'TourManagerContactID', 'IsSeasonShow', 'CurrencyCode'],
        description: 'Booked touring engagement for an attraction at a venue.',
        businessRules: 'Represents a scheduled stop on a tour. [SellableCapacity] is tickets available for sale after production holds. [GrossPotential] is max potential gross revenue. Primary venue is joined via dbo.EngagementVenue with IsPrimary = 1.',
    },
    {
        tableName: 'Performance',
        category: 'Bookings & Engagements',
        columns: ['PerformanceID', 'EngagementID', 'TicketingStatus', 'PerformanceDate', 'PerformanceTime', 'IsPublic', 'IsAdditional'],
        description: 'Specific show date and time for an engagement.',
        businessRules: 'Each row is one individual show/curtain time. [PerformanceDate] is the date, [PerformanceTime] is time. [TicketingStatus] indicates on-sale phase (e.g. "Public (On-Sale)"). Earliest PerformanceDate defines engagement start date.',
    },
    {
        tableName: 'TicketingSales',
        category: 'Daily Sales & Box Office',
        columns: ['PerformanceID', 'SalesDate', 'PerformanceSalesQuantity', 'PerformanceSalesRevenue'],
        description: 'Daily box office ticketing report snapshot per performance.',
        businessRules: '[PerformanceSalesQuantity] is number of tickets sold on SalesDate. [PerformanceSalesRevenue] is daily gross dollar amount. Sum these across an engagement to calculate cumulative sales to date.',
    },
    {
        tableName: 'EngagementProject',
        category: 'Routing Pipeline & Projects',
        columns: ['EngagementProjectID', 'TourID', 'OfferCreationStatus', 'OfferReviewStatus', 'CreatedDate', 'CreatedBy', 'ConfirmedOfferLinkID'],
        description: 'Routing deal and offer project for booking tours into potential markets.',
        businessRules: 'Project deals start in Drafted or In Consideration status before becoming Confirmed engagements. Linked to Tours via TourID.',
    },
    {
        tableName: 'EngagementProjectVenue',
        category: 'Routing Pipeline & Projects',
        columns: ['EngagementProjectVenueID', 'EngagementProjectID', 'VenueCompanyID', 'VenueStatus', 'OfferCreationStatus', 'OfferReviewStatus', 'ConfirmedOfferLinkID', 'DraftedOfferLinkID'],
        description: 'Venues being pitched or held for a specific project.',
        businessRules: 'Contains candidate venues for a tour routing. [VenueStatus] shows whether the venue is In Consideration, Confirmed, or Passed. Joins to dbo.Venue on VenueCompanyID = CompanyID.',
    },
    {
        tableName: 'Tour',
        category: 'Attractions & Touring',
        columns: ['TourID', 'TourName', 'AttractionID', 'ClassID', 'TourStartDate', 'TourEndDate', 'AudienceAgeRange', 'TalentAgencyCompanyID', 'TourManagementCompanyID'],
        description: 'Touring production entity under an Attraction.',
        businessRules: 'Represents a specific tour routing cycle (e.g. Fall 2026 Tour). Linked to Attraction via AttractionID.',
    },
    {
        tableName: 'Attraction',
        category: 'Attractions & Touring',
        columns: ['AttractionID', 'AttractionName', 'AttractionManagementLinkID'],
        description: 'Show brand, artist, or production intellectual property.',
        businessRules: 'Root entity for talent and shows. Tours are children of Attractions.',
    },
    {
        tableName: 'Contact',
        category: 'Personnel & Contacts',
        columns: ['ContactID', 'ContactInfoID'],
        description: 'Person or staff record in the directory.',
        businessRules: 'Joins 1:1 with dbo.ContactInfo via ContactInfoID to retrieve names, email, and phone numbers.',
    },
    {
        tableName: 'ContactInfo',
        category: 'Personnel & Contacts',
        columns: ['ContactInfoID', 'FirstName', 'LastName', 'Email', 'CellPhone', 'WorkPhone', 'WorkPhoneExtension'],
        description: 'Personal and contact information for personnel.',
        businessRules: 'Contains names and direct communication channels. Always retrieve [Email] and [CellPhone] when reporting contact details.',
    },
    {
        tableName: 'ContactAssignment',
        category: 'Personnel & Contacts',
        columns: ['ContactAssignmentID', 'ContactID', 'CompanyID', 'RoleID', 'DepartmentID'],
        description: 'Assigns a contact to a company with role and department affiliations.',
        businessRules: 'Maps people to companies (promoters, venues, agencies). Role is joined via dbo.Role (RoleName). Department is joined via dbo.Department (DepartmentName).',
    },
    {
        tableName: 'Address',
        category: 'Geography & Addresses',
        columns: ['AddressID', 'AddressLine1', 'AddressLine2', 'City', 'StateProvince', 'PostalCode', 'Country'],
        description: 'Physical, mailing, and load-dock address records.',
        businessRules: 'State code is stored in [StateProvince] (e.g., "NY", "CA", "TX"). Never query a column called "State".',
    },
    {
        tableName: 'DMA',
        category: 'Geography & Addresses',
        columns: ['DMAID', 'MarketName', 'PostalCode'],
        description: 'Nielsen Designated Market Area mappings and postal code assignments.',
        businessRules: 'Used for regional market routing and tour advertising scope.',
    },
    {
        tableName: 'DMAPopulation',
        category: 'Geography & Addresses',
        columns: ['NielsenCode', 'Rank', 'MarketName', 'Metro12PlusPopulation', 'Hispanic12PlusPopulation', 'Black12PlusPopulation'],
        description: 'Official Nielsen census population table by market rank.',
        businessRules: 'Contains market population sizing. [Rank] 1 is largest market (New York). Joined with DMA for demographic sizing.',
    },
    {
        tableName: 'EngagementVenue',
        category: 'Bookings & Engagements',
        columns: ['EngagementID', 'VenueCompanyID', 'IsPrimary', 'VenueBookingManagerContactID'],
        description: 'Venues associated with an engagement.',
        businessRules: 'Links Engagement to Venue (VenueCompanyID = Venue.CompanyID). [IsPrimary] = 1 identifies the main venue for the engagement.',
    },
];
function getFullSchemaTableRules() {
    const map = new Map();
    for (const item of exports.DEFAULT_SCHEMA_TABLE_RULES) {
        map.set(item.tableName.toLowerCase(), { ...item });
    }
    try {
        const filePath = path.resolve(process.cwd(), 'backend', 'data', 'extracted-schema.json');
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const parsed = JSON.parse(raw);
            for (const t of parsed) {
                const key = t.name.toLowerCase();
                if (!map.has(key)) {
                    map.set(key, {
                        tableName: t.name,
                        category: categorizeTable(t.name),
                        columns: t.columns || [],
                        description: `Database table dbo.${t.name}`,
                        businessRules: '',
                    });
                }
                else {
                    const existing = map.get(key);
                    if ((!existing.columns || existing.columns.length === 0) && t.columns) {
                        existing.columns = t.columns;
                    }
                }
            }
        }
    }
    catch {
    }
    return Array.from(map.values()).sort((a, b) => a.tableName.localeCompare(b.tableName));
}
function categorizeTable(name) {
    const n = name.toLowerCase();
    if (n.includes('venue') || n.includes('complex'))
        return 'Venues & Facilities';
    if (n.includes('engagement') || n.includes('performance') || n.includes('buyout') || n.includes('rehearsal'))
        return 'Bookings & Engagements';
    if (n.includes('sales') || n.includes('ticket') || n.includes('settlement'))
        return 'Daily Sales & Box Office';
    if (n.includes('project') || n.includes('offer'))
        return 'Routing Pipeline & Projects';
    if (n.includes('tour') || n.includes('attraction') || n.includes('brand'))
        return 'Attractions & Touring';
    if (n.includes('contact') || n.includes('employee') || n.includes('role') || n.includes('department'))
        return 'Personnel & Contacts';
    if (n.includes('company') || n.includes('vendor'))
        return 'Organizations & Directory';
    if (n.includes('address') || n.includes('dma') || n.includes('market'))
        return 'Geography & Addresses';
    if (n.includes('internal') || n.includes('handbook') || n.includes('news') || n.includes('benefit') || n.includes('learning'))
        return 'Internal Hub & HR';
    if (n.includes('ramp') || n.includes('hubspot') || n.includes('audit'))
        return 'Integrations & System';
    return 'Lookup & Reference Tables';
}
//# sourceMappingURL=schema-rules.catalog.js.map