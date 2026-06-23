import { IaeLogoIcon } from "@/components/brand/IaeBrandMark";
import { InternalPageHero } from "../components/InternalPageHero";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import { IaeEmployeesTable } from "../components/IaeEmployeesTable";
import { EMPLOYEE_SERVICE_ITEMS, type EmployeeServiceItem } from "../constants/pageData";
import { useInternalNavigation } from "../routing/InternalNavigationContext";
import {
  EmployeeHandbookSectionPage,
  resolveEmployeeHandbookView,
} from "./EmployeeHandbookPage";

function resolveHandbookViewFromData(
  handbook?: string,
  handbookHash?: string,
): ReturnType<typeof resolveEmployeeHandbookView> {
  if (handbook === "index" || handbook === "section" || handbook === "services") {
    if (handbook !== "services") return handbook;
  }
  if (handbook === "introduction") return "section";
  if (handbookHash) return resolveEmployeeHandbookView(`#${handbookHash}`);
  return "services";
}

const TILE_INTERACTION_CLASS =
  "transition-all duration-300 hover:-translate-y-1 hover:bg-black hover:shadow-[0_20px_40px_rgba(0,0,0,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4";

const MOBILE_TILE_CLASS = `group flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-lg bg-[#0c0c0c] px-4 py-5 text-center text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] ${TILE_INTERACTION_CLASS}`;

const DESKTOP_TILE_CLASS = `group flex min-h-[246px] w-full flex-col items-center justify-center gap-5 rounded-lg bg-[#0c0c0c] px-6 py-9 text-center text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] ${TILE_INTERACTION_CLASS}`;

function ServiceTileIcon({ item, variant }: { item: EmployeeServiceItem; variant: "mobile" | "desktop" }) {
  if (item.companyMark) {
    return (
      <IaeLogoIcon
        surface="on-dark"
        className={variant === "mobile" ? "h-10 w-[4.5rem]" : "h-12 w-[5.25rem]"}
      />
    );
  }

  const Icon = item.icon;
  return (
    <Icon
      className={variant === "mobile" ? "h-12 w-12" : "h-[84px] w-[84px]"}
      strokeWidth={1.55}
      aria-hidden
    />
  );
}

function ServiceTileContent({
  item,
  variant,
}: {
  item: EmployeeServiceItem;
  variant: "mobile" | "desktop";
}) {
  return (
    <>
      <span
        className={
          variant === "mobile"
            ? "flex items-center justify-center rounded-xl bg-black/20 p-2.5 transition-transform duration-300 group-hover:scale-110"
            : "rounded-xl bg-black/20 p-3 transition-transform duration-300 group-hover:scale-110"
        }
        aria-hidden
      >
        <ServiceTileIcon item={item} variant={variant} />
      </span>
      <span
        className={
          variant === "mobile"
            ? "px-1 text-sm font-semibold leading-tight tracking-[0.02em]"
            : "text-base font-semibold tracking-[0.02em]"
        }
      >
        {item.title}
      </span>
    </>
  );
}

function HandbookWideBanner({
  item,
  onOpen,
}: {
  item: EmployeeServiceItem;
  onOpen: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex min-h-[126px] w-full items-center justify-center gap-5 rounded-lg bg-[#0c0c0c] px-8 py-6 text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] ${TILE_INTERACTION_CLASS}`}
    >
      <span className="rounded-xl bg-black/20 p-3 transition-transform duration-300 group-hover:scale-110" aria-hidden>
        <Icon className="h-[66px] w-[66px]" strokeWidth={1.55} />
      </span>
      <span className="text-lg font-semibold tracking-[0.02em]">{item.title}</span>
    </button>
  );
}

function ServiceTile({
  item,
  variant,
  index,
  onActivate,
}: {
  item: EmployeeServiceItem;
  variant: "mobile" | "desktop";
  index: number;
  onActivate: (item: EmployeeServiceItem) => void;
}) {
  const className = variant === "mobile" ? MOBILE_TILE_CLASS : DESKTOP_TILE_CLASS;
  const cardStyle = { animationDelay: `${index * 70}ms` };
  const content = <ServiceTileContent item={item} variant={variant} />;

  if (item.externalUrl) {
    return (
      <a key={item.title} href={item.externalUrl} target="_blank" rel="noreferrer" className={className} style={cardStyle}>
        {content}
      </a>
    );
  }

  return (
    <button key={item.title} type="button" onClick={() => onActivate(item)} className={className} style={cardStyle}>
      {content}
    </button>
  );
}

export function EmployeeServicesPage() {
  const { viewData, openEmployeeHandbook, navigate } = useInternalNavigation();
  const handbookView = resolveHandbookViewFromData(viewData.handbook, viewData.handbookHash);

  const handbookItem = EMPLOYEE_SERVICE_ITEMS.find((item) => item.handbookIndex);
  const standardServiceItems = EMPLOYEE_SERVICE_ITEMS.filter(
    (item) => !item.handbookIndex && !item.companyMark,
  );

  if (handbookView === "section" || handbookView === "index") {
    return (
      <EmployeeHandbookSectionPage
        handbookHash={handbookView === "index" ? "" : viewData.handbookHash}
        handbookSubsection={viewData.handbookSubsection}
      />
    );
  }

  const handleTileClick = (item: EmployeeServiceItem) => {
    if (item.handbookIndex) {
      openEmployeeHandbook("index");
      return;
    }
    if (item.handbookHash) {
      openEmployeeHandbook("section", item.handbookHash, item.handbookSubsection);
      return;
    }
    if (item.internalView) {
      navigate(item.internalView);
    }
  };

  const mobileItems = EMPLOYEE_SERVICE_ITEMS;

  return (
    <InternalPageFrame>
      <InternalPageHero
        title="Employee Services"
        subtitle="A dedicated space to connect with employees, discover profiles, and access people-related resources in one place."
      />

      <main className="mx-auto w-full max-w-[1060px] px-5 pb-16 pt-16 sm:px-8 sm:pt-20 lg:px-0">
        <section aria-label="Employee services resources">
          {/* Mobile: uniform 2-column tile grid (all six resources) */}
          <div className="grid grid-cols-2 gap-3 lg:hidden">
            {mobileItems.map((item, index) => (
              <ServiceTile
                key={item.title}
                item={item}
                variant="mobile"
                index={index}
                onActivate={handleTileClick}
              />
            ))}
          </div>

          {/* Desktop: wide handbook banner + four tiles in one row */}
          <div className="hidden space-y-3 lg:block">
            {handbookItem ? (
              <HandbookWideBanner item={handbookItem} onOpen={() => openEmployeeHandbook("index")} />
            ) : null}

            <div className="grid grid-cols-4 gap-3">
              {standardServiceItems.map((item, index) => (
                <ServiceTile
                  key={item.title}
                  item={item}
                  variant="desktop"
                  index={index + 1}
                  onActivate={handleTileClick}
                />
              ))}
            </div>
          </div>
        </section>

        <IaeEmployeesTable />
      </main>
    </InternalPageFrame>
  );
}
