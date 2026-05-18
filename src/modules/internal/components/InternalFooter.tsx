import { IaeLogoIcon } from "@/components/brand/IaeBrandMark";
import { FOOTER_LINK_GROUPS } from "../constants/quickLinks";

export function InternalFooter() {
  return (
    <footer className="mt-16 overflow-hidden bg-black text-white">
      <div className="relative px-6 py-10 sm:px-8 lg:px-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, rgba(255,255,255,0.42) 0 1.1px, transparent 1.2px)",
            backgroundSize: "14px 14px",
            maskImage: "radial-gradient(circle at 50% 50%, black 0%, black 34%, transparent 72%)",
          }}
          aria-hidden
        />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_2fr] lg:items-start">
          <div>
            <IaeLogoIcon surface="on-dark" className="mb-5" />
            <h2 className="text-2xl font-semibold tracking-tight">Your Hub For All Things iAE</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">
              A central space for news, services, documents, events, and the resources that keep the day moving.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {FOOTER_LINK_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold tracking-[0.14em] uppercase text-white/90">{group.title}</h3>
                <ul className="mt-4 space-y-2">
                  {group.links.map((link) => (
                    <li key={link}>
                      <a href={`#${link.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm text-white/62 hover:text-white">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-10 border-t border-white/15 pt-5 text-xs text-white/45">
          © {new Date().getFullYear()} Innovation Arts & Entertainment. Internal use only.
        </div>
      </div>
    </footer>
  );
}
