import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { useTheme } from 'next-themes';
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ContactRound,
  Landmark,
  LineChart,
  LogOut,
  Map,
  Settings,
  Users,
  FolderKanban,
  Save,
  RotateCcw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Avatar } from './Primitives';
import { getAccountEmail, getAccountInitials, getAccountName, getActiveAccount } from '@/auth/entra';
import { IaeBrandMark } from '@/components/brand/IaeBrandMark';
import { cn } from '@/lib/utils';

export { IaeLogoFull } from '@/components/brand/IaeBrandMark';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /** Desktop (lg+) rail collapsed to icons only */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const NAV_ITEM_ICONS: Record<string, LucideIcon> = {
  projects: FolderKanban,
  engagements: Users,
  'daily-sales': LineChart,
  'sales-summary': ClipboardList,
  companies: Building2,
  contacts: ContactRound,
  'all-venues': Landmark,
  'attraction-tours': Map,
  calendar: CalendarDays,
  settings: Settings,
};

const NAV_SECTIONS = [
  {
    label: 'OPERATIONS',
    items: [
      { key: 'projects', label: 'Projects', icon: '⬡' },
      { key: 'engagements', label: 'Engagements', icon: '⬡' },
      { key: 'daily-sales', label: 'Daily Sales', icon: '⬡' },
      { key: 'sales-summary', label: 'Sales Summary', icon: '⬡' },
    ],
  },
  {
    label: 'Primary Data Library',
    items: [
      { key: 'companies', label: 'Companies', icon: '⬡' },
      { key: 'contacts', label: 'Contacts', icon: '⬡' },
      { key: 'all-venues', label: 'All Venues', icon: '⬡' },
      { key: 'attraction-tours', label: 'Attraction Tours', icon: '⬡' },
      { key: 'calendar', label: 'Calendar', icon: '⬡' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [{ key: 'settings', label: 'Settings', icon: '⬡' }],
  },
];

export function Sidebar({
  currentView,
  onNavigate,
  mobileOpen,
  onMobileClose,
  collapsed = false,
  onCollapsedChange,
}: SidebarProps) {
  const { accounts, instance } = useMsal();
  const account = getActiveAccount() ?? accounts[0] ?? null;
  const displayName = getAccountName(account);
  const email = getAccountEmail(account) || 'Signed in with Microsoft Entra ID';

  const handleNav = (key: string) => {
    onNavigate(key);
    onMobileClose?.();
  };

  const desktopCollapsed = Boolean(collapsed);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <div
        className={cn(
          'h-screen bg-surface border-r border-border flex flex-col fixed left-0 top-0 z-40',
          'min-w-0 overflow-x-hidden overflow-y-hidden',
          'transition-[width,transform] duration-200 ease-out',
          'w-[min(15rem,85vw)] max-lg:shadow-lg',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          desktopCollapsed ? 'lg:w-16 lg:min-w-[4rem]' : 'lg:w-60 lg:min-w-[15rem]',
        )}
      >
        <div
          className={cn(
            'h-14 flex items-center border-b border-border shrink-0 px-4 gap-2 min-w-0',
            desktopCollapsed
              ? 'lg:h-auto lg:flex-col lg:justify-center lg:px-0 lg:py-3 lg:gap-2'
              : 'justify-between',
          )}
        >
          <div
            className={cn(
              'flex items-center gap-2 min-w-0',
              desktopCollapsed && 'lg:flex-col lg:justify-center',
            )}
          >
            <IaeBrandMark collapseLabelsOnDesktop={desktopCollapsed} />
          </div>
          {onCollapsedChange && (
            <button
              type="button"
              onClick={() => onCollapsedChange(!desktopCollapsed)}
              className={cn(
                'rounded-md border border-border bg-elevated text-text-secondary hover:bg-hover hover:text-text-primary transition-colors',
                'p-2 shrink-0 max-lg:hidden',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ems-accent/35',
              )}
              title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!desktopCollapsed}
              aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {desktopCollapsed ? (
                <ChevronRight className="h-4 w-4" aria-hidden />
              ) : (
                <ChevronLeft className="h-4 w-4" aria-hidden />
              )}
            </button>
          )}
        </div>

        <nav
          className={cn(
            'flex-1 min-h-0 min-w-0 py-2',
            'overflow-y-auto overflow-x-hidden',
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            desktopCollapsed && 'lg:px-1.5',
          )}
        >
          {NAV_SECTIONS.map(section => (
            <div key={section.label} className="mb-1">
              <div
                className={cn(
                  'px-4 py-2 text-[10px] font-semibold text-text-muted tracking-wider uppercase',
                  desktopCollapsed && 'lg:hidden',
                )}
              >
                {section.label}
              </div>
              {section.items.map(item => {
                const isActive = currentView === item.key || (item.key === 'dashboard' && currentView === 'dashboard');
                const Icon = NAV_ITEM_ICONS[item.key] ?? CalendarDays;
                return (
                  <button
                    key={item.key}
                    type="button"
                    title={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => handleNav(item.key)}
                    className={cn(
                      'w-full text-sm flex items-center gap-2 transition-colors',
                      'px-4 py-2 max-lg:text-left',
                      desktopCollapsed && 'lg:justify-center lg:px-0 lg:py-2.5',
                      isActive
                        ? 'bg-ems-accent-dim text-ems-accent border-l-[3px] border-l-ems-accent lg:border-l-0 lg:rounded-md'
                        : 'text-text-secondary hover:bg-hover hover:text-text-primary border-l-[3px] border-l-transparent lg:border-l-0',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span className={cn('truncate', desktopCollapsed && 'lg:sr-only')}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div
          className={cn(
            'p-4 border-t border-border shrink-0 w-full min-w-0 overflow-x-hidden',
            desktopCollapsed && 'lg:p-2 lg:flex lg:flex-col lg:items-center lg:gap-2',
          )}
        >
          <div
            className={cn(
              'flex items-center gap-2 w-full min-w-0',
              desktopCollapsed && 'lg:flex-col lg:gap-1',
            )}
          >
            <Avatar name={displayName} size="sm" />
            <div className={cn('min-w-0', desktopCollapsed && 'lg:hidden')}>
              <div className="text-xs text-text-primary font-medium truncate">{displayName}</div>
              <div className="text-[10px] text-text-muted truncate">{email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void instance.logoutRedirect()}
            title="Sign out"
            aria-label="Sign out"
            className={cn(
              'mt-3 w-full rounded-md border border-border bg-elevated text-xs font-medium text-text-secondary hover:bg-hover hover:text-text-primary',
              'px-3 py-2 inline-flex items-center justify-center gap-2',
              desktopCollapsed && 'lg:mt-0 lg:p-2 lg:w-auto lg:aspect-square',
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            <span className={cn(desktopCollapsed && 'lg:sr-only')}>Sign out</span>
          </button>
        </div>
      </div>
    </>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div
        className="rounded-full bg-elevated border border-border"
        style={{ width: 52, height: 26 }}
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme !== 'light';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: 52,
        height: 26,
        borderRadius: 13,
        border: 'none',
        cursor: 'pointer',
        outline: 'none',
        padding: 0,
        backgroundColor: isDark ? 'hsl(223 35% 19%)' : 'hsl(208 75% 76%)',
        transition: 'background-color 0.4s ease',
        flexShrink: 0,
      }}
      onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 2px hsl(var(--ems-accent) / 0.4)')}
      onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      {isDark && (
        <>
          <span style={{ position: 'absolute', top: 5, left: 6, width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.65)', pointerEvents: 'none' }} />
          <span style={{ position: 'absolute', top: 14, left: 10, width: 1.5, height: 1.5, borderRadius: '50%', background: 'rgba(255,255,255,0.45)', pointerEvents: 'none' }} />
          <span style={{ position: 'absolute', top: 8, left: 14, width: 1.5, height: 1.5, borderRadius: '50%', background: 'rgba(255,255,255,0.55)', pointerEvents: 'none' }} />
        </>
      )}
      {!isDark && (
        <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 9, height: 9, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.7)', pointerEvents: 'none' }} />
      )}
      <span
        className="theme-toggle-thumb"
        style={{
          position: 'absolute',
          width: 22,
          height: 22,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isDark ? 'translateX(27px)' : 'translateX(2px)',
          backgroundColor: isDark ? 'hsl(228 40% 28%)' : '#ffffff',
          boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.6)' : '0 1px 4px rgba(0,0,0,0.18)',
        }}
      >
        {isDark ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#93b8f5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#e08800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
      </span>
    </button>
  );
}

interface HeaderProps {
  breadcrumb: string[];
  onSearch?: (q: string) => void;
  onMenuToggle?: () => void;
  viewPersistenceEnabled?: boolean;
  onEnableViewPersistence?: () => void;
  onResetViewPersistence?: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Header({
  breadcrumb,
  onMenuToggle,
  viewPersistenceEnabled = false,
  onEnableViewPersistence,
  onResetViewPersistence,
}: HeaderProps) {
  const { accounts } = useMsal();
  const account = getActiveAccount() ?? accounts[0] ?? null;
  const displayName = getAccountName(account);
  const email = getAccountEmail(account) || 'Microsoft Entra ID';
  const greeting = getGreeting();

  return (
    <div className="h-14 bg-surface border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md hover:bg-hover text-text-secondary hover:text-text-primary transition-colors shrink-0"
          aria-label="Toggle menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex items-center gap-1 text-sm truncate">
          {breadcrumb.map((b, i) => (
            <span key={i} className={i === breadcrumb.length - 1 ? 'text-text-primary font-medium truncate' : 'text-text-muted hidden sm:inline'}>
              {i > 0 && <span className="text-text-muted mx-1 hidden sm:inline">/</span>}
              {b}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onEnableViewPersistence}
          className={cn(
            'h-8 w-8 rounded-md border flex items-center justify-center transition-colors',
            viewPersistenceEnabled
              ? 'border-ems-accent bg-ems-accent-dim text-ems-accent'
              : 'border-border bg-elevated text-text-secondary hover:bg-hover hover:text-text-primary',
          )}
          title="Save current views"
          aria-label="Save current views"
        >
          <Save className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onResetViewPersistence}
          className="h-8 w-8 rounded-md border border-border bg-elevated text-text-secondary hover:bg-hover hover:text-text-primary flex items-center justify-center transition-colors"
          title="Reset saved views"
          aria-label="Reset saved views"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
        </button>
        <div className="text-right hidden md:block">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-text-secondary">{greeting},</span>
            <span className="text-sm font-semibold text-text-primary truncate max-w-44">{displayName}</span>
          </div>
          <div className="text-[11px] text-text-muted leading-none mt-0.5 truncate max-w-52">
            {email}
          </div>
        </div>
        <ThemeToggle />
        <div className="w-8 h-8 rounded-full bg-ems-accent-dim border border-ems-accent/30 flex items-center justify-center text-ems-accent text-xs font-bold select-none">
          {getAccountInitials(account)}
        </div>
      </div>
    </div>
  );
}
