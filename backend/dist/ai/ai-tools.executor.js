"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AiToolsExecutor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiToolsExecutor = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let AiToolsExecutor = AiToolsExecutor_1 = class AiToolsExecutor {
    dataSource;
    logger = new common_1.Logger(AiToolsExecutor_1.name);
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async executeTool(name, input) {
        const startTime = Date.now();
        const record = {
            id: `call_${Math.random().toString(36).substring(2, 9)}`,
            name,
            input,
        };
        try {
            let resultData;
            switch (name) {
                case 'search_projects':
                    resultData = await this.searchProjects(input);
                    break;
                case 'get_project_detail':
                    resultData = await this.getProjectDetail(input);
                    break;
                case 'search_engagements':
                    resultData = await this.searchEngagements(input);
                    break;
                case 'get_engagement_detail':
                    resultData = await this.getEngagementDetail(input);
                    break;
                case 'search_companies':
                    resultData = await this.searchCompanies(input);
                    break;
                case 'get_company_detail':
                    resultData = await this.getCompanyDetail(input);
                    break;
                case 'search_contacts':
                    resultData = await this.searchContacts(input);
                    break;
                case 'search_venues':
                    resultData = await this.searchVenues(input);
                    break;
                case 'get_daily_sales_summary':
                    resultData = await this.getDailySalesSummary(input);
                    break;
                case 'get_attractions_and_tours':
                    resultData = await this.getAttractionsAndTours(input);
                    break;
                case 'search_handbook_and_news':
                    resultData = await this.searchHandbookAndNews(input);
                    break;
                case 'execute_readonly_sql':
                    resultData = await this.executeReadonlySql(input);
                    break;
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
            record.executionTimeMs = Date.now() - startTime;
            record.outputSummary = typeof resultData === 'string'
                ? resultData
                : JSON.stringify(resultData, null, 2);
        }
        catch (err) {
            record.executionTimeMs = Date.now() - startTime;
            record.error = err.message || 'Tool execution error';
            record.outputSummary = JSON.stringify({ error: record.error });
            this.logger.error(`Error executing tool ${name}: ${err.message}`, err.stack);
        }
        return record;
    }
    async searchProjects(input) {
        const query = String(input.query || '').trim();
        const status = String(input.status || '').trim();
        const limit = Math.min(Math.max(Number(input.limit) || 15, 1), 50);
        let sql = `
      SELECT TOP (${limit})
        p.EngagementProjectID AS id,
        t.TourName AS tourName,
        a.AttractionName AS attractionName,
        p.OfferCreationStatus AS offerCreationStatus,
        p.OfferReviewStatus AS offerReviewStatus,
        p.CreatedDate AS createdDate
      FROM dbo.EngagementProject p
      LEFT JOIN dbo.Tour t ON p.TourID = t.TourID
      LEFT JOIN dbo.Attraction a ON t.AttractionID = a.AttractionID
      WHERE 1=1
    `;
        const params = [];
        if (query) {
            sql += ` AND (t.TourName LIKE @${params.length} OR a.AttractionName LIKE @${params.length})`;
            params.push(`%${query}%`);
        }
        if (status) {
            sql += ` AND (p.OfferCreationStatus LIKE @${params.length} OR p.OfferReviewStatus LIKE @${params.length})`;
            params.push(`%${status}%`);
        }
        sql += ` ORDER BY p.EngagementProjectID DESC`;
        return this.dataSource.query(sql, params);
    }
    async getProjectDetail(input) {
        const projectId = Number(input.projectId);
        if (!projectId)
            throw new Error('Missing valid projectId');
        const project = await this.dataSource.query(`SELECT TOP 1
        p.EngagementProjectID AS id,
        t.TourName AS tourName,
        a.AttractionName AS attractionName,
        p.OfferCreationStatus AS offerCreationStatus,
        p.OfferReviewStatus AS offerReviewStatus,
        p.CreatedDate AS createdDate,
        p.CreatedBy AS createdBy
      FROM dbo.EngagementProject p
      LEFT JOIN dbo.Tour t ON p.TourID = t.TourID
      LEFT JOIN dbo.Attraction a ON t.AttractionID = a.AttractionID
      WHERE p.EngagementProjectID = @0`, [projectId]);
        if (!project || project.length === 0) {
            return { message: `Project with ID ${projectId} not found.` };
        }
        const venues = await this.dataSource.query(`SELECT TOP 50
        pv.EngagementProjectVenueID AS id,
        v.VenueName AS venueName,
        v.SeatingCapacity AS seatingCapacity,
        pv.VenueStatus AS venueStatus,
        a.City AS city,
        a.StateProvince AS stateProvince
      FROM dbo.EngagementProjectVenue pv
      LEFT JOIN dbo.Venue v ON pv.VenueCompanyID = v.CompanyID
      LEFT JOIN dbo.Company c ON v.CompanyID = c.CompanyID
      LEFT JOIN dbo.Address a ON c.PhysicalAddressID = a.AddressID
      WHERE pv.EngagementProjectID = @0`, [projectId]);
        return {
            project: project[0],
            venues,
        };
    }
    async searchEngagements(input) {
        const query = String(input.query || '').trim();
        const status = String(input.status || '').trim();
        const limit = Math.min(Math.max(Number(input.limit) || 15, 1), 50);
        let sql = `
      SELECT TOP (${limit})
        e.EngagementID AS id,
        t.TourName AS tourName,
        a.AttractionName AS attractionName,
        v.VenueName AS venueName,
        addr.City AS city,
        addr.StateProvince AS stateProvince,
        e.EngagementStatus AS status,
        e.SellableCapacity AS sellableCapacity,
        e.GrossPotential AS grossPotential,
        (SELECT MIN(perf.PerformanceDate) FROM dbo.Performance perf WHERE perf.EngagementID = e.EngagementID) AS startDate
      FROM dbo.Engagement e
      LEFT JOIN dbo.Tour t ON e.TourID = t.TourID
      LEFT JOIN dbo.Attraction a ON t.AttractionID = a.AttractionID
      LEFT JOIN dbo.EngagementVenue ev ON e.EngagementID = ev.EngagementID AND ev.IsPrimary = 1
      LEFT JOIN dbo.Venue v ON ev.VenueCompanyID = v.CompanyID
      LEFT JOIN dbo.Company c ON v.CompanyID = c.CompanyID
      LEFT JOIN dbo.Address addr ON c.PhysicalAddressID = addr.AddressID
      WHERE 1=1
    `;
        const params = [];
        if (query) {
            sql += ` AND (t.TourName LIKE @${params.length} OR a.AttractionName LIKE @${params.length} OR v.VenueName LIKE @${params.length} OR addr.City LIKE @${params.length})`;
            params.push(`%${query}%`);
        }
        if (status) {
            sql += ` AND e.EngagementStatus LIKE @${params.length}`;
            params.push(`%${status}%`);
        }
        sql += ` ORDER BY e.EngagementID DESC`;
        return this.dataSource.query(sql, params);
    }
    async getEngagementDetail(input) {
        const engagementId = Number(input.engagementId);
        if (!engagementId)
            throw new Error('Missing valid engagementId');
        const engagement = await this.dataSource.query(`SELECT TOP 1
        e.EngagementID AS id,
        e.EngagementStatus AS status,
        e.EngagementScaling AS scaling,
        e.SellableCapacity AS sellableCapacity,
        e.GrossPotential AS grossPotential,
        t.TourName AS tourName,
        a.AttractionName AS attractionName,
        v.VenueName AS venueName,
        v.SeatingCapacity AS venueSeatingCapacity,
        addr.City AS city,
        addr.StateProvince AS stateProvince
      FROM dbo.Engagement e
      LEFT JOIN dbo.Tour t ON e.TourID = t.TourID
      LEFT JOIN dbo.Attraction a ON t.AttractionID = a.AttractionID
      LEFT JOIN dbo.EngagementVenue ev ON e.EngagementID = ev.EngagementID AND ev.IsPrimary = 1
      LEFT JOIN dbo.Venue v ON ev.VenueCompanyID = v.CompanyID
      LEFT JOIN dbo.Company c ON v.CompanyID = c.CompanyID
      LEFT JOIN dbo.Address addr ON c.PhysicalAddressID = addr.AddressID
      WHERE e.EngagementID = @0`, [engagementId]);
        if (!engagement || engagement.length === 0) {
            return { message: `Engagement with ID ${engagementId} not found.` };
        }
        const performances = await this.dataSource.query(`SELECT TOP 50
        p.PerformanceID AS performanceId,
        p.PerformanceDate AS performanceDate,
        p.PerformanceTime AS performanceTime,
        p.TicketingStatus AS ticketingStatus,
        ts.PerformanceSalesQuantity AS soldQuantity,
        ts.PerformanceSalesRevenue AS revenue
      FROM dbo.Performance p
      LEFT JOIN dbo.TicketingSales ts ON p.PerformanceID = ts.PerformanceID
      WHERE p.EngagementID = @0
      ORDER BY p.PerformanceDate ASC, p.PerformanceTime ASC`, [engagementId]);
        return {
            engagement: engagement[0],
            performances,
        };
    }
    async searchCompanies(input) {
        const query = String(input.query || '').trim();
        const companyType = String(input.companyType || '').trim();
        const limit = Math.min(Math.max(Number(input.limit) || 15, 1), 50);
        let sql = `
      SELECT TOP (${limit})
        c.CompanyID AS id,
        c.CompanyName AS name,
        ct.CompanyTypeName AS type,
        a.City AS city,
        a.StateProvince AS stateProvince,
        a.PostalCode AS postalCode
      FROM dbo.Company c
      LEFT JOIN dbo.CompanyType ct ON c.CompanyTypeID = ct.CompanyTypeID
      LEFT JOIN dbo.Address a ON c.PhysicalAddressID = a.AddressID
      WHERE 1=1
    `;
        const params = [];
        if (query) {
            sql += ` AND (c.CompanyName LIKE @${params.length} OR a.City LIKE @${params.length} OR a.StateProvince LIKE @${params.length})`;
            params.push(`%${query}%`);
        }
        if (companyType) {
            sql += ` AND ct.CompanyTypeName LIKE @${params.length}`;
            params.push(`%${companyType}%`);
        }
        sql += ` ORDER BY c.CompanyName ASC`;
        return this.dataSource.query(sql, params);
    }
    async getCompanyDetail(input) {
        const companyId = Number(input.companyId);
        if (!companyId)
            throw new Error('Missing valid companyId');
        const company = await this.dataSource.query(`SELECT TOP 1
        c.CompanyID AS id,
        c.CompanyName AS name,
        ct.CompanyTypeName AS type,
        a.AddressLine1 AS addressLine1,
        a.City AS city,
        a.StateProvince AS stateProvince,
        a.PostalCode AS postalCode,
        a.Country AS country,
        c.is_internal AS isInternal
      FROM dbo.Company c
      LEFT JOIN dbo.CompanyType ct ON c.CompanyTypeID = ct.CompanyTypeID
      LEFT JOIN dbo.Address a ON c.PhysicalAddressID = a.AddressID
      WHERE c.CompanyID = @0`, [companyId]);
        if (!company || company.length === 0) {
            return { message: `Company with ID ${companyId} not found.` };
        }
        const contacts = await this.dataSource.query(`SELECT TOP 25
        ct.ContactID AS id,
        ci.FirstName + ' ' + ci.LastName AS name,
        ci.Email AS email,
        ci.CellPhone AS cellPhone,
        ci.WorkPhone AS workPhone,
        r.RoleName AS role,
        d.DepartmentName AS department
      FROM dbo.ContactAssignment ca
      JOIN dbo.Contact ct ON ca.ContactID = ct.ContactID
      JOIN dbo.ContactInfo ci ON ct.ContactInfoID = ci.ContactInfoID
      LEFT JOIN dbo.Role r ON ca.RoleID = r.RoleID
      LEFT JOIN dbo.Department d ON ca.DepartmentID = d.DepartmentID
      WHERE ca.CompanyID = @0`, [companyId]);
        return {
            company: company[0],
            contacts,
        };
    }
    async searchContacts(input) {
        const query = String(input.query || '').trim();
        const role = String(input.role || '').trim();
        const limit = Math.min(Math.max(Number(input.limit) || 15, 1), 50);
        let sql = `
      SELECT TOP (${limit})
        ct.ContactID AS id,
        ci.FirstName + ' ' + ci.LastName AS fullName,
        ci.Email AS email,
        ci.CellPhone AS cellPhone,
        ci.WorkPhone AS workPhone,
        c.CompanyName AS companyName,
        r.RoleName AS role,
        d.DepartmentName AS department
      FROM dbo.Contact ct
      JOIN dbo.ContactInfo ci ON ct.ContactInfoID = ci.ContactInfoID
      LEFT JOIN dbo.ContactAssignment ca ON ct.ContactID = ca.ContactID
      LEFT JOIN dbo.Company c ON ca.CompanyID = c.CompanyID
      LEFT JOIN dbo.Role r ON ca.RoleID = r.RoleID
      LEFT JOIN dbo.Department d ON ca.DepartmentID = d.DepartmentID
      WHERE 1=1
    `;
        const params = [];
        if (query) {
            sql += ` AND (ci.FirstName LIKE @${params.length} OR ci.LastName LIKE @${params.length} OR ci.Email LIKE @${params.length} OR c.CompanyName LIKE @${params.length})`;
            params.push(`%${query}%`);
        }
        if (role) {
            sql += ` AND r.RoleName LIKE @${params.length}`;
            params.push(`%${role}%`);
        }
        sql += ` ORDER BY ci.LastName ASC, ci.FirstName ASC`;
        return this.dataSource.query(sql, params);
    }
    async searchVenues(input) {
        const query = String(input.query || '').trim();
        const minCapacity = Number(input.minCapacity);
        const maxCapacity = Number(input.maxCapacity);
        const limit = Math.min(Math.max(Number(input.limit) || 15, 1), 50);
        let sql = `
      SELECT TOP (${limit})
        v.CompanyID AS id,
        v.VenueName AS name,
        v.SeatingCapacity AS seatingCapacity,
        a.City AS city,
        a.StateProvince AS stateProvince,
        a.PostalCode AS postalCode,
        v.StageType AS stageType,
        v.VenueRelationshipIAE AS relationship
      FROM dbo.Venue v
      JOIN dbo.Company c ON v.CompanyID = c.CompanyID
      LEFT JOIN dbo.Address a ON c.PhysicalAddressID = a.AddressID
      WHERE 1=1
    `;
        const params = [];
        if (query) {
            sql += ` AND (v.VenueName LIKE @${params.length} OR a.City LIKE @${params.length} OR a.StateProvince LIKE @${params.length})`;
            params.push(`%${query}%`);
        }
        if (Number.isFinite(minCapacity) && minCapacity > 0) {
            sql += ` AND v.SeatingCapacity >= @${params.length}`;
            params.push(minCapacity);
        }
        if (Number.isFinite(maxCapacity) && maxCapacity > 0) {
            sql += ` AND v.SeatingCapacity <= @${params.length}`;
            params.push(maxCapacity);
        }
        sql += ` ORDER BY v.SeatingCapacity DESC, v.VenueName ASC`;
        return this.dataSource.query(sql, params);
    }
    async getDailySalesSummary(input) {
        const engagementId = Number(input.engagementId);
        const query = String(input.query || '').trim();
        const limit = Math.min(Math.max(Number(input.limit) || 20, 1), 50);
        let sql = `
      SELECT TOP (${limit})
        e.EngagementID AS engagementId,
        t.TourName AS tourName,
        v.VenueName AS venueName,
        p.PerformanceDate AS performanceDate,
        ts.SalesDate AS salesDate,
        ts.PerformanceSalesQuantity AS salesQuantity,
        ts.PerformanceSalesRevenue AS salesRevenue,
        e.GrossPotential AS grossPotential,
        e.SellableCapacity AS sellableCapacity
      FROM dbo.TicketingSales ts
      JOIN dbo.Performance p ON ts.PerformanceID = p.PerformanceID
      JOIN dbo.Engagement e ON p.EngagementID = e.EngagementID
      LEFT JOIN dbo.Tour t ON e.TourID = t.TourID
      LEFT JOIN dbo.EngagementVenue ev ON e.EngagementID = ev.EngagementID AND ev.IsPrimary = 1
      LEFT JOIN dbo.Venue v ON ev.VenueCompanyID = v.CompanyID
      WHERE 1=1
    `;
        const params = [];
        if (engagementId) {
            sql += ` AND e.EngagementID = @${params.length}`;
            params.push(engagementId);
        }
        if (query) {
            sql += ` AND (t.TourName LIKE @${params.length} OR v.VenueName LIKE @${params.length})`;
            params.push(`%${query}%`);
        }
        sql += ` ORDER BY ts.SalesDate DESC, p.PerformanceDate DESC`;
        return this.dataSource.query(sql, params);
    }
    async getAttractionsAndTours(input) {
        const query = String(input.query || '').trim();
        const limit = Math.min(Math.max(Number(input.limit) || 20, 1), 50);
        let sql = `
      SELECT TOP (${limit})
        a.AttractionID AS attractionId,
        a.AttractionName AS attractionName,
        t.TourID AS tourId,
        t.TourName AS tourName,
        t.StartDate AS startDate,
        t.EndDate AS endDate
      FROM dbo.Attraction a
      LEFT JOIN dbo.Tour t ON a.AttractionID = t.AttractionID
      WHERE 1=1
    `;
        const params = [];
        if (query) {
            sql += ` AND (a.AttractionName LIKE @${params.length} OR t.TourName LIKE @${params.length})`;
            params.push(`%${query}%`);
        }
        sql += ` ORDER BY a.AttractionName ASC`;
        return this.dataSource.query(sql, params);
    }
    async searchHandbookAndNews(input) {
        const query = String(input.query || '').trim();
        if (!query)
            return { message: 'Please provide a search keyword.' };
        const news = await this.dataSource.query(`SELECT TOP 5
        Id, Title, Content, Category, PublishedAt
      FROM dbo.InternalNews
      WHERE Title LIKE @0 OR Content LIKE @0
      ORDER BY PublishedAt DESC`, [`%${query}%`]).catch(() => []);
        const handbook = await this.dataSource.query(`SELECT TOP 5
        Id, Title, Summary, Category
      FROM dbo.HandbookDocument
      WHERE Title LIKE @0 OR Summary LIKE @0`, [`%${query}%`]).catch(() => []);
        return { news, handbook };
    }
    async executeReadonlySql(input) {
        const rawSql = String(input.sqlQuery || '').trim();
        if (!rawSql) {
            throw new Error('Empty SQL query provided.');
        }
        const cleaned = rawSql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
        const forbiddenKeywords = [
            'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE',
            'CREATE', 'MERGE', 'EXEC', 'EXECUTE', 'GRANT', 'REVOKE',
            'DENY', 'BACKUP', 'RESTORE', 'SHUTDOWN', 'KILL',
        ];
        const tokens = cleaned.toUpperCase().split(/[\s,;()]+/);
        for (const kw of forbiddenKeywords) {
            if (tokens.includes(kw)) {
                throw new Error(`Forbidden SQL keyword detected: '${kw}'. Only read-only SELECT queries are allowed.`);
            }
        }
        if (!cleaned.toUpperCase().startsWith('SELECT') && !cleaned.toUpperCase().startsWith('WITH')) {
            throw new Error("Invalid query: must start with 'SELECT' or 'WITH'.");
        }
        let queryToRun = cleaned;
        if (!/SELECT\s+TOP\s+\d+/i.test(queryToRun)) {
            queryToRun = queryToRun.replace(/^SELECT\s+/i, 'SELECT TOP 50 ');
        }
        this.logger.log(`Executing Hybrid SQL query: ${queryToRun}`);
        const rows = await this.dataSource.query(queryToRun);
        return {
            rowCount: Array.isArray(rows) ? rows.length : 0,
            rows: Array.isArray(rows) ? rows.slice(0, 50) : rows,
        };
    }
};
exports.AiToolsExecutor = AiToolsExecutor;
exports.AiToolsExecutor = AiToolsExecutor = AiToolsExecutor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], AiToolsExecutor);
//# sourceMappingURL=ai-tools.executor.js.map