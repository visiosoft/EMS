"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    logger = new common_1.Logger(AllExceptionsFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        const req = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        const detailParts = [];
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const body = exception.getResponse();
            if (typeof body === 'string') {
                message = body;
            }
            else if (body && typeof body === 'object') {
                const b = body;
                const m = b.message;
                if (typeof m === 'string') {
                    message = m;
                }
                else if (Array.isArray(m)) {
                    message = m.map(String).join('; ');
                }
                else if (typeof b.error === 'string') {
                    message = b.error;
                }
                if (typeof b.detail === 'string' && b.detail.trim()) {
                    detailParts.push(b.detail.trim());
                }
            }
        }
        else if (exception instanceof typeorm_1.QueryFailedError) {
            message = 'Database query failed';
            detailParts.push(exception.message);
            const de = exception.driverError;
            if (de?.message && de.message !== exception.message) {
                detailParts.push(`driver: ${de.message}`);
            }
        }
        else if (exception instanceof Error) {
            detailParts.push(exception.message);
        }
        else {
            detailParts.push(String(exception));
        }
        const isProd = process.env.NODE_ENV === 'production';
        const forceExpose = process.env.API_EXPOSE_ERROR_DETAILS === 'true';
        const expose = !isProd || forceExpose;
        if (!(exception instanceof common_1.HttpException)) {
            const err = exception instanceof Error ? exception : new Error(String(exception));
            this.logger.error(err.message, err.stack);
        }
        const payload = {
            statusCode: status,
            message,
            path: req?.url ?? '',
            timestamp: new Date().toISOString(),
        };
        if (expose) {
            if (detailParts.length > 0) {
                payload.detail = detailParts.join(' | ');
            }
            if (exception instanceof Error && exception.stack) {
                payload.stack = exception.stack;
            }
            if (exception instanceof Object && exception.constructor?.name) {
                payload.errorType = exception.constructor.name;
            }
        }
        res.status(status).json(payload);
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map