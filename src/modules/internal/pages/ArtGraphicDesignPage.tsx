import { Calendar, PenTool, Plus } from "lucide-react";

type QuickLinkIconProps = {
  className?: string;
};

const TEAM_MEMBERS = [
  { name: "Ben Viette", title: "Art Director" },
  { name: "Alex Abalo", title: "Graphic Designer" },
  { name: "Chauncey Hopewell", title: "Graphic Designer" },
  { name: "Amy Lord", title: "Graphic Designer" },
  { name: "Autumn Wieske", title: "Production Artist" },
  { name: "Rebecca Pepe", title: "Creative Director" },
  { name: "Nichole Beeler", title: "Marketing Designer" },
  { name: "Andrew Turbiville", title: "Event Designer" },
  { name: "George Wood", title: "Operations Support" },
];

function DesignResourcesIcon({ className }: QuickLinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 5.5h11.5v11.5H5z" />
      <path d="M7.2 15.1 10 11.9l2.2 2.3 1.6-1.8 2.7 3.1" />
      <path d="m14.4 4.2 5.4 5.4" />
      <path d="m17.1 6.9-9.2 9.2" />
    </svg>
  );
}

function StudentGalleryIcon({ className }: QuickLinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.2 16.6c.3-6.8 5.7-12.1 12.6-12.4" />
      <path d="M16.8 4.2v12.4H4.2" />
    </svg>
  );
}

function CoursesIcon({ className }: QuickLinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m12 3.8 8 4.7v7L12 20.2l-8-4.7v-7l8-4.7Z" />
      <path d="m4 8.5 8 4.7 8-4.7" />
      <path d="M12 13.2v7" />
      <path d="M8.1 6.1 16 17.8" />
      <path d="m15.9 6.1-7.8 11.7" />
    </svg>
  );
}

function FacultyStaffIcon({ className }: QuickLinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8.3 16.8c-1.9 0-3.1-1.5-2.6-3.3l1.5-5.1" />
      <path d="M12.2 7.1 9.7 16c-.6 2.1.7 3.8 2.8 3.8 1.7 0 3.4-1.2 3.9-2.9l2.2-7.8c.4-1.5-.5-2.8-2.1-2.8-1.3 0-2.5.9-2.9 2.1l-1.7 6.2" />
    </svg>
  );
}

const QUICK_LINKS = [
  { label: "Design Resources", icon: DesignResourcesIcon, href: "https://abcd.com/" },
  { label: "Student Gallery", icon: StudentGalleryIcon, href: "https://abcd.com/" },
  { label: "Courses & Curriculum", icon: CoursesIcon, href: "https://abcd.com/" },
  { label: "Faculty & Staff", icon: FacultyStaffIcon, href: "https://abcd.com/" },
];

const URGENT_EVENTS = [
  { month: "Month", day: "01", title: "Title of event", time: "Tuesday 12:00 AM - 1:00 PM" },
  { month: "Month", day: "01", title: "Title of event", time: "Tuesday 12:00 AM - 1:00 PM" },
  { month: "Month", day: "01", title: "Title of event", time: "Tuesday 12:00 AM - 1:00 PM" },
];

function TeamAvatar() {
  return (
    <img
      src="/team-member-avatar.svg"
      alt="Team member"
      className="block h-10 w-[31px] object-contain shadow-sm"
      loading="lazy"
    />
  );
}

function YouTubeEmbed() {
  return (
    <div className="mt-10 w-full max-w-[520px] overflow-hidden bg-black shadow-sm">
      <iframe
        className="aspect-video w-full"
        src="https://www.youtube.com/embed/v0BrTJHoYC0?rel=0"
        title="Attack on Titan - Beyond the Walls World Tour - 2026"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

export function ArtGraphicDesignPage() {
  return (
    <div className="bg-white text-black">
      <section
        className="relative isolate overflow-hidden bg-[#0b080c] px-4 py-8 text-white sm:px-8 sm:py-10 lg:px-10"
        style={{ backgroundImage: "url('/internal-hub-bg.svg')", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundSize: "cover" }}
      >
        <div className="mx-auto grid min-h-[300px] max-w-[1120px] items-center gap-8 md:grid-cols-[1fr_0.75fr]">
          <div>
            <h1 className="max-w-[560px] text-[clamp(2.25rem,11vw,4.75rem)] font-bold leading-[1.13] tracking-[-0.025em] text-white">
              Art &amp; Graphic<br />Design
            </h1>
            <p className="mt-6 text-base font-bold text-white sm:text-lg">Department Overview</p>
            <div className="mt-4 h-px max-w-[650px] bg-white/45" />
            <p className="mt-6 max-w-[620px] text-base font-bold leading-snug text-white sm:text-lg">
              A central hub for managing financial records, budgets, and accounting resources with clarity and control.
            </p>
          </div>
          <div className="hidden justify-center md:flex">
            <PenTool className="h-[185px] w-[185px] text-white" strokeWidth={1.6} aria-hidden />
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-[1120px] gap-10 px-4 py-6 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:px-0">
        <section>
          <h2 className="text-2xl font-semibold">Team Members</h2>
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
                  {TEAM_MEMBERS.map((member) => (
                    <tr key={member.name} className="relative">
                      <td className="relative px-4 py-4 before:absolute before:left-0 before:top-1/2 before:h-10 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-neutral-300">
                        <TeamAvatar />
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

        <section>
          <h2 className="text-2xl font-semibold">Quick Links</h2>
          <div className="mt-7 border-t border-neutral-600 pt-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {QUICK_LINKS.map(({ label, icon: Icon, href }) => (
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
            </div>
          </div>

          <h2 className="mt-6 border-b border-neutral-600 pb-7 text-2xl font-semibold">Fun Corner</h2>
          <YouTubeEmbed />
        </section>
      </main>

      <section className="mt-8 bg-black px-4 pb-14 pt-12 text-white sm:px-8 sm:pb-16 sm:pt-[84px] lg:px-10">
        <div className="mx-auto max-w-[1104px]">
          <div className="grid gap-4 sm:gap-7 md:grid-cols-[1fr_216px]">
            <h2 className="text-[28px] font-semibold leading-none tracking-[-0.02em] sm:text-[34px]">Urgent / Upcoming</h2>
            <div className="flex items-center justify-between gap-4 md:relative md:block md:h-[116px] md:w-[216px]">
              <button type="button" className="text-sm font-medium underline underline-offset-2 sm:text-base md:absolute md:left-[10px] md:top-0">View Full Calendar</button>
              <button type="button" className="text-sm font-semibold md:absolute md:left-[107px] md:top-[92px]">See all</button>
            </div>
          </div>

          <button type="button" className="mt-[20px] inline-flex items-center gap-3 text-sm font-semibold text-white hover:text-white/75">
            <Plus className="h-4 w-4" aria-hidden />
            Add event
          </button>

          <div className="mt-8 grid gap-7 md:grid-cols-[minmax(230px,1.05fr)_repeat(3,minmax(150px,1fr))]">
            <div className="flex items-center gap-4">
              <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center bg-white/40 text-black">
                <Calendar className="h-7 w-7" strokeWidth={1.7} aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold">Create an event</p>
                <p className="mt-1 max-w-[230px] text-xs font-semibold leading-snug text-white/90">When you add an event, it will show here where your readers can see it.</p>
              </div>
            </div>
            {URGENT_EVENTS.map((event, index) => (
              <article key={index} className="flex items-center gap-4">
                <div className="flex h-[58px] w-[66px] shrink-0 flex-col items-center justify-center border border-white/20 bg-black">
                  <span className="text-xs font-semibold text-white/85">{event.month}</span>
                  <span className="text-2xl font-semibold leading-none text-white">{event.day}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{event.title}</p>
                  <p className="mt-1 text-xs font-semibold text-white/90">{event.time}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
