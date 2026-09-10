function toUrlObject(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    /* not absolute — try resolving against the current origin below */
  }
  try {
    return new URL(raw, window.location.origin);
  } catch {
    return null;
  }
}

/** Derive a short, human-friendly label (e.g. a file name) from a stored link URL. */
export function extractLinkDisplayName(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  const url = toUrlObject(trimmed);
  if (!url) return trimmed;

  // Uploads/picks embed the original file name in the fragment (see withLinkDisplayName).
  if (url.hash.length > 1) {
    const fromHash = new URLSearchParams(url.hash.slice(1)).get('name');
    if (fromHash) return fromHash;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (last) {
    try {
      return decodeURIComponent(last);
    } catch {
      return last;
    }
  }
  return url.hostname || trimmed;
}

/** Embed the original file name in a link's fragment so the friendly name survives reloads. */
export function withLinkDisplayName(url: string, fileName: string): string {
  const trimmedName = fileName.trim();
  if (!trimmedName) return url;
  const separator = url.includes('#') ? '&' : '#';
  return `${url}${separator}name=${encodeURIComponent(trimmedName)}`;
}

// Longest/most specific patterns first so e.g. "Link to PDF of X" doesn't stop at "Link to X".
const LINK_NAME_PREFIX_PATTERNS = [
  /^link to pdf of\s+/i,
  /^link to\s+/i,
  /^upload\s+/i,
];

/** Strip filler phrasing (e.g. "Link to PDF of") from a field label to get a short link name. */
export function deriveLinkFieldName(label: string): string {
  const trimmed = label.trim();
  for (const pattern of LINK_NAME_PREFIX_PATTERNS) {
    const stripped = trimmed.replace(pattern, '').trim();
    if (stripped && stripped !== trimmed) return stripped;
  }
  return trimmed;
}
