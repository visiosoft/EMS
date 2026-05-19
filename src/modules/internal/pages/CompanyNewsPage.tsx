import { ChevronDown, CirclePlus, Newspaper, Plus, RefreshCw, UserRound, UsersRound, CalendarDays } from "lucide-react";
import { HOME_NEWS_ITEMS } from "../constants/quickLinks";

const AUTHORS = [
  { name: "Adam Epstein", title: "CEO", photo: true },
  { name: "Benjamin Viette", title: "Senior Graphic Designer" },
  { name: "Joe Kosin", title: "Director of Booking", photo: true },
  { name: "Andrew Turbiville", title: "Event Business Manager", photo: true },
  { name: "Nichole Beeler", title: "Director of Marketing" },
  { name: "Rebecca Pepe", title: "Director of Marketing" },
];

const FEATURED_NEWS = [
  { title: "Company News", summary: "Company News Stay updated with the latest announcements, achievements, and important...", author: "Haider Khalil", date: "8 hours ago", views: "46 views", image: "yellow" },
  { title: "Highlights and plans", summary: "Highlights and plans from the AI Team January 1, 2025 The AI Team at Trey Research has ha...", author: "Haider Khalil", date: "February 18", views: "6 views", image: "slate" },
  { title: "New Employee Benefit", summary: "New employee benefits at Lamna Healthcare Company We are excited to announce a range...", author: "zulfiqar khan", date: "February 3", views: "8 views", image: "orange" },
  { title: "iAE new Version is ready for launch", summary: "Highlights and plans from the AI Team January 1, 2025...", author: "zulfiqar khan", date: "February 3", views: "7 views", image: "slate" },
];

const AUTHORED_BY_ME = [
  { title: "Company News", summary: "Company News Stay updated with...", author: "Haider Khalil", date: "8 hours ago", views: "46 views", image: "yellow" },
  { title: "Highlights and plans", summary: "Highlights and plans from the AI...", author: "Haider Khalil", date: "February 18", views: "6 views", image: "slate" },
  { title: "SharePoint Platform Enhancements Now Live", summary: "We're pleased to share that several...", author: "Haider Khalil", date: "February 2", views: "10 views", image: "office" },
];

function NewsThumb({ variant, large = false }: { variant: string; large?: boolean }) {
  const sizeClass = large ? "h-[88px] w-full sm:w-[170px]" : "h-[76px] w-full sm:w-[118px]";

  if (variant === "yellow") {
    return (
      <div className={`${sizeClass} relative shrink-0 overflow-hidden bg-[#f2d600]`}>
        <div className="absolute -left-7 top-0 h-[120%] w-[55%] rotate-[-10deg] bg-white shadow-md" />
        <div className="absolute left-1 top-1 grid h-[96px] w-[82px] rotate-[-10deg] grid-cols-3 gap-px bg-neutral-300 opacity-70">
          {Array.from({ length: 18 }).map((_, i) => <span key={i} className="bg-white" />)}
        </div>
      </div>
    );
  }
  if (variant === "orange") return <div className={`${sizeClass} shrink-0 bg-[radial-gradient(circle_at_20%_45%,#ee8e4d_0,#ee8e4d_22%,#ff762c_23%,#ff762c_63%,#fff_64%)]`} />;
  if (variant === "office") return <div className={`${sizeClass} shrink-0 bg-[linear-gradient(135deg,#c7b18d,#e8e3da_38%,#743b2f_39%,#b16539_68%,#e9e1d5)]`} />;
  return <div className={`${sizeClass} shrink-0 bg-[linear-gradient(180deg,#f1f1f1_0%,#f1f1f1_45%,#54534f_46%,#54534f_100%)]`} />;
}

function AuthorAvatar({ photo }: { photo?: boolean }) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ${photo ? "bg-[radial-gradient(circle,#78523d,#1c1c1c)]" : "bg-neutral-200"}`}>
      <UserRound className="h-7 w-7 text-white/75" strokeWidth={1.3} aria-hidden />
    </div>
  );
}

export function CompanyNewsPage() {
  return (
    <div className="bg-white text-black">
      <section className="flex min-h-[240px] flex-col items-center justify-center bg-black px-4 py-10 text-center text-white sm:px-6 sm:py-14">
        <h1 className="text-[clamp(2rem,10vw,4.5rem)] font-bold tracking-[0.04em] sm:tracking-[0.08em]">Company News</h1>
        <p className="mt-6 max-w-[650px] text-base font-medium leading-snug text-white/95 sm:mt-9">
          Stay updated with the latest announcements, achievements, and important updates across the organization.
        </p>
      </section>

      <main className="mx-auto max-w-[1080px] px-5 py-8 sm:px-8 lg:px-0">
        <section className="grid gap-10 lg:grid-cols-[1.45fr_0.75fr]">
          <div>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-semibold">News</h2>
                <button className="mt-5 inline-flex items-center gap-2 text-sm text-neutral-900"><Plus className="h-4 w-4" /> Add <ChevronDown className="h-3 w-3" /></button>
              </div>
              <a className="text-xs font-semibold" href="#see-all">See all</a>
            </div>
            <div className="divide-y divide-neutral-200">
              {FEATURED_NEWS.map((item) => (
                <article key={item.title} className="flex flex-col gap-4 py-4 first:pt-0 sm:flex-row sm:gap-5">
                  <NewsThumb variant={item.image} large />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold">{item.title}</h3>
                    <p className="mt-2 line-clamp-1 text-sm text-neutral-600">{item.summary}</p>
                    <p className="mt-5 text-xs font-semibold text-neutral-800">{item.author} <span className="font-normal">{item.date}</span></p>
                    <p className="text-xs text-neutral-500">{item.views}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside>
            <h2 className="mb-7 text-2xl font-semibold">Authors</h2>
            <div className="space-y-6">
              {AUTHORS.map((author) => (
                <div key={author.name} className="flex items-center gap-4">
                  <AuthorAvatar photo={author.photo} />
                  <div>
                    <p className="text-sm font-semibold">{author.name}</p>
                    <p className="text-xs text-neutral-600">{author.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </main>

      <section className="bg-black px-5 py-8 text-white sm:px-8">
        <div className="mx-auto grid max-w-[1080px] gap-4 md:grid-cols-4">
          {[{label:"Employee Recognition", icon:UsersRound},{label:"Events Calendar", icon:CalendarDays},{label:"Policy Updates", icon:RefreshCw},{label:"Add your own title", icon:CirclePlus}].map(({label, icon:Icon}) => (
            <a key={label} href="#" className="flex h-[48px] items-center gap-3 border border-white/70 px-4 text-sm font-semibold hover:bg-white hover:text-black">
              <Icon className="h-5 w-5" /> {label}
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1080px] gap-10 px-5 py-8 sm:px-8 lg:grid-cols-3 lg:px-0">
        <div>
          <h2 className="mb-5 text-2xl font-semibold">Employee Updates</h2>
          <button className="mb-6 inline-flex items-center gap-2 text-sm"><Plus className="h-4 w-4" /> Add <ChevronDown className="h-3 w-3" /></button>
          <article className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row">
            <NewsThumb variant="orange" />
            <div><h3 className="font-semibold">New Employee Benefit</h3><p className="mt-2 line-clamp-1 text-sm text-neutral-600">New employee benefits at Lamna...</p><p className="mt-4 text-xs font-semibold">zulfiqar khan <span className="font-normal">February 3</span></p><p className="text-xs text-neutral-500">8 views</p></div>
          </article>
        </div>
        <div>
          <h2 className="mb-5 text-2xl font-semibold">Latest Updates</h2>
          <button className="mb-6 inline-flex items-center gap-2 text-sm"><Plus className="h-4 w-4" /> Add <ChevronDown className="h-3 w-3" /></button>
          <article className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row">
            <div className="flex h-[76px] w-[118px] shrink-0 flex-col items-center justify-center bg-black text-white"><Newspaper className="h-6 w-6" /><span className="mt-2 text-sm">Add News</span></div>
            <div><h3 className="font-semibold">Create a news post</h3><p className="mt-2 text-sm text-neutral-600">Keep your audience engaged by...</p><p className="mt-3 text-xs">now</p></div>
          </article>
          {[1,2,3].map(i => <article key={i} className="border-b border-neutral-200 py-5"><h3 className="font-semibold">Title of news post</h3><p className="mt-2 text-sm text-neutral-600">Preview that shows the first few lines of the article.</p><p className="mt-2 text-xs font-semibold">Author name <span className="font-normal">A few seconds ago</span></p></article>)}
        </div>
        <div>
          <h2 className="mb-5 text-2xl font-semibold">News Authored by Me</h2>
          <button className="mb-6 inline-flex items-center gap-2 text-sm"><Plus className="h-4 w-4" /> Add <ChevronDown className="h-3 w-3" /></button>
          <div className="divide-y divide-neutral-200">
            {AUTHORED_BY_ME.map(item => <article key={item.title} className="flex flex-col gap-4 py-4 first:pt-0 sm:flex-row"><NewsThumb variant={item.image} /><div><h3 className="font-semibold">{item.title}</h3><p className="mt-2 line-clamp-1 text-sm text-neutral-600">{item.summary}</p><p className="mt-4 text-xs font-semibold">{item.author} <span className="font-normal">{item.date}</span></p><p className="text-xs text-neutral-500">{item.views}</p></div></article>)}
          </div>
        </div>
      </section>
    </div>
  );
}
