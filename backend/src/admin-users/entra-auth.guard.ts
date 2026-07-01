import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import {
  EntraTokenVerifier,
  getOptionalBearerToken,
  type EntraRequestUser,
} from '../auth/entra-token-verifier.service';

export type EntraRequest = Request & { user?: EntraRequestUser };

@Injectable()
export class EntraAuthGuard implements CanActivate {
  constructor(
    private readonly tokenVerifier: EntraTokenVerifier,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<EntraRequest>();
    const token = getOptionalBearerToken(request.headers.authorization);

    // Dev bypass: skip auth when DEV_BYPASS_AUTH=true
    if (!token) {
      const bypassAuth = this.configService.get<string>('DEV_BYPASS_AUTH')?.trim();
      if (bypassAuth === 'true') {
        request.user = {
          oid: (request.headers['x-user-oid'] as string) || 'dev-user',
          name: (request.headers['x-user-name'] as string) || 'Dev User',
          email: (request.headers['x-user-email'] as string) || 'dev@localhost',
          preferred_username: (request.headers['x-user-email'] as string) || 'dev@localhost',
        } as EntraRequestUser;
        return true;
      }
      throw new UnauthorizedException(
        request.headers.authorization
          ? 'Authorization header must use Bearer token format.'
          : 'Missing Authorization header.',
      );
    }

    try {
      request.user = await this.tokenVerifier.verify(token);
      return true;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new UnauthorizedException({
        message: 'Invalid or expired Microsoft Entra access token.',
        detail: this.tokenVerifier.buildTokenValidationDetail(token, error),
      });
    }
  }
}
