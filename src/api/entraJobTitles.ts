import { acquireGraphAccessToken } from '@/auth/entra';
import { getActiveAccount } from '@/auth/entra';

export type EntraJobTitleMap = Map<string, string>;

/**
 * Fetches all Entra user job titles via Microsoft Graph.
 * Returns a Map keyed by lowercase email → jobTitle.
 * If the token is already available, pass it in to avoid re-acquisition.
 */
export async function fetchEntraJobTitles(
  graphToken?: string | null,
): Promise<EntraJobTitleMap> {
  let token = graphToken;
  if (!token) {
    const account = getActiveAccount();
    if (!account) return new Map();
    try {
      token = await acquireGraphAccessToken(account);
    } catch {
      return new Map();
    }
  }

  const map = new Map<string, string>();
  let nextUrl: string | null =
    'https://graph.microsoft.com/v1.0/users?$select=mail,userPrincipalName,jobTitle&$top=999';

  try {
    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) break;

      const payload = (await res.json()) as {
        value?: Array<{
          mail?: string;
          userPrincipalName?: string;
          jobTitle?: string;
        }>;
        '@odata.nextLink'?: string;
      };

      for (const user of payload.value ?? []) {
        const email = (user.mail ?? user.userPrincipalName ?? '')
          .trim()
          .toLowerCase();
        const title = (user.jobTitle ?? '').trim();
        if (email && title) {
          map.set(email, title);
        }
      }

      nextUrl = payload['@odata.nextLink'] ?? null;
    }
  } catch {
    // best-effort
  }

  return map;
}
