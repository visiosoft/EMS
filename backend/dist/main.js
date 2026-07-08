"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const app_module_1 = require("./app.module");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const tour_banner_multer_config_1 = require("./attraction-tours/tour-banner-multer.config");
const seating_chart_multer_config_1 = require("./engagements/seating-chart-multer.config");
const contract_multer_config_1 = require("./engagements/contract-multer.config");
const confirmed_offer_multer_config_1 = require("./projects/confirmed-offer-multer.config");
const DEFAULT_PORT = 3001;
async function bootstrap() {
    fs.mkdirSync(tour_banner_multer_config_1.TOUR_BANNER_UPLOAD_DIR, { recursive: true });
    fs.mkdirSync(seating_chart_multer_config_1.SEATING_CHART_UPLOAD_DIR, { recursive: true });
    fs.mkdirSync(contract_multer_config_1.CONTRACT_UPLOAD_DIR, { recursive: true });
    fs.mkdirSync(confirmed_offer_multer_config_1.CONFIRMED_OFFER_UPLOAD_DIR, { recursive: true });
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const logger = new common_1.Logger('Bootstrap');
    app.useStaticAssets(tour_banner_multer_config_1.TOUR_BANNER_UPLOAD_DIR, {
        prefix: '/uploads/tour-banners/',
    });
    app.useStaticAssets(seating_chart_multer_config_1.SEATING_CHART_UPLOAD_DIR, {
        prefix: '/uploads/seating-charts/',
    });
    app.useStaticAssets(contract_multer_config_1.CONTRACT_UPLOAD_DIR, {
        prefix: '/uploads/contracts/',
    });
    app.useStaticAssets(confirmed_offer_multer_config_1.CONFIRMED_OFFER_UPLOAD_DIR, {
        prefix: '/uploads/confirmed-offers/',
    });
    app.enableCors();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
    }));
    const repoRoot = path.resolve(__dirname, '..', '..');
    const frontendDistDir = path.join(repoRoot, 'dist');
    const frontendIndexPath = path.join(frontendDistDir, 'index.html');
    const expressApp = app.getHttpAdapter().getInstance();
    if (fs.existsSync(frontendIndexPath)) {
        app.useStaticAssets(frontendDistDir, { index: false });
        expressApp.get(/^(?!\/api(?:\/|$))(?!\/uploads(?:\/|$)).*/, (_req, res) => {
            res.sendFile(frontendIndexPath);
        });
        logger.log(`Serving frontend from ${frontendDistDir}`);
    }
    else {
        logger.warn(`Frontend build not found at ${frontendIndexPath}; serving API only.`);
        expressApp.get('/', (_req, res) => {
            res.status(200).json({
                message: 'This URL is the API host. JSON routes live under /api (for example GET /api). For the web app in development, run npm run dev:vite from the repository root and open the Vite port (see vite.config.ts; default 8080).',
                apiBase: '/api',
                statusCheck: '/api',
            });
        });
    }
    const port = Number(process.env.PORT) || DEFAULT_PORT;
    try {
        await app.listen(port);
        logger.log(`Listening on http://localhost:${port} (api prefix: /api)`);
    }
    catch (err) {
        const code = err && typeof err === 'object' && 'code' in err
            ? String(err.code)
            : '';
        if (code === 'EADDRINUSE') {
            logger.error(`Port ${port} is already in use. Stop the other process (e.g. an old Nest server) or set PORT in backend/.env — try PORT=${DEFAULT_PORT + 1}. On Linux: fuser -k ${port}/tcp`);
        }
        throw err;
    }
}
void bootstrap();
//# sourceMappingURL=main.js.map