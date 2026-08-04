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
var AccessLevelService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessLevelService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const access_level_enum_1 = require("./access-level.enum");
let AccessLevelService = AccessLevelService_1 = class AccessLevelService {
    dataSource;
    logger = new common_1.Logger(AccessLevelService_1.name);
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async resolveAccessLevel(email) {
        const normalized = (email ?? '').trim().toLowerCase();
        if (!normalized)
            return access_level_enum_1.AccessLevel.Employee;
        try {
            const rows = await this.dataSource.query(`
        SELECT TOP 1 ep.AccessLevel AS accessLevel
        FROM dbo.EmployeeProfile ep
        INNER JOIN dbo.Contact c ON c.ContactID = ep.ContactID
        INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
        WHERE LOWER(LTRIM(RTRIM(ci.Email))) = @0
        `, [normalized]);
            if (rows.length > 0) {
                const raw = (rows[0].accessLevel ?? '').trim();
                const lower = raw.toLowerCase();
                if (lower === 'super admin')
                    return access_level_enum_1.AccessLevel.SuperAdmin;
                if (lower === 'administrator')
                    return access_level_enum_1.AccessLevel.Administrator;
                if (lower === 'employee')
                    return access_level_enum_1.AccessLevel.Employee;
            }
        }
        catch (error) {
            this.logger.warn(`Failed to resolve access level for "${normalized}": ${error instanceof Error ? error.message : error}`);
        }
        return access_level_enum_1.AccessLevel.Employee;
    }
};
exports.AccessLevelService = AccessLevelService;
exports.AccessLevelService = AccessLevelService = AccessLevelService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], AccessLevelService);
//# sourceMappingURL=access-level.service.js.map