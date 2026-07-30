import { Calendar, Megaphone, ArrowLeft, Layers } from "lucide-react";
import { UrgentUpcomingSection } from "../components/UrgentUpcomingSection";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import { useInternalNavigation } from "../routing/InternalNavigationContext";

type IconProps = { className?: string };

const BUSINESS_CARDS = [
  {
    label: "SOP's",
    icon: SopIcon,
    href: "https://innovationae.sharepoint.com/:f:/s/IAECloudServer/IgAbnBRs9Jk2R5tv6WegXBD3Ab3LkW8yAifIMkVe6Po06ys?e=a9adxo",
  },
  {
    label: "Resource Library",
    icon: ResourceLibraryIcon,
    href: "https://innovationae.sharepoint.com/:f:/s/IAECloudServer/IgAoisq2Y6qSRKMfkxRJc9_gAXtU9myhZDr1e6b--4UMyj0?e=65wILd",
  },
  {
    label: "Forms & Templates",
    icon: DocumentsIcon,
    href: "https://innovationae.sharepoint.com/:f:/s/IAECloudServer/IgAhWNwoTBl1RppQCYXQkDXhAQ8-LLW8HUmlSwYAhHTW0To?e=dUF4sn",
  },
  {
    label: "Withholding Forms",
    icon: DocumentsIcon,
    href: "https://innovationae.sharepoint.com/:f:/s/IAECloudServer/IgARIxUxIA5DWbu0Fz7d-IxbAU1x3m8McOrcc6nMWNZkWzM?e=ofvTok",
  },
  {
    label: "Event Business Chec...",
    icon: ChecklistIcon,
    href: "https://innovationae.sharepoint.com/:w:/s/IAECloudServer/IQCPOUj37SC7T7pySJdasYHBAa-O7ryMUTWUNjO5TtR2kUs?e=vvOy4t",
  },
  {
    label: "Event Business Cont...",
    icon: ContractIcon,
    href: "https://airtable.com/login?continue=%2Fapps94oGAfjbSvf84%2Ftblia58QhLk7WylNK%2Fviw8miLgkSknJr9OF&redirectSource=liveapp",
  },
  { label: "Ramp", icon: LinkIcon, href: "https://app.ramp.com/" },
  {
    label: "Withholding Payme...",
    icon: CardPaymentIcon,
    href: "https://innovationae.formstack.com/forms/payment_request",
  },
  {
    label: "Incoming Funds Not...",
    icon: IncomingFundsIcon,
    href: "https://innovationae.formstack.com/forms/incoming_funds_notification",
  },
];

function SopIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M26 59h44v20H26z" />
      <path d="M34 59v-8c0-8 6-14 14-14s14 6 14 14v8" />
      <path d="M48 16v13" />
      <path d="M31 24l8 11" />
      <path d="M65 24l-8 11" />
      <path d="M25 79v9" />
      <path d="M48 79v9" />
      <path d="M71 79v9" />
      <text x="48" y="73" textAnchor="middle" fontSize="16" fill="currentColor" stroke="none" fontWeight="700">SOP</text>
    </svg>
  );
}

function ResourceLibraryIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="48" cy="28" r="15" />
      <path d="M48 13v7M48 36v7M33 28h7M56 28h7" />
      <path d="M28 68h40" />
      <path d="M48 45v23" />
      <path d="M30 68v13M48 68v13M66 68v13" />
      <circle cx="30" cy="83" r="4" />
      <circle cx="48" cy="83" r="4" />
      <circle cx="66" cy="83" r="4" />
      <circle cx="48" cy="28" r="4" />
    </svg>
  );
}

function DocumentsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M30 15h31l13 13v53H30z" />
      <path d="M61 15v14h13" />
      <path d="M23 22h7v52h-7z" />
      <path d="M41 44h23M41 55h23M41 66h17" />
    </svg>
  );
}

function ChecklistIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M23 22h14v14H23zM23 48h14v14H23zM23 74h14v14H23z" />
      <path d="m26 28 4 4 10-12" />
      <path d="m26 54 4 4 10-12" />
      <path d="M49 29h29M49 55h29M49 81h29" />
    </svg>
  );
}

function ContractIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M26 13h36l12 12v58H26z" />
      <path d="M62 13v13h12" />
      <path d="M39 59c9-11 18-11 27 0" />
      <path d="M36 70c7-6 14-6 22 0 5 4 10 4 16 0" />
      <path d="M40 38h18" />
      <path d="M40 48h25" />
    </svg>
  );
}

function LinkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M40 58 28 70c-8 8-21-5-13-13l16-16c7-7 17-6 23 0" />
      <path d="M56 38 68 26c8-8 21 5 13 13L65 55c-7 7-17 6-23 0" />
      <path d="M37 59 59 37" />
    </svg>
  );
}

function CardPaymentIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M24 35h55v28H24z" />
      <path d="M24 44h55" />
      <path d="M16 72h39" />
      <path d="M16 24h39" />
      <path d="M31 63c3 9 10 12 21 9" />
      <path d="M47 47h16" />
    </svg>
  );
}

function IncomingFundsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 67h20l10 9h22" />
      <path d="M16 76h18" />
      <path d="M32 58h19c6 0 10 4 10 9" />
      <path d="M54 34c0-9 6-15 15-15s15 6 15 15-6 15-15 15-15-6-15-15Z" />
      <path d="M69 25v18" />
      <path d="M63 31c3-4 12-4 13 1 1 6-12 4-12 9 0 4 8 5 13 1" />
      <path d="M64 13h10" />
      <path d="m61 13-4-8" />
      <path d="m77 13 4-8" />
    </svg>
  );
}

function HeroIllustration() {
  return (
    <div className="relative h-[172px] w-[230px] text-white" aria-hidden>
      <Calendar className="absolute right-0 top-0 h-[172px] w-[190px]" strokeWidth={2.2} />
      <Megaphone className="absolute left-0 top-[58px] h-[94px] w-[112px] -rotate-[22deg]" strokeWidth={2.4} />
    </div>
  );
}

function BusinessCard({
  label,
  icon: Icon,
  href,
  index,
}: {
  label: string;
  icon: (props: IconProps) => JSX.Element;
  href: string;
  index: number;
}) {
  return (
    <article
      className="group flex h-[188px] w-full flex-col items-center rounded-md bg-black px-4 pb-4 pt-4 text-white shadow-[0_4px_16px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(0,0,0,0.28)] sm:h-[214px] sm:px-6 sm:pb-5 sm:pt-5"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="flex flex-1 items-center justify-center">
        <Icon className="h-16 w-16 text-white transition-transform duration-300 group-hover:scale-105 sm:h-[82px] sm:w-[82px]" />
      </div>
      <h3 className="mb-2 max-w-full truncate text-center text-[12px] font-semibold leading-tight text-white sm:mb-3 sm:text-[13px]">{label}</h3>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-[26px] w-full max-w-[130px] items-center justify-center rounded-[3px] bg-white text-[10px] font-bold uppercase tracking-[0.08em] text-black hover:bg-neutral-200 sm:h-[28px]"
      >
        View Details
      </a>
    </article>
  );
}

export function EventBusinessPage() {
  const { navigate, viewData } = useInternalNavigation();
  const departmentId = viewData?.departmentId;
  return (
    <InternalPageFrame footer={<UrgentUpcomingSection pinned />}>
      <section
        className="relative isolate overflow-hidden bg-[#0b080c] px-4 py-8 text-white sm:px-8 sm:py-9 lg:px-10"
        style={{ backgroundImage: "url('/internal-hub-bg.svg')", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundSize: "cover" }}
      >
        <div className="mx-auto mb-6 max-w-[1080px]">
          <button
            onClick={() => navigate("departments")}
            className="flex items-center text-sm font-semibold text-neutral-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Departments
          </button>
        </div>
        <div className="mx-auto grid min-h-[276px] max-w-[1080px] items-center gap-10 md:grid-cols-[1fr_0.65fr]">
          <div>
            <h1 className="text-[clamp(2.25rem,11vw,4.25rem)] font-bold leading-[1.05] tracking-[-0.025em] text-white">Event Business</h1>
            <p className="mt-6 text-base font-bold text-white sm:mt-9 sm:text-lg">Department Overview</p>
            <div className="mt-4 h-px max-w-[690px] bg-white/45" />
            <p className="mt-5 max-w-[640px] text-base font-bold leading-snug text-white sm:text-lg">
              A central hub for managing financial records, budgets, and accounting resources with clarity and control.
            </p>
          </div>
          <div className="hidden justify-center md:flex">
            <HeroIllustration />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[980px] px-4 pt-8 sm:px-8 sm:pt-9 lg:px-0">
        <h2 className="mb-8 text-[17px] font-semibold text-neutral-900">Event &amp; Business List</h2>
        <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5" aria-label="Event and business list">
          {BUSINESS_CARDS.map((card, index) => (
            <BusinessCard key={card.label} label={card.label} icon={card.icon} href={card.href} index={index} />
          ))}
        </section>

        <a
          href={`/internal/learning-portal?fromView=department-event-business&fromTitle=Event+Business&departmentId=${departmentId || ""}`}
          target="_blank"
          rel="noreferrer"
          className="mt-8 flex h-[58px] w-full items-center justify-between gap-3 bg-black px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
        >
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 shrink-0" />
            Learning & Certifications Portal
          </div>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-black">
            NEW
          </span>
        </a>
      </main>
    </InternalPageFrame>
  );
}
