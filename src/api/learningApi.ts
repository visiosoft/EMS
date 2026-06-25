import { apiFetch, apiFetchMultipart } from '@/api/config';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type LearningPlatform = {
  platformId: number;
  platformName: string;
  websiteUrl: string | null;
};

export type LearningCertification = {
  certificationId: number;
  title: string;
  description: string | null;
  platformId: number;
  platformName: string;
  departmentId: number;
  departmentName: string;
  difficultyLevel: string;
  pointsAwarded: number;
  estimatedDuration: string | null;
  externalCourseUrl: string | null;
  status: string;
  publishedAt: string | null;
  tags: string[];
};

export type LearningSubmission = {
  submissionId: number;
  certificationId: number;
  contactId: number;
  departmentId: number;
  certificationName: string;
  issuingOrganization: string | null;
  dateCompleted: string;
  credentialId: string | null;
  credentialUrl: string | null;
  additionalNotes: string | null;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  pointsAwarded: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
  adminNotes: string | null;
  submittedAt: string;
  employeeName: string;
  employeeRole: string | null;
  departmentName: string;
  platformName: string | null;
};

export type LearningSubmissionDetail = LearningSubmission & {
  documents: {
    documentId: number;
    fileName: string;
    fileType: string;
    fileSizeBytes: number | null;
    storagePath: string;
    uploadedAt: string;
  }[];
};

export type LearningEmployeeScore = {
  scoreId: number;
  contactId: number;
  departmentId: number;
  totalPoints: number;
  certsSubmitted: number;
  certsApproved: number;
  currentTier: string;
  lastActivityAt: string | null;
  employeeName: string;
  employeeRole: string | null;
  departmentName: string;
  rank: number;
};

export type LearningMyScore = {
  totalPoints: number;
  certsSubmitted: number;
  certsApproved: number;
  currentTier: string;
  lastActivityAt: string | null;
  rank: number;
};

export type LearningProgressItem = {
  progressId: number;
  certificationId: number;
  certificationTitle: string;
  status: string;
  progressPercent: number;
  startedAt: string | null;
  completedAt: string | null;
};

export type LearningProgressResponse = {
  items: LearningProgressItem[];
  summary: { completed: number; total: number; percent: number };
};

export type LearningPointTier = {
  tierId: number;
  tierName: string;
  minPoints: number;
  maxPoints: number | null;
  displayIcon: string | null;
  sortOrder: number;
};

export type LearningOverview = {
  totalEmployees: number;
  activeCertifications: number;
  totalSubmissions: number;
  pendingSubmissions: number;
};

// ═══════════════════════════════════════════════════════════════════════════
// PLATFORMS
// ═══════════════════════════════════════════════════════════════════════════
export function fetchLearningPlatforms(): Promise<LearningPlatform[]> {
  return apiFetch<LearningPlatform[]>('/internal/learning/platforms');
}

// ═══════════════════════════════════════════════════════════════════════════
// CERTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════
export function fetchLearningCertifications(params: {
  departmentId?: number;
  status?: string;
  level?: string;
  platformId?: number;
}): Promise<LearningCertification[]> {
  const sp = new URLSearchParams();
  if (params.departmentId) sp.set('departmentId', String(params.departmentId));
  if (params.status) sp.set('status', params.status);
  if (params.level) sp.set('level', params.level);
  if (params.platformId) sp.set('platformId', String(params.platformId));
  const qs = sp.toString();
  return apiFetch<LearningCertification[]>(`/internal/learning/certifications${qs ? `?${qs}` : ''}`);
}

export function fetchLearningCertificationById(id: number): Promise<LearningCertification> {
  return apiFetch<LearningCertification>(`/internal/learning/certifications/${id}`);
}

export function createLearningCertification(data: {
  title: string;
  description?: string;
  platformId: number;
  departmentId: number;
  difficultyLevel: string;
  pointsAwarded: number;
  estimatedDuration?: string;
  externalCourseUrl: string;
  tags?: string;
}): Promise<LearningCertification> {
  return apiFetch<LearningCertification>('/internal/learning/certifications', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateLearningCertification(
  id: number,
  data: Partial<{
    title: string;
    description: string;
    platformId: number;
    departmentId: number;
    difficultyLevel: string;
    pointsAwarded: number;
    estimatedDuration: string;
    externalCourseUrl: string;
    tags: string;
    status: string;
  }>,
): Promise<LearningCertification> {
  return apiFetch<LearningCertification>(`/internal/learning/certifications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function toggleLearningCertificationStatus(
  id: number,
): Promise<{ certificationId: number; status: string }> {
  return apiFetch<{ certificationId: number; status: string }>(
    `/internal/learning/certifications/${id}/toggle-status`,
    { method: 'PATCH' },
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBMISSIONS
// ═══════════════════════════════════════════════════════════════════════════
export function fetchLearningSubmissions(params: {
  departmentId?: number;
  contactId?: number;
  status?: string;
  search?: string;
}): Promise<LearningSubmission[]> {
  const sp = new URLSearchParams();
  if (params.departmentId) sp.set('departmentId', String(params.departmentId));
  if (params.contactId) sp.set('contactId', String(params.contactId));
  if (params.status) sp.set('status', params.status);
  if (params.search) sp.set('search', params.search);
  const qs = sp.toString();
  return apiFetch<LearningSubmission[]>(`/internal/learning/submissions${qs ? `?${qs}` : ''}`);
}

export function fetchLearningSubmissionById(id: number): Promise<LearningSubmissionDetail> {
  return apiFetch<LearningSubmissionDetail>(`/internal/learning/submissions/${id}`);
}

export function createLearningSubmission(data: {
  certificationId: number;
  departmentId: number;
  certificationName: string;
  issuingOrganization?: string;
  dateCompleted: string;
  credentialId?: string;
  credentialUrl?: string;
  additionalNotes?: string;
  contactId: number;
  certificateFile?: File;
}): Promise<LearningSubmissionDetail> {
  const formData = new FormData();
  formData.append('certificationId', String(data.certificationId));
  formData.append('departmentId', String(data.departmentId));
  formData.append('certificationName', data.certificationName);
  formData.append('dateCompleted', data.dateCompleted);
  formData.append('contactId', String(data.contactId));
  if (data.issuingOrganization) formData.append('issuingOrganization', data.issuingOrganization);
  if (data.credentialId) formData.append('credentialId', data.credentialId);
  if (data.credentialUrl) formData.append('credentialUrl', data.credentialUrl);
  if (data.additionalNotes) formData.append('additionalNotes', data.additionalNotes);
  if (data.certificateFile) formData.append('certificateFile', data.certificateFile);

  return apiFetchMultipart<LearningSubmissionDetail>('/internal/learning/submissions', {
    method: 'POST',
    body: formData,
  });
}

export function reviewLearningSubmission(
  id: number,
  data: { action: 'VERIFIED' | 'REJECTED'; adminNotes?: string; rejectionReason?: string },
): Promise<LearningSubmissionDetail> {
  return apiFetch<LearningSubmissionDetail>(`/internal/learning/submissions/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYEE SCORES
// ═══════════════════════════════════════════════════════════════════════════
export function fetchLearningEmployeeScores(departmentId: number): Promise<LearningEmployeeScore[]> {
  return apiFetch<LearningEmployeeScore[]>(`/internal/learning/scores?departmentId=${departmentId}`);
}

export function fetchMyLearningScore(contactId: number, departmentId: number): Promise<LearningMyScore> {
  return apiFetch<LearningMyScore>(
    `/internal/learning/scores/my?contactId=${contactId}&departmentId=${departmentId}`,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS
// ═══════════════════════════════════════════════════════════════════════════
export function fetchLearningProgress(
  contactId: number,
  departmentId: number,
): Promise<LearningProgressResponse> {
  return apiFetch<LearningProgressResponse>(
    `/internal/learning/progress?contactId=${contactId}&departmentId=${departmentId}`,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// POINT TIERS
// ═══════════════════════════════════════════════════════════════════════════
export function fetchLearningPointTiers(): Promise<LearningPointTier[]> {
  return apiFetch<LearningPointTier[]>('/internal/learning/tiers');
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW (Admin)
// ═══════════════════════════════════════════════════════════════════════════
export function fetchLearningOverview(departmentId: number): Promise<LearningOverview> {
  return apiFetch<LearningOverview>(`/internal/learning/overview?departmentId=${departmentId}`);
}
