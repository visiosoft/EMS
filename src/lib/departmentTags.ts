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
