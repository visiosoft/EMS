import { Globe } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { APP_CHOOSER_PATH } from "@/routing/paths";
import { cn } from "@/lib/utils";
import { IaeLogoIcon } from "@/components/brand/IaeBrandMark";
import { INTERNAL_NAV_ITEMS } from "../constants/navigation";

export function InternalHeader() {
  const location = useLocation();

  function isActive(itemKey: string) {
    if (itemKey === "attractions") return location.pathname === "/internal" || location.pathname === "/internal/";
    return location.pathname.includes(itemKey);
  }

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

          <nav className="flex min-w-0 flex-1 items-center justify-end xl:hidden" aria-label="Primary mobile">
            <div className="flex min-w-0 items-center gap-4 overflow-x-auto">
              {INTERNAL_NAV_ITEMS.map((item) => {
                const isRoute = item.href.startsWith("/");
                const className = cn(
                  "whitespace-nowrap border-b-2 border-transparent pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70 hover:border-white/60 hover:text-white",
                  isActive(item.key) && "border-white/90 text-white",
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
            </div>
          </nav>

          <Link
            to={APP_CHOOSER_PATH}
            className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-white/85 hover:text-white"
          >
            <Globe className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Site access</span>
          </Link>
        </div>
      </div>
    </header>
  );
}