import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TOUR_BANNER_UPLOAD_DIR } from './attraction-tours/tour-banner-multer.config';
import { SEATING_CHART_UPLOAD_DIR } from './engagements/seating-chart-multer.config';
import { CONTRACT_UPLOAD_DIR } from './engagements/contract-multer.config';
import { CONFIRMED_OFFER_UPLOAD_DIR } from './projects/confirmed-offer-multer.config';
import { getUploadRoot } from './common/upload-path';

const DEFAULT_PORT = 3001;

async function bootstrap() {
  const certificateUploadDir = path.join(getUploadRoot(), 'certificates');
  fs.mkdirSync(TOUR_BANNER_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(SEATING_CHART_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(CONTRACT_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(CONFIRMED_OFFER_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(certificateUploadDir, { recursive: true });
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  app.useStaticAssets(TOUR_BANNER_UPLOAD_DIR, {
    prefix: '/uploads/tour-banners/',
  });
  app.useStaticAssets(SEATING_CHART_UPLOAD_DIR, {
    prefix: '/uploads/seating-charts/',
  });
  app.useStaticAssets(CONTRACT_UPLOAD_DIR, {
    prefix: '/uploads/contracts/',
  });
  app.useStaticAssets(CONFIRMED_OFFER_UPLOAD_DIR, {
    prefix: '/uploads/confirmed-offers/',
  });
  app.useStaticAssets(certificateUploadDir, {
    prefix: '/uploads/certificates/',
  });
  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Vite outputs to `<repo>/dist`. Nest often runs with cwd `backend/`, so avoid
  // `process.cwd()` — resolve from this file (works for `backend/dist/main.js` and `backend/src/main.ts`).
  const repoRoot = path.resolve(__dirname, '..', '..');
  const frontendDistDir = path.join(repoRoot, 'dist');
  const frontendIndexPath = path.join(frontendDistDir, 'index.html');

  const expressApp = app.getHttpAdapter().getInstance();

  if (fs.existsSync(frontendIndexPath)) {
    app.useStaticAssets(frontendDistDir, { index: false });

    expressApp.get(
      /^(?!\/api(?:\/|$))(?!\/uploads(?:\/|$)).*/,
      (_req: Request, res: Response) => {
        res.sendFile(frontendIndexPath);
      },
    );

    logger.log(`Serving frontend from ${frontendDistDir}`);
  } else {
    logger.warn(
      `Frontend build not found at ${frontendIndexPath}; serving API only.`,
    );
    expressApp.get('/', (_req: Request, res: Response) => {
      res.status(200).json({
        message:
          'This URL is the API host. JSON routes live under /api (for example GET /api). For the web app in development, run npm run dev:vite from the repository root and open the Vite port (see vite.config.ts; default 8080).',
        apiBase: '/api',
        statusCheck: '/api',
      });
    });
  }

  const port = Number(process.env.PORT) || DEFAULT_PORT;

  try {
    await app.listen(port);
    logger.log(`Listening on http://localhost:${port} (api prefix: /api)`);
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: unknown }).code)
        : '';
    if (code === 'EADDRINUSE') {
      logger.error(
        `Port ${port} is already in use. Stop the other process (e.g. an old Nest server) or set PORT in backend/.env — try PORT=${DEFAULT_PORT + 1}. On Linux: fuser -k ${port}/tcp`,
      );
    }
    throw err;
  }
}
void bootstrap();
