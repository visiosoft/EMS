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
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
function sqlCellToDisplay(value) {
    if (value == null)
        return null;
    if (value instanceof Date)
        return value.toISOString();
    switch (typeof value) {
        case 'string':
        case 'number':
        case 'bigint':
        case 'boolean':
            return String(value);
        default:
            return null;
    }
}
let AppService = class AppService {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    getApiStatus() {
        return {
            message: 'NestJS backend is running',
            service: 'iae-event-flow-backend',
            timestamp: new Date().toISOString(),
        };
    }
    async getDatabaseStatus() {
        const started = Date.now();
        try {
            const raw = await this.dataSource.query('SELECT 1 AS ok, SYSDATETIME() AS server_time');
            if (!Array.isArray(raw) || raw.length === 0) {
                return {
                    connected: true,
                    latencyMs: Date.now() - started,
                    serverTime: null,
                };
            }
            const row = raw[0];
            return {
                connected: true,
                latencyMs: Date.now() - started,
                serverTime: sqlCellToDisplay(row['server_time']),
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                connected: false,
                latencyMs: Date.now() - started,
                error: message,
            };
        }
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], AppService);
//# sourceMappingURL=app.service.js.map