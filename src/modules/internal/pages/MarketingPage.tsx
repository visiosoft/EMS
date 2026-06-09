import { Landmark, Megaphone, Layers, ArrowLeft } from "lucide-react";
import { TeamMemberAvatar } from "../components/TeamMemberAvatar";
import { UrgentUpcomingSection } from "../components/UrgentUpcomingSection";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import { useInternalNavigation } from "../routing/InternalNavigationContext";

type QuickLinkIconProps = {
  className?: string;
};

type DepartmentQuickLink = {
  label: string;
  href: string;
  icon: (props: QuickLinkIconProps) => JSX.Element;
};

type TeamMember = {
  name: string;
  title: string;
};

const MARKETING_TEAM_MEMBERS: TeamMember[] = [
  { name: "Amari Singleton", title: "Digital Marketing Coordinator" },
  { name: "Cassidy Sullivan", title: "Marketing Manager" },
  { name: "Mandy Epstein", title: "Marketing Asset & Trafficking Coordinator" },
  { name: "Dane Roberts", title: "Marketing Coordinator" },
  { name: "Mil Safadi", title: "Marketing Manager" },
  { name: "Morgan Roberts", title: "Marketing Coordinator" },
];

function DepartmentListIcon({ className }: QuickLinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="6" width="16" height="12" rx="1" />
      <circle cx="8" cy="10" r="1.2" />
      <circle cx="12" cy="10" r="1.2" />
      <circle cx="16" cy="10" r="1.2" />
      <path d="M7 14h10" />
    </svg>
  );
}

const MARKETING_QUICK_LINKS: DepartmentQuickLink[] = [
  { label: "Booking", icon: DepartmentListIcon, href: "https://abcd.com/" },
  { label: "Marketing", icon: Landmark, href: "https://abcd.com/" },
  { label: "Accounting", icon: DepartmentListIcon, href: "https://abcd.com/" },
  { label: "Production", icon: Landmark, href: "https://abcd.com/" },
];

const MARKETING_PAGE = {
  title: "Marketing",
  overviewLabel: "Department Overview",
  overview: "A central hub for managing financial records, budgets, and accounting resources with clarity and control.",
  teamMembers: MARKETING_TEAM_MEMBERS,
  quickLinks: MARKETING_QUICK_LINKS,
  funCornerVideoUrl: "https://www.youtube.com/embed/v0BrTJHoYC0?rel=0",
};

function MarketingHero() {
  const { navigate } = useInternalNavigation();
  return (
    <section
      className="relative isolate overflow-hidden bg-[#0b080c] px-4 py-8 text-white sm:px-8 sm:py-10 lg:px-10"
      style={{ backgroundImage: "url('/internal-hub-bg.svg')", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundSize: "cover" }}
    >
      <div className="mx-auto mb-6 max-w-[1120px]">
        <button
          onClick={() => navigate("departments")}
          className="flex items-center text-sm font-semibold text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Departments
        </button>
      </div>
      <div className="mx-auto grid min-h-[300px] max-w-[1120px] items-center gap-8 md:grid-cols-[1fr_0.75fr]">
        <div>
          <h1 className="max-w-[560px] text-[clamp(2.25rem,11vw,4.75rem)] font-bold leading-[1.08] tracking-[-0.025em] text-white">
            {MARKETING_PAGE.title}
          </h1>
          <p className="mt-6 text-base font-bold text-white sm:mt-10 sm:text-lg">{MARKETING_PAGE.overviewLabel}</p>
          <div className="mt-4 h-px max-w-[650px] bg-white/45" />
          <p className="mt-6 max-w-[620px] text-base font-bold leading-snug text-white sm:text-lg">{MARKETING_PAGE.overview}</p>
        </div>
        <div className="hidden justify-center md:flex">
          <Megaphone className="h-[185px] w-[185px] text-white" strokeWidth={1.7} aria-hidden />
        </div>
      </div>
    </section>
  );
}

function TeamMembersSection({ members }: { members: TeamMember[] }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold">Team members</h2>
      <div className="mt-7 border-t border-neutral-600">
        <div className="mt-5 max-h-[248px] overflow-y-auto pr-2 [scrollbar-color:#9ca3af_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-400 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-neutral-200 text-xs font-semibold text-neutral-900">
                <th className="w-[150px] px-4 py-3">Picture</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Title</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {members.map((member) => (
                <tr key={member.name} className="relative">
                  <td className="relative px-4 py-4 before:absolute before:left-0 before:top-1/2 before:h-10 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-neutral-300">
                    <TeamMemberAvatar />
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-700">{member.name}</td>
                  <td className="px-4 py-4 text-sm font-semibold text-neutral-900">{member.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function QuickLinksSection({ links }: { links: DepartmentQuickLink[] }) {
  const { navigate } = useInternalNavigation();
  return (
    <section>
      <h2 className="text-2xl font-semibold">Quick Links</h2>
      <div className="mt-7 border-t border-neutral-600 pt-5">
        <div className="grid gap-5 sm:grid-cols-2">
          {links.map(({ label, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex h-[58px] items-center gap-3 border border-neutral-700 px-4 text-sm font-semibold text-neutral-900 transition-colors hover:bg-black hover:text-white"
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </a>
          ))}
          <a
            href="/internal/learning-portal?fromView=department-marketing&fromTitle=Marketing"
            target="_blank"
            rel="noreferrer"
            className="col-span-1 flex h-[58px] w-full items-center justify-between gap-3 bg-black px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 sm:col-span-2"
          >
            <div className="flex items-center gap-3">
              <Layers className="h-5 w-5 shrink-0" />
              Learning & Certifications Portal
            </div>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-black">
              NEW
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

function FunCornerSection({ videoUrl }: { videoUrl: string }) {
  return (
    <section>
      <h2 className="mt-6 border-b border-neutral-600 pb-7 text-2xl font-semibold">Fun Corner</h2>
      <div className="mt-10 w-full max-w-[520px] overflow-hidden bg-black shadow-sm">
        <iframe
          className="aspect-video w-full"
          src={videoUrl}
          title="Attack on Titan - Beyond the Walls World Tour - 2026"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
  );
}

export function MarketingPage() {
  return (
    <InternalPageFrame footer={<UrgentUpcomingSection pinned />}>
      <MarketingHero />

      <main className="mx-auto grid max-w-[1120px] gap-10 px-4 py-6 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:px-0">
        <TeamMembersSection members={MARKETING_PAGE.teamMembers} />
        <div>
          <QuickLinksSection links={MARKETING_PAGE.quickLinks} />
          <FunCornerSection videoUrl={MARKETING_PAGE.funCornerVideoUrl} />
        </div>
      </main>
    </InternalPageFrame>
  );
}
