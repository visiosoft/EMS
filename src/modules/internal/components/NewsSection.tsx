import { useRef, useEffect, useState } from "react";
import { Plus, ChevronDown } from "lucide-react";

/* ─────────────────────────────────────────────
   Mock news data matching the SharePoint screenshots
───────────────────────────────────────────────── */
const FEATURED_ARTICLE = {
  id: "feat-1",
  title: "Company News",
  excerpt:
    "Company News – Stay updated with the latest announcements, achievements, and highlights from across iAE.",
  author: "Haider Khalil",
  date: "about an hour ago",
  views: 45,
  imageBg: "linear-gradient(135deg, #e8c840 0%, #f0d860 40%, #d4b830 100%)",
  imageContent: "calendar", // renders the calendar graphic
};

const SIDE_ARTICLES = [
  {
    id: "art-1",
    title: "Highlights and plans",
    excerpt: "Highlights and plans from the AI Team January 1, 2025…",
    author: "Haider Khalil",
    date: "February 18",
    views: 6,
    imageBg: "#2a2a2a",
  },
  {
    id: "art-2",
    title: "New Employee Benefit",
    excerpt: "New employee benefits at Lamna Healthcare Company…",
    author: "zulfiqar khan",
    date: "February 3",
    views: 8,
    imageBg: "linear-gradient(135deg, #e05c20 0%, #f07040 100%)",
  },
];

const BOTTOM_ARTICLE = {
  id: "art-3",
  title: "iAE new Version is ready for launch",
  excerpt: "Highlights and plans from the AI Team January 1, 2025…",
  author: "zulfiqar khan",
  date: "February 3",
  views: 7,
  imageBg: "#2a2a2a",
};

/* ─────────────────────────────────────────────
   Calendar Illustration (matches screenshot placeholder)
───────────────────────────────────────────────── */
function CalendarIllustration() {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full opacity-90"
      aria-hidden
    >
      {/* Calendar body */}
      <rect x="20" y="30" width="120" height="110" rx="4" fill="white" fillOpacity="0.95" />
      {/* Header bar */}
      <rect x="20" y="30" width="120" height="28" rx="4" fill="#1a1a1a" />
      <rect x="20" y="44" width="120" height="14" fill="#1a1a1a" />
      {/* Binding posts */}
      <rect x="46" y="22" width="8" height="20" rx="4" fill="#555" />
      <rect x="106" y="22" width="8" height="20" rx="4" fill="#555" />
      {/* Grid lines */}
      {[68, 87, 106, 125].map((y) => (
        <line key={y} x1="20" y1={y} x2="140" y2={y} stroke="#e5e5e5" strokeWidth="1" />
      ))}
      {[55, 75, 95, 115, 135].map((x) => (
        <line key={x} x1={x} y1="58" x2={x} y2="140" stroke="#e5e5e5" strokeWidth="1" />
      ))}
      {/* Sample day numbers */}
      {[
        [30, 65], [50, 65], [70, 65], [90, 65], [110, 65], [130, 65],
        [30, 84], [50, 84], [70, 84], [90, 84], [110, 84], [130, 84],
        [30, 103],[50, 103],[70, 103],[90, 103],[110, 103],[130, 103],
        [30, 122],[50, 122],[70, 122],[90, 122],[110, 122],[130, 122],
      ].map(([x, y], i) => (
        <text key={i} x={x} y={y} textAnchor="middle" fontSize="9" fill="#444" fontFamily="sans-serif">
          {i + 1}
        </text>
      ))}
      {/* Highlighted day */}
      <circle cx="70" cy="103" r="8" fill="#1a1a1a" />
      <text x="70" y="107" textAnchor="middle" fontSize="9" fill="white" fontFamily="sans-serif" fontWeight="bold">
        7
      </text>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Tiny person silhouette for author placeholder
───────────────────────────────────────────────── */
function AuthorAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-300 text-[9px] font-bold text-neutral-700 shrink-0">
      {initials}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Article card – side small variant
───────────────────────────────────────────────── */
function SmallArticleCard({
  article,
  delay = 0,
  visible,
}: {
  article: typeof SIDE_ARTICLES[0];
  delay?: number;
  visible: boolean;
}) {
  return (
    <a
      href="#news"
      className="group flex gap-3 border-b border-neutral-100 pb-4 last:border-0 last:pb-0"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(20px)",
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      {/* Thumbnail */}
      <div
        className="h-16 w-24 shrink-0 rounded overflow-hidden"
        style={{ background: article.imageBg }}
      />
      {/* Text */}
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-black leading-snug group-hover:underline line-clamp-2 mb-1">
          {article.title}
        </h4>
        <p className="text-xs text-neutral-500 line-clamp-2 leading-snug mb-1.5">
          {article.excerpt}
        </p>
        <div className="flex items-center gap-1.5">
          <AuthorAvatar name={article.author} />
          <span className="text-xs font-medium text-neutral-700">{article.author}</span>
          <span className="text-xs text-neutral-400">{article.date}</span>
        </div>
        <p className="text-xs text-neutral-400 mt-0.5">{article.views} views</p>
      </div>
    </a>
  );
}

/* ─────────────────────────────────────────────
   Main NewsSection export
───────────────────────────────────────────────── */
export function NewsSection() {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) { setVisible(true); io.disconnect(); }
      },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="mt-8"
      aria-label="News"
    >
      {/* Section header */}
      <div
        className="mb-4 flex items-center justify-between gap-3"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.45s ease 0ms, transform 0.45s ease 0ms",
        }}
      >
        <h2 className="text-xl font-bold text-black">News</h2>
        <a href="#news-all" className="text-sm font-medium text-neutral-600 hover:underline underline-offset-2">
          See all
        </a>
      </div>

      {/* Add button */}
      <div
        className="mb-5"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.45s ease 60ms, transform 0.45s ease 60ms",
        }}
      >
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-neutral-50 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add
          <ChevronDown className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
        </button>
      </div>

      {/* ── Primary grid: Featured (left) + 2 side articles (right) ── */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Featured / large card */}
        <a
          href="#news-featured"
          className="group block overflow-hidden rounded-sm border border-neutral-100 hover:shadow-md transition-shadow"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.55s ease 120ms, transform 0.55s ease 120ms",
          }}
        >
          {/* Image area */}
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
            <div
              className="absolute inset-0 flex items-center justify-center p-8"
              style={{ background: FEATURED_ARTICLE.imageBg }}
            >
              <CalendarIllustration />
            </div>
          </div>
          {/* Text below */}
          <div className="px-4 py-3.5">
            <h3 className="text-base font-bold text-black group-hover:underline underline-offset-2 leading-snug mb-1">
              {FEATURED_ARTICLE.title}
            </h3>
            <p className="text-sm text-neutral-500 line-clamp-2 leading-snug mb-3">
              {FEATURED_ARTICLE.excerpt}
            </p>
            <div className="flex items-center gap-2">
              <AuthorAvatar name={FEATURED_ARTICLE.author} />
              <span className="text-xs font-semibold text-neutral-700">
                {FEATURED_ARTICLE.author}
              </span>
              <span className="text-xs text-neutral-400">{FEATURED_ARTICLE.date}</span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">{FEATURED_ARTICLE.views} views</p>
          </div>
        </a>

        {/* Side articles stacked */}
        <div
          className="flex flex-col gap-4 border border-neutral-100 rounded-sm p-4"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateX(0)" : "translateX(20px)",
            transition: "opacity 0.55s ease 180ms, transform 0.55s ease 180ms",
          }}
        >
          {SIDE_ARTICLES.map((art, i) => (
            <SmallArticleCard
              key={art.id}
              article={art}
              delay={220 + i * 80}
              visible={visible}
            />
          ))}
        </div>
      </div>

      {/* ── Secondary row: Company News (left) + another article (right) ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Company News (large text card) */}
        <a
          href="#company-news"
          className="group block overflow-hidden rounded-sm border border-neutral-100 p-4 hover:shadow-md transition-shadow"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.5s ease 300ms, transform 0.5s ease 300ms",
          }}
        >
          <h3 className="text-base font-bold text-black group-hover:underline underline-offset-2 leading-snug mb-1">
            Company News
          </h3>
          <p className="text-sm text-neutral-500 line-clamp-2 leading-snug mb-3">
            Company News – Stay updated with the latest announcements, achievements, an…
          </p>
          <div className="flex items-center gap-2">
            <AuthorAvatar name="Haider Khalil" />
            <span className="text-xs font-semibold text-neutral-700">Haider Khalil</span>
            <span className="text-xs text-neutral-400">about an hour ago</span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">45 views</p>
        </a>

        {/* Bottom right article with thumbnail */}
        <a
          href="#iae-launch"
          className="group flex gap-3 overflow-hidden rounded-sm border border-neutral-100 p-4 hover:shadow-md transition-shadow items-start"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateX(0)" : "translateX(20px)",
            transition: "opacity 0.5s ease 360ms, transform 0.5s ease 360ms",
          }}
        >
          {/* Thumbnail */}
          <div
            className="h-20 w-32 shrink-0 rounded overflow-hidden"
            style={{ background: BOTTOM_ARTICLE.imageBg }}
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-black leading-snug group-hover:underline line-clamp-2 mb-1">
              {BOTTOM_ARTICLE.title}
            </h4>
            <p className="text-xs text-neutral-500 line-clamp-2 leading-snug mb-1.5">
              {BOTTOM_ARTICLE.excerpt}
            </p>
            <div className="flex items-center gap-1.5">
              <AuthorAvatar name={BOTTOM_ARTICLE.author} />
              <span className="text-xs font-medium text-neutral-700">{BOTTOM_ARTICLE.author}</span>
              <span className="text-xs text-neutral-400">{BOTTOM_ARTICLE.date}</span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">{BOTTOM_ARTICLE.views} views</p>
          </div>
        </a>
      </div>
    </section>
  );
}