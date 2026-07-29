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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeExperienceService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
let EmployeeExperienceService = class EmployeeExperienceService {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async getExperience(userEmail) {
        const email = normalizeEmail(userEmail);
        if (!email) {
            throw new common_1.BadRequestException('A valid email address is required.');
        }
        const contactRows = await this.dataSource.query(`
      SELECT TOP 1 c.ContactID AS contactId
      FROM dbo.Contact c
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      INNER JOIN dbo.ContactAssignment ca ON ca.ContactID = c.ContactID
      INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
      WHERE LOWER(LTRIM(RTRIM(ci.Email))) = LOWER(LTRIM(RTRIM(@0)))
      `, [email]);
        if (contactRows.length === 0) {
            throw new common_1.NotFoundException(`No internal employee found for ${email}. Run Entra → EMS sync first.`);
        }
        const contactId = Number(contactRows[0].contactId ?? contactRows[0].ContactID);
        const assignedRows = await this.dataSource.query(`
      SELECT DISTINCT
        CASE
          WHEN a.AttractionName IS NOT NULL AND vc.CompanyName IS NOT NULL
            THEN a.AttractionName + N' — ' + t.TourName + N' @ ' + vc.CompanyName
          WHEN a.AttractionName IS NOT NULL
            THEN a.AttractionName + N' — ' + t.TourName
          WHEN vc.CompanyName IS NOT NULL
            THEN t.TourName + N' @ ' + vc.CompanyName
          ELSE t.TourName
        END AS displayTitle
      FROM dbo.EngagementIAEContact eic
      INNER JOIN dbo.Engagement e ON e.EngagementID = eic.EngagementID
      INNER JOIN dbo.Tour t ON t.TourID = e.TourID
      LEFT JOIN dbo.Attraction a ON a.AttractionID = t.AttractionID
      LEFT JOIN dbo.EngagementVenue ev ON ev.EngagementID = e.EngagementID AND ev.IsPrimary = 1
      LEFT JOIN dbo.Company vc ON vc.CompanyID = ev.VenueCompanyID
      WHERE eic.ContactID = @0
      ORDER BY displayTitle
      `, [contactId]);
        const workedRows = await this.dataSource.query(`
      SELECT DISTINCT
        CASE
          WHEN a.AttractionName IS NOT NULL AND vc.CompanyName IS NOT NULL
            THEN a.AttractionName + N' — ' + t.TourName + N' @ ' + vc.CompanyName
          WHEN a.AttractionName IS NOT NULL
            THEN a.AttractionName + N' — ' + t.TourName
          WHEN vc.CompanyName IS NOT NULL
            THEN t.TourName + N' @ ' + vc.CompanyName
          ELSE t.TourName
        END AS displayTitle
      FROM dbo.EngagementIAEContact eic
      INNER JOIN dbo.Engagement e ON e.EngagementID = eic.EngagementID
      INNER JOIN dbo.Tour t ON t.TourID = e.TourID
      LEFT JOIN dbo.Attraction a ON a.AttractionID = t.AttractionID
      LEFT JOIN dbo.EngagementVenue ev ON ev.EngagementID = e.EngagementID AND ev.IsPrimary = 1
      LEFT JOIN dbo.Company vc ON vc.CompanyID = ev.VenueCompanyID
      WHERE eic.ContactID = @0
        AND EXISTS (
          SELECT 1 FROM dbo.Performance p
          WHERE p.EngagementID = e.EngagementID
            AND p.PerformanceDate < CAST(GETUTCDATE() AS date)
        )
      ORDER BY displayTitle
      `, [contactId]);
        const marketRows = await this.dataSource.query(`
      SELECT DISTINCT d.MarketName AS marketName
      FROM dbo.Engagement e
      INNER JOIN dbo.EngagementVenue ev ON ev.EngagementID = e.EngagementID AND ev.IsPrimary = 1
      INNER JOIN dbo.Company co ON co.CompanyID = ev.VenueCompanyID
      INNER JOIN dbo.DMA d ON d.DMAID = co.DMAID
      WHERE e.TourID IN (
        SELECT DISTINCT e2.TourID
        FROM dbo.EngagementIAEContact eic2
        INNER JOIN dbo.Engagement e2 ON e2.EngagementID = eic2.EngagementID
        WHERE eic2.ContactID = @0
      )
        AND d.MarketName IS NOT NULL
        AND d.MarketName <> ''
      ORDER BY d.MarketName
      `, [contactId]);
        return {
            contactId,
            engagementsAssignedTo: extractStrings(assignedRows, 'displayTitle', 'DisplayTitle'),
            engagementsWorkedOn: extractStrings(workedRows, 'displayTitle', 'DisplayTitle'),
            marketsWorkedIn: extractStrings(marketRows, 'marketName', 'MarketName'),
        };
    }
};
exports.EmployeeExperienceService = EmployeeExperienceService;
exports.EmployeeExperienceService = EmployeeExperienceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], EmployeeExperienceService);
function extractStrings(rows, ...keys) {
    return rows
        .map((r) => {
        for (const key of keys) {
            const val = r[key];
            if (val !== undefined && val !== null)
                return String(val).trim();
        }
        return '';
    })
        .filter(Boolean);
}
function normalizeEmail(value) {
    const email = String(value ?? '').trim().toLowerCase();
    return email.includes('@') ? email : '';
}
//# sourceMappingURL=employee-experience.service.js.map