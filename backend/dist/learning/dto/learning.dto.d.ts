export declare class CreateCertificationDto {
    title: string;
    description?: string;
    platformId: number;
    departmentId: number;
    difficultyLevel: string;
    pointsAwarded: number;
    estimatedDuration?: string;
    externalCourseUrl?: string;
    tags?: string;
}
export declare class UpdateCertificationDto {
    title?: string;
    description?: string;
    platformId?: number;
    departmentId?: number;
    difficultyLevel?: string;
    pointsAwarded?: number;
    estimatedDuration?: string;
    externalCourseUrl?: string;
    tags?: string;
    status?: string;
}
export declare class CreateSubmissionDto {
    certificationId?: number;
    departmentId: number;
    contactId: number;
    certificationName: string;
    issuingOrganization?: string;
    dateCompleted: string;
    credentialId?: string;
    credentialUrl?: string;
    additionalNotes?: string;
}
export declare class ReviewSubmissionDto {
    action: string;
    adminNotes?: string;
    rejectionReason?: string;
}
