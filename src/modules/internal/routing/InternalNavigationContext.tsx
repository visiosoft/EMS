import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import type { EmployeeHandbookView } from "../pages/EmployeeHandbookPage";
import {
  handbookHashToViewData,
  normalizeInternalBrowserUrl,
  readLegacyInternalRoute,
  readStoredInternalRoute,
  writeStoredInternalRoute,
  type InternalView,
  type InternalViewData,
} from "./internalSessionRoute";

type InternalNavigationContextValue = {
  currentView: InternalView;
  viewData: InternalViewData;
  navigate: (view: InternalView, data?: InternalViewData) => void;
  navigateHandbook: (hash: string) => void;
  openEmployeeHandbook: (handbook?: EmployeeHandbookView, handbookHash?: string, handbookSubsection?: string) => void;
};

const InternalNavigationContext = createContext<InternalNavigationContextValue | null>(null);

export function InternalNavigationProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [legacyConsumed, setLegacyConsumed] = useState(false);

  const [currentView, setCurrentView] = useState<InternalView>(() => {
    const legacy = readLegacyInternalRoute(location.pathname, location.hash, location.search);
    const stored = readStoredInternalRoute();
    if (legacy.view !== "home" || location.hash || location.search) return legacy.view;
    return stored?.view ?? legacy.view;
  });

  const [viewData, setViewData] = useState<InternalViewData>(() => {
    const legacy = readLegacyInternalRoute(location.pathname, location.hash, location.search);
    const stored = readStoredInternalRoute();
    if (legacy.view !== "home" || location.hash || location.search) return legacy.viewData;
    return stored?.viewData ?? legacy.viewData;
  });

  useEffect(() => {
    if (legacyConsumed) return;
    const legacy = readLegacyInternalRoute(location.pathname, location.hash, location.search);
    const hasLegacyPath =
      location.pathname !== "/internal" &&
      location.pathname !== "/internal/" &&
      location.pathname.startsWith("/internal");
    if (hasLegacyPath || location.hash || location.search) {
      setCurrentView(legacy.view);
      setViewData(legacy.viewData);
    }
    setLegacyConsumed(true);
    normalizeInternalBrowserUrl(legacy.view);
  }, [legacyConsumed, location.hash, location.pathname, location.search]);

  useEffect(() => {
    writeStoredInternalRoute(currentView, viewData);
    normalizeInternalBrowserUrl(currentView);
  }, [currentView, viewData]);

  const navigate = useCallback((view: InternalView, data: InternalViewData = {}) => {
    setCurrentView(view);
    setViewData(data);
  }, []);

  const openEmployeeHandbook = useCallback(
    (handbook: EmployeeHandbookView = "index", handbookHash?: string, handbookSubsection?: string) => {
      const data: InternalViewData = { handbook };
      if (handbookHash) data.handbookHash = handbookHash.replace(/^#/, "");
      if (handbookSubsection) data.handbookSubsection = handbookSubsection;
      navigate("employee-services", data);
    },
    [navigate],
  );

  const navigateHandbook = useCallback(
    (hash: string) => {
      const data = handbookHashToViewData(hash.startsWith("#") ? hash : `#${hash}`);
      navigate("employee-services", data.handbook ? data : { handbook: "index", handbookHash: "handbook" });
    },
    [navigate],
  );

  const value = useMemo(
    () => ({
      currentView,
      viewData,
      navigate,
      navigateHandbook,
      openEmployeeHandbook,
    }),
    [currentView, viewData, navigate, navigateHandbook, openEmployeeHandbook],
  );

  return (
    <InternalNavigationContext.Provider value={value}>{children}</InternalNavigationContext.Provider>
  );
}

export function useInternalNavigation() {
  const ctx = useContext(InternalNavigationContext);
  if (!ctx) {
    throw new Error("useInternalNavigation must be used within InternalNavigationProvider");
  }
  return ctx;
}
