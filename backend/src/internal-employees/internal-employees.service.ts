import { Injectable } from '@nestjs/common';
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
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * All contacts assigned to at least one company marked dbo.Company.is_internal = 1.
   * Role/title comes from an internal company assignment when present (optional).
   */
  async listStaffEmployees(): Promise<IaeEmployeeRow[]> {
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

  async listEmployeesByDepartment(departmentId: number): Promise<IaeEmployeeRow[]> {
    const rows = await this.dataSource.query(
      `SELECT DISTINCT
         c.ContactID AS contactId,
         ci.FirstName AS firstName,
         ci.LastName AS lastName,
         ci.Email AS email,
         ci.CellPhone AS cellPhone,
         ci.WorkPhone AS workPhone,
         r.RoleName AS roleName
       FROM dbo.ContactAssignment ca
       JOIN dbo.Contact c ON c.ContactID = ca.ContactID
       JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
       JOIN dbo.Company company ON company.CompanyID = ca.CompanyID
       LEFT JOIN dbo.Role r ON r.RoleID = ca.RoleID
       WHERE ca.DepartmentID = @0
         AND company.is_internal = 1
       ORDER BY ci.LastName ASC, ci.FirstName ASC`,
      [departmentId],
    );

    return rows.map((row: any) => ({
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
