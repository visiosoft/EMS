/**
 * Builds the list of departments a person belongs to, for rendering one badge
 * per department: department 1 (the ContactAssignment department) followed by
 * department 2 (the Entra "Department2" custom attribute).
 *
 * Each value is taken whole. Nothing is split on commas — a department name can
 * legitimately contain one ("Art, Graphic Design"), and splitting would break it
 * into two badges.
 */
export function toDepartmentTags(...values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const value of values) {
    const name = (value ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(name);
  }

  return tags;
}

export type DepartmentBadge = {
  name: string;
  isSecondary: boolean;
};

/**
 * Returns independent badges for primary and secondary departments.
 * Splits comma-separated department names into individual badges.
 * If the secondary department already exists in primary (or is identical),
 * it is not duplicated as a separate badge.
 */
export function getDepartmentBadges(
  departmentName?: string | null,
  department2?: string | null,
): DepartmentBadge[] {
  const sec = (department2 ?? "").trim();
  const rawPrimary = (departmentName ?? "").trim();

  if (!rawPrimary && !sec) return [];

  // Split comma-separated department names
  const rawItems = rawPrimary
    ? rawPrimary.split(/,\s*/).map((s) => s.trim()).filter(Boolean)
    : [];

  const badges: DepartmentBadge[] = [];
  const seenLower = new Set<string>();

  // Filter out any primary items that match secondary department
  const primaryItems = rawItems.filter((item) => {
    if (sec && item.toLowerCase() === sec.toLowerCase()) {
      return false;
    }
    return true;
  });

  // Add primary department badges
  for (const item of primaryItems) {
    const key = item.toLowerCase();
    if (!seenLower.has(key)) {
      seenLower.add(key);
      badges.push({ name: item, isSecondary: false });
    }
  }

  // If primary list only matched secondary or was empty, add rawPrimary as primary badge
  if (badges.length === 0 && rawPrimary && sec && rawPrimary.toLowerCase() === sec.toLowerCase()) {
    badges.push({ name: rawPrimary, isSecondary: false });
    return badges;
  }

  // Add secondary department badge if non-empty and not already in primary badges
  if (sec && !seenLower.has(sec.toLowerCase())) {
    badges.push({ name: sec, isSecondary: true });
  }

  return badges;
}

export function getDepartmentFilterNames(
  departmentName?: string | null,
  department2?: string | null,
): string[] {
  const names = getDepartmentBadges(departmentName, department2).map((badge) => badge.name);
  return names.length > 0 ? names : ["Unassigned"];
}
