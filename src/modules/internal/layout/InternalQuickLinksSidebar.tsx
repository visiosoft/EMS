import { ChevronDown, Folder } from "lucide-react";
import { QUICK_LINKS } from "../constants/quickLinks";

const DOCUMENT_PLACEHOLDERS = [
  { name: "Employee-Handbook", type: "folder" as const, color: "text-emerald-600" },
  { name: "Handbook Images", type: "folder" as const, color: "text-yellow-500" },
];

export function InternalQuickLinksSidebar() {
  return (
    /**
     * `self-stretch` ensures the aside fills the full height of the flex row
     * so the black background reaches the bottom of the viewport even when
     * the page content is short.
     */
    <aside className="self-stretch bg-black flex flex-col w-[260px] shrink-0 lg:w-[280px] xl:w-[300px]">
      {/* ── Quick Links ── */}
      <section className="px-5 pt-6 pb-4">
        <h2 className="text-base font-semibold text-white mb-3">Quick Links</h2>
        <ul className="space-y-2">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="flex items-center gap-3 rounded-md bg-white px-3 py-2.5 text-sm font-medium text-black shadow-sm transition-colors hover:bg-neutral-100"
                >
                  <Icon className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
                  {link.label}
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Divider ── */}
      <hr className="border-white/10 mx-5" />

      {/* ── Documents ── */}
      <section className="px-5 pt-4 pb-6 flex-1">
        <h2 className="text-base font-semibold text-white mb-3">Documents</h2>
        <div className="rounded-sm bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 text-sm font-semibold text-black">
            <span>Name</span>
            <ChevronDown className="h-4 w-4 text-neutral-400" aria-hidden />
          </div>
          <ul className="divide-y divide-neutral-100">
            {DOCUMENT_PLACEHOLDERS.map((doc) => (
              <li key={doc.name}>
                <a
                  href={`#${doc.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-neutral-800 hover:bg-neutral-50 transition-colors"
                >
                  <Folder className={`h-4 w-4 shrink-0 ${doc.color}`} aria-hidden />
                  {doc.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </aside>
  );
}