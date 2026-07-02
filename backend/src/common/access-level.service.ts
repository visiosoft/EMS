import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AccessLevel } from './access-level.enum';

/**
 * Resolves the AccessLevel for a given user email.
 *
 * Logic:
 *  1. Look up the user's Contact in dbo.Contact → dbo.ContactInfo by email.
 *  2. If a matching EmployeeProfile row exists and has an AccessLevel value,
 *     return it.
 *  3. Otherwise default to AccessLevel.Employee.
 */
@Injectable()
export class AccessLevelService {
  private readonly logger = new Logger(AccessLevelService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async resolveAccessLevel(email: string | null | undefined): Promise<AccessLevel> {
    const normalized = (email ?? '').trim().toLowerCase();
    if (!normalized) return AccessLevel.Employee;

    try {
      const rows = await this.dataSource.query(
        `
        SELECT TOP 1 ep.AccessLevel AS accessLevel
        FROM dbo.EmployeeProfile ep
        INNER JOIN dbo.Contact c ON c.ContactID = ep.ContactID
        INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
        WHERE LOWER(LTRIM(RTRIM(ci.Email))) = @0
        `,
        [normalized],
      );

      if (rows.length > 0) {
        const raw = (rows[0].accessLevel ?? '').trim();
        const lower = raw.toLowerCase();
        if (lower === 'super admin') return AccessLevel.SuperAdmin;
        if (lower === 'administrator') return AccessLevel.Administrator;
        if (lower === 'employee') return AccessLevel.Employee;
        // Non-empty but unrecognized → treat as Employee
      }
    } catch (error) {
      this.logger.warn(
        `Failed to resolve access level for "${normalized}": ${error instanceof Error ? error.message : error}`,
      );
    }

    return AccessLevel.Employee;
  }
}
