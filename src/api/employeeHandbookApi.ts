import { apiFetch } from '@/api/config';

export type HandbookContentBlock =
  | { kind: 'paragraph'; text: string; italic?: boolean }
  | { kind: 'heading'; text: string; italic?: boolean }
  | { kind: 'list'; items: string[] };

export type HandbookSubsection = {
  id: string;
  subsectionId: string;
  subsectionTitle: string | null;
  content: string;
  sortOrder: number;
};

export type HandbookSectionGrouped = {
  sectionNumber: number | null;
  sectionId: string;
  sectionTitle: string;
  heroTitle: string | null;
  subsections: HandbookSubsection[];
};

export type UpsertHandbookSectionPayload = {
  sectionNumber?: number;
  sectionId: string;
  sectionTitle: string;
  heroTitle?: string;
  subsectionId: string;
  subsectionTitle?: string;
  content: HandbookContentBlock[];
  apiResponse?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpsertHandbookSectionsPayload = {
  sections: UpsertHandbookSectionPayload[];
};

const HANDBOOK_ENDPOINT = '/internal/handbook';

export function fetchHandbookSections(): Promise<HandbookSectionGrouped[]> {
  return apiFetch<HandbookSectionGrouped[]>(`${HANDBOOK_ENDPOINT}/sections`);
}

export function fetchHandbookSection(sectionId: string): Promise<HandbookSectionGrouped[]> {
  return apiFetch<HandbookSectionGrouped[]>(`${HANDBOOK_ENDPOINT}/section?sectionId=${encodeURIComponent(sectionId)}`);
}

export function syncHandbookSections(payload: UpsertHandbookSectionsPayload): Promise<HandbookSectionGrouped[]> {
  return apiFetch<HandbookSectionGrouped[]>(`${HANDBOOK_ENDPOINT}/sync`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
