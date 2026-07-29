"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireAccessLevel = exports.ACCESS_LEVEL_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.ACCESS_LEVEL_KEY = 'requiredAccessLevel';
const RequireAccessLevel = (level) => (0, common_1.SetMetadata)(exports.ACCESS_LEVEL_KEY, level);
exports.RequireAccessLevel = RequireAccessLevel;
//# sourceMappingURL=require-access-level.decorator.js.map