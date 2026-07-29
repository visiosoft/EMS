"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENGAGEMENT_STATUS_VALUES = void 0;
exports.normalizeEngagementStatus = normalizeEngagementStatus;
exports.ENGAGEMENT_STATUS_VALUES = [
    'Unknown',
    'Private',
    'Public',
    'Confirmed',
];
function normalizeEngagementStatus(raw) {
    const s = raw.trim();
    if (s === 'Unknown' || s === 'Private' || s === 'Public' || s === 'Confirmed')
        return s;
    return 'Unknown';
}
//# sourceMappingURL=engagement-status.util.js.map