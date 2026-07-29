"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInternalHubEmailAllowed = isInternalHubEmailAllowed;
function isInternalHubEmailAllowed(email) {
    return String(email ?? '').trim().length > 0;
}
//# sourceMappingURL=internal-access.js.map