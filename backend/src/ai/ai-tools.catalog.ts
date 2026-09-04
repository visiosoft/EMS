import { AiToolDefinition } from './ai.types';

export const AI_TOOLS_CATALOG: AiToolDefinition[] = [
    {
        name: 'search_projects',
        description: 'Search event management projects by name, status, attraction, tour, or year.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Keyword search for project name, attraction, or notes',
                },
                status: {
                    type: 'string',
                    description: 'Filter by project status (e.g. In Progress, Confirmed, Cancelled, Completed)',
                },
                limit: {
                    type: 'number',
                    description: 'Max number of projects to return (default: 15)',
                },
            },
        },
    },
    {
        name: 'get_project_detail',
        description: 'Get comprehensive details of a single project by its ID, including associated venues, offers, notes, and dates.',
        parameters: {
            type: 'object',
            properties: {
                projectId: {
                    type: 'number',
                    description: 'The unique numeric ID of the project (EngagementProjectID)',
                },
            },
            required: ['projectId'],
        },
    },
    {
        name: 'search_engagements',
        description: 'Search engagements (bookings/shows) by keyword, status, date range, or venue name.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search string for engagement, artist, or venue',
                },
                status: {
                    type: 'string',
                    description: 'Status filter (e.g., Confirmed, In Progress, Contract Signed, Archived)',
                },
                limit: {
                    type: 'number',
                    description: 'Max records to return (default: 15)',
                },
            },
        },
    },
    {
        name: 'get_engagement_detail',
        description: 'Retrieve full details for an engagement including financial terms, production details, performances, venue, and partners.',
        parameters: {
            type: 'object',
            properties: {
                engagementId: {
                    type: 'number',
                    description: 'The numeric ID of the engagement',
                },
            },
            required: ['engagementId'],
        },
    },
    {
        name: 'search_companies',
        description: 'Search the company directory for promoters, venues, agencies, co-promoters, and vendors.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Company name, city, state, or postal code',
                },
                companyType: {
                    type: 'string',
                    description: 'Filter by company type (e.g., Promoter, Agency, Venue, Vendor, Co-Promoter)',
                },
                limit: {
                    type: 'number',
                    description: 'Max records (default: 15)',
                },
            },
        },
    },
    {
        name: 'get_company_detail',
        description: 'Get details of a company including associated contacts and address.',
        parameters: {
            type: 'object',
            properties: {
                companyId: {
                    type: 'number',
                    description: 'The ID of the company',
                },
            },
            required: ['companyId'],
        },
    },
    {
        name: 'search_contacts',
        description: 'Search personnel and contacts by name, email, company, or job role.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Contact name, email address, or phone number',
                },
                role: {
                    type: 'string',
                    description: 'Role name filter (e.g. Agent, Booker, Executive, Production Manager)',
                },
                limit: {
                    type: 'number',
                    description: 'Max records (default: 15)',
                },
            },
        },
    },
    {
        name: 'search_venues',
        description: 'Search the venue directory by venue name, city, state, market, or seating capacity.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Venue name, city, or state',
                },
                minCapacity: {
                    type: 'number',
                    description: 'Minimum seating capacity',
                },
                maxCapacity: {
                    type: 'number',
                    description: 'Maximum seating capacity',
                },
                limit: {
                    type: 'number',
                    description: 'Max records (default: 15)',
                },
            },
        },
    },
    {
        name: 'get_daily_sales_summary',
        description: 'Get daily sales and box office performance summary for engagements or tours.',
        parameters: {
            type: 'object',
            properties: {
                engagementId: {
                    type: 'number',
                    description: 'Optional engagement ID to filter sales',
                },
                query: {
                    type: 'string',
                    description: 'Search by event or venue name',
                },
                limit: {
                    type: 'number',
                    description: 'Max records (default: 20)',
                },
            },
        },
    },
    {
        name: 'get_attractions_and_tours',
        description: 'List active touring attractions, tours, and roster information.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Attraction or tour name search',
                },
                limit: {
                    type: 'number',
                    description: 'Max records (default: 20)',
                },
            },
        },
    },
    {
        name: 'search_handbook_and_news',
        description: 'Search internal employee handbook, company policies, and company news announcements.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Keyword search for handbook policies, benefits, or news',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'execute_readonly_sql',
        description: 'HYBRID FALLBACK: Execute a safe, read-only SQL query against the MSSQL database when standard API endpoints do not provide the requested aggregation or cross-table join. ONLY SELECT statements are permitted.',
        parameters: {
            type: 'object',
            properties: {
                sqlQuery: {
                    type: 'string',
                    description: 'A read-only MSSQL SELECT query (e.g. "SELECT TOP 10 EngagementID, EngagementName, TotalGross FROM dbo.Engagement ORDER BY TotalGross DESC")',
                },
                reason: {
                    type: 'string',
                    description: 'Why this query is necessary and what data is being queried',
                },
            },
            required: ['sqlQuery'],
        },
    },
];
