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
  /** Current desk extension (dbo.EmployeePhoneExtension → dbo.PhoneExtension). */
  extension: string | null;
  departmentName: string | null;
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
        ranked.roleName,
        ranked.extension,
        ranked.departmentName
      FROM (
        SELECT
          c.ContactID AS contactId,
          ci.FirstName AS firstName,
          ci.LastName AS lastName,
          ci.Email AS email,
          ci.CellPhone AS cellPhone,
          ci.WorkPhone AS workPhone,
          rolePick.roleName AS roleName,
          extPick.extensionNumber AS extension,
          deptPick.departmentName AS departmentName,
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
        OUTER APPLY (
          SELECT TOP 1 pe.ExtensionNumber AS extensionNumber
          FROM dbo.ContactAssignment caExt
          INNER JOIN dbo.Company coExt
            ON coExt.CompanyID = caExt.CompanyID AND coExt.is_internal = 1
          INNER JOIN dbo.EmployeePhoneExtension epe
            ON epe.ContactAssignmentID = caExt.ContactAssignmentID AND epe.IsCurrent = 1
          INNER JOIN dbo.PhoneExtension pe ON pe.ExtensionID = epe.ExtensionID
          WHERE caExt.ContactID = c.ContactID
          ORDER BY epe.AssignedDate DESC
        ) extPick
        OUTER APPLY (
          SELECT STUFF((
            SELECT ', ' + dep.DepartmentName
            FROM dbo.ContactAssignment caD
            INNER JOIN dbo.Company coD
              ON coD.CompanyID = caD.CompanyID AND coD.is_internal = 1
            INNER JOIN dbo.Department dep ON dep.DepartmentID = caD.DepartmentID
            WHERE caD.ContactID = c.ContactID
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
      extension: row.extension != null && String(row.extension).trim() ? String(row.extension).trim() : null,
      departmentName: (() => {
        const names = String(row.departmentName ?? '')
          .split(',')
          .map((name) => name.trim())
          .filter((name) => name && name.toLowerCase() !== 'unknown');
        return names.length ? names.join(', ') : null;
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
      extension: null,
      departmentName: null,
    }));
  }
}
