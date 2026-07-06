import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface EmployeeCertificationResponse {
  certifications: {
    submissionId: number;
    certificationName: string;
    issuingOrganization: string;
    platformName: string;
    dateCompleted: string | null;
    pointsAwarded: number;
    credentialUrl: string;
    tags: string[];
  }[];
}

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

function readString(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string') return value.trim();
  }
  return '';
}

function readNumber(row: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const n = parseInt(value, 10);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

function readDateString(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return null;
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const str = String(value).trim();
    if (!str) continue;
    const parsed = new Date(str + 'T00:00:00');
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return null;
}

@Injectable()
export class EmployeeCertificationsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getCertifications(userEmail: string): Promise<EmployeeCertificationResponse> {
    const email = normalizeEmail(userEmail);
    if (!email) {
      throw new BadRequestException('A valid email address is required.');
    }

    // Get ContactID from email
    const contactRows = await this.dataSource.query(
      `SELECT TOP 1 c.ContactID AS contactId
       FROM dbo.Contact c
       INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
       INNER JOIN dbo.ContactAssignment ca ON ca.ContactID = c.ContactID
       INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
       WHERE LOWER(LTRIM(RTRIM(ci.Email))) = @0`,
      [email],
    );

    if (contactRows.length === 0) {
      throw new NotFoundException(`No internal employee found for ${email}.`);
    }

    const contactId = readNumber(contactRows[0], 'contactId') ?? 0;

    // Get verified submissions with certification + platform + tags
    const rows = await this.dataSource.query(
      `SELECT
         ls.SubmissionID AS submissionId,
         ls.CertificationName AS certificationName,
         ls.IssuingOrganization AS issuingOrganization,
         COALESCE(lp.PlatformName, ls.IssuingOrganization) AS platformName,
         ls.DateCompleted AS dateCompleted,
         ls.PointsAwarded AS pointsAwarded,
         COALESCE(ls.CredentialUrl, '') AS credentialUrl,
         ls.CertificationID AS certificationId
       FROM dbo.LearningSubmission ls
       LEFT JOIN dbo.LearningCertification lc ON lc.CertificationID = ls.CertificationID
       LEFT JOIN dbo.LearningPlatform lp ON lp.PlatformID = lc.PlatformID
       WHERE ls.ContactID = @0 AND ls.Status = 'VERIFIED'
       ORDER BY ls.DateCompleted DESC, ls.SubmissionID DESC`,
      [contactId],
    );

    // Get tags for each certification
    const certIds = [...new Set(rows.map((r: Record<string, unknown>) => readNumber(r, 'certificationId')).filter(Boolean))];
    let tagsMap: Record<number, string[]> = {};

    if (certIds.length > 0) {
      const tagRows = await this.dataSource.query(
        `SELECT ct.CertificationID AS certificationId, t.TagName AS tagName
         FROM dbo.LearningCertificationTag ct
         INNER JOIN dbo.LearningTag t ON t.TagID = ct.TagID
         WHERE ct.CertificationID IN (${certIds.join(',')})`,
      );
      for (const tr of tagRows as Record<string, unknown>[]) {
        const cid = readNumber(tr, 'certificationId') ?? 0;
        const tag = readString(tr, 'tagName');
        if (!tagsMap[cid]) tagsMap[cid] = [];
        if (tag) tagsMap[cid].push(tag);
      }
    }

    const certifications = (rows as Record<string, unknown>[]).map((r) => {
      const certId = readNumber(r, 'certificationId') ?? 0;
      return {
        submissionId: readNumber(r, 'submissionId') ?? 0,
        certificationName: readString(r, 'certificationName'),
        issuingOrganization: readString(r, 'issuingOrganization'),
        platformName: readString(r, 'platformName'),
        dateCompleted: readDateString(r, 'dateCompleted'),
        pointsAwarded: readNumber(r, 'pointsAwarded') ?? 0,
        credentialUrl: readString(r, 'credentialUrl'),
        tags: tagsMap[certId] || [],
      };
    });

    return { certifications };
  }
}
