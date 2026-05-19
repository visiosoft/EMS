import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminUsersService } from '../admin-users/admin-users.service';
import { AuditRequestContext } from '../audit/audit-request-context.service';
import { CreateNewsDto } from './dto/create-news.dto';

export type InternalNewsListItem = {
  id: string;
  title: string;
  summary: string;
  body: string;
  createdBy: string | null;
  createdByName: string;
  createdAt: string | null;
  modifiedBy: string | null;
  modifiedAt: string | null;
};

type NewsRow = {
  id: string;
  title: string;
  summary: string;
  body: string;
  created_by: string | null;
  created_at: Date | string | null;
  modified_by?: string | null;
  modified_at?: Date | string | null;
};

type NewsColumnFlags = {
  modifiedBy: boolean;
  modifiedAt: boolean;
};

const MAX_BODY_LENGTH = 5000;
const MAX_NEWS_LIMIT = 500;

@Injectable()
export class InternalNewsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditContext: AuditRequestContext,
    private readonly adminUsersService: AdminUsersService,
  ) {}

  async findAll(limit = 12): Promise<InternalNewsListItem[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), MAX_NEWS_LIMIT);
    const flags = await this.getColumnFlags();
    const rows = await this.dataSource.query<NewsRow[]>(`
      SELECT TOP (@0)
        id,
        title,
        summary,
        body,
        created_by,
        created_at
        ${flags.modifiedBy ? ', modified_by' : ', CAST(NULL AS nvarchar(150)) AS modified_by'}
        ${flags.modifiedAt ? ', modified_at' : ', CAST(NULL AS datetime) AS modified_at'}
      FROM dbo.News
      ORDER BY created_at DESC
    `, [safeLimit]);

    return this.toListItems(rows);
  }

  async create(dto: CreateNewsDto): Promise<InternalNewsListItem> {
    const title = dto.title.trim();
    const summary = dto.summary.trim();
    const body = dto.body.trim();
    const bodyText = stripHtml(body);

    if (bodyText.length < 20) {
      throw new BadRequestException('News body must be at least 20 characters.');
    }

    if (bodyText.length > MAX_BODY_LENGTH) {
      throw new BadRequestException('News body must be 5,000 characters or fewer.');
    }

    const id = randomUUID();
    const now = new Date();
    const userOid = this.auditContext.getUserOid();
    const flags = await this.getColumnFlags();

    if (flags.modifiedBy && flags.modifiedAt) {
      await this.dataSource.query(
        `INSERT INTO dbo.News (id, title, summary, body, created_by, created_at, modified_by, modified_at)
         VALUES (@0, @1, @2, @3, @4, @5, @4, @5)`,
        [id, title, summary, body, userOid, now],
      );
    } else if (flags.modifiedBy) {
      await this.dataSource.query(
        `INSERT INTO dbo.News (id, title, summary, body, created_by, created_at, modified_by)
         VALUES (@0, @1, @2, @3, @4, @5, @4)`,
        [id, title, summary, body, userOid, now],
      );
    } else if (flags.modifiedAt) {
      await this.dataSource.query(
        `INSERT INTO dbo.News (id, title, summary, body, created_by, created_at, modified_at)
         VALUES (@0, @1, @2, @3, @4, @5, @5)`,
        [id, title, summary, body, userOid, now],
      );
    } else {
      await this.dataSource.query(
        `INSERT INTO dbo.News (id, title, summary, body, created_by, created_at)
         VALUES (@0, @1, @2, @3, @4, @5)`,
        [id, title, summary, body, userOid, now],
      );
    }

    const rows = await this.dataSource.query<NewsRow[]>(`
      SELECT TOP (1)
        id,
        title,
        summary,
        body,
        created_by,
        created_at
        ${flags.modifiedBy ? ', modified_by' : ', CAST(NULL AS nvarchar(150)) AS modified_by'}
        ${flags.modifiedAt ? ', modified_at' : ', CAST(NULL AS datetime) AS modified_at'}
      FROM dbo.News
      WHERE id = @0
    `, [id]);

    const [created] = await this.toListItems(rows);
    return created;
  }

  private async toListItems(rows: NewsRow[]): Promise<InternalNewsListItem[]> {
    const authorNames = await this.getAuthorNames(rows.map((row) => row.created_by));

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      body: row.body,
      createdBy: row.created_by,
      createdByName: row.created_by ? authorNames.get(row.created_by) ?? 'Entra user' : 'Unknown user',
      createdAt: toIso(row.created_at),
      modifiedBy: row.modified_by ?? null,
      modifiedAt: toIso(row.modified_at ?? null),
    }));
  }

  private async getAuthorNames(authorIds: Array<string | null>): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    const uniqueIds = Array.from(new Set(authorIds.filter((id): id is string => Boolean(id))));
    const currentUserOid = this.auditContext.getUserOid();
    const currentUserName = this.auditContext.getUserDisplayName();

    if (currentUserOid && currentUserName) {
      names.set(currentUserOid, currentUserName);
    }

    const missingIds = uniqueIds.filter((id) => !names.has(id));
    if (missingIds.length === 0) return names;

    try {
      const users = await this.adminUsersService.listUsers();
      const directoryNames = new Map(users.map((user) => [user.id, user.name]));
      for (const id of missingIds) {
        const name = directoryNames.get(id);
        if (name) names.set(id, name);
      }
    } catch {
      // Keep the news visible even if Microsoft Graph is temporarily unavailable.
    }

    return names;
  }

  private async getColumnFlags(): Promise<NewsColumnFlags> {
    const rows = await this.dataSource.query<Array<{ columnName: string }>>(
      `SELECT COLUMN_NAME AS columnName
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'dbo'
         AND TABLE_NAME = 'News'
         AND COLUMN_NAME IN ('modified_by', 'modified_at')`,
    );
    const columns = new Set(rows.map((row) => row.columnName));
    return {
      modifiedBy: columns.has('modified_by'),
      modifiedAt: columns.has('modified_at'),
    };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
