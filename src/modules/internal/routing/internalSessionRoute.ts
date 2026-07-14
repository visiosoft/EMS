import { INTERNAL_ROOT } from "@/routing/paths";

export type EmployeeHandbookView = "services" | "index" | "introduction" | "section";

export const INTERNAL_SESSION_ROUTE_KEY = "iae-internal-session-route-v1";

export type InternalView =
  | "home"
  | "company-news"
  | "employee-services"
  | "employee-directory"
  | "employee-profile"
  | "leadership"
  | "markets"
  | "venues"
  | "attractions"
  | "departments"
  | "department"
  | "department-art-graphic-design"
  | "department-booking"
  | "department-event-business"
  | "department-marketing"
  | "department-production"
  | "department-ticketing-sales"
  | "learning-portal"
  | "learning-admin"
  | "document-library"
  | "my-profile"
  | "payroll-schedule"
  | "health-insurance";

export type InternalViewData = {
  handbook?: EmployeeHandbookView;
  handbookHash?: string;
  handbookSubsection?: string;
  fromView?: InternalView;
  fromTitle?: string;
  departmentId?: number;
  /** Employee Services: open with the employee directory panel expanded. */
  revealDirectory?: boolean;
  /** Employee profile: which employee's profile to show (directory → profile). */
  contactId?: number;
};

const VALID_VIEWS = new Set<string>([
  "home",
  "company-news",
  "employee-services",
  "employee-directory",
  "employee-profile",
  "leadership",
  "markets",
  "venues",
  "attractions",
  "departments",
  "department",
  "department-art-graphic-design",
  "department-booking",
  "department-event-business",
  "department-marketing",
  "department-production",
  "department-ticketing-sales",
  "learning-portal",
  "learning-admin",
  "document-library",
  "my-profile",
  "payroll-schedule",
  "health-insurance",
]);

const LEGACY_PATH_TO_VIEW: Record<string, InternalView> = {
  "/internal": "home",
  "/internal/": "home",
  "/internal/admin": "learning-admin",
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
  "/internal/learning-portal": "learning-portal",
  "/internal/my-profile": "my-profile",
  "/internal/payroll-schedule": "payroll-schedule",
  "/internal/health-insurance": "health-insurance",
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

  if (view === "learning-portal" || view === "learning-admin") {
    if (typeof obj.fromView === "string") out.fromView = obj.fromView as InternalView;
    if (typeof obj.fromTitle === "string") out.fromTitle = obj.fromTitle;
    if (typeof obj.departmentId === "number" && obj.departmentId > 0) out.departmentId = obj.departmentId;
    return out;
  }

  // Generic department detail view and legacy per-department views
  if (view === "department" || view.startsWith("department-")) {
    if (typeof obj.departmentId === "number" && obj.departmentId > 0) out.departmentId = obj.departmentId;
    return out;
  }

  if (view === "employee-profile") {
    if (typeof obj.contactId === "number" && obj.contactId > 0) out.contactId = obj.contactId;
    if (typeof obj.fromView === "string") out.fromView = obj.fromView as InternalView;
    return out;
  }

  if (view !== "employee-services") return out;

  const handbook = typeof obj.handbook === "string" ? obj.handbook.trim() : "";
  if (handbook === "services" || handbook === "index" || handbook === "section") {
    out.handbook = handbook;
  }

  const handbookHash = typeof obj.handbookHash === "string" ? normalizeHash(obj.handbookHash) : "";
  if (handbookHash) out.handbookHash = handbookHash.slice(0, 120);

  if (obj.revealDirectory === true) out.revealDirectory = true;

  if (!out.handbook && out.handbookHash) {
    const fromHash = handbookDataFromHash(`#${out.handbookHash}`);
    return { ...fromHash, handbookHash: out.handbookHash };
  }

  return out;
}

export function footerLabelToView(label: string): InternalView | null {
  return FOOTER_LABEL_TO_VIEW[label.toLowerCase()] ?? null;
}

export function handbookHashToViewData(hash: string): InternalViewData {
  return handbookDataFromHash(hash);
}

/** One-time read of a legacy deep link before the address bar is normalized to `/internal`. */
export function readLegacyInternalRoute(pathname: string, hash: string, search: string = ""): {
  view: InternalView;
  viewData: InternalViewData;
} {
  const pathView = LEGACY_PATH_TO_VIEW[pathname];
  const hashData = handbookDataFromHash(hash);
  const searchParams = new URLSearchParams(search);
  const viewData: InternalViewData = { ...hashData };

  if (searchParams.has("fromView")) {
    viewData.fromView = searchParams.get("fromView") as InternalView;
  }
  if (searchParams.has("fromTitle")) {
    viewData.fromTitle = searchParams.get("fromTitle") as string;
  }
  if (searchParams.has("departmentId")) {
    const parsed = Number(searchParams.get("departmentId"));
    if (Number.isFinite(parsed) && parsed > 0) viewData.departmentId = parsed;
  }

  // Handle ?view= query param (used for new-tab views like learning-admin)
  const viewParam = searchParams.get("view");
  if (viewParam && VALID_VIEWS.has(viewParam)) {
    return { view: viewParam as InternalView, viewData };
  }

  if (pathView === "employee-services") {
    return {
      view: "employee-services",
      viewData,
    };
  }

  if (pathView) {
    return { view: pathView, viewData };
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
export function normalizeInternalBrowserUrl(view?: InternalView) {
  if (typeof window === "undefined") return;
  const target = view === "learning-admin" ? "/internal/admin" : INTERNAL_ROOT;
  if (window.location.pathname !== target || window.location.search || window.location.hash) {
    window.history.replaceState({}, document.title, target);
  }
}
