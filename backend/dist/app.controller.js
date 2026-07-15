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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
let AppController = class AppController {
    appService;
    constructor(appService) {
        this.appService = appService;
    }
    getHealth() {
        return this.appService.getApiStatus();
    }
    async getDbHealth() {
        const db = await this.appService.getDatabaseStatus();
        return {
            ...this.appService.getApiStatus(),
            db,
        };
    }
    async getDbCheckPage() {
        const api = this.appService.getApiStatus();
        const db = await this.appService.getDatabaseStatus();
        const ok = db.connected;
        const title = ok ? 'Database connected' : 'Database connection failed';
        const accent = ok ? '#16a34a' : '#dc2626';
        const detailRows = [];
        if (db.latencyMs != null) {
            detailRows.push(`<tr><th>Round-trip</th><td>${escapeHtml(String(db.latencyMs))} ms</td></tr>`);
        }
        if (db.serverTime != null) {
            detailRows.push(`<tr><th>SQL Server time</th><td>${escapeHtml(db.serverTime)}</td></tr>`);
        }
        if (db.error) {
            detailRows.push(`<tr><th>Error</th><td><pre style="white-space:pre-wrap;margin:0;font-size:12px">${escapeHtml(db.error)}</pre></td></tr>`);
        }
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; color: #111; }
    h1 { font-size: 1.25rem; border-left: 4px solid ${accent}; padding-left: 0.75rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
    th { width: 10rem; color: #525252; font-weight: 600; }
    code { font-size: 0.85rem; background: #f5f5f5; padding: 0.15rem 0.35rem; border-radius: 4px; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>Use this page to confirm the Nest app can reach MSSQL / Azure SQL.</p>
  <table>
    <tr><th>Status</th><td><strong style="color:${accent}">${ok ? 'OK' : 'FAILED'}</strong></td></tr>
    <tr><th>API</th><td>${escapeHtml(api.service)}</td></tr>
    <tr><th>Checked at</th><td>${escapeHtml(api.timestamp)}</td></tr>
    ${detailRows.join('\n    ')}
  </table>
  <p style="margin-top:1.5rem;font-size:0.85rem;color:#737373">
    JSON: <a href="./db-health"><code>/api/db-health</code></a>
  </p>
</body>
</html>`;
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('db-health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getDbHealth", null);
__decorate([
    (0, common_1.Get)('db-check'),
    (0, common_1.Header)('Content-Type', 'text/html; charset=utf-8'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getDbCheckPage", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService])
], AppController);
//# sourceMappingURL=app.controller.js.map