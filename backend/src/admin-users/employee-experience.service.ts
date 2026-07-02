import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// ─── Response Type ────────────────────────────────────────────────────────────

export type EmployeeExperienceResponse = {
  contactId: number;
  /** Names of engagements (tours) the employee is assigned to */
  engagementsAssignedTo: string[];
  /** Names of engagements (tours) where at least one performance has occurred */
  engagementsWorkedOn: string[];
  /** DMA market names from venues on this employee's engagements */
  marketsWorkedIn: string[];
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class EmployeeExperienceService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getExperience(
    userEmail: string,
  ): Promise<EmployeeExperienceResponse> {
    const email = normalizeEmail(userEmail);
    if (!email) {
      throw new BadRequestException('A valid email address is required.');
    }

    // Resolve ContactID from email
    const contactRows = await this.dataSource.query(
      `
      SELECT TOP 1 c.ContactID AS contactId
      FROM dbo.Contact c
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      INNER JOIN dbo.ContactAssignment ca ON ca.ContactID = c.ContactID
      INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
      WHERE LOWER(LTRIM(RTRIM(ci.Email))) = LOWER(LTRIM(RTRIM(@0)))
      `,
      [email],
    );

    if (contactRows.length === 0) {
      throw new NotFoundException(
        `No internal employee found for ${email}. Run Entra → EMS sync first.`,
      );
    }

    const contactId = Number(contactRows[0].contactId ?? contactRows[0].ContactID);

    // 1. Engagements Assigned To — display titles for all assignments
    const assignedRows = await this.dataSource.query(
      `
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
      `,
      [contactId],
    );

    // 2. Engagements Worked On — display titles with at least one past performance
    const workedRows = await this.dataSource.query(
      `
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
      `,
      [contactId],
    );

    // 3. Markets Worked In — distinct DMA market names from all engagements
    //    on tours where the employee has at least one IAE contact assignment
    const marketRows = await this.dataSource.query(
      `
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
      `,
      [contactId],
    );

    return {
      contactId,
      engagementsAssignedTo: extractStrings(assignedRows, 'displayTitle', 'DisplayTitle'),
      engagementsWorkedOn: extractStrings(workedRows, 'displayTitle', 'DisplayTitle'),
      marketsWorkedIn: extractStrings(marketRows, 'marketName', 'MarketName'),
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractStrings(rows: Record<string, unknown>[], ...keys: string[]): string[] {
  return rows
    .map((r) => {
      for (const key of keys) {
        const val = r[key];
        if (val !== undefined && val !== null) return String(val).trim();
      }
      return '';
    })
    .filter(Boolean);
}

function normalizeEmail(value: string | null | undefined): string {
  const email = String(value ?? '').trim().toLowerCase();
  return email.includes('@') ? email : '';
}
