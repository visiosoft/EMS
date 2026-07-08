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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeCertificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
function normalizeEmail(email) {
    return (email ?? '').trim().toLowerCase();
}
function readString(row, ...keys) {
    for (const key of keys) {
        const value = row[key];
        if (typeof value === 'string')
            return value.trim();
    }
    return '';
}
function readNumber(row, ...keys) {
    for (const key of keys) {
        const value = row[key];
        if (typeof value === 'number')
            return value;
        if (typeof value === 'string') {
            const n = parseInt(value, 10);
            if (!isNaN(n))
                return n;
        }
    }
    return null;
}
function readDateString(row, ...keys) {
    for (const key of keys) {
        const value = row[key];
        if (value === null || value === undefined)
            continue;
        if (value instanceof Date) {
            if (isNaN(value.getTime()))
                return null;
            const y = value.getFullYear();
            const m = String(value.getMonth() + 1).padStart(2, '0');
            const d = String(value.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        const str = String(value).trim();
        if (!str)
            continue;
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
let EmployeeCertificationsService = class EmployeeCertificationsService {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async getCertifications(userEmail) {
        const email = normalizeEmail(userEmail);
        if (!email) {
            throw new common_1.BadRequestException('A valid email address is required.');
        }
        const contactRows = await this.dataSource.query(`SELECT TOP 1 c.ContactID AS contactId
       FROM dbo.Contact c
       INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
       INNER JOIN dbo.ContactAssignment ca ON ca.ContactID = c.ContactID
       INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
       WHERE LOWER(LTRIM(RTRIM(ci.Email))) = @0`, [email]);
        if (contactRows.length === 0) {
            throw new common_1.NotFoundException(`No internal employee found for ${email}.`);
        }
        const contactId = readNumber(contactRows[0], 'contactId') ?? 0;
        const rows = await this.dataSource.query(`SELECT
         ls.SubmissionID AS submissionId,
         ls.CertificationName AS certificationName,
         ls.IssuingOrganization AS issuingOrganization,
         COALESCE(lp.PlatformName, ls.IssuingOrganization) AS platformName,
         ls.DateCompleted AS dateCompleted,
         ls.PointsAwarded AS pointsAwarded,
         COALESCE(ls.CredentialUrl, '') AS credentialUrl,
         ls.CertificationID AS certificationId
       FROM dbo.LearningSubmission ls
       LEFT JOIN dbo.LearningCertification lc ON lc.CertificationID = ls.CertificationID
       LEFT JOIN dbo.LearningPlatform lp ON lp.PlatformID = lc.PlatformID
       WHERE ls.ContactID = @0 AND ls.Status = 'VERIFIED'
       ORDER BY ls.DateCompleted DESC, ls.SubmissionID DESC`, [contactId]);
        const certIds = [...new Set(rows.map((r) => readNumber(r, 'certificationId')).filter(Boolean))];
        let tagsMap = {};
        if (certIds.length > 0) {
            const tagRows = await this.dataSource.query(`SELECT ct.CertificationID AS certificationId, t.TagName AS tagName
         FROM dbo.LearningCertificationTag ct
         INNER JOIN dbo.LearningTag t ON t.TagID = ct.TagID
         WHERE ct.CertificationID IN (${certIds.join(',')})`);
            for (const tr of tagRows) {
                const cid = readNumber(tr, 'certificationId') ?? 0;
                const tag = readString(tr, 'tagName');
                if (!tagsMap[cid])
                    tagsMap[cid] = [];
                if (tag)
                    tagsMap[cid].push(tag);
            }
        }
        const certifications = rows.map((r) => {
            const certId = readNumber(r, 'certificationId') ?? 0;
            return {
                submissionId: readNumber(r, 'submissionId') ?? 0,
                certificationName: readString(r, 'certificationName'),
                issuingOrganization: readString(r, 'issuingOrganization'),
                platformName: readString(r, 'platformName'),
                dateCompleted: readDateString(r, 'dateCompleted'),
                pointsAwarded: readNumber(r, 'pointsAwarded') ?? 0,
                credentialUrl: readString(r, 'credentialUrl'),
                tags: tagsMap[certId] || [],
            };
        });
        return { certifications };
    }
};
exports.EmployeeCertificationsService = EmployeeCertificationsService;
exports.EmployeeCertificationsService = EmployeeCertificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], EmployeeCertificationsService);
//# sourceMappingURL=employee-certifications.service.js.map