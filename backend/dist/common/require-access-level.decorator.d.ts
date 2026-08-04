import { AccessLevel } from './access-level.enum';
export declare const ACCESS_LEVEL_KEY = "requiredAccessLevel";
export declare const RequireAccessLevel: (level: AccessLevel) => import("@nestjs/common").CustomDecorator<string>;
