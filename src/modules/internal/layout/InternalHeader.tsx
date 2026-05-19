import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IaeLogoIcon } from "@/components/brand/IaeBrandMark";
import { INTERNAL_NAV_ITEMS } from "../constants/navigation";

export function InternalHeader() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function isActive(itemKey: string) {
    return location.pathname.includes(itemKey);
  }

  const activeItemLabel = useMemo(() => {
    const match = INTERNAL_NAV_ITEMS.find((item) => location.pathname.includes(item.key));
    return match?.label ?? "Company Hub";
  }, [location.pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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

  return (
    <header className="sticky top-0 z-50 bg-black text-white shadow-[0_1px_0_rgba(255,255,255,0.08)]">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[56px] items-center justify-between gap-5">
          <Link to="/internal" className="shrink-0" aria-label="iAE Company Hub home">
            <IaeLogoIcon surface="on-dark" className="h-[31px] w-[70px]" />
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-7 xl:flex" aria-label="Primary">
            {INTERNAL_NAV_ITEMS.map((item) => {
              const active = isActive(item.key);
              const isRoute = item.href.startsWith("/");
              const className = cn(
                "whitespace-nowrap border-b-2 border-transparent pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/78 transition-colors hover:border-white/70 hover:text-white",
                active && "border-white text-white",
              );

              return isRoute ? (
                <Link key={item.key} to={item.href} className={className}>
                  {item.label}
                </Link>
              ) : (
                <a key={item.key} href={item.href} className={className}>
                  {item.label}
                </a>
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
                const isRoute = item.href.startsWith("/");
                const className = cn(
                  "flex min-h-12 items-center justify-between rounded-md border px-4 py-3 text-sm font-semibold transition-all",
                  active
                    ? "border-white bg-white text-black"
                    : "border-white/20 bg-white/5 text-white hover:border-white/45 hover:bg-white/10",
                );

                const content = (
                  <>
                    <span>{item.label}</span>
                    <ChevronRight className={cn("h-4 w-4", active ? "text-black/80" : "text-white/70")} aria-hidden />
                  </>
                );

                return (
                  <li key={item.key}>
                    {isRoute ? (
                      <Link to={item.href} className={className}>
                        {content}
                      </Link>
                    ) : (
                      <a href={item.href} className={className}>
                        {content}
                      </a>
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