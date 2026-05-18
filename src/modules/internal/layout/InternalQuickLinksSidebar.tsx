import { ChevronDown, File, Folder } from "lucide-react";
import { DOCUMENT_ITEMS, QUICK_LINKS } from "../constants/quickLinks";

export function InternalQuickLinksSidebar() {
  return (
    <aside className="w-full shrink-0 self-stretch bg-black text-white lg:w-[290px] xl:w-[324px]">
      <div className="flex w-full flex-col overflow-y-auto px-6 pb-10 pt-7 lg:sticky lg:top-[56px] lg:max-h-[calc(100vh-56px)] xl:px-8">
        <section className="animate-slide-up">
          <h2 className="mb-6 text-xl font-semibold tracking-[0.02em] text-white">Quick Links</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:gap-4">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="group flex min-h-[48px] items-center gap-3 rounded-sm bg-white px-4 py-3 text-[14px] font-semibold text-neutral-950 shadow-sm outline-none transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-100 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-neutral-500 transition-colors group-hover:text-black" strokeWidth={1.7} aria-hidden />
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <hr className="my-10 border-white/20 lg:my-12" />

        <section className="animate-slide-up">
          <h2 className="mb-4 text-xl font-semibold tracking-[0.02em] text-white">Documents</h2>
          <div className="overflow-hidden rounded-sm bg-white text-neutral-950 shadow-sm">
            <div className="grid grid-cols-[26px_1fr_18px] items-center border-b border-neutral-200 px-4 py-3 text-[13px] font-semibold">
              <File className="h-4 w-4 text-neutral-500" aria-hidden />
              <span>Name</span>
              <ChevronDown className="h-4 w-4 text-neutral-500" aria-hidden />
            </div>
            <ul>
              {DOCUMENT_ITEMS.map((doc) => {
                const Icon = doc.type === "folder" ? Folder : File;
                return (
                  <li key={doc.name} className="border-b border-neutral-100 last:border-b-0">
                    <a
                      href={`#${doc.name.toLowerCase().replace(/\s+/g, "-")}`}
                      className="grid grid-cols-[26px_1fr] items-center px-4 py-3 text-[14px] text-neutral-800 transition-colors hover:bg-neutral-100"
                    >
                      <Icon className={`h-4 w-4 ${doc.colorClass}`} aria-hidden />
                      <span className="truncate">{doc.name}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>
    </aside>
  );
}