import { useEffect, useState } from 'react';
import { getInitials } from '@/data/constants';

/**
 * Module-level cache: email → blob-URL (or empty string for known-missing photos).
 * Shared across all component instances so re-renders and tab switches don't re-fetch.
 */
const photoCache = new Map<string, string>();

/**
 * Batch queue: collects emails and resolves them in a single $batch call
 * so individual 404s never appear in the Network tab.
 */
let batchQueue: { email: string; resolve: (url: string) => void }[] = [];
let batchToken: string | null = null;
let batchTimer: ReturnType<typeof setTimeout> | null = null;

const BATCH_LIMIT = 20; // Graph $batch max requests per call

async function processBatch(token: string, items: typeof batchQueue) {
  const requests = items.map((item, i) => ({
    id: String(i),
    method: 'GET',
    url: `/users/${encodeURIComponent(item.email)}/photo/$value`,
  }));

  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/$batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      // Entire batch failed — mark all as missing
      for (const item of items) {
        photoCache.set(item.email.toLowerCase(), '');
        item.resolve('');
      }
      return;
    }

    const data = await response.json();
    const responsesById = new Map<string, any>();
    for (const r of data.responses ?? []) {
      responsesById.set(r.id, r);
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cacheKey = item.email.toLowerCase();
      const batchResp = responsesById.get(String(i));

      if (batchResp && batchResp.status === 200 && batchResp.body) {
        // Photo returned as base64 in the batch response body
        const contentType = batchResp.headers?.['Content-Type'] || 'image/jpeg';
        const blob = base64ToBlob(batchResp.body, contentType);
        const url = URL.createObjectURL(blob);
        photoCache.set(cacheKey, url);
        item.resolve(url);
      } else {
        photoCache.set(cacheKey, '');
        item.resolve('');
      }
    }
  } catch {
    for (const item of items) {
      photoCache.set(item.email.toLowerCase(), '');
      item.resolve('');
    }
  }
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: contentType });
}

function scheduleBatch() {
  if (batchTimer) return;
  batchTimer = setTimeout(() => {
    batchTimer = null;
    const token = batchToken;
    if (!token || batchQueue.length === 0) return;

    // Process in chunks of BATCH_LIMIT
    while (batchQueue.length > 0) {
      const chunk = batchQueue.splice(0, BATCH_LIMIT);
      processBatch(token, chunk);
    }
  }, 50); // Small delay to collect requests from multiple components mounting together
}

function fetchGraphPhoto(graphToken: string, email: string): Promise<string> {
  const cacheKey = email.toLowerCase();

  const cached = photoCache.get(cacheKey);
  if (cached !== undefined) return Promise.resolve(cached);

  batchToken = graphToken;

  return new Promise<string>((resolve) => {
    batchQueue.push({ email, resolve });
    scheduleBatch();
  });
}

type GraphAvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const sizeClasses: Record<GraphAvatarSize, string> = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-12 h-12 text-sm',
};

/**
 * Avatar that loads the Microsoft Entra profile photo for a user.
 * Falls back to colored initials if no Graph token is available, no email is
 * provided, or the photo fetch fails (e.g. user has no photo set).
 */
export function GraphAvatar({
  email,
  name,
  graphToken,
  size = 'sm',
  className = '',
}: {
  email?: string | null;
  name: string;
  graphToken?: string | null;
  size?: GraphAvatarSize;
  className?: string;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(() => {
    if (!email) return null;
    const cached = photoCache.get(email.toLowerCase());
    return cached || null;
  });

  useEffect(() => {
    if (!graphToken || !email) return;
    let mounted = true;
    fetchGraphPhoto(graphToken, email).then((url) => {
      if (mounted && url) setPhotoUrl(url);
    });
    return () => { mounted = false; };
  }, [graphToken, email]);

  const sizeClass = sizeClasses[size] ?? sizeClasses.sm;
  const colors = [
    'bg-ems-accent-dim text-ems-accent',
    'bg-ems-blue-dim text-ems-blue',
    'bg-ems-purple-dim text-ems-purple',
    'bg-ems-amber-dim text-ems-amber',
    'bg-ems-green-dim text-ems-green',
  ];
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${sizeClass} ${colors[idx]} rounded-full flex items-center justify-center font-semibold shrink-0 ${className}`}>
      {getInitials(name)}
    </div>
  );
}

/**
 * Hub/WMS-styled avatar: dark circle with white initials, or a profile photo.
 */
export function HubGraphAvatar({
  email,
  name,
  graphToken,
  size = 'sm',
  ringClass = '',
  className = '',
}: {
  email?: string | null;
  name: string;
  graphToken?: string | null;
  size?: GraphAvatarSize;
  ringClass?: string;
  className?: string;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(() => {
    if (!email) return null;
    const cached = photoCache.get(email.toLowerCase());
    return cached || null;
  });

  useEffect(() => {
    if (!graphToken || !email) return;
    let mounted = true;
    fetchGraphPhoto(graphToken, email).then((url) => {
      if (mounted && url) setPhotoUrl(url);
    });
    return () => { mounted = false; };
  }, [graphToken, email]);

  const sizeClass = sizeClasses[size] ?? sizeClasses.sm;

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover shrink-0 ring-2 ring-offset-2 ${ringClass} ${className}`}
      />
    );
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-neutral-900 font-bold text-white ring-2 ring-offset-2 ${ringClass} ${sizeClass} ${className}`}
    >
      {initials}
    </span>
  );
}
