"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIaeWaiverStatusAllowlist = getIaeWaiverStatusAllowlist;
const DEFAULT = [
    'Pending',
    'Submitted',
    'In review',
    'Approved',
    'Rejected',
    'Withdrawn',
    'N/A',
];
function parseEnv() {
    const raw = process.env.IAE_WAIVER_STATUS_OPTIONS?.trim();
    if (!raw)
        return [...DEFAULT];
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}
function getIaeWaiverStatusAllowlist() {
    const v = parseEnv();
    return v.length > 0 ? v : [...DEFAULT];
}
//# sourceMappingURL=iae-waiver-status.constants.js.map