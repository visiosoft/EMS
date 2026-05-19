import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CirclePlus, Loader2, Plus, RefreshCw, UserRound, UsersRound } from "lucide-react";
import {
  AddNewsModal,
  EmptyNewsState,
  createCompanyNews,
  type NewsItem,
} from "../components/HomeNewsSection";
import { apiFetch } from "@/api/config";

const NEWS_PAGE_SIZE = 3;

async function fetchNewsChunk(skip = 0): Promise<NewsItem[]> {
  return apiFetch<NewsItem[]>(`/internal/news?limit=${NEWS_PAGE_SIZE}&skip=${skip}`);
}

function NewsThumb({ variant, large = false }: { variant: string; large?: boolean }) {
  const sizeClass = large ? "h-[92px] w-full sm:w-[190px]" : "h-[76px] w-full sm:w-[118px]";

  if (variant === "yellow") {
    return (
      <div className={`${sizeClass} relative shrink-0 overflow-hidden bg-[#f2d600]`}>
        <div className="absolute -left-7 top-0 h-[120%] w-[55%] rotate-[-10deg] bg-white shadow-md" />
        <div className="absolute left-1 top-1 grid h-[104px] w-[92px] rotate-[-10deg] grid-cols-3 gap-px bg-neutral-300 opacity-70">
          {Array.from({ length: 18 }).map((_, i) => <span key={i} className="bg-white" />)}
        </div>
      </div>
    );
  }
  if (variant === "orange") return <div className={`${sizeClass} shrink-0 bg-[radial-gradient(circle_at_20%_45%,#ee8e4d_0,#ee8e4d_22%,#ff762c_23%,#ff762c_63%,#fff_64%)]`} />;
  if (variant === "office") return <div className={`${sizeClass} shrink-0 bg-[linear-gradient(135deg,#c7b18d,#e8e3da_38%,#743b2f_39%,#b16539_68%,#e9e1d5)]`} />;
  return <div className={`${sizeClass} shrink-0 bg-[linear-gradient(135deg,#f5f5f5_0%,#f5f5f5_40%,#5a5a5a_41%,#5a5a5a_100%)]`} />;
}

function AuthorAvatar() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200">
      <UserRound className="h-7 w-7 text-neutral-500" strokeWidth={1.3} aria-hidden />
    </div>
  );
}

function NewsListRow({ item, image = "slate", large = true }: { item: NewsItem; image?: string; large?: boolean }) {
  return (
    <article className="group grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.08)] sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-5">
      <NewsThumb variant={image} large={large} />
      <div className="flex min-w-0 flex-col justify-center">
        <h3 className="text-lg font-semibold tracking-[-0.01em] text-neutral-950 group-hover:underline group-hover:underline-offset-4">{item.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">{item.summary}</p>
        <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-neutral-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"><UserRound className="h-4 w-4" aria-hidden /></span>
          {item.createdByName}
        </div>
      </div>
    </article>
  );
}

export function CompanyNewsPage() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const authors = useMemo(() => {
    const unique = new Map<string, string>();
    newsItems.forEach((item) => {
      const key = item.createdBy ?? item.createdByName;
      if (key && item.createdByName && item.createdByName !== "Unknown user" && item.createdByName !== "Entra user") {
        unique.set(key, item.createdByName);
      }
    });
    return Array.from(unique.values()).map((name) => ({ name, title: "Microsoft 365 author" }));
  }, [newsItems]);

  const loadNews = async (mode: "initial" | "more" = "initial") => {
    const isMore = mode === "more";
    if (isMore && (!hasMore || isLoadingMore)) return;

    if (isMore) setIsLoadingMore(true);
    else setIsLoading(true);
    setLoadError(null);

    try {
      const rows = await fetchNewsChunk(isMore ? newsItems.length : 0);
      setNewsItems((previous) => (isMore ? [...previous, ...rows] : rows));
      setHasMore(rows.length === NEWS_PAGE_SIZE);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load news.");
      if (!isMore) setNewsItems([]);
    } finally {
      if (isMore) setIsLoadingMore(false);
      else setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNews();
  }, []);

  const handleAddNews = async (values: { title: string; summary: string; body: string }) => {
    const saved = await createCompanyNews(values);
    setNewsItems((previous) => [saved, ...previous.filter((item) => item.id !== saved.id)]);
    setHasMore(true);
  };

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
            <span>Live news could not be loaded.</span>
            <button type="button" onClick={() => void loadNews()} className="inline-flex items-center gap-1 font-semibold hover:underline"><RefreshCw className="h-3.5 w-3.5" /> Retry</button>
          </div>
        ) : null}

        <section className="grid gap-10 lg:grid-cols-[1.45fr_0.75fr]">
          <div>
            <div className="mb-5 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-semibold">News</h2>
                <button type="button" onClick={() => setIsModalOpen(true)} className="mt-5 inline-flex items-center gap-2 text-sm text-neutral-900"><Plus className="h-4 w-4" /> Add</button>
              </div>
            </div>
            {isLoading ? (
              <div className="flex min-h-[240px] items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-sm font-semibold text-neutral-700"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading news...</div>
            ) : newsItems.length === 0 ? (
              <EmptyNewsState onAdd={() => setIsModalOpen(true)} />
            ) : (
              <>
                <div className="space-y-4">
                  {newsItems.map((item, index) => <NewsListRow key={item.id} item={item} image={index % 3 === 0 ? "yellow" : index % 3 === 2 ? "orange" : "slate"} />)}
                </div>
                {hasMore ? (
                  <div className="mt-6 flex justify-center">
                    <button type="button" onClick={() => void loadNews("more")} disabled={isLoadingMore} className="inline-flex h-11 min-w-[160px] items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-900 transition hover:border-black hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60">
                      {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : "Load more news"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <aside>
            <h2 className="mb-7 text-2xl font-semibold">Authors</h2>
            {isLoading ? (
              <div className="flex min-h-[160px] items-center text-sm font-semibold text-neutral-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading authors...</div>
            ) : authors.length === 0 ? (
              <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-sm text-neutral-600">Authors will appear after news is added.</div>
            ) : (
              <div className="space-y-6">
                {authors.map((author) => (
                  <div key={author.name} className="flex items-center gap-4">
                    <AuthorAvatar />
                    <div>
                      <p className="text-sm font-semibold">{author.name}</p>
                      <p className="text-xs text-neutral-600">{author.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      <AddNewsModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddNews} />
    </div>
  );
}
