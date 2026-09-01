import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';

export type IaeEmployeeRow = {
  contactId: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string | null;
  workPhone: string | null;
  roleName: string | null;
  /** Entra job title when available, otherwise null. */
  jobTitle: string | null;
  /** Current desk extension (dbo.EmployeePhoneExtension → dbo.PhoneExtension). */
  extension: string | null;
  departmentName: string | null;
  /** Secondary department from the Entra "Department2" custom attribute. */
  department2: string | null;
  departmentRank: number | null;
};

@Injectable()
export class InternalEmployeesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditContext: AuditRequestContext,
    private readonly configService: ConfigService,
  ) {}

  /**
   * dbo.EmployeeProfile.Department2 ships in a manual migration, so guard the
   * select — an unmigrated database must still return the directory.
   */
  private async department2Select(): Promise<string> {
    const rows = await this.dataSource.query(
      `SELECT 1 AS hasColumn
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'dbo'
         AND TABLE_NAME = 'EmployeeProfile'
         AND COLUMN_NAME = 'Department2'`,
    );
    return rows.length > 0
      ? "COALESCE(ep.Department2, '')"
      : "CAST('' AS nvarchar(100))";
  }

  /**
   * All contacts assigned to at least one company marked dbo.Company.is_internal = 1.
   * Role/title comes from an internal company assignment when present (optional).
   */
  async listStaffEmployees(): Promise<IaeEmployeeRow[]> {
    const department2Select = await this.department2Select();
    const rows = await this.dataSource.query(
      `
      SELECT
        ranked.contactId,
        ranked.firstName,
        ranked.lastName,
        ranked.email,
        ranked.cellPhone,
        ranked.workPhone,
        ranked.roleName,
        ranked.extension,
        ranked.departmentName,
        ranked.department2,
        ranked.departmentRank,
        ranked.jobTitle
      FROM (
        SELECT
          c.ContactID AS contactId,
          ci.FirstName AS firstName,
          ci.LastName AS lastName,
          ci.Email AS email,
          ci.CellPhone AS cellPhone,
          ci.WorkPhone AS workPhone,
          ci.WorkPhoneExtension AS extension,
          COALESCE(NULLIF(LTRIM(RTRIM(ep.JobTitle)), ''), '') AS jobTitle,
          rolePick.roleName AS roleName,
          deptPick.departmentName AS departmentName,
          ${department2Select} AS department2,
          ISNULL(TRY_CAST(ep.DepartmentRank AS int), 999) AS departmentRank,
          ROW_NUMBER() OVER (
            PARTITION BY ci.ContactInfoID
            ORDER BY c.ContactID ASC
          ) AS rowNum
        FROM dbo.Contact c
        INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
        LEFT JOIN dbo.EmployeeProfile ep ON ep.ContactID = c.ContactID
        OUTER APPLY (
          SELECT STUFF((
            SELECT ', ' + r.RoleName
            FROM dbo.ContactAssignment ca
            INNER JOIN dbo.Company internalCompany
              ON internalCompany.CompanyID = ca.CompanyID
            INNER JOIN dbo.Role r ON r.RoleID = ca.RoleID
            WHERE ca.ContactID = c.ContactID
              AND internalCompany.is_internal = 1
            FOR XML PATH(''), TYPE
          ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS roleName
        ) rolePick
        OUTER APPLY (
          SELECT STUFF((
            SELECT DISTINCT ', ' + LTRIM(RTRIM(dep.DepartmentName))
            FROM dbo.ContactAssignment caD
            INNER JOIN dbo.Company coD
              ON coD.CompanyID = caD.CompanyID AND coD.is_internal = 1
            INNER JOIN dbo.Department dep ON dep.DepartmentID = caD.DepartmentID
            WHERE caD.ContactID = c.ContactID
              AND NULLIF(LTRIM(RTRIM(dep.DepartmentName)), '') IS NOT NULL
            FOR XML PATH(''), TYPE
          ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS departmentName
        ) deptPick
        WHERE EXISTS (
          SELECT 1
          FROM dbo.ContactAssignment caInternal
          INNER JOIN dbo.Company internalCompany
            ON internalCompany.CompanyID = caInternal.CompanyID
          WHERE caInternal.ContactID = c.ContactID
            AND internalCompany.is_internal = 1
        )
      ) ranked
      WHERE ranked.rowNum = 1
      ORDER BY ranked.lastName ASC, ranked.firstName ASC
      `,
    );

    const seenEmails = new Set<string>();
    const deduped: IaeEmployeeRow[] = [];

    for (const row of rows) {
      const emailKey = String(row.email ?? '')
        .trim()
        .toLowerCase();
      if (emailKey && seenEmails.has(emailKey)) continue;
      if (emailKey) seenEmails.add(emailKey);
      deduped.push(row);
    }

    return deduped.map((row) => {
      const email = String(row.email ?? '').trim();
      return {
        contactId: Number(row.contactId),
        firstName: String(row.firstName ?? '').trim(),
        lastName: String(row.lastName ?? '').trim(),
        email,
        cellPhone: row.cellPhone != null ? String(row.cellPhone).trim() : null,
        workPhone: row.workPhone != null ? String(row.workPhone).trim() : null,
        roleName: (() => {
          const name = String(row.roleName ?? '').trim();
          return name && name.toLowerCase() !== 'unknown' ? name : null;
        })(),
        jobTitle: String(row.jobTitle ?? '').trim() || null,
        extension: row.extension != null && String(row.extension).trim() ? String(row.extension).trim() : null,
        departmentName: (() => {
          const names = [...new Set(
            String(row.departmentName ?? '')
              .split(',')
              .map((name) => name.trim())
              .filter((name) => name && name.toLowerCase() !== 'unknown'),
          )];
          return names.length ? names.join(', ') : null;
        })(),
        // A single Entra value — never split; a department name can contain a comma.
        department2: (() => {
          const name = String(row.department2 ?? '').trim();
          return name && name.toLowerCase() !== 'unknown' ? name : null;
        })(),
        departmentRank: row.departmentRank != null ? Number(row.departmentRank) : null,
      };
    });
  }

  async listEmployeesByDepartment(departmentId: number): Promise<IaeEmployeeRow[]> {
    const department2Select = await this.department2Select();
    const rows = await this.dataSource.query(
      `SELECT
         c.ContactID AS contactId,
         ci.FirstName AS firstName,
         ci.LastName AS lastName,
         ci.Email AS email,
         ci.CellPhone AS cellPhone,
         ci.WorkPhone AS workPhone,
         ci.WorkPhoneExtension AS extension,
         COALESCE(NULLIF(LTRIM(RTRIM(ep.JobTitle)), ''), '') AS jobTitle,
         rolePick.roleName AS roleName,
         deptPick.departmentName AS departmentName,
         ${department2Select} AS department2,
         ISNULL(TRY_CAST(ep.DepartmentRank AS int), 999) AS departmentRank
       FROM dbo.Contact c
       INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
       LEFT JOIN dbo.EmployeeProfile ep ON ep.ContactID = c.ContactID
       OUTER APPLY (
         SELECT STUFF((
           SELECT ', ' + r.RoleName
           FROM dbo.ContactAssignment ca2
           INNER JOIN dbo.Company co2 ON co2.CompanyID = ca2.CompanyID AND co2.is_internal = 1
           INNER JOIN dbo.Role r ON r.RoleID = ca2.RoleID
           WHERE ca2.ContactID = c.ContactID
             AND ca2.DepartmentID = @0
           FOR XML PATH(''), TYPE
         ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS roleName
       ) rolePick
       OUTER APPLY (
         SELECT STUFF((
           SELECT DISTINCT ', ' + LTRIM(RTRIM(dep.DepartmentName))
           FROM dbo.ContactAssignment caD
           INNER JOIN dbo.Company coD
             ON coD.CompanyID = caD.CompanyID AND coD.is_internal = 1
           INNER JOIN dbo.Department dep ON dep.DepartmentID = caD.DepartmentID
           WHERE caD.ContactID = c.ContactID
             AND NULLIF(LTRIM(RTRIM(dep.DepartmentName)), '') IS NOT NULL
           FOR XML PATH(''), TYPE
         ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS departmentName
       ) deptPick
       WHERE EXISTS (
         SELECT 1
         FROM dbo.ContactAssignment ca
         INNER JOIN dbo.Company company ON company.CompanyID = ca.CompanyID
         WHERE ca.ContactID = c.ContactID
           AND ca.DepartmentID = @0
           AND company.is_internal = 1
       )
       ORDER BY ci.LastName ASC, ci.FirstName ASC`,
      [departmentId],
    );

    return rows.map((row: any) => {
      const email = String(row.email ?? '').trim();
      return {
        contactId: Number(row.contactId),
        firstName: String(row.firstName ?? '').trim(),
        lastName: String(row.lastName ?? '').trim(),
        email,
        cellPhone: row.cellPhone != null ? String(row.cellPhone).trim() : null,
        workPhone: row.workPhone != null ? String(row.workPhone).trim() : null,
        roleName: (() => {
          const name = String(row.roleName ?? '').trim();
          return name && name.toLowerCase() !== 'unknown' ? name : null;
        })(),
        jobTitle: String(row.jobTitle ?? '').trim() || null,
        extension: row.extension != null && String(row.extension).trim() ? String(row.extension).trim() : null,
        departmentName: (() => {
          const names = [...new Set(
            String(row.departmentName ?? '')
              .split(',')
              .map((name) => name.trim())
              .filter((name) => name && name.toLowerCase() !== 'unknown'),
          )];
          return names.length ? names.join(', ') : null;
        })(),
        // A single Entra value — never split; a department name can contain a comma.
        department2: (() => {
          const name = String(row.department2 ?? '').trim();
          return name && name.toLowerCase() !== 'unknown' ? name : null;
        })(),
        departmentRank: row.departmentRank != null ? Number(row.departmentRank) : null,
      };
    });
  }

  /**
   * Fetches job titles from Entra via Microsoft Graph.
   * Tries the delegated token first; falls back to client credentials flow.
   */
  private async fetchEntraJobTitleMap(): Promise<Map<string, string>> {
    let token = this.auditContext.getGraphAccessToken();

    if (!token) {
      token = await this.acquireAppOnlyGraphToken();
    }

    if (!token) {
      console.warn('[EmployeeDirectory] No Graph token available (delegated or app) — jobTitle will be empty');
      return new Map();
    }

    return this.fetchJobTitlesWithToken(token);
  }

  /**
   * Acquire a Graph token via OAuth2 client credentials (app-only).
   */
  private async acquireAppOnlyGraphToken(): Promise<string | null> {
    const tenantId = this.configService.get<string>('ENTRA_TENANT_ID');
    const clientId = this.configService.get<string>('ENTRA_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ENTRA_CLIENT_SECRET');

    if (!tenantId || !clientId || !clientSecret) return null;

    try {
      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!response.ok) {
        console.warn(`[EmployeeDirectory] Client credentials token request failed: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as { access_token?: string };
      return data.access_token ?? null;
    } catch (err) {
      console.warn('[EmployeeDirectory] Error acquiring app-only Graph token:', err);
      return null;
    }
  }

  private async fetchJobTitlesWithToken(token: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    let nextUrl: string | null =
      'https://graph.microsoft.com/v1.0/users?$select=mail,userPrincipalName,jobTitle&$top=999';

    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          console.warn(
            `[EmployeeDirectory] Graph API returned ${response.status} ${response.statusText}`,
          );
          break;
        }

        const payload = (await response.json()) as {
          value?: Array<{
            mail?: string;
            userPrincipalName?: string;
            jobTitle?: string;
          }>;
          '@odata.nextLink'?: string;
        };

        for (const user of payload.value ?? []) {
          const email = (user.mail ?? user.userPrincipalName ?? '').trim().toLowerCase();
          const title = (user.jobTitle ?? '').trim();
          if (email && title) {
            map.set(email, title);
          }
        }

        nextUrl = payload['@odata.nextLink'] ?? null;
      }
    } catch (err) {
      console.warn('[EmployeeDirectory] Graph API error fetching job titles:', err);
    }

    console.log(`[EmployeeDirectory] Fetched ${map.size} job titles from Graph`);
    return map;
  }
}
