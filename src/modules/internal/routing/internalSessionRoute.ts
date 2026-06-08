import { INTERNAL_ROOT } from "@/routing/paths";

export type EmployeeHandbookView = "services" | "index" | "introduction" | "section";

export const INTERNAL_SESSION_ROUTE_KEY = "iae-internal-session-route-v1";

export type InternalView =
  | "home"
  | "company-news"
  | "employee-services"
  | "leadership"
  | "markets"
  | "venues"
  | "attractions"
  | "departments"
  | "department-art-graphic-design"
  | "department-booking"
  | "department-event-business"
  | "department-marketing"
  | "department-production"
  | "department-ticketing-sales";

export type InternalViewData = {
  handbook?: EmployeeHandbookView;
  handbookHash?: string;
  handbookSubsection?: string;
};

const VALID_VIEWS = new Set<string>([
  "home",
  "company-news",
  "employee-services",
  "leadership",
  "markets",
  "venues",
  "attractions",
  "departments",
  "department-art-graphic-design",
  "department-booking",
  "department-event-business",
  "department-marketing",
  "department-production",
  "department-ticketing-sales",
]);

const LEGACY_PATH_TO_VIEW: Record<string, InternalView> = {
  "/internal": "home",
  "/internal/": "home",
  "/internal/company-news": "company-news",
  "/internal/news": "company-news",
  "/internal/employee-services": "employee-services",
  "/internal/leadership": "leadership",
  "/internal/markets": "markets",
  "/internal/venues": "venues",
  "/internal/attractions": "attractions",
  "/internal/departments": "departments",
  "/internal/departments/art-graphic-design": "department-art-graphic-design",
  "/internal/departments/booking": "department-booking",
  "/internal/departments/event-business": "department-event-business",
  "/internal/departments/marketing": "department-marketing",
  "/internal/departments/production": "department-production",
  "/internal/departments/ticketing-sales": "department-ticketing-sales",
};

const DEPARTMENT_TITLE_TO_VIEW: Record<string, InternalView> = {
  Art: "department-art-graphic-design",
  Events: "department-event-business",
  Booking: "department-booking",
  Marketing: "department-marketing",
  "Ticketing & Sales": "department-ticketing-sales",
  Production: "department-production",
};

const FOOTER_LABEL_TO_VIEW: Record<string, InternalView> = {
  "company news": "company-news",
  "employee services": "employee-services",
  leadership: "leadership",
  markets: "markets",
  venues: "venues",
  attractions: "attractions",
  departments: "departments",
  "employee handbook": "employee-services",
};

function normalizeHash(hash: string): string {
  return hash.replace(/^#/, "").trim();
}

function handbookDataFromHash(hash: string): InternalViewData {
  const normalized = normalizeHash(hash);
  if (!normalized) return {};
  if (normalized === "handbook") {
    return { handbook: "index", handbookHash: "handbook" };
  }
  return { handbook: "section", handbookHash: normalized };
}

function sanitizeViewData(view: InternalView, raw: unknown): InternalViewData {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: InternalViewData = {};

  if (view !== "employee-services") return out;

  const handbook = typeof obj.handbook === "string" ? obj.handbook.trim() : "";
  if (handbook === "services" || handbook === "index" || handbook === "section") {
    out.handbook = handbook;
  }

  const handbookHash = typeof obj.handbookHash === "string" ? normalizeHash(obj.handbookHash) : "";
  if (handbookHash) out.handbookHash = handbookHash.slice(0, 120);

  if (!out.handbook && out.handbookHash) {
    const fromHash = handbookDataFromHash(`#${out.handbookHash}`);
    return { ...fromHash, handbookHash: out.handbookHash };
  }

  return out;
}

export function departmentTitleToView(title: string): InternalView | null {
  return DEPARTMENT_TITLE_TO_VIEW[title] ?? null;
}

export function footerLabelToView(label: string): InternalView | null {
  return FOOTER_LABEL_TO_VIEW[label.toLowerCase()] ?? null;
}

export function handbookHashToViewData(hash: string): InternalViewData {
  return handbookDataFromHash(hash);
}

/** One-time read of a legacy deep link before the address bar is normalized to `/internal`. */
export function readLegacyInternalRoute(pathname: string, hash: string): {
  view: InternalView;
  viewData: InternalViewData;
} {
  const pathView = LEGACY_PATH_TO_VIEW[pathname];
  const hashData = handbookDataFromHash(hash);

  if (pathView === "employee-services") {
    return {
      view: "employee-services",
      viewData: { ...hashData },
    };
  }

  if (pathView) {
    return { view: pathView, viewData: {} };
  }

  return { view: "home", viewData: {} };
}

export function readStoredInternalRoute(): { view: InternalView; viewData: InternalViewData } | null {
  if (typeof window === "undefined") return null;
  try {
    const txt = window.sessionStorage.getItem(INTERNAL_SESSION_ROUTE_KEY);
    if (!txt) return null;
    const parsed = JSON.parse(txt) as { view?: unknown; viewData?: unknown };
    const view = typeof parsed.view === "string" ? parsed.view : "";
    if (!VALID_VIEWS.has(view)) return null;
    return {
      view: view as InternalView,
      viewData: sanitizeViewData(view as InternalView, parsed.viewData),
    };
  } catch {
    return null;
  }
}

export function writeStoredInternalRoute(view: InternalView, viewData: InternalViewData) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      INTERNAL_SESSION_ROUTE_KEY,
      JSON.stringify({ view, viewData: sanitizeViewData(view, viewData) }),
    );
  } catch {
    /* quota or private mode */
  }
}

/** Keep the browser on the hub root only — no child paths or hash fragments. */
export function normalizeInternalBrowserUrl() {
  if (typeof window === "undefined") return;
  const target = INTERNAL_ROOT;
  if (window.location.pathname !== target || window.location.search || window.location.hash) {
    window.history.replaceState({}, document.title, target);
  }
}
