import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IaeLogoIcon } from "@/components/brand/IaeBrandMark";
import { INTERNAL_NAV_ITEMS } from "../constants/navigation";
import { useInternalNavigation } from "../routing/InternalNavigationContext";

export function InternalHeader() {
  const { currentView, navigate } = useInternalNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function isActive(itemKey: string) {
    if (itemKey === "employee-services") return currentView === "employee-services";
    if (itemKey === "leadership") return currentView === "leadership";
    if (itemKey === "markets") return currentView === "markets";
    if (itemKey === "venues") return currentView === "venues";
    if (itemKey === "attractions") return currentView === "attractions";
    if (itemKey === "departments") {
      return currentView === "departments" || currentView.startsWith("department-");
    }
    return false;
  }

  const activeItemLabel = useMemo(() => {
    const match = INTERNAL_NAV_ITEMS.find((item) => isActive(item.key));
    return match?.label ?? "Company Hub";
  }, [currentView]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentView]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  const navButtonClass = (active: boolean) =>
    cn(
      "whitespace-nowrap border-b-2 border-transparent pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/78 transition-colors hover:border-white/70 hover:text-white",
      active && "border-white text-white",
    );

  const mobileButtonClass = (active: boolean) =>
    cn(
      "flex min-h-12 w-full items-center justify-between rounded-md border px-4 py-3 text-sm font-semibold transition-all",
      active
        ? "border-white bg-white text-black"
        : "border-white/20 bg-white/5 text-white hover:border-white/45 hover:bg-white/10",
    );

  return (
    <header className="sticky top-0 z-50 bg-black text-white shadow-[0_1px_0_rgba(255,255,255,0.08)]">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[56px] items-center justify-between gap-5">
          <button
            type="button"
            onClick={() => navigate("home")}
            className="shrink-0"
            aria-label="iAE Company Hub home"
          >
            <IaeLogoIcon surface="on-dark" className="h-[31px] w-[70px]" />
          </button>

          <nav className="hidden flex-1 items-center justify-center gap-7 xl:flex" aria-label="Primary">
            {INTERNAL_NAV_ITEMS.map((item) => {
              const active = isActive(item.key);
              if (item.view) {
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => navigate(item.view!)}
                    className={navButtonClass(active)}
                  >
                    {item.label}
                  </button>
                );
              }

              return (
                <span
                  key={item.key}
                  className={cn(navButtonClass(false), "cursor-default opacity-55")}
                  aria-disabled
                >
                  {item.label}
                </span>
              );
            })}
          </nav>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 xl:hidden">
            <span className="truncate rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90">
              {activeItemLabel}
            </span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="internal-mobile-nav"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
              <span className="sr-only">{mobileMenuOpen ? "Close menu" : "Open menu"}</span>
            </button>
          </div>

          <div className="hidden w-[70px] shrink-0 xl:block" aria-hidden />
        </div>
      </div>

      <div
        id="internal-mobile-nav"
        onClick={() => setMobileMenuOpen(false)}
        className={cn(
          "xl:hidden",
          mobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          "fixed inset-0 top-[56px] z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-200",
        )}
      >
        <nav
          className="max-h-[calc(100dvh-56px)] overflow-y-auto bg-black px-4 pb-6 pt-4"
          aria-label="Primary mobile menu"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mx-auto max-w-[640px]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/65">Navigate</p>
            <ul className="grid gap-2">
              {INTERNAL_NAV_ITEMS.map((item) => {
                const active = isActive(item.key);
                const content = (
                  <>
                    <span>{item.label}</span>
                    <ChevronRight className={cn("h-4 w-4", active ? "text-black/80" : "text-white/70")} aria-hidden />
                  </>
                );

                return (
                  <li key={item.key}>
                    {item.view ? (
                      <button
                        type="button"
                        onClick={() => navigate(item.view!)}
                        className={mobileButtonClass(active)}
                      >
                        {content}
                      </button>
                    ) : (
                      <span className={cn(mobileButtonClass(false), "cursor-default opacity-55")} aria-disabled>
                        {content}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>
    </header>
  );
}
