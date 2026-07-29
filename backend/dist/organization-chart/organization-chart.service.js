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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OrganizationChartService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationChartService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_request_context_service_1 = require("../audit/audit-request-context.service");
const COMPANY_NODE_ID = 0;
const UNASSIGNED_DEPARTMENT_NODE_ID = -1;
let OrganizationChartService = OrganizationChartService_1 = class OrganizationChartService {
    dataSource;
    auditContext;
    logger = new common_1.Logger(OrganizationChartService_1.name);
    constructor(dataSource, auditContext) {
        this.dataSource = dataSource;
        this.auditContext = auditContext;
    }
    async getHierarchicalChart(graphAccessToken) {
        const generatedAt = new Date().toISOString();
        const internalCompanies = await this.getInternalCompanies();
        if (internalCompanies.length !== 1) {
            const message = internalCompanies.length === 0
                ? 'Mark one company as internal to publish its organizational view.'
                : 'More than one company is marked internal. Keep exactly one internal company.';
            return {
                mode: 'department',
                configured: false,
                generatedAt,
                company: internalCompanies[0] ?? null,
                roots: [],
                unmatched: [],
                stats: { people: 0, departments: 0, levels: 0 },
                warnings: [message],
            };
        }
        const company = internalCompanies[0];
        const jobTitleColumnAvailable = await this.hasContactInfoJobTitleColumn();
        const rows = await this.loadInternalContacts(company.companyId, jobTitleColumnAvailable);
        const warnings = [];
        if (!jobTitleColumnAvailable) {
            warnings.push('ContactInfo.JobTitle is not installed, so chart titles use existing internal roles.');
        }
        const accessToken = this.resolveGraphToken(graphAccessToken);
        if (accessToken) {
            try {
                const entraUsers = await this.fetchEntraUsersWithManagers(accessToken);
                const result = this.buildHierarchyFromEntra(company, rows, entraUsers, jobTitleColumnAvailable);
                return {
                    mode: 'hierarchy',
                    configured: true,
                    generatedAt,
                    company,
                    roots: result.roots,
                    unmatched: result.unmatched,
                    stats: result.stats,
                    warnings: [...warnings, ...result.warnings],
                    nodes: this.buildDepartmentNodes(company, rows),
                };
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : String(error ?? '');
                warnings.push(`Could not fetch Entra manager data — falling back to department view. ${msg}`);
            }
        }
        else {
            warnings.push('No Graph token available — showing department-grouped view. Sign in to see the hierarchical org chart.');
        }
        return {
            mode: 'department',
            configured: true,
            generatedAt,
            company,
            roots: [],
            unmatched: [],
            stats: {
                people: rows.length,
                departments: new Set(rows.map((r) => readString(r, 'departmentName', 'DepartmentName'))).size,
                levels: 0,
            },
            warnings,
            nodes: this.buildDepartmentNodes(company, rows),
        };
    }
    resolveGraphToken(provided) {
        const token = String(provided ?? this.auditContext.getGraphAccessToken() ?? '').trim();
        return token || null;
    }
    async fetchEntraUsersWithManagers(accessToken) {
        const users = [];
        let nextUrl = 'https://graph.microsoft.com/v1.0/users?$select=id,mail,displayName,userPrincipalName,department,jobTitle&$expand=manager($select=id,mail,displayName)&$top=999';
        while (nextUrl) {
            const response = await fetch(nextUrl, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!response.ok) {
                throw new Error(`Microsoft Graph user+manager request failed with status ${response.status}.`);
            }
            const payload = (await response.json());
            for (const user of payload.value ?? []) {
                const id = String(user.id ?? '').trim();
                if (!id)
                    continue;
                users.push({
                    id,
                    mail: user.mail?.trim() || user.userPrincipalName?.trim() || null,
                    displayName: user.displayName?.trim() || null,
                    userPrincipalName: user.userPrincipalName?.trim() || null,
                    department: user.department?.trim() || null,
                    jobTitle: user.jobTitle?.trim() || null,
                    managerId: user.manager?.id?.trim() || null,
                });
            }
            nextUrl = payload['@odata.nextLink'] ?? null;
        }
        return users;
    }
    buildHierarchyFromEntra(company, rows, entraUsers, jobTitleColumnAvailable) {
        const warnings = [];
        const emsMembers = this.buildMembersFromRows(rows, jobTitleColumnAvailable);
        const emsByEmail = new Map();
        for (const member of emsMembers) {
            const email = normalizeEmail(member.email);
            if (email)
                emsByEmail.set(email, member);
        }
        const entraById = new Map();
        const entraByEmail = new Map();
        for (const user of entraUsers) {
            entraById.set(user.id, user);
            const email = user.mail ? normalizeEmail(user.mail) : null;
            if (email && !entraByEmail.has(email)) {
                entraByEmail.set(email, user);
            }
        }
        const matchedMembers = [];
        const unmatchedMembers = [];
        for (const member of emsMembers) {
            const email = normalizeEmail(member.email);
            const entraUser = email ? entraByEmail.get(email) : undefined;
            if (entraUser) {
                member.entraUserId = entraUser.id;
                matchedMembers.push({ member, entraUser });
            }
            else {
                unmatchedMembers.push(member);
            }
        }
        const nodeByEntraId = new Map();
        for (const { member, entraUser } of matchedMembers) {
            nodeByEntraId.set(entraUser.id, {
                nodeId: `contact:${member.contactId}`,
                member,
                children: [],
            });
        }
        const roots = [];
        for (const { entraUser } of matchedMembers) {
            const node = nodeByEntraId.get(entraUser.id);
            if (!node)
                continue;
            const managerId = entraUser.managerId;
            const parentNode = managerId ? nodeByEntraId.get(managerId) : null;
            if (parentNode && parentNode !== node) {
                parentNode.children.push(node);
            }
            else {
                roots.push(node);
            }
        }
        const sortChildren = (nodes) => {
            nodes.sort((left, right) => roleRank(left.member.jobTitle) - roleRank(right.member.jobTitle) ||
                left.member.displayName.localeCompare(right.member.displayName));
            for (const node of nodes) {
                sortChildren(node.children);
            }
        };
        sortChildren(roots);
        const totalPeople = emsMembers.length;
        const departments = new Set(emsMembers.map((m) => m.departmentName).filter(Boolean));
        const maxDepth = computeMaxDepth(roots);
        return {
            roots,
            unmatched: unmatchedMembers,
            stats: {
                people: totalPeople,
                departments: departments.size,
                levels: maxDepth,
            },
            warnings,
        };
    }
    buildMembersFromRows(rows, jobTitleColumnAvailable) {
        const seen = new Set();
        const members = [];
        for (const row of rows) {
            const contactId = readNumber(row, 'contactId', 'ContactID');
            if (!contactId || seen.has(contactId))
                continue;
            seen.add(contactId);
            const firstName = readString(row, 'firstName', 'FirstName');
            const lastName = readString(row, 'lastName', 'LastName');
            const rawJobTitle = readString(row, 'jobTitle', 'JobTitle');
            const roleName = readString(row, 'roleName', 'RoleName');
            const departmentName = normalizeDepartmentName(readString(row, 'departmentName', 'DepartmentName'));
            members.push({
                memberId: contactId,
                contactId,
                firstName,
                lastName,
                displayName: cleanText(`${firstName} ${lastName}`) || `Contact ${contactId}`,
                email: readString(row, 'email', 'Email'),
                cellPhone: readString(row, 'cellPhone', 'CellPhone'),
                workPhone: readString(row, 'workPhone', 'WorkPhone'),
                jobTitle: rawJobTitle || roleName || '',
                roleName,
                departmentName,
            });
        }
        return members;
    }
    async getChart() {
        const generatedAt = new Date().toISOString();
        const internalCompanies = await this.getInternalCompanies();
        if (internalCompanies.length !== 1) {
            const message = internalCompanies.length === 0
                ? 'Mark one company as internal to publish its organizational view.'
                : 'More than one company is marked internal. Keep exactly one internal company to publish the organizational view.';
            return {
                configured: false,
                generatedAt,
                company: internalCompanies[0] ?? null,
                nodes: [],
                warnings: [message],
            };
        }
        const company = internalCompanies[0];
        const jobTitleColumnAvailable = await this.hasContactInfoJobTitleColumn();
        const rows = await this.loadInternalContacts(company.companyId, jobTitleColumnAvailable);
        const warnings = [];
        if (!jobTitleColumnAvailable) {
            warnings.push('ContactInfo.JobTitle is not installed, so chart titles use existing internal roles.');
        }
        return {
            configured: true,
            generatedAt,
            company,
            nodes: this.buildDepartmentNodes(company, rows),
            warnings,
        };
    }
    async getInternalCompanies() {
        const rows = await this.dataSource.query(`
      SELECT CompanyID AS companyId, CompanyName AS companyName
      FROM dbo.Company
      WHERE is_internal = 1
      ORDER BY CompanyID
      `);
        return rows
            .map((row) => ({
            companyId: readNumber(row, 'companyId', 'CompanyID') ?? 0,
            companyName: readString(row, 'companyName', 'CompanyName'),
        }))
            .filter((company) => company.companyId > 0);
    }
    async hasContactInfoJobTitleColumn() {
        const rows = await this.dataSource.query(`
      SELECT 1 AS hasColumn
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = 'ContactInfo'
        AND COLUMN_NAME = 'JobTitle'
      `);
        return rows.length > 0;
    }
    async loadInternalContacts(companyId, jobTitleColumnAvailable) {
        const jobTitleSelect = jobTitleColumnAvailable
            ? "COALESCE(NULLIF(LTRIM(RTRIM(ci.JobTitle)), ''), rolePick.roleName, '')"
            : "COALESCE(rolePick.roleName, '')";
        return this.dataSource.query(`
      SELECT
        c.ContactID AS contactId,
        COALESCE(ci.FirstName, '') AS firstName,
        COALESCE(ci.LastName, '') AS lastName,
        COALESCE(ci.Email, '') AS email,
        COALESCE(ci.CellPhone, '') AS cellPhone,
        COALESCE(ci.WorkPhone, '') AS workPhone,
        ${jobTitleSelect} AS jobTitle,
        COALESCE(rolePick.roleName, '') AS roleName,
        departmentPick.departmentId,
        COALESCE(departmentPick.departmentName, 'Unassigned') AS departmentName
      FROM dbo.Contact c
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      OUTER APPLY (
        SELECT STUFF((
          SELECT DISTINCT ', ' + LTRIM(RTRIM(r.RoleName))
          FROM dbo.ContactAssignment roleAssignment
          INNER JOIN dbo.Role r ON r.RoleID = roleAssignment.RoleID
          WHERE roleAssignment.ContactID = c.ContactID
            AND roleAssignment.CompanyID = @0
            AND NULLIF(LTRIM(RTRIM(r.RoleName)), '') IS NOT NULL
          FOR XML PATH(''), TYPE
        ).value('.', 'nvarchar(max)'), 1, 2, '') AS roleName
      ) rolePick
      OUTER APPLY (
        SELECT TOP 1
          d.DepartmentID AS departmentId,
          NULLIF(LTRIM(RTRIM(d.DepartmentName)), '') AS departmentName
        FROM dbo.ContactAssignment departmentAssignment
        LEFT JOIN dbo.Department d
          ON d.DepartmentID = departmentAssignment.DepartmentID
        WHERE departmentAssignment.ContactID = c.ContactID
          AND departmentAssignment.CompanyID = @0
        ORDER BY
          CASE
            WHEN d.DepartmentName IS NULL
              OR LTRIM(RTRIM(d.DepartmentName)) = ''
              OR LOWER(LTRIM(RTRIM(d.DepartmentName))) = 'unknown'
            THEN 1 ELSE 0
          END,
          departmentAssignment.ContactAssignmentID
      ) departmentPick
      WHERE EXISTS (
        SELECT 1
        FROM dbo.ContactAssignment internalAssignment
        WHERE internalAssignment.ContactID = c.ContactID
          AND internalAssignment.CompanyID = @0
      )
      ORDER BY
        COALESCE(departmentPick.departmentName, 'Unassigned'),
        ci.LastName,
        ci.FirstName,
        c.ContactID
      `, [companyId]);
    }
    buildDepartmentNodes(company, rows) {
        const groups = new Map();
        for (const row of rows) {
            const contactId = readNumber(row, 'contactId', 'ContactID');
            if (!contactId)
                continue;
            const rawDepartmentId = readNumber(row, 'departmentId', 'DepartmentID');
            const departmentName = normalizeDepartmentName(readString(row, 'departmentName', 'DepartmentName'));
            const departmentId = rawDepartmentId && departmentName !== 'Unassigned'
                ? rawDepartmentId
                : UNASSIGNED_DEPARTMENT_NODE_ID;
            let node = groups.get(departmentId);
            if (!node) {
                node = {
                    nodeId: departmentId,
                    parentNodeId: COMPANY_NODE_ID,
                    label: departmentName,
                    sortOrder: 0,
                    members: [],
                };
                groups.set(departmentId, node);
            }
            const firstName = readString(row, 'firstName', 'FirstName');
            const lastName = readString(row, 'lastName', 'LastName');
            node.members.push({
                memberId: contactId,
                contactId,
                sortOrder: roleRank(readString(row, 'jobTitle', 'JobTitle')),
                firstName,
                lastName,
                displayName: cleanText(`${firstName} ${lastName}`) || `Contact ${contactId}`,
                email: readString(row, 'email', 'Email'),
                cellPhone: readString(row, 'cellPhone', 'CellPhone'),
                workPhone: readString(row, 'workPhone', 'WorkPhone'),
                jobTitle: readString(row, 'jobTitle', 'JobTitle'),
                roleName: readString(row, 'roleName', 'RoleName'),
                departmentName,
            });
        }
        const departmentNodes = Array.from(groups.values()).sort((left, right) => departmentRank(left.label) - departmentRank(right.label) ||
            left.label.localeCompare(right.label));
        departmentNodes.forEach((node, index) => {
            node.sortOrder = index + 1;
            node.members.sort((left, right) => left.sortOrder - right.sortOrder ||
                left.displayName.localeCompare(right.displayName));
        });
        return [
            {
                nodeId: COMPANY_NODE_ID,
                parentNodeId: null,
                label: company.companyName,
                sortOrder: 0,
                members: [],
            },
            ...departmentNodes,
        ];
    }
};
exports.OrganizationChartService = OrganizationChartService;
exports.OrganizationChartService = OrganizationChartService = OrganizationChartService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        audit_request_context_service_1.AuditRequestContext])
], OrganizationChartService);
function normalizeEmail(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase();
}
function computeMaxDepth(nodes) {
    if (nodes.length === 0)
        return 0;
    let max = 0;
    for (const node of nodes) {
        const childDepth = computeMaxDepth(node.children);
        if (childDepth > max)
            max = childDepth;
    }
    return max + 1;
}
function normalizeDepartmentName(value) {
    const normalized = cleanText(value);
    return normalized && normalized.toLowerCase() !== 'unknown'
        ? normalized
        : 'Unassigned';
}
function departmentRank(name) {
    const normalized = name.toLowerCase();
    if (normalized.includes('executive'))
        return 0;
    if (normalized === 'unassigned')
        return 2;
    return 1;
}
function roleRank(title) {
    const normalized = title.toLowerCase();
    if (/\b(chief|ceo|president|owner)\b/.test(normalized))
        return 0;
    if (/\b(vice president|vp)\b/.test(normalized))
        return 10;
    if (/\bdirector\b/.test(normalized))
        return 20;
    if (/\b(manager|head)\b/.test(normalized))
        return 30;
    if (/\b(coordinator|administrator)\b/.test(normalized))
        return 40;
    if (/\b(assistant|associate)\b/.test(normalized))
        return 50;
    return 60;
}
function cleanText(value) {
    return String(value ?? '')
        .trim()
        .replace(/\s+/g, ' ');
}
function readString(row, ...keys) {
    if (!row)
        return '';
    for (const key of keys) {
        if (row[key] != null)
            return cleanText(row[key]);
    }
    return '';
}
function readNumber(row, ...keys) {
    if (!row)
        return null;
    for (const key of keys) {
        if (row[key] == null || row[key] === '')
            continue;
        const value = Number(row[key]);
        if (Number.isFinite(value))
            return value;
    }
    return null;
}
//# sourceMappingURL=organization-chart.service.js.map