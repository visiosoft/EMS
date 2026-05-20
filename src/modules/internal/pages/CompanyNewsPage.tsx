import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CirclePlus, Loader2, Newspaper, Plus, RefreshCw, Sparkles, UserRound, UsersRound } from "lucide-react";
import {
  AddNewsModal,
  EmptyNewsState,
  NewsImage,
  createCompanyNews,
  type NewsItem,
} from "../components/HomeNewsSection";
import { apiFetch } from "@/api/config";
import { cn } from "@/lib/utils";
import { InternalPageFrame } from "../layout/InternalPageFrame";

const NEWS_PAGE_SIZE = 3;

const COMPANY_NEWS_FOOTER_LINKS = [
  { label: "Employee Recognition", icon: UsersRound, href: "https://www.google.com" },
  { label: "Events Calendar", icon: CalendarDays, href: "https://www.google.com" },
  { label: "Policy Updates", icon: RefreshCw, href: "https://www.google.com" },
  {
    label: "Add your own title",
    icon: CirclePlus,
    href: "https://innovationae.sharepoint.com/_layouts/15/images/DesignIdeasCuratedImage3.jpg",
  },
] as const;

const VISUAL_VARIANTS = ["yellow", "orange", "slate", "office"] as const;

async function fetchNewsChunk(skip = 0): Promise<NewsItem[]> {
  return apiFetch<NewsItem[]>(`/internal/news?limit=${NEWS_PAGE_SIZE}&skip=${skip}`);
}

function formatNewsDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function AuthorAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass =
    size === "lg" ? "h-11 w-11" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconClass = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 ring-2 ring-white",
        sizeClass,
      )}
    >
      <UserRound className={cn(iconClass, "text-neutral-500")} strokeWidth={1.3} aria-hidden />
    </div>
  );
}

function CompanyNewsVisual({ variant, featured = false }: { variant: (typeof VISUAL_VARIANTS)[number]; featured?: boolean }) {
  if (featured) {
    return (
      <div className="relative overflow-hidden">
        <NewsImage featured />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" aria-hidden />
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
          <Sparkles className="h-3 w-3" aria-hidden />
          Latest
        </span>
      </div>
    );
  }

  if (variant === "yellow") {
    return (
      <div className="relative h-full min-h-[200px] w-full overflow-hidden bg-[#f2d600] md:min-h-[220px] md:w-[260px]">
        <div className="absolute -left-8 top-0 h-[120%] w-[55%] rotate-[-10deg] bg-white shadow-lg" />
        <div className="absolute left-2 top-2 grid h-[200px] w-[110px] rotate-[-10deg] grid-cols-3 gap-px bg-neutral-300/80 md:h-[220px] md:w-[120px]">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="bg-white/90" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "orange") {
    return (
      <div className="h-full min-h-[200px] w-full bg-[radial-gradient(circle_at_20%_45%,#ee8e4d_0,#ee8e4d_22%,#ff762c_23%,#ff762c_63%,#fff_64%)] md:min-h-[220px] md:w-[260px]" />
    );
  }

  if (variant === "office") {
    return (
      <div className="h-full min-h-[200px] w-full bg-[linear-gradient(135deg,#c7b18d,#e8e3da_38%,#743b2f_39%,#b16539_68%,#e9e1d5)] md:min-h-[220px] md:w-[260px]" />
    );
  }

  return (
    <div className="relative h-full min-h-[200px] w-full overflow-hidden bg-[linear-gradient(135deg,#f0f0f0_0%,#d4d4d4_45%,#404040_46%,#2a2a2a_100%)] md:min-h-[220px] md:w-[260px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35)_0,transparent_55%)]" aria-hidden />
    </div>
  );
}

function AuthorMeta({ item, large = false }: { item: NewsItem; large?: boolean }) {
  const dateLabel = formatNewsDate(item.createdAt);

  return (
    <div className={cn("flex items-center gap-3", large && "mt-6")}>
      <AuthorAvatar size={large ? "lg" : "md"} />
      <div className="min-w-0">
        <p className={cn("font-semibold text-neutral-900", large ? "text-sm" : "text-xs")}>{item.createdByName}</p>
        <p className="text-xs text-neutral-500">{dateLabel ?? "Company Hub author"}</p>
      </div>
    </div>
  );
}

function CompanyNewsFeaturedCard({ item, variant }: { item: NewsItem; variant: (typeof VISUAL_VARIANTS)[number] }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(0,0,0,0.12)]">
      <CompanyNewsVisual variant={variant} featured />
      <div className="space-y-4 p-6 sm:p-8">
        <h3 className="text-[clamp(1.5rem,4vw,2.125rem)] font-bold leading-[1.15] tracking-[-0.02em] text-neutral-950 transition-colors group-hover:text-black">
          {item.title}
        </h3>
        <p className="max-w-[720px] text-base leading-relaxed text-neutral-600 sm:text-[17px]">{item.summary}</p>
        <AuthorMeta item={item} large />
      </div>
    </article>
  );
}

function CompanyNewsCard({
  item,
  variant,
  index,
}: {
  item: NewsItem;
  variant: (typeof VISUAL_VARIANTS)[number];
  index: number;
}) {
  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_18px_44px_rgba(0,0,0,0.1)] md:flex-row"
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
    >
      <span
        className="absolute left-0 top-0 z-10 hidden h-full w-1 bg-black opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:block"
        aria-hidden
      />
      <div className="shrink-0 overflow-hidden md:w-[260px]">
        <CompanyNewsVisual variant={variant} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Announcement</p>
        <h3 className="mt-2 text-xl font-bold leading-snug tracking-[-0.02em] text-neutral-950 transition-colors group-hover:underline group-hover:underline-offset-4 sm:text-2xl">
          {item.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-[15px] leading-7 text-neutral-600 sm:line-clamp-2 sm:text-base">{item.summary}</p>
        <AuthorMeta item={item} />
      </div>
    </article>
  );
}

function AuthorsPanel({
  authors,
  isLoading,
}: {
  authors: { name: string; title: string }[];
  isLoading: boolean;
}) {
  return (
    <aside className="rounded-2xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] xl:sticky xl:top-20 xl:self-start">
      <div className="mb-6 flex items-center gap-2">
        <UsersRound className="h-5 w-5 text-neutral-700" aria-hidden />
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-neutral-950">Authors</h2>
      </div>
      {isLoading ? (
        <div className="flex min-h-[160px] items-center text-sm font-semibold text-neutral-600">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          Loading authors...
        </div>
      ) : authors.length === 0 ? (
        <p className="text-sm leading-relaxed text-neutral-600">Authors will appear after news is published.</p>
      ) : (
        <ul className="space-y-5">
          {authors.map((author) => (
            <li key={author.name} className="flex items-center gap-4 rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
              <AuthorAvatar />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900">{author.name}</p>
                <p className="text-xs text-neutral-500">{author.title}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
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

  const [featuredItem, ...moreItems] = newsItems;

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

  const footerLinks = (
    <section className="bg-black px-5 py-8 text-white sm:px-8">
      <div className="mx-auto grid max-w-[1240px] gap-4 md:grid-cols-2 lg:grid-cols-4">
        {COMPANY_NEWS_FOOTER_LINKS.map(({ label, icon: Icon, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex h-[48px] w-full items-center gap-3 border border-white/70 px-4 text-left text-sm font-semibold transition hover:bg-white hover:text-black"
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            {label}
          </a>
        ))}
      </div>
    </section>
  );

  return (
    <InternalPageFrame footer={footerLinks}>
      <section className="flex min-h-[260px] shrink-0 flex-col items-center justify-center bg-black px-4 py-12 text-center text-white sm:px-6 sm:py-16">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90">
          <Newspaper className="h-3.5 w-3.5" aria-hidden />
          Internal communications
        </p>
        <h1 className="text-[clamp(2.25rem,9vw,4.25rem)] font-bold tracking-[0.04em]">Company News</h1>
        <p className="mt-6 max-w-[680px] text-base font-medium leading-relaxed text-white/92 sm:mt-8 sm:text-lg">
          Stay updated with the latest announcements, achievements, and important updates across the organization.
        </p>
      </section>

      <main className="mx-auto w-full max-w-[1240px] px-5 py-10 sm:px-8 lg:px-10">
        {loadError ? (
          <div className="mb-8 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <span>Live news could not be loaded.</span>
            <button
              type="button"
              onClick={() => void loadNews()}
              className="inline-flex items-center gap-1 font-semibold hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Retry
            </button>
          </div>
        ) : null}

        <section className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-12">
          <div className="min-w-0">
            <div className="mb-8 flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-bold tracking-[-0.02em] text-neutral-950">News</h2>
                  {!isLoading && newsItems.length > 0 ? (
                    <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
                      {newsItems.length} {newsItems.length === 1 ? "story" : "stories"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-neutral-600">
                  Read the latest updates from across iAE. The newest announcement is highlighted at the top.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add news
              </button>
            </div>

            {isLoading ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 text-sm font-semibold text-neutral-700">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" aria-hidden />
                Loading news...
              </div>
            ) : newsItems.length === 0 ? (
              <EmptyNewsState onAdd={() => setIsModalOpen(true)} />
            ) : (
              <div className="space-y-8">
                {featuredItem ? (
                  <CompanyNewsFeaturedCard item={featuredItem} variant={VISUAL_VARIANTS[0]} />
                ) : null}

                {moreItems.length > 0 ? (
                  <div className="space-y-6">
                    {moreItems.map((item, index) => (
                      <CompanyNewsCard
                        key={item.id}
                        item={item}
                        variant={VISUAL_VARIANTS[(index + 1) % VISUAL_VARIANTS.length]}
                        index={index}
                      />
                    ))}
                  </div>
                ) : null}

                {hasMore ? (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => void loadNews("more")}
                      disabled={isLoadingMore}
                      className="inline-flex h-12 min-w-[200px] items-center justify-center gap-2 rounded-full border-2 border-neutral-900 bg-white px-8 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Loading...
                        </>
                      ) : (
                        "Load more news"
                      )}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <AuthorsPanel authors={authors} isLoading={isLoading} />
        </section>
      </main>

      <AddNewsModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddNews} />
    </InternalPageFrame>
  );
}
