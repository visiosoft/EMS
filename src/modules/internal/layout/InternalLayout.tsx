import type { ReactNode } from "react";
import { InternalHeader } from "./InternalHeader";
import { InternalQuickLinksSidebar } from "./InternalQuickLinksSidebar";
import { useInternalNavigation } from "../routing/InternalNavigationContext";

/**
 * Shell for the iAE Company Hub module.
 * The Quick Links rail belongs to the main hub landing screen only, matching the SharePoint references.
 */
export function InternalLayout({ children, showSidebar = true }: { children: ReactNode; showSidebar?: boolean }) {
  const { currentView } = useInternalNavigation();
  const isHubLanding = currentView === "home";
  const shouldShowSidebar = showSidebar && isHubLanding;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white text-black">
      <InternalHeader />

      <div
        className={
          shouldShowSidebar
            ? "mx-auto flex w-full min-h-0 max-w-[1600px] flex-1 flex-col gap-5 pt-5 lg:flex-row lg:gap-6"
            : "flex min-h-0 w-full flex-1 flex-col"
        }
      >
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>

        {shouldShowSidebar ? <InternalQuickLinksSidebar /> : null}
      </div>
    </div>
  );
}
