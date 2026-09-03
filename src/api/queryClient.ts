import { QueryClient, type Query } from '@tanstack/react-query';

/**
 * Shared React Query client + the app-wide "data changed" bus.
 *
 * Freshness policy (fixes "stale data until F5"):
 *  - Any successful write (POST/PATCH/PUT/DELETE through `apiFetch`) marks the
 *    whole cache stale, then refetches only the queries belonging to the view the
 *    user is actually looking at. Everything else refetches when its view is
 *    opened, or on next mount for screens that unmount (inner tabs).
 *  - Scoping matters: the EMS shell keeps every visited view mounted but hidden,
 *    so a naive "refetch all active queries" fires every list in every visited
 *    view at once — on this data set that is 5+ multi-second queries competing
 *    for the same backend, which is what made saves feel slow.
 *
 * This is deliberately key-agnostic: a save in one screen cannot be expected to
 * know the query keys of every other screen that renders the same record.
 *
 * Opt a query out with `meta: { skipGlobalInvalidate: true }`, or a single write
 * with `apiFetch(path, init, { refreshCache: false })`.
 */

const GLOBAL_INVALIDATE_DEBOUNCE_MS = 250;

/** Which EMS view each query was mounted under, so refetches can stay scoped to one screen. */
const viewByQueryHash = new Map<string, string>();
let activeViewKey = '';

export function setActiveViewKey(key: string): void {
  activeViewKey = key;
}

function belongsToActiveView(query: Query): boolean {
  return (viewByQueryHash.get(query.queryHash) ?? activeViewKey) === activeViewKey;
}

function isRefreshable(query: Query): boolean {
  return query.meta?.skipGlobalInvalidate !== true;
}

/** In-flight queries are skipped: they are already on their way to fresh data. */
function shouldRefetchNow(query: Query): boolean {
  return isRefreshable(query) && query.state.fetchStatus === 'idle' && belongsToActiveView(query);
}

let pendingInvalidate: ReturnType<typeof setTimeout> | null = null;

/** Called after every successful write; coalesces bursts (grid autosave, bulk edits). */
export function notifyDataMutated(): void {
  if (pendingInvalidate) clearTimeout(pendingInvalidate);
  pendingInvalidate = setTimeout(() => {
    pendingInvalidate = null;
    void queryClient.invalidateQueries({ predicate: isRefreshable, refetchType: 'none' });
    void queryClient.refetchQueries({ type: 'active', predicate: shouldRefetchNow });
  }, GLOBAL_INVALIDATE_DEBOUNCE_MS);
}

/** Called when the user switches EMS views; only that view's stale queries hit the network. */
export function refreshStaleQueries(): void {
  void queryClient.refetchQueries({ type: 'active', stale: true, predicate: shouldRefetchNow });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'observerAdded') {
    viewByQueryHash.set(event.query.queryHash, activeViewKey);
  } else if (event.type === 'removed') {
    viewByQueryHash.delete(event.query.queryHash);
  }
});
