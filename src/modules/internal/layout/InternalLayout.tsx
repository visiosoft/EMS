import { Outlet } from "react-router-dom";
import { InternalHeader } from "./InternalHeader";
import { InternalQuickLinksSidebar } from "./InternalQuickLinksSidebar";

/**
 * Shell for the iAE Company Hub module.
 * Header + main column + right Quick Links sidebar.
 * The sidebar is permanently black and grows to fill the viewport height.
 */
export function InternalLayout({ showSidebar = true }: { showSidebar?: boolean }) {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <InternalHeader />

      {/* Body: stretches so the black sidebar always fills remaining viewport height */}
      <div className="flex flex-1 mx-auto w-full max-w-[1600px]">
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>

        {showSidebar ? <InternalQuickLinksSidebar /> : null}
      </div>
    </div>
  );
}