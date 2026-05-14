import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar, Header } from '@/components/ems/Layout';
import { ToastContainer } from '@/components/ems/Primitives';
import { CompaniesPage } from '@/components/ems/CompaniesPage';
import { AttractionToursPage } from '@/components/ems/AttractionToursPage';
import { AttractionSalesDashboardPage } from '@/components/ems/AttractionSalesDashboardPage';
import { CalendarPage } from '@/components/ems/CalendarPage';
import { ProjectsPage, ProjectDetailPage } from '@/components/ems/ProjectsPage';
import { EngagementsPage } from '@/components/ems/EngagementsPage';
import { EngagementDetailPage } from '@/components/ems/EngagementDetailPage';
import { SettingsPage } from '@/components/ems/SettingsLookupTablesPage';
import { DailySalesPage } from '@/components/ems/DailySalesPage';
import { AllVenuesPage } from '@/components/ems/AllVenuesPage';
import { USERS } from '@/data/constants';
import type { ToastItem } from '@/components/ems/Primitives';
import { cn } from '@/lib/utils';

const SIDEBAR_COLLAPSED_KEY = 'iae-ems-sidebar-collapsed-v1';

function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

const Index = () => {
  const [currentView, setCurrentView] = useState('projects');
  const [viewData, setViewData] = useState<Record<string, unknown>>({});
  const [users, setUsers] = useState(USERS);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  const navigate = useCallback((view: string, data?: Record<string, unknown>) => {
    setCurrentView(view);
    setViewData(data ?? {});
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

  const getBreadcrumb = (): string[] => {
    const map: Record<string, string[]> = {
      companies:          ['Companies'],
      'all-venues':        ['All Venues'],
      'attraction-tours': ['Attraction Tours'],
      'attraction-sales-summary': ['Daily Sales', 'Attraction sales summary'],
      calendar:           ['Calendar'],
      projects:           ['Projects'],
      'project-detail':   ['Projects', 'Project detail'],
      engagements:        ['Engagements'],
      'daily-sales':      ['Daily Sales'],
      'engagement-detail': ['Engagements', 'Engagement detail'],
      settings:           ['Settings'],
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
        <Header breadcrumb={getBreadcrumb()} onMenuToggle={() => setMobileSidebarOpen(prev => !prev)} />
        <main className="p-4 lg:p-6">

          {currentView === 'companies' && (
            <CompaniesPage
              addToast={addToast}
              initialSelectedCompanyId={
                (viewData.selectedCompanyId as string | number | undefined) ?? null
              }
            />
          )}

          {currentView === 'all-venues' && <AllVenuesPage onNavigate={navigate} />}

          {currentView === 'attraction-tours' && (
            <AttractionToursPage addToast={addToast} />
          )}

          {currentView === 'attraction-sales-summary' && (() => {
            const raw = viewData.attractionId;
            const s = raw != null ? String(raw) : '';
            const n = Number(s);
            const ok = s !== '' && Number.isFinite(n) && String(n) === s && n >= 1;
            const rv =
              typeof viewData.returnView === 'string' && viewData.returnView.trim()
                ? viewData.returnView.trim()
                : 'daily-sales';
            if (ok) {
              return (
                <AttractionSalesDashboardPage
                  attractionId={n}
                  onNavigate={navigate}
                  returnView={rv}
                />
              );
            }
            return (
              <div className="text-text-muted text-sm">
                Attraction not found. Open a sales summary from Daily Sales using an attraction in the current report.
              </div>
            );
          })()}

          {currentView === 'calendar' && <CalendarPage onNavigate={navigate} addToast={addToast} />}

          {currentView === 'projects' && (
            <ProjectsPage onNavigate={navigate} addToast={addToast} />
          )}

          {currentView === 'project-detail' && (
            <ProjectDetailPage onNavigate={navigate} addToast={addToast} />
          )}

          {currentView === 'engagements' && (
            <EngagementsPage
              onNavigate={navigate}
              statusFilter={viewData.statusFilter as string | undefined}
              addToast={addToast}
            />
          )}

          {currentView === 'daily-sales' && (
            <DailySalesPage onNavigate={navigate} addToast={addToast} />
          )}

          {currentView === 'engagement-detail' && (() => {
            const raw = viewData.engagementId;
            const s = raw != null ? String(raw) : '';
            const n = Number(s);
            const isNumericApiId = s !== '' && Number.isFinite(n) && String(n) === s;
            if (isNumericApiId) {
              return (
                <EngagementDetailPage
                  engagementId={n}
                  onNavigate={navigate}
                  addToast={addToast}
                  initialTab={viewData.initialTab as string | undefined}
                />
              );
            }
            return <div className="text-text-muted text-sm">Engagement not found</div>;
          })()}

          {currentView === 'settings' && (
            <SettingsPage
              addToast={addToast}
              users={users}
              onUpdateUsers={setUsers}
              initialMainTab="Users"
            />
          )}

        </main>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default Index;
