"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEngagementDisplayTitle = buildEngagementDisplayTitle;
function buildEngagementDisplayTitle(attractionName, tourName, venueLabel) {
    if (!attractionName)
        return `${tourName} @ ${venueLabel}`;
    return `${attractionName} — ${tourName} @ ${venueLabel}`;
}
//# sourceMappingURL=engagement-display.util.js.map