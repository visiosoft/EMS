import { Calendar, GraduationCap, ImageIcon, Palette, PenTool, Plus } from "lucide-react";

const TEAM_MEMBERS = [
  { name: "Alex Abalo", title: "Graphic Designer" },
  { name: "Ben Viette", title: "Art Director" },
  { name: "Chauncey Hopewell", title: "Graphic Designer" },
];

const QUICK_LINKS = [
  { label: "Design Resources", icon: ImageIcon },
  { label: "Student Gallery", icon: Palette },
  { label: "Courses & Curriculum", icon: GraduationCap },
  { label: "Faculty & Staff", icon: PenTool },
];

const URGENT_EVENTS = [
  { month: "Month", day: "01", title: "Title of event", time: "Tuesday 12:00 AM - 1:00 PM" },
  { month: "Month", day: "01", title: "Title of event", time: "Tuesday 12:00 AM - 1:00 PM" },
  { month: "Month", day: "01", title: "Title of event", time: "Tuesday 12:00 AM - 1:00 PM" },
];

function TeamAvatar() {
  return (
    <div className="relative h-[40px] w-[31px] overflow-hidden bg-neutral-100 shadow-sm" aria-hidden>
      <div className="absolute left-1/2 top-[7px] h-[13px] w-[13px] -translate-x-1/2 rounded-full bg-[#111]" />
      <div className="absolute bottom-0 left-1/2 h-[22px] w-[20px] -translate-x-1/2 rounded-t-[9px] bg-[#111]" />
      <div className="absolute bottom-0 left-1/2 h-[19px] w-[8px] -translate-x-1/2 bg-white" />
      <div className="absolute bottom-[3px] left-1/2 h-[13px] w-[4px] -translate-x-1/2 bg-[#b10f18]" />
      <div className="absolute bottom-[15px] left-1/2 h-[4px] w-[8px] -translate-x-1/2 rotate-45 bg-[#b10f18]" />
      <div className="absolute bottom-[15px] left-1/2 h-[4px] w-[8px] -translate-x-1/2 -rotate-45 bg-[#b10f18]" />
    </div>
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
        className="relative isolate overflow-hidden bg-[#0b080c] px-5 py-10 text-white sm:px-8 lg:px-10"
        style={{ backgroundImage: "url('/internal-hub-bg.svg')", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundSize: "cover" }}
      >
        <div className="mx-auto grid min-h-[300px] max-w-[1120px] items-center gap-8 md:grid-cols-[1fr_0.75fr]">
          <div>
            <h1 className="max-w-[560px] text-[58px] font-bold leading-[1.13] tracking-[-0.025em] text-white sm:text-[70px] md:text-[76px]">
              Art &amp; Graphic<br />Design
            </h1>
            <p className="mt-6 text-lg font-bold text-white">Department Overview</p>
            <div className="mt-4 h-px max-w-[650px] bg-white/45" />
            <p className="mt-6 max-w-[620px] text-lg font-bold leading-snug text-white">
              A central hub for managing financial records, budgets, and accounting resources with clarity and control.
            </p>
          </div>
          <div className="hidden justify-center md:flex">
            <PenTool className="h-[185px] w-[185px] text-white" strokeWidth={1.6} aria-hidden />
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-[1120px] gap-10 px-5 py-6 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:px-0">
        <section>
          <h2 className="text-2xl font-semibold">Team Members</h2>
          <div className="mt-7 border-t border-neutral-600">
            <table className="mt-5 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs font-semibold text-neutral-900">
                  <th className="w-[150px] px-4 py-3">Picture</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Title</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {TEAM_MEMBERS.map((member) => (
                  <tr key={member.name}>
                    <td className="px-4 py-4"><TeamAvatar /></td>
                    <td className="px-4 py-4 text-sm text-neutral-700">{member.name}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-neutral-900">{member.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Quick Links</h2>
          <div className="mt-7 border-t border-neutral-600 pt-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {QUICK_LINKS.map(({ label, icon: Icon }) => (
                <a key={label} href="#" className="flex h-[58px] items-center gap-3 border border-neutral-700 px-4 text-sm font-semibold text-neutral-900 transition-colors hover:bg-black hover:text-white">
                  <Icon className="h-5 w-5" strokeWidth={1.45} aria-hidden />
                  {label}
                </a>
              ))}
            </div>
          </div>

          <h2 className="mt-6 border-b border-neutral-600 pb-7 text-2xl font-semibold">Fun Corner</h2>
          <YouTubeEmbed />
        </section>
      </main>

      <section className="mt-8 bg-black px-5 py-16 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-7 md:grid-cols-[1fr_230px]">
            <h2 className="text-[34px] font-semibold tracking-[0.04em]">Urgent / Upcoming</h2>
            <div className="flex flex-col items-start gap-10 md:items-start">
              <a href="#calendar" className="text-base font-medium underline underline-offset-2">View Full Calendar</a>
              <a href="#see-all" className="text-sm font-semibold">See all</a>
            </div>
          </div>

          <button type="button" className="mt-12 inline-flex items-center gap-3 text-sm font-semibold text-white hover:text-white/75">
            <Plus className="h-4 w-4" aria-hidden />
            Add event
          </button>

          <div className="mt-8 grid gap-8 md:grid-cols-[minmax(230px,1.05fr)_repeat(3,minmax(150px,1fr))]">
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
                  <p className="mt-1 truncate text-xs font-semibold text-white/90">{event.time}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
