import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';
import { InternalContactSyncService } from './internal-contact-sync.service';

export type MyProfileResponse = {
  contactId: number;
  contactInfoId: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  workPhone: string;
  departmentName: string;
  roleNames: string[];
  jobTitle: string;
  jobTitleColumnAvailable: boolean;
  entraSyncWarnings?: string[];
};

export type UpdateMyProfileDto = {
  firstName?: string;
  lastName?: string;
  cellPhone?: string | null;
  workPhone?: string | null;
  departmentName?: string;
  jobTitle?: string | null;
};

type InternalProfileRow = MyProfileResponse & {
  internalCompanyId: number;
};

@Injectable()
export class UserProfileService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditContext: AuditRequestContext,
    private readonly internalContactSyncService: InternalContactSyncService,
  ) {}

  async getMyProfile(): Promise<MyProfileResponse> {
    const email = this.getSignedInEmail();
    return this.loadMyInternalProfile(email);
  }

  async updateMyProfile(dto: UpdateMyProfileDto): Promise<MyProfileResponse> {
    const email = this.getSignedInEmail();
    const current = await this.loadMyInternalProfile(email);
    const next = normalizeProfileUpdate(dto, current);
    const profilePayload: Record<string, unknown> = {
      displayName: `${next.firstName} ${next.lastName}`.trim() || current.email,
      givenName: next.firstName || null,
      surname: next.lastName || null,
      department: next.departmentName || null,
    };
    const phonePayload: Record<string, unknown> = {
      mobilePhone: next.cellPhone || null,
      businessPhones: next.workPhone ? [next.workPhone] : [],
    };
    if (current.jobTitleColumnAvailable) {
      profilePayload.jobTitle = next.jobTitle || null;
    }

    await this.dataSource.transaction(async (manager) => {
      if (current.jobTitleColumnAvailable) {
        await manager.query(
          `
          UPDATE dbo.ContactInfo
          SET FirstName = @0,
              LastName = @1,
              CellPhone = @2,
              WorkPhone = @3,
              JobTitle = @4
          WHERE ContactInfoID = @5
          `,
          [
            next.firstName,
            next.lastName,
            nullableText(next.cellPhone),
            nullableText(next.workPhone),
            nullableText(next.jobTitle),
            current.contactInfoId,
          ],
        );
      } else {
        await manager.query(
          `
          UPDATE dbo.ContactInfo
          SET FirstName = @0,
              LastName = @1,
              CellPhone = @2,
              WorkPhone = @3
          WHERE ContactInfoID = @4
          `,
          [
            next.firstName,
            next.lastName,
            nullableText(next.cellPhone),
            nullableText(next.workPhone),
            current.contactInfoId,
          ],
        );
      }

      const departmentId = await this.findOrCreateDepartment(
        manager,
        next.departmentName,
      );
      await manager.query(
        `
        UPDATE dbo.ContactAssignment
        SET DepartmentID = @0,
            modified_by = @1,
            modified_at = SYSUTCDATETIME()
        WHERE ContactID = @2
          AND CompanyID = @3
        `,
        [
          departmentId,
          this.auditContext.getUserEmail() ?? 'self profile',
          current.contactId,
          current.internalCompanyId,
        ],
      );

    });

    const entraSyncWarnings = await this.syncProfileToEntra(
      this.auditContext.getUserOid() || current.email,
      { ...profilePayload, ...phonePayload },
    );
    return {
      ...(await this.loadMyInternalProfile(next.email)),
      ...(entraSyncWarnings.length ? { entraSyncWarnings } : {}),
    };
  }

  private async syncProfileToEntra(
    userIdentifier: string,
    payload: Record<string, unknown>,
  ): Promise<string[]> {
    const warnings: string[] = [];
    try {
      await this.internalContactSyncService.updateAndVerifyEntraUserByIdentifier(
        userIdentifier,
        payload,
      );
    } catch (error) {
      warnings.push(
        `EMS profile saved. ${readErrorMessage(
          error,
          'Microsoft Entra did not persist one or more profile fields.',
        )}`,
      );
    }

    return warnings;
  }

  private getSignedInEmail(): string {
    const email = normalizeEmail(this.auditContext.getUserEmail());
    if (!email) {
      throw new UnauthorizedException('Signed-in user email was not found.');
    }
    return email;
  }

  private async loadMyInternalProfile(
    email: string,
  ): Promise<InternalProfileRow> {
    const jobTitleColumnAvailable = await this.hasContactInfoJobTitleColumn();
    const jobTitleSelect = jobTitleColumnAvailable
      ? 'ci.JobTitle AS jobTitle'
      : "CAST('' AS nvarchar(150)) AS jobTitle";
    const rows = await this.dataSource.query(
      `
      SELECT
        co.CompanyID AS internalCompanyId,
        c.ContactID AS contactId,
        ci.ContactInfoID AS contactInfoId,
        ci.FirstName AS firstName,
        ci.LastName AS lastName,
        ci.Email AS email,
        ci.CellPhone AS cellPhone,
        ci.WorkPhone AS workPhone,
        ${jobTitleSelect},
        COALESCE(d.DepartmentName, '') AS departmentName,
        COALESCE(r.RoleName, '') AS roleName
      FROM dbo.ContactAssignment ca
      INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
      INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      LEFT JOIN dbo.Department d ON d.DepartmentID = ca.DepartmentID
      LEFT JOIN dbo.Role r ON r.RoleID = ca.RoleID
      WHERE LOWER(LTRIM(RTRIM(ci.Email))) = LOWER(LTRIM(RTRIM(@0)))
      ORDER BY ca.ContactAssignmentID
      `,
      [email],
    );

    if (rows.length === 0) {
      throw new NotFoundException(
        'Your EMS internal contact profile was not found. Run Entra to EMS sync first.',
      );
    }

    const contactIds: number[] = Array.from(
      new Set(
        rows
          .map((row: Record<string, unknown>) => readNumber(row, 'contactId', 'ContactID'))
          .filter((id: number | null): id is number => id != null),
      ),
    );
    if (contactIds.length !== 1) {
      throw new BadRequestException(
        'More than one EMS internal contact uses your email. Resolve duplicates before editing your profile.',
      );
    }

    const first = rows[0] as Record<string, unknown>;
    const departments = uniqueClean(
      rows.map((row: Record<string, unknown>) =>
        readString(row, 'departmentName', 'DepartmentName'),
      ),
    );
    const roles = uniqueClean(
      rows.map((row: Record<string, unknown>) =>
        readString(row, 'roleName', 'RoleName'),
      ),
    );

    return {
      internalCompanyId: readNumber(first, 'internalCompanyId', 'CompanyID') ?? 0,
      contactId: contactIds[0],
      contactInfoId: readNumber(first, 'contactInfoId', 'ContactInfoID') ?? 0,
      firstName: readString(first, 'firstName', 'FirstName'),
      lastName: readString(first, 'lastName', 'LastName'),
      email: readString(first, 'email', 'Email'),
      cellPhone: readString(first, 'cellPhone', 'CellPhone'),
      workPhone: readString(first, 'workPhone', 'WorkPhone'),
      departmentName: departments[0] ?? '',
      roleNames: roles,
      jobTitle: readString(first, 'jobTitle', 'JobTitle'),
      jobTitleColumnAvailable,
    };
  }

  private async hasContactInfoJobTitleColumn(): Promise<boolean> {
    const rows = await this.dataSource.query(
      `
      SELECT 1 AS hasColumn
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = 'ContactInfo'
        AND COLUMN_NAME = 'JobTitle'
      `,
    );
    return rows.length > 0;
  }

  private async findOrCreateDepartment(
    manager: EntityManager,
    value: string,
  ): Promise<number> {
    const departmentName = cleanText(value);
    if (!departmentName) {
      throw new BadRequestException('Department is required.');
    }
    const existingRows = await manager.query(
      `
      SELECT TOP 1 DepartmentID AS departmentId
      FROM dbo.Department
      WHERE LOWER(LTRIM(RTRIM(DepartmentName))) = LOWER(LTRIM(RTRIM(@0)))
      `,
      [departmentName],
    );
    const existingId = readNumber(existingRows[0], 'departmentId', 'DepartmentID');
    if (existingId) return existingId;

    const rows = await manager.query(
      `
      INSERT INTO dbo.Department (DepartmentName)
      OUTPUT INSERTED.DepartmentID AS departmentId
      VALUES (@0)
      `,
      [trimToMax(departmentName, 100)],
    );
    const departmentId = readNumber(rows[0], 'departmentId', 'DepartmentID');
    if (!departmentId) {
      throw new BadRequestException('Unable to create EMS department.');
    }
    return departmentId;
  }
}

function normalizeProfileUpdate(
  dto: UpdateMyProfileDto,
  current: MyProfileResponse,
): MyProfileResponse {
  const firstName = trimToMax(dto.firstName ?? current.firstName, 100);
  const lastName = trimToMax(dto.lastName ?? current.lastName, 100);
  const departmentName = trimToMax(
    dto.departmentName ?? current.departmentName,
    100,
  );
  if (!firstName) throw new BadRequestException('First name is required.');
  if (!departmentName) throw new BadRequestException('Department is required.');
  return {
    ...current,
    firstName,
    lastName,
    cellPhone: trimToMax(dto.cellPhone ?? current.cellPhone, 30),
    workPhone: trimToMax(dto.workPhone ?? current.workPhone, 30),
    departmentName,
    jobTitle: current.jobTitleColumnAvailable
      ? trimToMax(dto.jobTitle ?? current.jobTitle, 150)
      : current.jobTitle,
  };
}

function normalizeEmail(value: string | null | undefined): string {
  const email = cleanText(value).toLowerCase();
  return email.includes('@') ? email : '';
}

function uniqueClean(values: string[]): string[] {
  return Array.from(new Set(values.map(cleanText).filter(Boolean)));
}

function cleanText(value: string | null | undefined): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function nullableText(value: string | null | undefined): string | null {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function trimToMax(value: string | null | undefined, maxLength: number): string {
  return cleanText(value).slice(0, maxLength);
}

function readString(row: Record<string, unknown> | undefined, ...keys: string[]): string {
  if (!row) return '';
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return cleanText(String(value));
  }
  return '';
}

function readNumber(row: Record<string, unknown> | undefined, ...keys: string[]): number | null {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }
  return null;
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null) {
    const response =
      'getResponse' in error
        ? (error as { getResponse?: () => unknown }).getResponse?.()
        : undefined;
    if (typeof response === 'string' && response.trim()) return response.trim();
    if (response && typeof response === 'object') {
      const message = (response as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message.trim();
    }
  }
  return fallback;
}
