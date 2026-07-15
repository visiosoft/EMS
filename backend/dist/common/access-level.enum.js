"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCESS_LEVEL_HIERARCHY = exports.AccessLevel = void 0;
exports.meetsAccessLevel = meetsAccessLevel;
var AccessLevel;
(function (AccessLevel) {
    AccessLevel["Employee"] = "Employee";
    AccessLevel["Administrator"] = "Administrator";
    AccessLevel["SuperAdmin"] = "Super Admin";
})(AccessLevel || (exports.AccessLevel = AccessLevel = {}));
exports.ACCESS_LEVEL_HIERARCHY = [
    AccessLevel.Employee,
    AccessLevel.Administrator,
    AccessLevel.SuperAdmin,
];
function meetsAccessLevel(userLevel, requiredLevel) {
    const userIdx = exports.ACCESS_LEVEL_HIERARCHY.indexOf(userLevel);
    const requiredIdx = exports.ACCESS_LEVEL_HIERARCHY.indexOf(requiredLevel);
    return userIdx >= requiredIdx;
}
//# sourceMappingURL=access-level.enum.js.map