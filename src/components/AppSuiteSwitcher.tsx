import { useEffect, useRef, useState } from "react";
import { Building2, ClipboardList, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { isEmsEnabled, isInternalEnabled } from "@/routing/appSuite";
import { EMS_ROOT, INTERNAL_HOME_PATH } from "@/routing/paths";

type AppSuiteKey = "ems" | "internal";
type AppSuiteSwitcherSurface = "light" | "dark";

interface AppSuiteSwitcherProps {
  surface?: AppSuiteSwitcherSurface;
  className?: string;
}

const APP_SWITCH_DELAY_MS = 340;

const APP_SUITES: Array<{
  key: AppSuiteKey;
  label: string;
  shortLabel: string;
  path: string;
  Icon: typeof ClipboardList;
}> = [
  {
    key: "ems",
    label: "Event Management",
    shortLabel: "EMS",
    path: EMS_ROOT,
    Icon: ClipboardList,
  },
  {
    key: "internal",
    label: "Company Hub",
    shortLabel: "Hub",
    path: INTERNAL_HOME_PATH,
    Icon: Building2,
  },
];

function getCurrentSuite(pathname: string): AppSuiteKey {
  return pathname.startsWith(INTERNAL_HOME_PATH) ? "internal" : "ems";
}

export function AppSuiteSwitcher({
  surface = "light",
  className,
}: AppSuiteSwitcherProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const timeoutRef = useRef<number | null>(null);
  const currentSuite = getCurrentSuite(location.pathname);
  const [switchingTo, setSwitchingTo] = useState<AppSuiteKey | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!isEmsEnabled() || !isInternalEnabled()) return null;

  const goToSuite = (suite: AppSuiteKey) => {
    if (suite === currentSuite || switchingTo) return;
    const next = APP_SUITES.find((item) => item.key === suite);
    if (!next) return;

    setSwitchingTo(suite);
    timeoutRef.current = window.setTimeout(() => {
      navigate(next.path);
    }, APP_SWITCH_DELAY_MS);
  };

  const isDark = surface === "dark";
  const target = switchingTo ? APP_SUITES.find((item) => item.key === switchingTo) : null;

  return (
    <>
      <div
        role="group"
        aria-label="Switch between Event Management and Company Hub"
        className={cn(
          "relative inline-grid h-9 w-[5.75rem] shrink-0 grid-cols-2 overflow-hidden rounded-full border p-0.5 shadow-sm",
          "transition-[background-color,border-color,box-shadow] duration-300 ease-out sm:w-[10.25rem]",
          isDark
            ? "border-white/20 bg-white/10 shadow-black/30"
            : "border-border bg-elevated/90 shadow-slate-900/5",
          className,
        )}
      >
        <span
          className={cn(
            "absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none",
            isDark
              ? "bg-white text-black shadow-white/10"
              : "bg-white text-ems-accent shadow-slate-900/10 ring-1 ring-border/60",
            currentSuite === "internal" && "translate-x-full",
          )}
          aria-hidden
        />

        {APP_SUITES.map(({ key, shortLabel, label, Icon }) => {
          const active = key === currentSuite;
          return (
            <button
              key={key}
              type="button"
              onClick={() => goToSuite(key)}
              aria-pressed={active}
              title={`Switch to ${label}`}
              className={cn(
                "relative z-10 inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-[11px] font-semibold",
                "transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ems-accent/35",
                active
                  ? isDark
                    ? "text-black"
                    : "text-ems-accent"
                  : isDark
                    ? "text-white/72 hover:text-white"
                    : "text-text-secondary hover:text-text-primary",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
              <span className="hidden truncate sm:inline">{shortLabel}</span>
              <span className="sr-only">{label}</span>
            </button>
          );
        })}
      </div>

      {target ? (
        <div
          className="pointer-events-none fixed inset-0 z-[9999] flex items-start justify-center bg-background/15 pt-16 backdrop-blur-[2px]"
          aria-hidden
        >
          <div
            className={cn(
              "app-suite-switch-card inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-2xl",
              isDark
                ? "border-white/20 bg-black/90 text-white shadow-black/50"
                : "border-border bg-white/95 text-text-primary shadow-slate-900/20",
            )}
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ems-accent-dim text-ems-accent">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span>Opening {target.label}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
