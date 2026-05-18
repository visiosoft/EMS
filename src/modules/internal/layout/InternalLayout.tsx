import { Outlet, useLocation } from "react-router-dom";
import { InternalHeader } from "./InternalHeader";
import { InternalQuickLinksSidebar } from "./InternalQuickLinksSidebar";

/**
 * Shell for the iAE Company Hub module.
 * The Quick Links rail belongs to the main hub landing screen only, matching the SharePoint references.
 */
export function InternalLayout({ showSidebar = true }: { showSidebar?: boolean }) {
  const location = useLocation();
  const isHubLanding = location.pathname === "/internal" || location.pathname === "/internal/";
  const shouldShowSidebar = showSidebar && isHubLanding;

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <InternalHeader />

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>

        {shouldShowSidebar ? <InternalQuickLinksSidebar /> : null}
      </div>
    </div>
  );
}