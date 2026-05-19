import { useEffect, useMemo, useState } from "react";
import { CirclePlus, Loader2, Newspaper, Plus, RefreshCw, UserRound, UsersRound, CalendarDays } from "lucide-react";
import {
  AddNewsModal,
  NewsImage,
  SAMPLE_NEWS_ITEMS,
  createCompanyNews,
  fetchCompanyNews,
  type NewsItem,
} from "../components/HomeNewsSection";
import { getActiveAccount, getAccountOid } from "@/auth/entra";

const AUTHORS = [
  { name: "Adam Epstein", title: "CEO", photo: true },
  { name: "Benjamin Viette", title: "Senior Graphic Designer" },
  { name: "Joe Kosin", title: "Director of Booking", photo: true },
  { name: "Andrew Turbiville", title: "Event Business Manager", photo: true },
  { name: "Nichole Beeler", title: "Director of Marketing" },
  { name: "Rebecca Pepe", title: "Director of Marketing" },
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
  return <div className={`${sizeClass} shrink-0 bg-[linear-gradient(135deg,#f5f5f5_0%,#f5f5f5_40%,#5a5a5a_41%,#5a5a5a_100%)]`} />;
}

function AuthorAvatar({ photo }: { photo?: boolean }) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ${photo ? "bg-[radial-gradient(circle,#78523d,#1c1c1c)]" : "bg-neutral-200"}`}>
      <UserRound className="h-7 w-7 text-white/75" strokeWidth={1.3} aria-hidden />
    </div>
  );
}

function NewsListRow({ item, image = "slate", large = true }: { item: NewsItem; image?: string; large?: boolean }) {
  return (
    <article className="flex flex-col gap-4 py-4 first:pt-0 sm:flex-row sm:gap-5">
      <NewsThumb variant={image} large={large} />
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold">{item.title}</h3>
        <p className="mt-2 line-clamp-1 text-sm text-neutral-600">{item.summary}</p>
        <p className="mt-5 text-xs font-semibold text-neutral-800">{item.createdByName}</p>
      </div>
    </article>
  );
}

export function CompanyNewsPage() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>(SAMPLE_NEWS_ITEMS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentUserOid = getAccountOid(getActiveAccount());
  const authoredByMe = useMemo(
    () => newsItems.filter((item) => currentUserOid && item.createdBy === currentUserOid),
    [currentUserOid, newsItems],
  );

  const loadNews = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchCompanyNews(24);
      setNewsItems(rows.length > 0 ? rows : SAMPLE_NEWS_ITEMS);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load news.");
      setNewsItems(SAMPLE_NEWS_ITEMS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNews();
  }, []);

  const handleAddNews = async (values: { title: string; summary: string; body: string }) => {
    const saved = await createCompanyNews(values);
    setNewsItems((previous) => [saved, ...previous.filter((item) => item.id !== saved.id)]);
  };

  const [firstNews, secondNews, thirdNews, fourthNews] = newsItems;
  const pageNews = newsItems.slice(0, 4);
  const latestNews = newsItems.slice(0, 4);
  const myNews = authoredByMe.length > 0 ? authoredByMe.slice(0, 3) : newsItems.slice(0, 3);

  return (
    <div className="bg-white text-black">
      <section className="flex min-h-[240px] flex-col items-center justify-center bg-black px-4 py-10 text-center text-white sm:px-6 sm:py-14">
        <h1 className="text-[clamp(2rem,10vw,4.5rem)] font-bold tracking-[0.04em] sm:tracking-[0.08em]">Company News</h1>
        <p className="mt-6 max-w-[650px] text-base font-medium leading-snug text-white/95 sm:mt-9">
          Stay updated with the latest announcements, achievements, and important updates across the organization.
        </p>
      </section>

      <main className="mx-auto max-w-[1080px] px-5 py-8 sm:px-8 lg:px-0">
        {loadError ? (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>Showing sample news because live news could not be loaded.</span>
            <button type="button" onClick={() => void loadNews()} className="inline-flex items-center gap-1 font-semibold hover:underline"><RefreshCw className="h-3.5 w-3.5" /> Retry</button>
          </div>
        ) : null}

        <section className="grid gap-10 lg:grid-cols-[1.45fr_0.75fr]">
          <div>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-semibold">News</h2>
                <button type="button" onClick={() => setIsModalOpen(true)} className="mt-5 inline-flex items-center gap-2 text-sm text-neutral-900"><Plus className="h-4 w-4" /> Add</button>
              </div>
              <a className="text-xs font-semibold" href="#see-all">See all</a>
            </div>
            {isLoading ? (
              <div className="flex min-h-[240px] items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-sm font-semibold text-neutral-700"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading news...</div>
            ) : (
              <div className="divide-y divide-neutral-200">
                {pageNews.map((item, index) => <NewsListRow key={item.id} item={item} image={index === 0 ? "yellow" : index === 2 ? "orange" : "slate"} />)}
              </div>
            )}
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
          <button type="button" onClick={() => setIsModalOpen(true)} className="mb-6 inline-flex items-center gap-2 text-sm"><Plus className="h-4 w-4" /> Add</button>
          {thirdNews ? <NewsListRow item={thirdNews} image="orange" large={false} /> : null}
        </div>
        <div>
          <h2 className="mb-5 text-2xl font-semibold">Latest Updates</h2>
          <button type="button" onClick={() => setIsModalOpen(true)} className="mb-6 inline-flex items-center gap-2 text-sm"><Plus className="h-4 w-4" /> Add</button>
          <article className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row">
            <div className="flex h-[76px] w-[118px] shrink-0 flex-col items-center justify-center bg-black text-white"><Newspaper className="h-6 w-6" /><span className="mt-2 text-sm">Add News</span></div>
            <div><h3 className="font-semibold">Create a news post</h3><p className="mt-2 text-sm text-neutral-600">Keep your audience engaged by...</p><p className="mt-3 text-xs">Created by user</p></div>
          </article>
          {latestNews.slice(1, 4).map((item) => <article key={item.id} className="border-b border-neutral-200 py-5"><h3 className="font-semibold">{item.title}</h3><p className="mt-2 text-sm text-neutral-600">{item.summary}</p><p className="mt-2 text-xs font-semibold">{item.createdByName}</p></article>)}
        </div>
        <div>
          <h2 className="mb-5 text-2xl font-semibold">News Authored by Me</h2>
          <button type="button" onClick={() => setIsModalOpen(true)} className="mb-6 inline-flex items-center gap-2 text-sm"><Plus className="h-4 w-4" /> Add</button>
          <div className="divide-y divide-neutral-200">
            {myNews.map((item, index) => <NewsListRow key={item.id} item={item} image={index === 0 ? "yellow" : "slate"} large={false} />)}
          </div>
        </div>
      </section>

      <AddNewsModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddNews} />
    </div>
  );
}
