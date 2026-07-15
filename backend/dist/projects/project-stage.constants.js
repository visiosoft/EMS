"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PRIVATE_TICKETING_STATUS = exports.DEFAULT_PUBLIC_TICKETING_STATUS = exports.PERFORMANCE_TICKETING_STATUS_VALUES = exports.PROJECT_CONVERSION_REVIEW_STATUS = exports.OFFER_REVIEW_STATUS_VALUES = exports.PROJECT_STAGE_VALUES = void 0;
exports.isAllowedProjectStage = isAllowedProjectStage;
exports.isAllowedOfferReviewStatus = isAllowedOfferReviewStatus;
exports.isProjectConversionReview = isProjectConversionReview;
exports.isAllowedPerformanceTicketingStatus = isAllowedPerformanceTicketingStatus;
exports.isPublicTicketingStatus = isPublicTicketingStatus;
exports.PROJECT_STAGE_VALUES = [
    'Requested',
    'Drafted',
    'Submitted',
];
function isAllowedProjectStage(v) {
    return exports.PROJECT_STAGE_VALUES.includes(v);
}
exports.OFFER_REVIEW_STATUS_VALUES = [
    'In Consideration',
    'Declined',
    'Confirmed',
];
function isAllowedOfferReviewStatus(v) {
    return exports.OFFER_REVIEW_STATUS_VALUES.includes(v);
}
exports.PROJECT_CONVERSION_REVIEW_STATUS = 'Confirmed';
function isProjectConversionReview(v) {
    return v != null && v === exports.PROJECT_CONVERSION_REVIEW_STATUS;
}
exports.PERFORMANCE_TICKETING_STATUS_VALUES = [
    'Private (Not Announced)',
    'Public (Not On Sale)',
    'Public (On-Sale)',
    'Public (Season Ticket Sales Only)',
];
function isAllowedPerformanceTicketingStatus(v) {
    return exports.PERFORMANCE_TICKETING_STATUS_VALUES.includes(v);
}
function isPublicTicketingStatus(v) {
    if (!v)
        return false;
    return v.trim().toLowerCase().startsWith('public');
}
exports.DEFAULT_PUBLIC_TICKETING_STATUS = 'Public (Not On Sale)';
exports.DEFAULT_PRIVATE_TICKETING_STATUS = 'Private (Not Announced)';
//# sourceMappingURL=project-stage.constants.js.map