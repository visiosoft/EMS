import { Globe } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { APP_CHOOSER_PATH } from "@/routing/paths";
import { cn } from "@/lib/utils";
import { IaeLogoIcon } from "@/components/brand/IaeBrandMark";
import { INTERNAL_NAV_ITEMS } from "../constants/navigation";

export function InternalHeader() {
  const location = useLocation();
  const isHome = location.pathname === "/internal" || location.pathname === "/internal/";

  return (
    <header className="bg-black text-white sticky top-0 z-50">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[56px] items-center justify-between gap-4">
          {/* Logo – icon only, no "IAE EVENT FLOW" label */}
          <Link
            to="/internal"
            className="shrink-0 flex items-center gap-2"
            aria-label="iAE Company Hub home"
          >
            <IaeLogoIcon surface="on-dark" />
          </Link>

          {/* Centred nav – visible on xl+ */}
          <nav
            className="hidden flex-1 items-center justify-center gap-6 xl:flex"
            aria-label="Primary"
          >
            {INTERNAL_NAV_ITEMS.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80 transition-colors hover:text-white whitespace-nowrap",
                  item.key === "attractions" &&
                    isHome &&
                    "border-b-2 border-white pb-0.5 text-white",
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Mobile hamburger nav (collapsed) */}
          <nav className="flex xl:hidden flex-1 items-center justify-end">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-none">
              {INTERNAL_NAV_ITEMS.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className="text-[10px] font-semibold uppercase tracking-wider text-white/70 whitespace-nowrap hover:text-white transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          {/* Site access */}
          <Link
            to={APP_CHOOSER_PATH}
            className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            <Globe className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Site access</span>
          </Link>
        </div>
      </div>
    </header>
  );
}