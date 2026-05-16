import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EntraTokenVerifier } from '../auth/entra-token-verifier.service';
import { AuditContextMiddleware } from './audit-context.middleware';
import { AuditRequestContext } from './audit-request-context.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AuditRequestContext, AuditContextMiddleware, EntraTokenVerifier],
  exports: [AuditRequestContext, AuditContextMiddleware, EntraTokenVerifier],
})
export class AuditModule {}
