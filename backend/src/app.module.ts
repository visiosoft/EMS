import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditContextMiddleware } from './audit/audit-context.middleware';
import { AuditModule } from './audit/audit.module';
import { AuditSubscriber } from './audit/audit.subscriber';
import { AttractionToursModule } from './attraction-tours/attraction-tours.module';
import { CompanyModule } from './company/company.module';
import { EngagementsModule } from './engagements/engagements.module';
import { PerformancesModule } from './performances/performances.module';
import { ProjectsModule } from './projects/projects.module';
import { DailySalesModule } from './daily-sales/daily-sales.module';
import { VenueDirectoryModule } from './venue-directory/venue-directory.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { InternalNewsModule } from './internal-news/internal-news.module';
import { InternalEmployeesModule } from './internal-employees/internal-employees.module';
import { InternalMarketsModule } from './internal-markets/internal-markets.module';
import { InternalVenuesModule } from './internal-venues/internal-venues.module';
import { InternalAttractionsModule } from './internal-attractions/internal-attractions.module';
import { InternalHandbookModule } from './internal-handbook/internal-handbook.module';
import { HubSpotModule } from './hubspot/hubspot.module';
import { DocumentLibraryModule } from './document-library/document-library.module';

const parseBoolean = (
  value: string | undefined,
  fallback: boolean,
): boolean => {
  if (!value) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'backend/.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mssql' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<string>('DB_PORT', '1433')),
        username: configService.get<string>('DB_USERNAME', 'SA'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME', 'master'),
        synchronize: false,
        autoLoadEntities: true,
        /**
         * If SQL is temporarily unavailable (startup ordering, transient network),
         * retry rather than failing the whole Nest boot.
         */
        retryAttempts: parseNumber(
          configService.get<string>('DB_RETRY_ATTEMPTS'),
          10,
        ),
        retryDelay: parseNumber(
          configService.get<string>('DB_RETRY_DELAY_MS'),
          3000,
        ),
        options: {
          encrypt: parseBoolean(configService.get<string>('DB_ENCRYPT'), true),
          trustServerCertificate: parseBoolean(
            configService.get<string>('DB_TRUST_SERVER_CERT'),
            true,
          ),
        },
        /**
         * `extra` is passed through to the underlying `mssql` driver (tedious).
         * Helps avoid hard 15s connect timeouts on slow links and keeps pool sane.
         */
        extra: {
          connectionTimeout: parseNumber(
            configService.get<string>('DB_CONNECTION_TIMEOUT_MS'),
            30000,
          ),
          requestTimeout: parseNumber(
            configService.get<string>('DB_REQUEST_TIMEOUT_MS'),
            30000,
          ),
          pool: {
            max: parseNumber(configService.get<string>('DB_POOL_MAX'), 10),
            min: parseNumber(configService.get<string>('DB_POOL_MIN'), 0),
            idleTimeoutMillis: parseNumber(
              configService.get<string>('DB_POOL_IDLE_TIMEOUT_MS'),
              30000,
            ),
          },
        },
      }),
    }),
    AuditModule,
    CompanyModule,
    AttractionToursModule,
    EngagementsModule,
    ProjectsModule,
    PerformancesModule,
    DailySalesModule,
    VenueDirectoryModule,
    AdminUsersModule,
    InternalNewsModule,
    InternalEmployeesModule,
    InternalMarketsModule,
    InternalVenuesModule,
    InternalAttractionsModule,
    InternalHandbookModule,
    HubSpotModule,
    DocumentLibraryModule,
  ],
  controllers: [AppController],
  providers: [AppService, AuditSubscriber],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditContextMiddleware).forRoutes('*');
  }
}
