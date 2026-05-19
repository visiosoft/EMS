import { Calendar, Megaphone, Plus } from "lucide-react";

type IconProps = { className?: string };

const BUSINESS_CARDS = [
  { label: "SOP's", icon: SopIcon },
  { label: "Resource Library", icon: ResourceLibraryIcon },
  { label: "Forms & Templates", icon: DocumentsIcon },
  { label: "Withholding Forms", icon: DocumentsIcon },
  { label: "Event Business Chec...", icon: ChecklistIcon },
  { label: "Event Business Cont...", icon: ContractIcon },
  { label: "Ramp", icon: LinkIcon },
  { label: "Withholding Payme...", icon: CardPaymentIcon },
  { label: "Incoming Funds Not...", icon: IncomingFundsIcon },
];

const UPCOMING_EVENTS = [
  { month: "Month", day: "01", title: "Title of event", time: "Tuesday 12:00 AM - 1:00 PM" },
  { month: "Month", day: "01", title: "Title of event", time: "Tuesday 12:00 AM - 1:00 PM" },
  { month: "Month", day: "01", title: "Title of event", time: "Tuesday 12:00 AM - 1:00 PM" },
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

function BusinessCard({ label, icon: Icon, index }: { label: string; icon: (props: IconProps) => JSX.Element; index: number }) {
  return (
    <article
      className="group flex h-[214px] w-[184px] flex-col items-center rounded-md bg-black px-6 pb-5 pt-5 text-white shadow-[0_4px_16px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(0,0,0,0.28)]"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="flex flex-1 items-center justify-center">
        <Icon className="h-[82px] w-[82px] text-white transition-transform duration-300 group-hover:scale-105" />
      </div>
      <h3 className="mb-3 max-w-full truncate text-center text-[13px] font-semibold leading-tight text-white">{label}</h3>
      <a
        href="#details"
        className="inline-flex h-[28px] w-[130px] items-center justify-center rounded-[3px] bg-white text-[10px] font-bold uppercase tracking-[0.08em] text-black hover:bg-neutral-200"
      >
        View Details
      </a>
    </article>
  );
}

function UrgentUpcomingSection() {
  return (
    <section className="bg-white px-5 pb-16 pt-[104px] text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1080px]">
        <div className="grid gap-6 md:grid-cols-[1fr_220px]">
          <h2 className="text-[34px] font-semibold leading-none tracking-[-0.02em] text-neutral-900">Urgent / Upcoming</h2>
          <div className="flex flex-col items-start gap-[66px] pt-1">
            <a href="#calendar" className="text-base text-neutral-800 underline underline-offset-2 hover:text-black">
              View Full Calendar
            </a>
            <a href="#see-all" className="text-sm font-semibold text-neutral-900 hover:underline">
              See all
            </a>
          </div>
        </div>

        <button type="button" className="mt-[72px] inline-flex items-center gap-3 text-sm font-medium text-neutral-950 hover:text-neutral-600">
          <Plus className="h-4 w-4" aria-hidden />
          Add event
        </button>

        <div className="mt-7 grid gap-10 md:grid-cols-[minmax(245px,1.15fr)_repeat(3,minmax(160px,1fr))]">
          <div className="flex items-center gap-4">
            <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center bg-black text-white">
              <Calendar className="h-7 w-7" strokeWidth={1.65} aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-950">Create an event</p>
              <p className="mt-1 max-w-[190px] text-xs leading-snug text-neutral-700">When you add an event, it will show here where your readers can see it.</p>
            </div>
          </div>

          {UPCOMING_EVENTS.map((event, index) => (
            <article key={index} className="flex items-center gap-4">
              <div className="flex h-[58px] w-[58px] shrink-0 flex-col items-center justify-center border border-neutral-200 bg-white shadow-sm">
                <span className="text-xs text-neutral-700">{event.month}</span>
                <span className="text-2xl font-semibold leading-none text-neutral-900">{event.day}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900">{event.title}</p>
                <p className="mt-1 truncate text-xs font-medium text-neutral-800">{event.time}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EventBusinessPage() {
  return (
    <div className="bg-white text-black">
      <section
        className="relative isolate overflow-hidden bg-[#0b080c] px-5 py-9 text-white sm:px-8 lg:px-10"
        style={{ backgroundImage: "url('/internal-hub-bg.svg')", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundSize: "cover" }}
      >
        <div className="mx-auto grid min-h-[276px] max-w-[1080px] items-center gap-10 md:grid-cols-[1fr_0.65fr]">
          <div>
            <h1 className="text-[58px] font-bold leading-[1.05] tracking-[-0.025em] text-white sm:text-[68px]">Event Business</h1>
            <p className="mt-9 text-lg font-bold text-white">Department Overview</p>
            <div className="mt-4 h-px max-w-[690px] bg-white/45" />
            <p className="mt-5 max-w-[640px] text-lg font-bold leading-snug text-white">
              A central hub for managing financial records, budgets, and accounting resources with clarity and control.
            </p>
          </div>
          <div className="hidden justify-center md:flex">
            <HeroIllustration />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[980px] px-5 pb-0 pt-9 sm:px-8 lg:px-0">
        <h2 className="mb-8 text-[17px] font-semibold text-neutral-900">Event &amp; Business List</h2>
        <section className="grid grid-cols-1 justify-items-center gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5" aria-label="Event and business list">
          {BUSINESS_CARDS.map((card, index) => (
            <BusinessCard key={card.label} label={card.label} icon={card.icon} index={index} />
          ))}
        </section>
      </main>

      <UrgentUpcomingSection />
    </div>
  );
}
