"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalNewsService = void 0;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const admin_users_service_1 = require("../admin-users/admin-users.service");
const audit_request_context_service_1 = require("../audit/audit-request-context.service");
const MAX_BODY_LENGTH = 5000;
const MAX_NEWS_LIMIT = 50;
let InternalNewsService = class InternalNewsService {
    dataSource;
    auditContext;
    adminUsersService;
    constructor(dataSource, auditContext, adminUsersService) {
        this.dataSource = dataSource;
        this.auditContext = auditContext;
        this.adminUsersService = adminUsersService;
    }
    async findAll(limit = 12, skip = 0) {
        const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), MAX_NEWS_LIMIT);
        const safeSkip = Math.max(Number(skip) || 0, 0);
        const flags = await this.getColumnFlags();
        const rows = await this.dataSource.query(`
      SELECT
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
      OFFSET @1 ROWS FETCH NEXT @0 ROWS ONLY
    `, [safeLimit, safeSkip]);
        return this.toListItems(rows);
    }
    async create(dto) {
        const title = dto.title.trim();
        const summary = dto.summary.trim();
        const body = dto.body.trim();
        const bodyText = stripHtml(body);
        if (bodyText.length < 20) {
            throw new common_1.BadRequestException('News body must be at least 20 characters.');
        }
        if (bodyText.length > MAX_BODY_LENGTH) {
            throw new common_1.BadRequestException('News body must be 5,000 characters or fewer.');
        }
        const id = (0, node_crypto_1.randomUUID)();
        const now = new Date();
        const userOid = this.auditContext.getUserOid();
        const flags = await this.getColumnFlags();
        if (flags.modifiedBy && flags.modifiedAt) {
            await this.dataSource.query(`INSERT INTO dbo.News (id, title, summary, body, created_by, created_at, modified_by, modified_at)
         VALUES (@0, @1, @2, @3, @4, @5, @4, @5)`, [id, title, summary, body, userOid, now]);
        }
        else if (flags.modifiedBy) {
            await this.dataSource.query(`INSERT INTO dbo.News (id, title, summary, body, created_by, created_at, modified_by)
         VALUES (@0, @1, @2, @3, @4, @5, @4)`, [id, title, summary, body, userOid, now]);
        }
        else if (flags.modifiedAt) {
            await this.dataSource.query(`INSERT INTO dbo.News (id, title, summary, body, created_by, created_at, modified_at)
         VALUES (@0, @1, @2, @3, @4, @5, @5)`, [id, title, summary, body, userOid, now]);
        }
        else {
            await this.dataSource.query(`INSERT INTO dbo.News (id, title, summary, body, created_by, created_at)
         VALUES (@0, @1, @2, @3, @4, @5)`, [id, title, summary, body, userOid, now]);
        }
        const rows = await this.dataSource.query(`
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
    async toListItems(rows) {
        const authorNames = await this.getAuthorNames(rows.map((row) => row.created_by));
        return rows.map((row) => ({
            id: row.id,
            title: row.title,
            summary: row.summary,
            body: row.body,
            createdBy: row.created_by,
            createdByName: row.created_by
                ? (authorNames.get(row.created_by) ?? 'Entra user')
                : 'Unknown user',
            createdAt: toIso(row.created_at),
            modifiedBy: row.modified_by ?? null,
            modifiedAt: toIso(row.modified_at ?? null),
        }));
    }
    async getAuthorNames(authorIds) {
        const names = new Map();
        const uniqueIds = Array.from(new Set(authorIds.filter((id) => Boolean(id))));
        const currentUserOid = this.auditContext.getUserOid();
        const currentUserName = this.auditContext.getUserDisplayName();
        if (currentUserOid && currentUserName) {
            names.set(currentUserOid, currentUserName);
        }
        const missingIds = uniqueIds.filter((id) => !names.has(id));
        if (missingIds.length === 0)
            return names;
        try {
            const users = await this.adminUsersService.listUsers();
            const directoryNames = new Map(users.map((user) => [user.id, user.name]));
            for (const id of missingIds) {
                const name = directoryNames.get(id);
                if (name)
                    names.set(id, name);
            }
        }
        catch {
        }
        return names;
    }
    async getColumnFlags() {
        const rows = await this.dataSource.query(`SELECT COLUMN_NAME AS columnName
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'dbo'
         AND TABLE_NAME = 'News'
         AND COLUMN_NAME IN ('modified_by', 'modified_at')`);
        const columns = new Set(rows.map((row) => row.columnName));
        return {
            modifiedBy: columns.has('modified_by'),
            modifiedAt: columns.has('modified_at'),
        };
    }
};
exports.InternalNewsService = InternalNewsService;
exports.InternalNewsService = InternalNewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        audit_request_context_service_1.AuditRequestContext,
        admin_users_service_1.AdminUsersService])
], InternalNewsService);
function stripHtml(html) {
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function toIso(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return value.toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
//# sourceMappingURL=internal-news.service.js.map