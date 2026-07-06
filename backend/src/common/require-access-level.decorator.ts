import { SetMetadata } from '@nestjs/common';
import { AccessLevel } from './access-level.enum';

export const ACCESS_LEVEL_KEY = 'requiredAccessLevel';

/**
 * Decorator to set the minimum access level required for a route or controller.
 *
 * Usage:
 *   @RequireAccessLevel(AccessLevel.Administrator)
 *   @Get('some-admin-only-endpoint')
 *   someEndpoint() { ... }
 */
export const RequireAccessLevel = (level: AccessLevel) =>
  SetMetadata(ACCESS_LEVEL_KEY, level);
