import { Outlet } from "react-router-dom";
import { InternalHeader } from "./InternalHeader";
import { InternalQuickLinksSidebar } from "./InternalQuickLinksSidebar";

/**
 * Shell for the iAE Company Hub module.
 * Header + main column + responsive Quick Links panel.
 */
export function InternalLayout({ showSidebar = true }: { showSidebar?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <InternalHeader />

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>

        {showSidebar ? <InternalQuickLinksSidebar /> : null}
      </div>
    </div>
  );
}