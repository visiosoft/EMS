import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { AuditRequestContext } from '../audit/audit-request-context.service';

// ─── Response / DTO Types ─────────────────────────────────────────────────────

export type EmployeePersonalProfileResponse = {
  contactId: number;
  contactInfoId: number;
  /** Entra-sourced fields (read-only echoes) */
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  /** Editable employee-owned fields */
  middleName: string;
  personalEmail: string;
  birthDate: string | null;
  ssn: string;
  /** Home address */
  homeAddressId: number | null;
  homeStreet: string;
  homeAddress2: string;
  homeCity: string;
  homeState: string;
  homePostalCode: string;
  homeCountry: string;
  /** Emergency contact */
  emergencyContactId: number | null;
  emergencyFirstName: string;
  emergencyLastName: string;
  emergencyEmail: string;
  emergencyCellPhone: string;
};

export class UpdateEmployeePersonalProfileDto {
  @IsOptional() @IsString() @MaxLength(100) middleName?: string | null;
  @IsOptional() @IsString() personalEmail?: string | null;
  @IsOptional() @IsString() birthDate?: string | null;
  @IsOptional() @IsString() ssn?: string | null;
  @IsOptional() @IsString() homeStreet?: string | null;
  @IsOptional() @IsString() homeAddress2?: string | null;
  @IsOptional() @IsString() homeCity?: string | null;
  @IsOptional() @IsString() homeState?: string | null;
  @IsOptional() @IsString() homePostalCode?: string | null;
  @IsOptional() @IsString() homeCountry?: string | null;
  @IsOptional() @IsString() emergencyFirstName?: string | null;
  @IsOptional() @IsString() emergencyLastName?: string | null;
  @IsOptional() @IsString() emergencyEmail?: string | null;
  @IsOptional() @IsString() emergencyCellPhone?: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class EmployeeProfileService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditContext: AuditRequestContext,
  ) {}

  /** Fetch personal profile for a user identified by email. */
  async getPersonalProfile(
    userEmail: string,
  ): Promise<EmployeePersonalProfileResponse> {
    const email = normalizeEmail(userEmail);
    if (!email) {
      throw new BadRequestException('A valid email address is required.');
    }
    return this.loadPersonalProfile(email);
  }

  /** Update personal (non-Entra) fields for a user identified by email. */
  async updatePersonalProfile(
    userEmail: string,
    dto: UpdateEmployeePersonalProfileDto,
  ): Promise<EmployeePersonalProfileResponse> {
    const email = normalizeEmail(userEmail);
    if (!email) {
      throw new BadRequestException('A valid email address is required.');
    }
    const current = await this.loadPersonalProfile(email);
    const modifiedBy =
      this.auditContext.getUserOid() ?? this.auditContext.getUserEmail() ?? email;

    await this.dataSource.transaction(async (manager) => {
      // 1. Upsert EmployeeProfile row
      const epExists = await manager.query(
        `SELECT 1 AS found FROM dbo.EmployeeProfile WHERE ContactID = @0`,
        [current.contactId],
      );
      console.log('[PersonalProfile] contactId:', current.contactId, 'epExists:', epExists.length > 0);
      console.log('[PersonalProfile] dto.birthDate:', dto.birthDate, '→ nullableDate:', nullableDate(dto.birthDate));
      console.log('[PersonalProfile] dto.ssn:', dto.ssn, '→ ssnLast4:', ssnLast4(dto.ssn));
      if (epExists.length > 0) {
        await manager.query(
          `
          UPDATE dbo.EmployeeProfile
          SET DateOfBirth   = @0,
              SSNLast4      = @1,
              MiddleName    = @2,
              PersonalEmail = @3,
              UpdatedBy     = @4,
              UpdatedAt     = SYSUTCDATETIME()
          WHERE ContactID = @5
          `,
          [
            nullableDate(dto.birthDate),
            ssnLast4(dto.ssn),
            nullableText(dto.middleName),
            nullableText(dto.personalEmail),
            modifiedBy,
            current.contactId,
          ],
        );
      } else {
        await manager.query(
          `
          INSERT INTO dbo.EmployeeProfile
            (ContactID, DateOfBirth, SSNLast4, MiddleName, PersonalEmail, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt)
          VALUES
            (@0, @1, @2, @3, @4, @5, SYSUTCDATETIME(), @5, SYSUTCDATETIME())
          `,
          [
            current.contactId,
            nullableDate(dto.birthDate),
            ssnLast4(dto.ssn),
            nullableText(dto.middleName),
            nullableText(dto.personalEmail),
            modifiedBy,
          ],
        );
      }

      // 2. Home address upsert
      const hasHomeAddressFields =
        dto.homeStreet != null ||
        dto.homeAddress2 != null ||
        dto.homeCity != null ||
        dto.homeState != null ||
        dto.homePostalCode != null ||
        dto.homeCountry != null;

      if (hasHomeAddressFields) {
        if (current.homeAddressId) {
          await manager.query(
            `
            UPDATE dbo.Address
            SET AddressLine1  = @0,
                AddressLine2  = @1,
                City          = @2,
                StateProvince = @3,
                PostalCode    = @4,
                Country       = @5
            WHERE AddressID = @6
            `,
            [
              cleanText(dto.homeStreet) || current.homeStreet || '',
              nullableText(dto.homeAddress2),
              cleanText(dto.homeCity) || current.homeCity || '',
              cleanText(dto.homeState) || current.homeState || '',
              cleanText(dto.homePostalCode) || current.homePostalCode || '',
              cleanText(dto.homeCountry) || current.homeCountry || '',
              current.homeAddressId,
            ],
          );
        } else {
          // Check if this address already exists (unique index on Address table)
          const street = cleanText(dto.homeStreet) || '';
          const city = cleanText(dto.homeCity) || '';
          const state = cleanText(dto.homeState) || '';
          const postalCode = cleanText(dto.homePostalCode) || '';
          const country = cleanText(dto.homeCountry) || '';
          const address2 = nullableText(dto.homeAddress2);

          const existingAddr = await manager.query(
            `SELECT TOP 1 AddressID AS addressId FROM dbo.Address
             WHERE AddressLine1 = @0 AND City = @1 AND StateProvince = @2 AND Country = @3 AND PostalCode = @4`,
            [street, city, state, country, postalCode],
          );

          let newAddressId: number | null = null;
          if (existingAddr.length > 0) {
            newAddressId = readNumber(existingAddr[0], 'addressId', 'AddressID');
            // Update address line 2 if needed
            if (newAddressId) {
              await manager.query(
                `UPDATE dbo.Address SET AddressLine2 = @0 WHERE AddressID = @1`,
                [address2, newAddressId],
              );
            }
          } else {
            const addrRows = await manager.query(
              `
              INSERT INTO dbo.Address (AddressLine1, AddressLine2, City, StateProvince, PostalCode, Country)
              OUTPUT INSERTED.AddressID AS addressId
              VALUES (@0, @1, @2, @3, @4, @5)
              `,
              [street, address2, city, state, postalCode, country],
            );
            newAddressId = readNumber(addrRows[0], 'addressId', 'AddressID');
          }

          if (newAddressId) {
            await manager.query(
              `UPDATE dbo.EmployeeProfile SET HomeAddressID = @0 WHERE ContactID = @1`,
              [newAddressId, current.contactId],
            );
          }
        }
      }

      // 3. Upsert emergency contact
      const hasEmergencyFields =
        dto.emergencyFirstName != null ||
        dto.emergencyLastName != null ||
        dto.emergencyEmail != null ||
        dto.emergencyCellPhone != null;

      if (hasEmergencyFields) {
        console.log('[PersonalProfile] emergencyContactId:', current.emergencyContactId);
        console.log('[PersonalProfile] emergency payload:', { firstName: dto.emergencyFirstName, lastName: dto.emergencyLastName, email: dto.emergencyEmail, cellPhone: dto.emergencyCellPhone });
        if (current.emergencyContactId) {
          await manager.query(
            `
            UPDATE dbo.EmergencyContact
            SET FullName    = @0,
                Email       = @1,
                PhoneNumber = @2,
                UpdatedBy   = @3,
                UpdatedAt   = SYSUTCDATETIME()
            WHERE EmergencyContactID = @4
            `,
            [
              [cleanText(dto.emergencyFirstName) || current.emergencyFirstName || '', cleanText(dto.emergencyLastName) || current.emergencyLastName || ''].filter(Boolean).join(' '),
              nullableText(dto.emergencyEmail),
              nullableText(dto.emergencyCellPhone),
              modifiedBy,
              current.emergencyContactId,
            ],
          );
        } else {
          const rows = await manager.query(
            `
            INSERT INTO dbo.EmergencyContact
              (ContactID, FullName, Email, PhoneNumber, IsPrimary, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt)
            OUTPUT INSERTED.EmergencyContactID AS emergencyContactId
            VALUES (@0, @1, @2, @3, 1, @4, SYSUTCDATETIME(), @4, SYSUTCDATETIME())
            `,
            [
              current.contactId,
              [cleanText(dto.emergencyFirstName) || '', cleanText(dto.emergencyLastName) || ''].filter(Boolean).join(' '),
              nullableText(dto.emergencyEmail),
              nullableText(dto.emergencyCellPhone),
              modifiedBy,
            ],
          );
          // emergencyContactId is auto-linked via ContactID FK
          void rows;
        }
      }
    });

    return this.loadPersonalProfile(email);
  }

  // ─── Private Loaders ────────────────────────────────────────────────────────

  private async loadPersonalProfile(
    email: string,
  ): Promise<EmployeePersonalProfileResponse> {
    const hasEpTable = await this.tableExists('EmployeeProfile');
    const hasEcTable = await this.tableExists('EmergencyContact');

    // Build the SELECT dynamically based on which tables exist
    let epJoin = '';
    let epSelect =
      "CAST('' AS nvarchar(100)) AS middleName, CAST('' AS nvarchar(254)) AS personalEmail, CAST(NULL AS date) AS birthDate, CAST('' AS nvarchar(20)) AS ssn, CAST(NULL AS int) AS homeAddressId";
    if (hasEpTable) {
      epJoin =
        'LEFT JOIN dbo.EmployeeProfile ep ON ep.ContactID = c.ContactID LEFT JOIN dbo.Address ha ON ha.AddressID = ep.HomeAddressID';
      epSelect =
        "COALESCE(ep.MiddleName, '') AS middleName, COALESCE(ep.PersonalEmail, '') AS personalEmail, ep.DateOfBirth AS birthDate, COALESCE(ep.SSNLast4, '') AS ssn, ep.HomeAddressID AS homeAddressId";
    }

    let ecJoin = '';
    let ecSelect =
      "CAST(NULL AS int) AS emergencyContactId, CAST('' AS nvarchar(100)) AS emergencyFirstName, CAST('' AS nvarchar(100)) AS emergencyLastName, CAST('' AS nvarchar(254)) AS emergencyEmail, CAST('' AS nvarchar(30)) AS emergencyCellPhone";
    if (hasEcTable) {
      ecJoin =
        'LEFT JOIN dbo.EmergencyContact ec ON ec.ContactID = c.ContactID';
      ecSelect =
        "ec.EmergencyContactID AS emergencyContactId, " +
        "COALESCE(LEFT(ec.FullName, CASE WHEN CHARINDEX(' ', ec.FullName) > 0 THEN CHARINDEX(' ', ec.FullName) - 1 ELSE LEN(ec.FullName) END), '') AS emergencyFirstName, " +
        "COALESCE(CASE WHEN CHARINDEX(' ', ec.FullName) > 0 THEN SUBSTRING(ec.FullName, CHARINDEX(' ', ec.FullName) + 1, LEN(ec.FullName)) ELSE '' END, '') AS emergencyLastName, " +
        "COALESCE(ec.Email, '') AS emergencyEmail, " +
        "COALESCE(ec.PhoneNumber, '') AS emergencyCellPhone";
    }

    const rows = await this.dataSource.query(
      `
      SELECT TOP 1
        c.ContactID AS contactId,
        ci.ContactInfoID AS contactInfoId,
        ci.FirstName AS firstName,
        ci.LastName AS lastName,
        ci.Email AS email,
        COALESCE(ci.CellPhone, '') AS cellPhone,
        ${epSelect},
        ${ecSelect},
        ${hasEpTable ? "COALESCE(ha.AddressLine1, '') AS homeStreet, COALESCE(ha.AddressLine2, '') AS homeAddress2, COALESCE(ha.City, '') AS homeCity, COALESCE(ha.StateProvince, '') AS homeState, COALESCE(ha.PostalCode, '') AS homePostalCode, COALESCE(ha.Country, '') AS homeCountry" : "CAST('' AS nvarchar(200)) AS homeStreet, CAST('' AS nvarchar(200)) AS homeAddress2, CAST('' AS nvarchar(100)) AS homeCity, CAST('' AS nvarchar(100)) AS homeState, CAST('' AS nvarchar(20)) AS homePostalCode, CAST('' AS nvarchar(100)) AS homeCountry"}
      FROM dbo.Contact c
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      INNER JOIN dbo.ContactAssignment ca ON ca.ContactID = c.ContactID
      INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
      ${epJoin}
      ${ecJoin}
      WHERE LOWER(LTRIM(RTRIM(ci.Email))) = LOWER(LTRIM(RTRIM(@0)))
      `,
      [email],
    );

    if (rows.length === 0) {
      throw new NotFoundException(
        `No internal employee profile found for ${email}. Run Entra → EMS sync first.`,
      );
    }

    const r = rows[0] as Record<string, unknown>;
    return {
      contactId: readNumber(r, 'contactId', 'ContactID') ?? 0,
      contactInfoId: readNumber(r, 'contactInfoId', 'ContactInfoID') ?? 0,
      firstName: readString(r, 'firstName', 'FirstName'),
      lastName: readString(r, 'lastName', 'LastName'),
      email: readString(r, 'email', 'Email'),
      cellPhone: readString(r, 'cellPhone', 'CellPhone'),
      middleName: readString(r, 'middleName', 'MiddleName'),
      personalEmail: readString(r, 'personalEmail', 'PersonalEmail'),
      birthDate: readDateString(r, 'birthDate', 'BirthDate'),
      ssn: readString(r, 'ssn', 'SSN'),
      homeAddressId: readNumber(r, 'homeAddressId', 'HomeAddressID'),
      homeStreet: readString(r, 'homeStreet'),
      homeAddress2: readString(r, 'homeAddress2'),
      homeCity: readString(r, 'homeCity'),
      homeState: readString(r, 'homeState'),
      homePostalCode: readString(r, 'homePostalCode'),
      homeCountry: readString(r, 'homeCountry'),
      emergencyContactId: readNumber(
        r,
        'emergencyContactId',
        'EmergencyContactID',
      ),
      emergencyFirstName: readString(r, 'emergencyFirstName'),
      emergencyLastName: readString(r, 'emergencyLastName'),
      emergencyEmail: readString(r, 'emergencyEmail'),
      emergencyCellPhone: readString(r, 'emergencyCellPhone'),
    };
  }

  private async tableExists(tableName: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `
      SELECT 1 AS found
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @0
      `,
      [tableName],
    );
    return rows.length > 0;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeEmail(value: string | null | undefined): string {
  const email = cleanText(value).toLowerCase();
  return email.includes('@') ? email : '';
}

function cleanText(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function nullableText(value: string | null | undefined): string | null {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function ssnLast4(value: string | null | undefined): string | null {
  const cleaned = cleanText(value)?.replace(/\D/g, '');
  if (!cleaned) return null;
  return cleaned.slice(-4);
}

function nullableDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  // Validate ISO date format
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function readString(
  row: Record<string, unknown> | undefined,
  ...keys: string[]
): string {
  if (!row) return '';
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return cleanText(String(value));
  }
  return '';
}

function readNumber(
  row: Record<string, unknown> | undefined,
  ...keys: string[]
): number | null {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }
  return null;
}

function readDateString(
  row: Record<string, unknown> | undefined,
  ...keys: string[]
): string | null {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return null;
      // Use local date parts to avoid timezone shift
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const str = String(value).trim();
    if (!str) continue;
    // For string dates, parse and use local parts
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
