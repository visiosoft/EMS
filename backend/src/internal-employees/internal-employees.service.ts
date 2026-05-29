import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type IaeEmployeeRow = {
  contactId: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string | null;
  workPhone: string | null;
  roleName: string | null;
};

@Injectable()
export class InternalEmployeesService {
  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * All dbo.Contact rows with is_staff = 1, joined to ContactInfo.
   * Role/title comes from an IAE company assignment when present (optional).
   */
  async listStaffEmployees(): Promise<IaeEmployeeRow[]> {
    const companyId = Number(
      this.configService.get<string>('IAE_COMPANY_ID', '35025'),
    );

    const rows = await this.dataSource.query(
      `
      SELECT
        ranked.contactId,
        ranked.firstName,
        ranked.lastName,
        ranked.email,
        ranked.cellPhone,
        ranked.workPhone,
        ranked.roleName
      FROM (
        SELECT
          c.ContactID AS contactId,
          ci.FirstName AS firstName,
          ci.LastName AS lastName,
          ci.Email AS email,
          ci.CellPhone AS cellPhone,
          ci.WorkPhone AS workPhone,
          rolePick.roleName AS roleName,
          ROW_NUMBER() OVER (
            PARTITION BY ci.ContactInfoID
            ORDER BY c.ContactID ASC
          ) AS rowNum
        FROM dbo.Contact c
        INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
        OUTER APPLY (
          SELECT TOP 1 r.RoleName AS roleName
          FROM dbo.ContactAssignment ca
          INNER JOIN dbo.Role r ON r.RoleID = ca.RoleID
          WHERE ca.ContactID = c.ContactID
            AND ca.CompanyID = @0
          ORDER BY ca.ContactAssignmentID
        ) rolePick
        WHERE c.is_staff = 1 OR c.is_staff = CAST(1 AS BIT)
      ) ranked
      WHERE ranked.rowNum = 1
      ORDER BY ranked.lastName ASC, ranked.firstName ASC
      `,
      [companyId],
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

    return deduped.map((row) => ({
      contactId: Number(row.contactId),
      firstName: String(row.firstName ?? '').trim(),
      lastName: String(row.lastName ?? '').trim(),
      email: String(row.email ?? '').trim(),
      cellPhone: row.cellPhone != null ? String(row.cellPhone).trim() : null,
      workPhone: row.workPhone != null ? String(row.workPhone).trim() : null,
      roleName: (() => {
        const name = String(row.roleName ?? '').trim();
        return name && name.toLowerCase() !== 'unknown' ? name : null;
      })(),
    }));
  }
}
