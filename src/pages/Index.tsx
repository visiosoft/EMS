import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Sidebar, Header } from '@/components/ems/Layout';
import { ToastContainer } from '@/components/ems/Primitives';
import { CompaniesPage } from '@/components/ems/CompaniesPage';
import { ContactsPage } from '@/components/ems/ContactsPage';
import { useAccessLevel } from '@/hooks/useAccessLevel';
import { AttractionToursPage } from '@/components/ems/AttractionToursPage';
import { AttractionSalesDashboardPage } from '@/components/ems/AttractionSalesDashboardPage';
import { CalendarPage } from '@/components/ems/CalendarPage';
import { ProjectsPage, ProjectDetailPage } from '@/components/ems/ProjectsPage';
import { EngagementsPage } from '@/components/ems/EngagementsPage';
import { EngagementDetailPage } from '@/components/ems/EngagementDetailPage';
import { SettingsPage } from '@/components/ems/SettingsLookupTablesPage';
import { DailySalesPage } from '@/components/ems/DailySalesPage';
import { SalesSummaryPage } from '@/components/ems/SalesSummaryPage';
import { EngagementSalesDashboardPanel } from '@/components/ems/EngagementSalesDashboardPanel';
import { AllVenuesPage } from '@/components/ems/AllVenuesPage';
import { ProfilePage } from '@/components/ems/ProfilePage';
import { OrganizationalChartPage } from '@/components/ems/OrganizationalChartPage';
import { USERS } from '@/data/constants';
import type { ToastItem } from '@/components/ems/Primitives';
import { cn } from '@/lib/utils';

const SIDEBAR_COLLAPSED_KEY = 'iae-ems-sidebar-collapsed-v1';
const EMS_SAVED_VIEWS_ENABLED_KEY = 'iae-ems-saved-views-enabled-v1';
const ENGAGEMENTS_SORT_STATE_STORAGE_KEY = 'iae-engagements-sort-state-v1';
const PROJECTS_SORT_STATE_STORAGE_KEY = 'iae-projects-sort-state-v1';
const COMPANIES_SORT_STATE_STORAGE_KEY = 'iae-companies-sort-state-v1';
const ALL_VENUES_SORT_STATE_STORAGE_KEY = 'iae-all-venues-sort-state-v1';
const CALENDAR_LIST_SORT_STATE_STORAGE_KEY = 'iae-calendar-list-sort-state-v1';
const ATTRACTIONS_SORT_STATE_STORAGE_KEY = 'iae-attractions-sort-state-v1';
const TOURS_SORT_STATE_STORAGE_KEY = 'iae-tours-sort-state-v1';
const SALES_SUMMARY_SORT_STATE_STORAGE_KEY = 'iae-sales-summary-sort-state-v1';
const SETTINGS_LOOKUP_SORT_STORAGE_KEY = 'iae-settings-lookup-sort-state-v1';

/** Survives Ctrl+R in this tab; cleared when the tab closes — new visits start on Projects. */
const EMS_SESSION_ROUTE_KEY = 'iae-ems-session-route-v1';
const EMS_OPEN_INTENT_KEY = 'iae-ems-open-intent-v1';

const VALID_VIEWS = new Set([
  'companies',
  'contacts',
  'organization',
  'all-venues',
  'attraction-tours',
  'attraction-sales-summary',
  'calendar',
  'projects',
  'project-detail',
  'engagements',
  'daily-sales',
  'sales-summary',
  'engagement-sales-dashboard',
  'engagement-detail',
  'settings',
  'profile',
]);

const SALES_SUMMARY_RETURN_VIEWS = new Set(['daily-sales', 'projects', 'engagements', 'sales-summary']);
const ENGAGEMENT_TIMING_FILTERS = new Set(['all', 'upcoming', 'past']);
type EngagementTimingFilter = 'all' | 'upcoming' | 'past';
type ViewCacheEntry = {
  key: string;
  view: string;
  viewData: Record<string, unknown>;
};

function makeViewCacheKey(view: string, viewData: Record<string, unknown>): string {
  if (view === 'engagement-detail') {
    const id = parsePositiveIntId(viewData.engagementId);
    return `${view}:${id ?? 'none'}`;
  }
  if (view === 'engagement-sales-dashboard') {
    const eid = parsePositiveIntId(viewData.engagementId);
    const pid = parsePositiveIntId(viewData.performanceId);
    return `${view}:${eid ?? 'none'}:${pid ?? 'none'}`;
  }
  if (view === 'attraction-sales-summary') {
    const id = parsePositiveIntId(viewData.attractionId);
    return `${view}:${id ?? 'none'}`;
  }
  return view;
}

function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function readSavedViewsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(EMS_SAVED_VIEWS_ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

function parsePositiveIntId(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1 || String(Math.floor(n)) !== s) return null;
  return Math.floor(n);
}

function sanitizeViewDataForView(view: string, raw: unknown): Record<string, unknown> {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  if (view === 'engagement-detail') {
    const id = parsePositiveIntId(obj.engagementId);
    const out: Record<string, unknown> = {};
    if (id != null) out.engagementId = id;
    return out;
  }
  if (view === 'engagement-sales-dashboard') {
    const id = parsePositiveIntId(obj.engagementId);
    const out: Record<string, unknown> = {};
    if (id != null) out.engagementId = id;
    const pid = parsePositiveIntId(obj.performanceId);
    if (pid != null) out.performanceId = pid;
    const rv = typeof obj.returnView === 'string' ? obj.returnView.trim() : '';
    if (rv && SALES_SUMMARY_RETURN_VIEWS.has(rv)) out.returnView = rv;
    const asOf = typeof obj.initialAsOf === 'string' ? obj.initialAsOf.trim() : '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(asOf)) out.initialAsOf = asOf;
    return out;
  }
  if (view === 'attraction-sales-summary') {
    const id = parsePositiveIntId(obj.attractionId);
    const out: Record<string, unknown> = {};
    if (id != null) out.attractionId = id;
    const rv = typeof obj.returnView === 'string' ? obj.returnView.trim() : '';
    if (rv && SALES_SUMMARY_RETURN_VIEWS.has(rv)) out.returnView = rv;
    const asOf = typeof obj.initialAsOf === 'string' ? obj.initialAsOf.trim() : '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(asOf)) out.initialAsOf = asOf;
    return out;
  }
  if (view === 'engagements') {
    const out: Record<string, unknown> = {};
    if (typeof obj.statusFilter === 'string' && obj.statusFilter.trim()) {
      out.statusFilter = obj.statusFilter.trim().slice(0, 120);
    }
    if (typeof obj.timingFilter === 'string' && ENGAGEMENT_TIMING_FILTERS.has(obj.timingFilter.trim())) {
      out.timingFilter = obj.timingFilter.trim();
    }
    if (obj.createEngagement === true || obj.createEngagement === '1') {
      out.createEngagement = true;
    }
    if (obj.mineOnly === true || obj.mineOnly === '1') {
      out.mineOnly = true;
    }
    if (typeof obj.dateFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.dateFrom.trim())) {
      out.dateFrom = obj.dateFrom.trim();
    }
    if (typeof obj.dateTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.dateTo.trim())) {
      out.dateTo = obj.dateTo.trim();
    }
    return out;
  }
  if (view === 'companies' && obj.selectedCompanyId != null) {
    return { selectedCompanyId: obj.selectedCompanyId };
  }
  return {};
}

function readRouteFromUrl(): { view: string; viewData: Record<string, unknown> } | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view')?.trim() ?? '';
    if (!view || !VALID_VIEWS.has(view)) return null;

    const viewData = sanitizeViewDataForView(view, {
      statusFilter: params.get('statusFilter') ?? undefined,
      timingFilter: params.get('timingFilter') ?? undefined,
      createEngagement: params.get('createEngagement') === '1',
      mineOnly: params.get('mineOnly') === '1',
    });

    return { view, viewData };
  } catch {
    return null;
  }
}

function readAndConsumeOpenIntent(): { view: string; viewData: Record<string, unknown> } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(EMS_OPEN_INTENT_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(EMS_OPEN_INTENT_KEY);

    const parsed = JSON.parse(raw) as {
      view?: unknown;
      createEngagement?: unknown;
      timingFilter?: unknown;
      mineOnly?: unknown;
      dateFrom?: unknown;
      dateTo?: unknown;
      expiresAt?: unknown;
    };
    const expiresAt = typeof parsed.expiresAt === 'number' ? parsed.expiresAt : 0;
    const view = typeof parsed.view === 'string' ? parsed.view : '';
    if (Date.now() > expiresAt) return null;

    if (view === 'calendar' && VALID_VIEWS.has('calendar')) {
      return { view: 'calendar', viewData: {} };
    }

    if (view !== 'engagements') return null;

    return {
      view: 'engagements',
      viewData: sanitizeViewDataForView('engagements', {
        createEngagement: parsed.createEngagement === true,
        timingFilter: parsed.timingFilter,
        mineOnly: parsed.mineOnly === true,
        dateFrom: parsed.dateFrom,
        dateTo: parsed.dateTo,
      }),
    };
  } catch {
    return null;
  }
}

function readStoredSessionRoute(): { view: string; viewData: Record<string, unknown> } | null {
  if (typeof window === 'undefined') return null;
  try {
    const txt = window.sessionStorage.getItem(EMS_SESSION_ROUTE_KEY);
    if (!txt) return null;
    const parsed = JSON.parse(txt) as { view?: unknown; viewData?: unknown };
    const view = typeof parsed.view === 'string' ? parsed.view : '';
    if (!VALID_VIEWS.has(view)) return null;
    const viewData = sanitizeViewDataForView(view, parsed.viewData);
    if (view === 'engagement-detail' && viewData.engagementId == null) {
      return { view: 'engagements', viewData: {} };
    }
    if (view === 'engagement-sales-dashboard' && viewData.engagementId == null) {
      return { view: 'sales-summary', viewData: {} };
    }
    if (view === 'attraction-sales-summary' && viewData.attractionId == null) {
      return { view: 'daily-sales', viewData: {} };
    }
    return { view, viewData };
  } catch {
    return null;
  }
}

function writeStoredSessionRoute(view: string, viewData: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    const safe = sanitizeViewDataForView(view, viewData);
    window.sessionStorage.setItem(EMS_SESSION_ROUTE_KEY, JSON.stringify({ view, viewData: safe }));
  } catch {
    /* quota or private mode */
  }
}

const Index = () => {
  const initialRoute = useMemo(() => {
    const urlRoute = readRouteFromUrl();
    if (urlRoute) return urlRoute;
    const intentRoute = readAndConsumeOpenIntent();
    if (intentRoute) return intentRoute;
    const r = readStoredSessionRoute();
    return { view: r?.view ?? 'projects', viewData: r?.viewData ?? {} };
  }, []);

  const [currentView, setCurrentView] = useState(initialRoute.view);
  const [viewData, setViewData] = useState<Record<string, unknown>>(initialRoute.viewData);
  const [users, setUsers] = useState(USERS);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [savedViewsEnabled, setSavedViewsEnabled] = useState(readSavedViewsEnabled);
  const [savedViewCache, setSavedViewCache] = useState<ViewCacheEntry[]>([]);
  const [viewRenderEpoch, setViewRenderEpoch] = useState(0);
  const autoCreateEngagementHandledRef = useRef(false);
  const { isAdministrator, isLoading: accessLevelLoading } = useAccessLevel();

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        EMS_SAVED_VIEWS_ENABLED_KEY,
        savedViewsEnabled ? '1' : '0',
      );
    } catch {
      /* ignore */
    }
  }, [savedViewsEnabled]);

  useEffect(() => {
    if (!VALID_VIEWS.has(currentView)) return;
    writeStoredSessionRoute(currentView, viewData);
  }, [currentView, viewData]);

  useEffect(() => {
    if (!savedViewsEnabled) return;
    const key = makeViewCacheKey(currentView, viewData);
    setSavedViewCache((prev) => {
      const idx = prev.findIndex((entry) => entry.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], viewData };
        return next;
      }
      return [...prev, { key, view: currentView, viewData }];
    });
  }, [savedViewsEnabled, currentView, viewData]);

  useEffect(() => {
    if (currentView !== 'engagements' || viewData.createEngagement !== true) {
      autoCreateEngagementHandledRef.current = false;
      return;
    }
    if (autoCreateEngagementHandledRef.current) return;
    autoCreateEngagementHandledRef.current = true;

    let attempts = 0;
    let cancelled = false;
    let timeoutId: number | undefined;

    const openCreateEngagementModal = () => {
      if (cancelled) return;
      attempts += 1;
      const addButton = Array.from(document.querySelectorAll('button')).find((button) => {
        const text = button.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() ?? '';
        return text.includes('add engagement') && !button.hasAttribute('disabled');
      }) as HTMLButtonElement | undefined;

      if (addButton) {
        addButton.click();
        setViewData((previous) => {
          const next = { ...previous };
          delete next.createEngagement;
          return next;
        });
        if (window.location.pathname !== '/' || window.location.search) {
          window.history.replaceState({}, document.title, '/');
        }
        return;
      }

      if (attempts < 300) {
        timeoutId = window.setTimeout(openCreateEngagementModal, 100);
      }
    };

    timeoutId = window.setTimeout(openCreateEngagementModal, 0);

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [currentView, viewData.createEngagement]);

  const navigate = useCallback((view: string, data?: unknown) => {
    setCurrentView(view);
    setViewData((data as Record<string, unknown>) ?? {});
  }, []);

  const addToast = useCallback((
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    action?: { label: string; onClick: () => void },
  ) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, action }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const enableSavedViews = useCallback(() => {
    setSavedViewsEnabled(true);
    addToast('View memory enabled.', 'success');
  }, [addToast]);

  const resetSavedViews = useCallback(() => {
    setSavedViewsEnabled(false);
    setSavedViewCache([]);
    try {
      window.localStorage.removeItem(ENGAGEMENTS_SORT_STATE_STORAGE_KEY);
      window.localStorage.removeItem(PROJECTS_SORT_STATE_STORAGE_KEY);
      window.localStorage.removeItem(COMPANIES_SORT_STATE_STORAGE_KEY);
      window.localStorage.removeItem(ALL_VENUES_SORT_STATE_STORAGE_KEY);
      window.localStorage.removeItem(CALENDAR_LIST_SORT_STATE_STORAGE_KEY);
      window.localStorage.removeItem(ATTRACTIONS_SORT_STATE_STORAGE_KEY);
      window.localStorage.removeItem(TOURS_SORT_STATE_STORAGE_KEY);
      window.localStorage.removeItem(SALES_SUMMARY_SORT_STATE_STORAGE_KEY);
      window.localStorage.removeItem(SETTINGS_LOOKUP_SORT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setViewRenderEpoch((v) => v + 1);
    addToast('Saved views reset.', 'info');
  }, [addToast]);

  const renderView = useCallback(
    (view: string, data: Record<string, unknown>) => (
      <>
        {view === 'companies' && (
          <CompaniesPage
            addToast={addToast}
            onNavigate={navigate}
            initialSelectedCompanyId={
              (data.selectedCompanyId as string | number | undefined) ?? null
            }
          />
        )}

        {view === 'contacts' && <ContactsPage addToast={addToast} />}

        {view === 'organization' && <OrganizationalChartPage />}

        {view === 'all-venues' && <AllVenuesPage onNavigate={navigate} />}

        {view === 'attraction-tours' && (
          <AttractionToursPage addToast={addToast} onNavigate={navigate} />
        )}

        {view === 'attraction-sales-summary' && (() => {
          const raw = data.attractionId;
          const s = raw != null ? String(raw) : '';
          const n = Number(s);
          const ok = s !== '' && Number.isFinite(n) && String(n) === s && n >= 1;
          const rv =
            typeof data.returnView === 'string' && data.returnView.trim()
              ? data.returnView.trim()
              : 'daily-sales';
          const initialAsOfRaw = data.initialAsOf;
          const initialAsOf =
            typeof initialAsOfRaw === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(initialAsOfRaw.trim())
              ? initialAsOfRaw.trim()
              : undefined;
          if (ok) {
            return (
              <AttractionSalesDashboardPage
                attractionId={n}
                onNavigate={navigate}
                returnView={rv}
                initialAsOf={initialAsOf}
              />
            );
          }
          return (
            <div className="text-text-muted text-sm">
              Attraction not found. Open a sales summary from Daily Sales using an attraction in the current report.
            </div>
          );
        })()}

        {view === 'calendar' && <CalendarPage onNavigate={navigate} addToast={addToast} />}

        {view === 'projects' && (
          <ProjectsPage onNavigate={navigate} addToast={addToast} />
        )}

        {view === 'project-detail' && (
          <ProjectDetailPage onNavigate={navigate} addToast={addToast} />
        )}

        {view === 'engagements' && (
          <EngagementsPage
            onNavigate={navigate}
            statusFilter={data.statusFilter as string | undefined}
            timingFilter={data.timingFilter as EngagementTimingFilter | undefined}
            mineOnly={data.mineOnly as boolean | undefined}
            dateFrom={data.dateFrom as string | undefined}
            dateTo={data.dateTo as string | undefined}
            addToast={addToast}
          />
        )}

        {view === 'daily-sales' && (
          <DailySalesPage onNavigate={navigate} addToast={addToast} />
        )}

        {view === 'sales-summary' && (
          <SalesSummaryPage
            onOpenEngagement={(engagementId, performanceId) =>
              navigate('engagement-sales-dashboard', {
                engagementId,
                performanceId,
                returnView: 'sales-summary',
              })
            }
          />
        )}

        {view === 'engagement-sales-dashboard' && (() => {
          const raw = data.engagementId;
          const s = raw != null ? String(raw) : '';
          const n = Number(s);
          const ok = s !== '' && Number.isFinite(n) && String(n) === s && n >= 1;
          const rv =
            typeof data.returnView === 'string' && data.returnView.trim()
              ? data.returnView.trim()
              : 'sales-summary';
          const pidRaw = data.performanceId;
          const pidStr = pidRaw != null ? String(pidRaw) : '';
          const pidNum = Number(pidStr);
          const pid =
            pidStr !== '' && Number.isFinite(pidNum) && String(pidNum) === pidStr && pidNum >= 1
              ? pidNum
              : undefined;
          const initialAsOfRaw = data.initialAsOf;
          const initialAsOf =
            typeof initialAsOfRaw === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(initialAsOfRaw.trim())
              ? initialAsOfRaw.trim()
              : undefined;
          const backTitle = rv === 'sales-summary' ? 'Back to Sales Summary' : 'Back';
          if (ok) {
            return (
              <EngagementSalesDashboardPanel
                engagementId={n}
                performanceId={pid}
                initialAsOf={initialAsOf}
                backTitle={backTitle}
                onBack={() => navigate(rv)}
              />
            );
          }
          return (
            <div className="text-text-muted text-sm">
              Engagement not found. Open the sales summary again and pick a row.
            </div>
          );
        })()}

        {view === 'engagement-detail' && (() => {
          const raw = data.engagementId;
          const s = raw != null ? String(raw) : '';
          const n = Number(s);
          const isNumericApiId = s !== '' && Number.isFinite(n) && String(n) === s;
          if (isNumericApiId) {
            return (
              <EngagementDetailPage
                engagementId={n}
                onNavigate={navigate}
                addToast={addToast}
              />
            );
          }
          return <div className="text-text-muted text-sm">Engagement not found</div>;
        })()}

        {view === 'settings' && isAdministrator && (
          <SettingsPage
            addToast={addToast}
            users={users}
            onUpdateUsers={setUsers}
            initialMainTab="Users"
          />
        )}

        {view === 'settings' && !isAdministrator && !accessLevelLoading && (
          <div className="flex items-center justify-center h-64 text-text-muted text-sm">
            You do not have permission to access Settings. Administrator access is required.
          </div>
        )}

        {view === 'profile' && (
          <ProfilePage addToast={addToast} />
        )}
      </>
    ),
    [addToast, navigate, setUsers, users, isAdministrator, accessLevelLoading],
  );

  const getBreadcrumb = (): string[] => {
    const map: Record<string, string[]> = {
      companies:          ['Companies'],
      contacts:           ['Contacts'],
      organization:       ['Organization'],
      'all-venues':        ['All Venues'],
      'attraction-tours': ['Attraction Tours'],
      'attraction-sales-summary': ['Daily Sales', 'Attraction sales summary'],
      calendar:           ['Calendar'],
      projects:           ['Projects'],
      'project-detail':   ['Projects', 'Project detail'],
      engagements:        ['Engagements'],
      'daily-sales':      ['Daily Sales'],
      'sales-summary':    ['Sales Summary'],
      'engagement-sales-dashboard': ['Sales Summary', 'Sales trends'],
      'engagement-detail': ['Engagements', 'Engagement detail'],
      settings:           ['Settings'],
      profile:            ['My Profile'],
    };
    return map[currentView] ?? ['Projects'];
  };

  const sidebarView =
    currentView === 'project-detail'
      ? 'projects'
      : currentView === 'engagement-detail'
        ? 'engagements'
        : currentView === 'attraction-sales-summary'
          ? 'daily-sales'
          : currentView === 'engagement-sales-dashboard'
            ? 'sales-summary'
            : currentView;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        currentView={sidebarView}
        onNavigate={navigate}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div
        className={cn(
          'min-h-screen transition-[margin] duration-200 ease-out',
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60',
        )}
      >
        <Header
          breadcrumb={getBreadcrumb()}
          onMenuToggle={() => setMobileSidebarOpen(prev => !prev)}
          viewPersistenceEnabled={savedViewsEnabled}
          onEnableViewPersistence={enableSavedViews}
          onResetViewPersistence={resetSavedViews}
          onOpenProfile={() => navigate('profile')}
        />
        <main className="p-4 lg:p-6">
          {savedViewsEnabled ? (
            <>
              {savedViewCache.map((entry) => (
                <div
                  key={`${entry.key}:${viewRenderEpoch}`}
                  className={entry.key === makeViewCacheKey(currentView, viewData) ? 'block' : 'hidden'}
                >
                  {renderView(entry.view, entry.viewData)}
                </div>
              ))}
              {!savedViewCache.some(
                (entry) => entry.key === makeViewCacheKey(currentView, viewData),
              ) && (
                <div key={`active-fallback:${makeViewCacheKey(currentView, viewData)}:${viewRenderEpoch}`}>
                  {renderView(currentView, viewData)}
                </div>
              )}
            </>
          ) : (
            <div key={`${currentView}:${makeViewCacheKey(currentView, viewData)}:${viewRenderEpoch}`}>
              {renderView(currentView, viewData)}
            </div>
          )}
        </main>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default Index;
