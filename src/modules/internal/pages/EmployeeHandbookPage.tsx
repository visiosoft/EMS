import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, Banknote, ChevronDown,BookOpen, ChevronLeft, ChevronRight, ClipboardCheck, Home, Lectern, Star, UserRoundCog, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ReactFlipBook } from "@vuvandinh203/react-flipbook";
import { fetchHandbookSections } from "@/api/employeeHandbookApi";
import { useInternalNavigation } from "../routing/InternalNavigationContext";
import type { EmployeeHandbookView } from "../routing/internalSessionRoute";

export type { EmployeeHandbookView };

interface ReactFlipBookRef {
  pageFlip: () => unknown;
  flipNext: () => void;
  flipPrev: () => void;
  flip: (page: number) => void;
  getCurrentPageIndex: () => number | undefined;
  getPageCount: () => number | undefined;
  destroy: () => void;
  startAutoFlip: (delay?: number, direction?: 'next' | 'prev') => void;
  stopAutoFlip: () => void;
}

export type HandbookFlipBookHandle = {
  /** Jump to a page by index, resolving the exact spread (no far-jump glitch). */
  goToPage: (index: number) => void;
};

type HandbookFlipBookProps = {
  pages: ReactNode[];
  pageW: number;
  pageH: number;
  isMobile: boolean;
  startPage: number;
  onPageChange: (index: number) => void;
};

/**
 * Isolated flip-book. Wrapped in React.memo so the parent's frequent re-renders
 * (currentPage/header/rail updates) never reach it — those would otherwise recreate
 * `children` and force the underlying engine to re-initialize, snapping the book back
 * to the cover. All navigation is driven imperatively through the ref, so the parent
 * never has to re-render this subtree to move pages. It only re-renders when the
 * pagination or page dimensions genuinely change.
 */
const HandbookFlipBook = memo(
  forwardRef<HandbookFlipBookHandle, HandbookFlipBookProps>(function HandbookFlipBook(
    { pages, pageW, pageH, isMobile, startPage, onPageChange },
    ref,
  ) {
    const bookRef = useRef<ReactFlipBookRef>(null);

    useImperativeHandle(
      ref,
      () => ({
        goToPage: (index: number) => {
          if (index == null || index < 0) return;
          const clamped = Math.min(index, pages.length - 1);
          const engine = bookRef.current?.pageFlip?.() as
            | { turnToPage?: (page: number) => void }
            | null
            | undefined;
          if (engine && typeof engine.turnToPage === "function") {
            engine.turnToPage(clamped);
          } else {
            bookRef.current?.flip(clamped);
          }
        },
      }),
      [pages.length],
    );

    return (
      <ReactFlipBook
        key={pages.length}
        ref={bookRef}
        width={pageW}
        height={pageH}
        size="fixed"
        showCover={true}
        usePortrait={isMobile}
        flippingTime={700}
        drawShadow
        maxShadowOpacity={0.5}
        enableKeyboardNav
        showPageCorners
        startPage={startPage}
        mobileScrollSupport={false}
        onFlip={(e: { data: number }) => onPageChange(e.data)}
        renderNavigationButton={(type, onClick) => (
          <button
            type="button"
            onClick={onClick}
            aria-label={type === "prev" ? "Previous page" : "Next page"}
            className="absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/[0.08] bg-neutral-950/60 p-2.5 text-white/40 shadow-lg backdrop-blur-md transition-all duration-200 hover:border-white/20 hover:bg-neutral-950/80 hover:text-white/70"
            style={{ [type === "prev" ? "left" : "right"]: "4px" }}
          >
            {type === "prev" ? (
              <ChevronLeft className="size-4" strokeWidth={2} />
            ) : (
              <ChevronRight className="size-4" strokeWidth={2} />
            )}
          </button>
        )}
        renderPageNumber={(current, total) => (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
            <span className="rounded-full bg-white/90 px-3 py-0.5 text-[10px] font-medium text-black backdrop-blur-sm">
              {current + 1} / {total}
            </span>
          </div>
        )}
      >
        {pages}
      </ReactFlipBook>
    );
  }),
);

type HandbookSectionId =
  | "introduction"
  | "employment-policies"
  | "company-policies"
  | "compensation-benefits"
  | "work-performance"
  | "procedures-and-guidelines"
  | "employee-acknowledgment";

type HandbookSection = {
  id: HandbookSectionId;
  title: string;
  heroTitle: string;
  hash: string;
  icon: LucideIcon;
};

type HandbookContentBlock =
  | { kind: "paragraph"; text: string; italic?: boolean }
  | { kind: "heading"; text: string; italic?: boolean }
  | { kind: "list"; items: string[] }
  | { kind: "list-item"; text: string };

type HandbookSubsection = {
  id: string;
  title: string;
  blocks: HandbookContentBlock[];
};

type HandbookDetailSection = {
  id: HandbookSectionId;
  heroTitle: string;
  subsections: HandbookSubsection[];
};

const handbookStageImage = "/images/internal/bf7ddb8a-fab3-42ff-8fce-15c415b150c8";

const handbookSections: HandbookSection[] = [
  { id: "introduction", title: "Introduction", heroTitle: "1. Introduction", hash: "handbook-introduction", icon: Lectern },
  {
    id: "employment-policies",
    title: "Employment Policies and Practices",
    heroTitle: "2. Employment Policies and Practices",
    hash: "handbook-employment-policies",
    icon: UserRoundCog,
  },
  {
    id: "company-policies",
    title: "Company Policies and Practices",
    heroTitle: "3. Company Policies and Practices",
    hash: "handbook-company-policies",
    icon: Home,
  },
  {
    id: "compensation-benefits",
    title: "Compensation and Benefits",
    heroTitle: "4. Compensation and Benefits",
    hash: "handbook-compensation-benefits",
    icon: Banknote,
  },
  { id: "work-performance", title: "Work Performance", heroTitle: "5. Work Performance", hash: "handbook-work-performance", icon: Star },
  {
    id: "procedures-and-guidelines",
    title: "Department Guides and Procedures",
    heroTitle: "6. Procedures and Guidelines",
    hash: "handbook-procedures-and-guidelines",
    icon: BookOpen,
  },
  {
    id: "employee-acknowledgment",
    title: "Employee Acknowledgment Form",
    heroTitle: "7. Employee Acknowledgment",
    hash: "handbook-employee-acknowledgment",
    icon: ClipboardCheck,
  },
];

function parseContentBlocks(content: string): HandbookContentBlock[] {
  try {
    return JSON.parse(content) as HandbookContentBlock[];
  } catch {
    return [];
  }
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function splitIntoSubsections(blocks: HandbookContentBlock[]): { title: string; blocks: HandbookContentBlock[] }[] {
  const subsections: { title: string; blocks: HandbookContentBlock[] }[] = [];
  let current: { title: string; blocks: HandbookContentBlock[] } | null = null;

  for (const block of blocks) {
    if (block.kind === "heading" && /^\d+\.\d+\s/.test(block.text)) {
      if (current) {
        subsections.push(current);
      }
      current = { title: block.text, blocks: [] };
    } else {
      if (!current) {
        current = { title: "", blocks: [] };
      }
      current.blocks.push(block);
    }
  }

  if (current) {
    subsections.push(current);
  }

  return subsections;
}

/**
 * True when a subsection has at least one block that actually renders text.
 * Gated placeholder subsections (e.g. "8.1 Onboarding Checklist (limited
 * access/password)") arrive from the API as a heading with no body, so they
 * produce no book page. Keeping them would list a chapter/index entry that jumps
 * nowhere (shown as "—" in the index), so we drop them entirely.
 */
function hasRenderableContent(blocks: HandbookContentBlock[]): boolean {
  return blocks.some((block) => {
    if (block.kind === "list") return block.items.some((item) => item.trim().length > 0);
    return block.text.trim().length > 0;
  });
}

function useHandbookSections() {
  return useQuery({
    queryKey: ["handbook-sections"],
    queryFn: fetchHandbookSections,
    select: (apiSections) => {
      const result: Record<string, HandbookDetailSection> = {};
      for (const apiSection of apiSections) {
        const id = apiSection.sectionId as HandbookSectionId;
        if (!result[id]) {
          result[id] = {
            id,
            heroTitle: apiSection.heroTitle ?? apiSection.sectionTitle,
            subsections: [],
          };
        }
        for (const sub of apiSection.subsections) {
          const blocks = parseContentBlocks(sub.content);
          const splitSubsections = splitIntoSubsections(blocks);

          for (const ss of splitSubsections) {
            if (!hasRenderableContent(ss.blocks)) continue;
            result[id].subsections.push({
              id: slugify(ss.title || sub.subsectionId),
              title: ss.title || sub.subsectionTitle || apiSection.sectionTitle,
              blocks: ss.blocks,
            });
          }
        }
      }
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function getSectionForHash(hash: string, data: Record<string, HandbookDetailSection>): HandbookDetailSection | null {
  if (!hash) return null;
  const normalized = hash.replace(/^#/, "");

  if (data[normalized]) return data[normalized];

  const sectionMeta = handbookSections.find((s) => s.hash === normalized);
  if (sectionMeta && data[sectionMeta.id]) return data[sectionMeta.id];

  for (const section of Object.values(data)) {
    if (section.subsections.some((sub) => sub.id === normalized)) return section;
  }

  return null;
}

/** Sentinel passed as `handbookSubsection` to open the full book straight at the Index page. */
const INDEX_SUBSECTION_SENTINEL = "__index__";

const CHAR_COLS = 55;

/**
 * Estimated line height in px, matched to the real rendered CSS (text-[15px], and
 * `.prose-handbook p { line-height: 1.75 }` wins over the leading-[1.85] utility by
 * specificity, so 15 * 1.75 = 26.25). Headings render at leading-[1.65] = 24.75.
 * These used to be a flat 30px for both, which overestimated block height and left
 * the bottom third of every page blank — see splitPages().
 */
const PARAGRAPH_LINE_H = 26;
const HEADING_H = 25;

function blockHeight(block: HandbookContentBlock): number {
  switch (block.kind) {
    case 'heading':
      return HEADING_H;
    case 'paragraph':
    case 'list-item': {
      const lines = Math.max(1, Math.ceil(block.text.length / CHAR_COLS));
      return lines * PARAGRAPH_LINE_H;
    }
    case 'list':
      return 0;
  }
}

function findBreakPoint(text: string, targetCol: number): number {
  if (targetCol >= text.length) return text.length;
  const nextSpace = text.indexOf(" ", targetCol);
  if (nextSpace === -1 || nextSpace > targetCol + Math.round(CHAR_COLS * 0.6)) {
    return targetCol;
  }
  return nextSpace + 1;
}

function splitPages(blocks: HandbookContentBlock[], contentHeight: number): HandbookContentBlock[][] {
  const TITLE_H = 60;
  const GAP = 13;
  const LIST_GAP = 4;
  const pages: HandbookContentBlock[][] = [];
  let buf: HandbookContentBlock[] = [];
  let used = TITLE_H;

  function addBlock(block: HandbookContentBlock, gapSize: number): "fit" | "new-page" {
    const h = blockHeight(block);
    const gap = buf.length === 0 ? 0 : gapSize;
    if (used + gap + h <= contentHeight) {
      buf.push(block);
      used += gap + h;
      return "fit";
    }
    return "new-page";
  }

  function flushAndStart(block: HandbookContentBlock) {
    pages.push(buf);
    buf = [block];
    used = blockHeight(block);
  }

  function trySplitBlock(block: HandbookContentBlock, gapSize: number): boolean {
    if (block.kind !== "list-item" && block.kind !== "paragraph") return false;
    const text = block.text;
    const totalLines = Math.max(1, Math.ceil(text.length / CHAR_COLS));
    const availableSpace = contentHeight - used - (buf.length === 0 ? 0 : gapSize);
    const linesThatFit = Math.max(1, Math.floor(availableSpace / PARAGRAPH_LINE_H));
    if (linesThatFit >= totalLines) return false;
    const fitChars = linesThatFit * CHAR_COLS;
    const splitIdx = findBreakPoint(text, fitChars);
    const firstPart = text.slice(0, splitIdx).trimEnd();
    const secondPart = text.slice(splitIdx).trimStart();
    if (!firstPart || !secondPart) return false;
    buf.push({ ...block, text: firstPart });
    pages.push(buf);
    buf = [{ ...block, text: secondPart }];
    used = blockHeight({ ...block, text: secondPart });
    return true;
  }

  for (const block of blocks) {
    if (block.kind === "list") {
      for (const item of block.items) {
        const itemBlock: HandbookContentBlock = { kind: "list-item", text: item };
        if (addBlock(itemBlock, LIST_GAP) === "new-page") {
          if (!trySplitBlock(itemBlock, LIST_GAP)) {
            flushAndStart(itemBlock);
          }
        }
      }
    } else {
      if (addBlock(block, GAP) === "new-page") {
        if (!trySplitBlock(block, GAP)) {
          flushAndStart(block);
        }
      }
    }
  }

  if (buf.length > 0) pages.push(buf);
  return pages;
}

function HandbookParagraph({ children, italic = false }: { children: ReactNode; italic?: boolean }) {
  return <p className={`mb-[13px] text-left text-[15px] leading-[1.85] text-neutral-800 last:mb-0 md:text-justify ${italic ? "italic" : ""}`}>{children}</p>;
}

/**
 * Block-to-block margins below are matched to the GAP/LIST_GAP constants reserved by
 * splitPages() during pagination. Without them the DOM renders tightly-packed content
 * (Tailwind preflight zeroes default margins) while the paginator budgets extra space
 * for a gap that never appears — the mismatch was what left the bottom third of every
 * handbook page blank.
 */
function renderContentBlock(block: HandbookContentBlock, index: number) {
  if (block.kind === "heading") {
    return (
      <h3 key={`${block.text}-${index}`} className={`mb-[13px] text-[15px] font-semibold leading-[1.65] text-neutral-900 last:mb-0 ${block.italic ? "italic" : ""}`}>
        {block.text}
      </h3>
    );
  }

  if (block.kind === "list") {
    return (
      <ul key={`list-${index}`} className="mb-[13px] list-disc space-y-[11px] pl-[18px] text-[15px] leading-[1.85] text-neutral-800 last:mb-0">
        {block.items.map((item) => (
          <li key={item} className="pl-1 text-left md:text-justify">
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === "list-item") {
    return (
      <p key={`li-${block.text}-${index}`} className="relative mb-1 pl-[18px] text-left text-[15px] leading-[1.85] text-neutral-800 last:mb-0 md:text-justify">
        <span className="absolute left-0 top-0 select-none">•</span>
        {block.text}
      </p>
    );
  }

  return (
    <HandbookParagraph key={`${block.text}-${index}`} italic={block.italic}>
      {block.text}
    </HandbookParagraph>
  );
}

function HandbookIntroCard() {
  const { navigateHandbook } = useInternalNavigation();

  return (
    <article
      className="relative h-[340px] overflow-hidden rounded-none border border-white/[0.06] bg-cover bg-center text-white ink-grain"
      style={{ backgroundImage: `url('${handbookStageImage}')` }}
    >
      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      <div className="relative flex h-full flex-col justify-end px-8 pb-8">
        <span className="mb-3 w-max bg-white/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur-sm">
          Employee Handbook
        </span>
        <h2 className="max-w-[400px] font-display text-[32px] leading-[1.15] tracking-tight text-white">
          A Message From the Chief Executive Officer
        </h2>
        <p className="mt-2 max-w-[420px] text-[14px] leading-relaxed text-white/70">
          Introducing the Innovation Arts Entertainment Employee Handbook.
        </p>
        <button
          type="button"
          onClick={() => navigateHandbook("handbook-introduction")}
          className="mt-4 inline-flex h-8 w-max items-center justify-center bg-white/10 px-4 text-[11px] font-medium uppercase tracking-[0.15em] text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Read
        </button>
      </div>
    </article>
  );
}

function normalizeHash(hash: string) {
  return hash.replace(/^#/, "");
}

/** Routes Employee Services hash URLs to the correct handbook screen. */
export function resolveEmployeeHandbookView(hash: string): EmployeeHandbookView {
  const normalized = normalizeHash(hash);
  if (!normalized) return "services";
  if (normalized === "handbook") return "index";
  return "section";
}

export function EmployeeHandbookPage() {
  const { navigateHandbook, openEmployeeHandbook } = useInternalNavigation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className="min-h-full bg-neutral-950 text-white ink-grain">
      <div className="mx-auto flex min-h-full max-w-[1200px] flex-col px-6 py-12 sm:px-10 lg:flex-row lg:gap-20 lg:px-12 lg:py-16">

        {/* ── Left: cover / branding ── */}
        <div className="flex flex-col justify-between lg:sticky lg:top-16 lg:h-[calc(100vh-8rem)] lg:w-[420px] lg:shrink-0">
          <div>
            <div className="flex items-center gap-3 text-[9px] font-medium uppercase tracking-[0.25em] text-white/50">
              <span className="inline-block h-2 w-2 rounded-full bg-white/40" />
              Edition 01 · 2026
            </div>
            <h1 className="mt-8 font-display text-[clamp(2.4rem,6vw,3.8rem)] leading-[1.05] tracking-tight text-white">
              iAE Employee
              <br />
              Handbook
            </h1>
            <div className="mt-6 h-px w-16 bg-white/15" />
            <p className="mt-6 max-w-sm text-[14px] leading-relaxed text-white/50">
              This page is designed to help you familiarize yourself with essential information and provide a quick reference for when you need assistance.
            </p>
          </div>

          <div className="mt-10 lg:mt-0">
            <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-white/20">
              Innovation Arts Entertainment
            </p>
          </div>
        </div>

        {/* ── Right: content ── */}
        <div className="mt-12 flex-1 lg:mt-0">
          <section id="introduction" aria-labelledby="handbook-introduction-title">
            <h2 id="handbook-introduction-title" className="mb-6 font-display text-2xl tracking-tight text-white/90">
              Introduction
            </h2>
            <HandbookIntroCard />
          </section>

          <aside aria-labelledby="handbook-toc-title" className="mt-14">
            <h2 id="handbook-toc-title" className="mb-6 font-display text-2xl tracking-tight text-white/90">
              Contents
            </h2>
            <nav className="space-y-[3px]" aria-label="Employee handbook table of contents">
              {handbookSections.map((section, i) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.title}
                    type="button"
                    onClick={() => navigateHandbook(section.hash)}
                    className="group flex h-[56px] w-full items-center gap-4 border-t border-white/[0.04] px-0 text-left text-[13px] text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.06] text-[10px] font-medium text-white/30 transition-colors group-hover:border-white/20 group-hover:text-white/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Icon className="h-[18px] w-[18px] shrink-0 text-white/50 transition-colors group-hover:text-white/50" strokeWidth={1.5} aria-hidden />
                    <span className="leading-tight">{section.title}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => openEmployeeHandbook("index", undefined, INDEX_SUBSECTION_SENTINEL)}
                className="group flex h-[56px] w-full items-center gap-4 border-t border-white/[0.04] px-0 text-left text-[13px] text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.06] text-[10px] font-medium text-white/30 transition-colors group-hover:border-white/20 group-hover:text-white/60">
                  <BookOpen className="h-[13px] w-[13px]" strokeWidth={1.5} />
                </span>
                <span className="leading-tight">Index</span>
              </button>
            </nav>
          </aside>
        </div>
      </div>
    </div>
  );
}

type HandbookTocSection = {
  number: number;
  title: string;
  pageId?: string;
  pageIndex: number;
  subsections?: { label: string; title: string; pageId: string; pageIndex: number }[];
};

/**
 * Self-contained Contents page. It owns its expand/collapse state so toggling a
 * chapter never changes the parent's children array — which would otherwise
 * force the flip-book to re-initialize and snap back to the cover.
 */
function HandbookTocPage({
  tocSections,
  isMobile,
  pageNumber,
  totalPages,
  onJump,
}: {
  tocSections: HandbookTocSection[];
  isMobile: boolean;
  pageNumber: number;
  totalPages: number;
  onJump: (index: number | null | undefined) => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (num: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  const sectionIcons = [Lectern, UserRoundCog, Home, Banknote, Star, BookOpen, ClipboardCheck];

  return (
    <div className={`flex h-full w-full flex-col bg-white text-neutral-900 paper-grain ${isMobile ? "" : "page-edge"}`}>
      <div className="flex-1 overflow-y-auto p-8 md:p-10">
        <h2 className="font-display text-2xl tracking-tight mb-4">Contents</h2>
        <div className="h-px w-8 bg-current/20 mb-5" />
        <nav className="space-y-[3px]">
          {tocSections.map((sec) => {
            const isIndexEntry = sec.title === "Index";
            const Icon = isIndexEntry ? BookOpen : sectionIcons[sec.number - 1] || BookOpen;
            const isExpanded = expanded.has(sec.number);
            const hasSubsections = !isIndexEntry && sec.subsections && sec.subsections.length > 0;
            return (
              <div key={sec.number}>
                <div className="group flex h-[52px] w-full items-center gap-3 border-t border-neutral-200 text-left text-[15px] text-black-500 transition-colors hover:text-neutral-900">
                  <button
                    type="button"
                    onClick={() => onJump(sec.pageIndex)}
                    className="flex flex-1 items-center gap-3 py-0 focus-visible:outline-none"
                  >
                    <span className="w-6 text-[12px] font-medium text-black-300 group-hover:text-neutral-500">
                      {isIndexEntry ? "" : String(sec.number).padStart(2, "0")}
                    </span>
                    <Icon className="size-[19px] shrink-0 text-black-300 transition-colors group-hover:text-neutral-500" strokeWidth={1.5} aria-hidden />
                    <span className="leading-tight">{sec.title}</span>
                  </button>
                  {hasSubsections && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(sec.number);
                      }}
                      className="flex size-[28px] shrink-0 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                      aria-label={isExpanded ? "Collapse subsections" : "Expand subsections"}
                    >
                      <ChevronDown
                        className={`size-4 text-black-300 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        strokeWidth={2}
                      />
                    </button>
                  )}
                </div>
                {isExpanded && hasSubsections
                  ? sec.subsections!.map((sub) => (
                      <button
                        key={sub.label}
                        type="button"
                        onClick={() => onJump(sub.pageIndex)}
                        className="flex h-[38px] w-full items-center gap-3 pl-[56px] pr-0 text-left text-[13px] text-black-400 transition-colors hover:text-neutral-900 focus-visible:outline-none"
                      >
                        <span className="shrink-0 font-medium">{sub.label}</span>
                        <span className="truncate opacity-70">{sub.title.replace(/^\d+\.\d+\s*/, "")}</span>
                      </button>
                    ))
                  : null}
              </div>
            );
          })}
        </nav>
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-black-100 px-5 py-2 text-black-300">
        <span className="text-[9px] font-medium uppercase tracking-[0.2em]">iAE Employee Handbook</span>
        <span className="text-[9px] font-medium uppercase tracking-[0.2em]">{String(pageNumber).padStart(3, "0")} / {String(totalPages).padStart(3, "0")}</span>
      </div>
    </div>
  );
}

export function EmployeeHandbookSectionPage({ handbookHash, handbookSubsection }: { handbookHash?: string; handbookSubsection?: string }) {
  const { navigateHandbook, openEmployeeHandbook } = useInternalNavigation();
  const { data: handbookData = {}, isLoading, isError, error } = useHandbookSections();
  const section = getSectionForHash(handbookHash ?? "", handbookData);
  const sectionMeta = section ? handbookSections.find((item) => item.id === section.id) : undefined;
  const isIndex = !handbookHash || handbookHash === "handbook";

  useEffect(() => {
    // The flip-book renders no DOM anchors; deep links land via startPage/flip().
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [handbookHash, sectionMeta?.hash]);

  type BookPage = {
    kind: "cover" | "toc" | "chapter-intro" | "content" | "index" | "back-cover";
    theme: "ink" | "paper";
    /** Stable target id — flip destinations resolve against the FINAL page order. */
    pageId?: string;
    chapterIdx?: number;
    chapterNumber?: number;
    chapterTitle?: string;
    pageInChapter?: number;
    totalInChapter?: number;
    blocks?: HandbookContentBlock[];
    subsectionTitle?: string;
    indexEntries?: { label: string; title: string; pageId: string }[];
    tocSections?: {
      number: number;
      title: string;
      pageId?: string;
      pageIndex: number;
      subsections?: { label: string; title: string; pageId: string; pageIndex: number }[];
    }[];
  };

  const stageRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<HandbookFlipBookHandle>(null);
  const navLabel = isIndex ? "Index" : (section?.heroTitle ?? "Handbook");
  const [currentPage, setCurrentPage] = useState(0);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  /** Stable so it never invalidates the memoized flip-book. */
  const handlePageChange = useCallback((index: number) => setCurrentPage(index), []);

  useLayoutEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setStage({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * page-flip binds NATIVE mousedown/mouseup (and touch) listeners on the book
   * container and, on release, treats a near-corner click as a page turn. Our
   * pages contain their own interactive controls (TOC chapter rows, the chapter
   * chevron, index links, chapter-jump buttons). Clicking one of those fires BOTH
   * our React onClick (jump / toggle) AND page-flip's flip-by-click, which snaps
   * the book to an adjacent/cover page right after we jump — the reported bug.
   *
   * React's stopPropagation can't prevent this: page-flip's listeners are native
   * and run during the bubble phase before React's root-level handlers. So we
   * intercept in the CAPTURE phase on the stage (an ancestor of the book) and
   * swallow the pointer events only when they originate from an in-page control,
   * so they never reach page-flip. Drag-to-flip on empty page area, the explicit
   * prev/next buttons, and keyboard navigation are all untouched.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const swallowIfControl = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, [data-book-interactive]")) {
        e.stopPropagation();
      }
    };
    const types = ["mousedown", "mouseup", "touchstart", "touchend"] as const;
    types.forEach((type) => stage.addEventListener(type, swallowIfControl, true));
    return () => {
      types.forEach((type) => stage.removeEventListener(type, swallowIfControl, true));
    };
  }, []);

  const { pageW, pageH } = useMemo(() => {
    const maxBookH = Math.min(stage.h - 40, 800);
    const isMobile = stage.w > 0 && stage.w < 768;
    const aspect = isMobile ? 0.72 : 1.42;
    let bookH = Math.max(400, maxBookH);
    let bookW = bookH * aspect;
    const maxBookW = Math.min(stage.w - 48, 1200);
    if (bookW > maxBookW) {
      bookW = maxBookW;
      bookH = bookW / aspect;
    }
    const pw = isMobile ? Math.round(bookW) : Math.round(bookW / 2);
    const ph = Math.round(bookH);
    return { pageW: pw, pageH: ph };
  }, [stage]);

  const contentHeight = useMemo(() => {
    const footerH = 36;
    const paddingH = 64;
    return Math.max(300, pageH - footerH - paddingH);
  }, [pageH]);

  const { bookPages, pageIndexById } = useMemo(() => {
    type TocEntry = NonNullable<BookPage["tocSections"]>[number];

    const stripSubsectionNumber = (title: string) => title.replace(/^\d+\.\d+\s*/, "");

    // Step 1: Build all book pages in final order (excluding TOC for now).
    const result: BookPage[] = [];
    const indexSubsections: { label: string; title: string; pageId: string }[] = [];

    result.push({ kind: "cover", theme: "ink" });

    if (isIndex && Object.keys(handbookData).length > 0) {
      Object.values(handbookData).forEach((sec, si) => {
        const number = si + 1;
        const chapterPageId = `chapter-${si}`;

        // The user expects a chapter intro to appear as the LEFT page of a spread.
        // With showCover=true, page 0 is the cover alone on the right, then spreads
        // are [1,2], [3,4], ... so odd indices are left pages. The TOC is later
        // inserted at index 1, shifting every page after it by +1, so the next slot
        // must be even before the splice to land on an odd (left) page after the splice.
        if (result.length % 2 !== 0) {
          result.push({ kind: "content", theme: "paper", blocks: [] });
        }

        result.push({
          kind: "chapter-intro",
          theme: "ink",
          pageId: chapterPageId,
          chapterIdx: si,
          chapterNumber: number,
          chapterTitle: sec.heroTitle,
        });

        for (const sub of sec.subsections) {
          const pageBlocks = splitPages(sub.blocks, contentHeight);
          const subPageId = `sub-${si}-${sub.id}`;
          const numMatch = sub.title.match(/^(\d+\.\d+)/);
          const label = numMatch ? numMatch[1] : sub.title;
          indexSubsections.push({ label, title: sub.title, pageId: subPageId });

          pageBlocks.forEach((chunk, ci) => {
            result.push({
              kind: "content",
              theme: "paper",
              pageId: ci === 0 ? subPageId : undefined,
              chapterIdx: si,
              chapterNumber: number,
              chapterTitle: sec.heroTitle,
              pageInChapter: ci + 1,
              totalInChapter: pageBlocks.length,
              blocks: chunk,
              subsectionTitle: ci === 0 ? sub.title : undefined,
            });
          });
        }
      });

      // Alphabetical index pages at the end of the book (before the back cover).
      const sortedEntries = [...indexSubsections].sort((a, b) =>
        stripSubsectionNumber(a.title).localeCompare(stripSubsectionNumber(b.title)),
      );
      if (sortedEntries.length > 0) {
        // Ensure the index also begins on a left-hand page after the TOC splice.
        if (result.length % 2 !== 0) {
          result.push({ kind: "content", theme: "paper", blocks: [] });
        }
        const rowsPerPage = Math.max(8, Math.floor((contentHeight - 90) / 26));
        const entriesPerPage = rowsPerPage * 2; // two columns on desktop
        for (let i = 0; i < sortedEntries.length; i += entriesPerPage) {
          result.push({
            kind: "index",
            theme: "paper",
            pageId: i === 0 ? "handbook-index" : undefined,
            indexEntries: sortedEntries
              .slice(i, i + entriesPerPage)
              .map(({ label, title, pageId }) => ({ label, title, pageId })),
          });
        }
      }
      result.push({ kind: "back-cover", theme: "ink" });
    } else if (section) {
      result.push({
        kind: "chapter-intro",
        theme: "ink",
        pageId: "chapter-0",
        chapterIdx: 0,
        chapterNumber: 1,
        chapterTitle: section.heroTitle,
      });

      for (const sub of section.subsections) {
        const pageBlocks = splitPages(sub.blocks, contentHeight);
        const subPageId = `sub-0-${sub.id}`;
        const numMatch = sub.title.match(/^(\d+\.\d+)/);
        const label = numMatch ? numMatch[1] : sub.title;

        pageBlocks.forEach((chunk, ci) => {
          result.push({
            kind: "content",
            theme: "paper",
            pageId: ci === 0 ? subPageId : undefined,
            chapterIdx: 0,
            chapterNumber: 1,
            chapterTitle: section.heroTitle,
            pageInChapter: ci + 1,
            totalInChapter: pageBlocks.length,
            blocks: chunk,
            subsectionTitle: ci === 0 ? sub.title : undefined,
          });
        });
      }
      result.push({ kind: "back-cover", theme: "ink" });
    }

    // Ensure the book has an odd number of pages so the back cover ends on the right side.
    if (result.length % 2 === 0) {
      result.splice(result.length - 1, 0, { kind: "content", theme: "paper", blocks: [] });
    }

    // Step 2: Resolve stable page ids against the FINAL page order.
    const map = new Map<string, number>();
    result.forEach((page, i) => {
      if (page.pageId) map.set(page.pageId, i);
    });

    // Step 3: Build the Table of Contents from the resolved final page order.
    const tocSections: TocEntry[] = [];
    if (isIndex && Object.keys(handbookData).length > 0) {
      Object.values(handbookData).forEach((sec, si) => {
        const chapterPageId = `chapter-${si}`;
        const subsections: NonNullable<TocEntry["subsections"]> = [];
        for (const sub of sec.subsections) {
          const subPageId = `sub-${si}-${sub.id}`;
          const numMatch = sub.title.match(/^(\d+\.\d+)/);
          const label = numMatch ? numMatch[1] : sub.title;
          subsections.push({
            label,
            title: sub.title,
            pageId: subPageId,
            pageIndex: map.get(subPageId) ?? 0,
          });
        }
        tocSections.push({
          number: si + 1,
          title: sec.heroTitle,
          pageId: chapterPageId,
          pageIndex: map.get(chapterPageId) ?? 0,
          subsections,
        });
      });

      if (indexSubsections.length > 0) {
        tocSections.push({
          number: tocSections.length + 1,
          title: "Index",
          pageId: "handbook-index",
          pageIndex: map.get("handbook-index") ?? 0,
          subsections: [],
        });
      }
    } else if (section) {
      const subsections: NonNullable<TocEntry["subsections"]> = [];
      for (const sub of section.subsections) {
        const subPageId = `sub-0-${sub.id}`;
        const numMatch = sub.title.match(/^(\d+\.\d+)/);
        const label = numMatch ? numMatch[1] : sub.title;
        subsections.push({
          label,
          title: sub.title,
          pageId: subPageId,
          pageIndex: map.get(subPageId) ?? 0,
        });
      }
      tocSections.push({
        number: 1,
        title: section.heroTitle,
        pageId: "chapter-0",
        pageIndex: map.get("chapter-0") ?? 0,
        subsections,
      });
    }

    // Step 4: Insert the resolved TOC as page 1.
    result.splice(1, 0, { kind: "toc", theme: "paper", tocSections });

    // Step 5: Rebuild the map after the TOC splice and update TOC page indices.
    map.clear();
    result.forEach((page, i) => {
      if (page.pageId) map.set(page.pageId, i);
    });
    for (const entry of tocSections) {
      const idx = entry.pageId != null ? map.get(entry.pageId) : null;
      if (idx != null) entry.pageIndex = idx;
      for (const sub of entry.subsections ?? []) {
        const subIdx = map.get(sub.pageId);
        if (subIdx != null) sub.pageIndex = subIdx;
      }
    }

    return { bookPages: result, pageIndexById: map };
  }, [isIndex, section, handbookData, contentHeight]);

  const currentPageInfo = bookPages[currentPage];
  const currentChapterIdx = currentPageInfo?.chapterIdx ?? -1;
  const headerLabel = currentPageInfo?.chapterTitle
    ? `Ch. ${currentPageInfo.chapterNumber} · ${currentPageInfo.chapterTitle}`
    : navLabel;

  const chapterSubsections = useMemo(() => {
    if (currentChapterIdx < 0) return [];
    const entries: { label: string; fullTitle: string; pageIndex: number }[] = [];
    bookPages.forEach((page, i) => {
      if (page.chapterIdx === currentChapterIdx && page.subsectionTitle) {
        const numMatch = page.subsectionTitle.match(/^(\d+\.\d+)/);
        const label = numMatch ? numMatch[1] : page.subsectionTitle;
        entries.push({ label, fullTitle: page.subsectionTitle, pageIndex: i });
      }
    });
    return entries;
  }, [currentChapterIdx, bookPages]);

  /** Chapter headings for the floating button directory (one per chapter-intro page). */
  const chapterEntries = useMemo(
    () =>
      bookPages.flatMap((page, i) =>
        page.kind === "chapter-intro"
          ? [
              {
                number: page.chapterNumber!,
                title: (page.chapterTitle ?? "").replace(/^\d+\.\s*/, ""),
                chapterIdx: page.chapterIdx!,
                pageIndex: i,
              },
            ]
          : [],
      ),
    [bookPages],
  );

  const startPage = useMemo(() => {
    if (!handbookSubsection || bookPages.length === 0) return 0;
    if (handbookSubsection === INDEX_SUBSECTION_SENTINEL) {
      return pageIndexById.get("handbook-index") ?? 0;
    }
    const prefix = `${handbookSubsection} `;
    const idx = bookPages.findIndex(
      (p) => p.kind === "content" && p.subsectionTitle?.startsWith(prefix),
    );
    return idx > 0 ? idx : 0;
  }, [handbookSubsection, bookPages, pageIndexById]);

  const totalPages = bookPages.length;
  const isMobile = stage.w > 0 && stage.w < 768;
  const showFlipbook = !isError && !isLoading && (isIndex || section) && pageW > 0 && pageH > 0;

  /**
   * Jump to a page by its bookPages index. Delegates to the isolated flip-book's
   * imperative handle (which uses the engine's `turnToPage` to resolve the exact
   * spread). Stable identity — no deps — so it never invalidates the memoized book.
   */
  const jumpToIndex = useCallback((targetIndex: number | null | undefined) => {
    if (targetIndex == null || targetIndex < 0) return;
    bookRef.current?.goToPage(targetIndex);
  }, []);

  function renderBookPage(page: BookPage, index: number, pageNumber: number) {
    const ink = page.theme === "ink";
    const themeClasses = ink
      ? "bg-neutral-950 text-white ink-grain"
      : "bg-white text-neutral-900 paper-grain";

    if (page.kind === "cover") {
      return (
        <div className={`flex h-full w-full flex-col ${themeClasses} ${isMobile ? "" : "page-edge"}`}>
          <div className="flex flex-1 flex-col justify-between p-8 md:p-12">
            <div className="flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.25em] text-white/30">
              <span>Edition 01 · 2026</span>
              <span>Vol. I</span>
            </div>
            <div>
              <div className="text-[9px] font-medium uppercase tracking-[0.3em] text-white/30 mb-5">
                An Employee Handbook
              </div>
              <h1 className="font-display text-[clamp(2rem,5vw,3.6rem)] leading-[0.95] tracking-tight text-white">
                iAE Employee
                <br />
                Handbook
              </h1>
              <div className="mt-6 h-px w-20 bg-white/20" />
              <p className="mt-5 max-w-sm text-[13px] leading-relaxed text-white/50">
                A comprehensive guide to how we work, build, and care for the people at Innovation Arts Entertainment.
              </p>
            </div>
            <div className="flex items-end justify-between text-[9px] font-medium uppercase tracking-[0.25em] text-white/50">
              <span>Innovation Arts Entertainment</span>
              <span>No. 001</span>
            </div>
          </div>
          <div className={`flex shrink-0 items-center justify-between border-t px-5 py-2 ${ink ? "border-white/[0.06] text-white/50" : "border-black-100 text-black-300"}`}>
            <span className="text-[8px] font-medium uppercase tracking-[0.2em]">iAE Employee Handbook</span>
            <span className="text-[8px] font-medium uppercase tracking-[0.2em]">{String(pageNumber).padStart(3, "0")} / {String(totalPages).padStart(3, "0")}</span>
          </div>
        </div>
      );
    }

    if (page.kind === "toc" && page.tocSections) {
      return (
        <HandbookTocPage
          tocSections={page.tocSections}
          isMobile={isMobile}
          pageNumber={pageNumber}
          totalPages={totalPages}
          onJump={jumpToIndex}
        />
      );
    }

    if (page.kind === "index" && page.indexEntries) {
      return (
        <div className={`flex h-full w-full flex-col ${themeClasses} ${isMobile ? "" : "page-edge"}`}>
          <div className="flex-1 overflow-y-auto p-8 md:p-10">
            <h2 className="font-display text-2xl tracking-tight mb-4">Index</h2>
            <div className="h-px w-8 bg-current/20 mb-5" />
            <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
              {page.indexEntries.map((entry) => {
                const target = pageIndexById.get(entry.pageId);
                return (
                  <button
                    key={`${entry.pageId}-${entry.title}`}
                    type="button"
                    onClick={() => {
                      jumpToIndex(target);
                    }}
                    className="flex h-[32px] min-w-0 items-baseline gap-2 text-left text-[14px] text-black-500 transition-colors hover:text-neutral-900 focus-visible:outline-none"
                    title={entry.title}
                  >
                    <span className="truncate">{entry.title.replace(/^\d+\.\d+\s*/, "")}</span>
                    <span className="min-w-4 flex-1 border-b border-dotted border-current/25" aria-hidden />
                    <span className="shrink-0 text-[12px] font-medium tabular-nums text-black-300">
                      {target != null ? String(target + 1).padStart(3, "0") : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between border-t border-black-100 px-5 py-2 text-black-300">
            <span className="text-[9px] font-medium uppercase tracking-[0.2em]">iAE Employee Handbook</span>
            <span className="text-[9px] font-medium uppercase tracking-[0.2em]">{String(pageNumber).padStart(3, "0")} / {String(totalPages).padStart(3, "0")}</span>
          </div>
        </div>
      );
    }

    if (page.kind === "back-cover") {
      return (
        <div className={`flex h-full w-full flex-col ${themeClasses}`}>
          <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
            <div className="text-[9px] font-medium uppercase tracking-[0.3em] opacity-60 mb-6">Fin</div>
            <p className="font-display text-2xl italic leading-snug max-w-xs opacity-90 text-white">
              Make the work. Mind the people. The rest sorts itself out.
            </p>
            <div className="mt-10 h-px w-16 bg-white/30" />
            <div className="mt-6 text-[9px] font-medium uppercase tracking-[0.25em] opacity-60 text-white/50">
              Innovation Arts Entertainment · 2026
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between border-t border-white/[0.06] px-5 py-2 text-white/50">
            <span className="text-[8px] font-medium uppercase tracking-[0.2em]">iAE Employee Handbook</span>
            <span className="text-[8px] font-medium uppercase tracking-[0.2em]">{String(pageNumber).padStart(3, "0")} / {String(totalPages).padStart(3, "0")}</span>
          </div>
        </div>
      );
    }

    if (page.kind === "chapter-intro") {
      return (
        <div className={`flex h-full w-full flex-col ${themeClasses}`}>
          <div className="flex flex-1 flex-col justify-between p-8 md:p-12">
            <div className="text-[9px] font-medium uppercase tracking-[0.3em] opacity-60">Chapter</div>
            <div>
              <div className="font-display text-[100px] md:text-[140px] leading-none tracking-tight opacity-95">
                {page.chapterNumber}
              </div>
              <h2 className="mt-4 font-display text-2xl md:text-3xl leading-tight tracking-tight">
                {page.chapterTitle}
              </h2>
              <div className="mt-8 h-px w-20 bg-current/30" />
            </div>
            <div className="text-[9px] font-medium uppercase tracking-[0.25em] opacity-60">Continue →</div>
          </div>
          <div className={`flex shrink-0 items-center justify-between border-t px-5 py-2 ${ink ? "border-white/[0.06] text-white/50" : "border-black-100 text-black-300"}`}>
            <span className="text-[8px] font-medium uppercase tracking-[0.2em]">iAE Employee Handbook</span>
            <span className="text-[8px] font-medium uppercase tracking-[0.2em]">{String(pageNumber).padStart(3, "0")} / {String(totalPages).padStart(3, "0")}</span>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex h-full w-full flex-col ${themeClasses}`}>
        <div className="flex-1 overflow-hidden px-6 py-6 md:px-8 md:py-8">
          {page.chapterTitle && (
            <div className={`mb-5 flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.25em] ${ink ? "text-white/40" : "text-neutral-400"}`}>
              <span>
                Ch. {page.chapterNumber} · {page.chapterTitle}
              </span>
              {page.pageInChapter && page.totalInChapter && (
                <span>
                  {page.pageInChapter} / {page.totalInChapter}
                </span>
              )}
            </div>
          )}
          <div className="prose-handbook">
            {page.subsectionTitle && (
              <>
                <h2 className="font-display text-lg tracking-tight mb-2">{page.subsectionTitle}</h2>
                <div className="h-px w-8 bg-current/20 mb-4" />
              </>
            )}
            {page.blocks?.map((block, i) => renderContentBlock(block, i))}
          </div>
        </div>
        <div className={`flex shrink-0 items-center justify-between border-t px-5 py-2 ${ink ? "border-white/[0.06] text-white/50" : "border-black-100 text-black-300"}`}>
          <span className="text-[8px] font-medium uppercase tracking-[0.2em]">iAE Employee Handbook</span>
          <span className="text-[8px] font-medium uppercase tracking-[0.2em]">{String(pageNumber).padStart(3, "0")} / {String(totalPages).padStart(3, "0")}</span>
        </div>
      </div>
    );
  }

  /**
   * Stable page children. The flip-book wrapper re-initializes (and resets to the
   * cover) whenever its `children` identity changes, so this memo must only change
   * when the pagination itself changes — never on navigation state like currentPage.
   * TOC expand state lives inside HandbookTocPage so it doesn't invalidate this.
   */
  const bookChildren = useMemo(
    () =>
      bookPages.map((page, index) => (
        <div key={index} style={{ width: pageW, height: pageH }}>
          {renderBookPage(page, index, index + 1)}
        </div>
      )),
    [bookPages, pageW, pageH, isMobile, totalPages, pageIndexById, jumpToIndex],
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 ink-grain">
      {/* Top bar */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.04] bg-neutral-950/80 px-4 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={() => openEmployeeHandbook("services")}
          className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-white/100 transition-colors hover:text-white/60"
        >
          <X className="size-3.5" strokeWidth={2} />
          Close
        </button>
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/100">
          {headerLabel}
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-white text-white/100" />
        </div>
      </div>

      {/* Flipbook area — stageRef is always rendered so ResizeObserver always fires */}
      <div
        ref={stageRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-2 pt-1 sm:px-6 sm:pb-4"
      >
        {isError ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-5 px-4 animate-fade-in">
            <div className="flex size-14 items-center justify-center rounded-full bg-ems-coral-dim">
              <AlertCircle className="size-7 text-ems-coral" />
            </div>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <p className="text-base font-semibold text-white/70">Failed to load handbook</p>
              <p className="max-w-[400px] text-sm leading-relaxed text-white/40">
                {(error as Error)?.message ?? "An unexpected error occurred. Please try again later."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-1 h-[34px] rounded-[4px] bg-ems-coral px-4 text-[13px] font-semibold text-white transition-colors hover:bg-ems-coral/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ems-coral focus-visible:ring-offset-2"
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center text-white/40">
            Loading...
          </div>
        ) : !isIndex && !section ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-2 text-white/40">
            <p>Section not found.</p>
            <p className="text-sm">The handbook hash "{handbookHash}" did not match any loaded section.</p>
          </div>
        ) : pageW > 0 && pageH > 0 ? (
          <>
            <div
              className="book-shadow"
              style={{ width: isMobile ? pageW : pageW * 2, height: pageH }}
            >
              <HandbookFlipBook
                ref={bookRef}
                pages={bookChildren}
                pageW={pageW}
                pageH={pageH}
                isMobile={isMobile}
                startPage={startPage}
                onPageChange={handlePageChange}
              />
            </div>

            {/* ── Floating buttons: desktop (left side) ── */}
            <div className="absolute left-2 top-1/2 z-20 -translate-y-1/2 flex-col gap-1.5 hidden md:flex max-h-[82vh] w-[220px] overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => jumpToIndex(0)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.50] bg-neutral-950/70 text-white/80 shadow-lg backdrop-blur-md transition-all hover:border-white/20 hover:text-white/70"
                title="Go to cover"
              >
                <BookOpen className="size-4" strokeWidth={1.5} />
              </button>

              {chapterEntries.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-left text-[13px] font-semibold uppercase tracking-[0.08em] text-white/60">
                    Chapters
                  </span>
                  {chapterEntries.map((chapter) => {
                    const isActiveChapter = chapter.chapterIdx === currentChapterIdx;
                    return (
                      <div key={chapter.number} className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => jumpToIndex(chapter.pageIndex)}
                          className={`flex w-full min-w-0 items-center gap-1.5 rounded-md border px-2.5 py-2 text-left text-[14px] font-medium leading-snug shadow-lg backdrop-blur-md transition-all ${
                            isActiveChapter
                              ? "border-white bg-white/90 text-neutral-950"
                              : "border-white/[0.50] bg-neutral-950/70 text-white/70 hover:border-white/20 hover:text-white/70"
                          }`}
                          title={chapter.title}
                        >
                          <span className="shrink-0 font-semibold tracking-[0.03em]">Ch. {chapter.number}</span>
                          <span className={`truncate ${isActiveChapter ? "" : "opacity-75"}`}>{chapter.title}</span>
                        </button>
                        {isActiveChapter && chapterSubsections.length > 0 && (
                          <span className="ml-3 text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-white/40">
                            In This Chapter
                          </span>
                        )}
                        {isActiveChapter &&
                          chapterSubsections.map((sub) => (
                            <button
                              key={sub.label}
                              type="button"
                              onClick={() => jumpToIndex(sub.pageIndex)}
                              className="ml-3 flex min-w-0 items-center gap-1.5 rounded-md border border-white/[0.50] bg-neutral-950/70 px-2.5 py-2 text-left text-[14px] font-medium leading-snug text-white/70 shadow-lg backdrop-blur-md transition-all hover:border-white/20 hover:text-white/70"
                              title={sub.fullTitle}
                            >
                              <span className="shrink-0 font-semibold tracking-[0.03em]">{sub.label}</span>
                              <span className="truncate opacity-75">{sub.fullTitle.replace(/^\d+\.\d+\s*/, "")}</span>
                            </button>
                          ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* ── Mobile buttons: below flipbook ── */}
      {showFlipbook && (
        <div className="flex max-h-[38vh] flex-col gap-2 overflow-y-auto px-4 py-2 md:hidden">
          <button
            type="button"
            onClick={() => jumpToIndex(0)}
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.50] bg-neutral-950/70 text-white/80 shadow-lg backdrop-blur-md transition-all hover:border-white/20 hover:text-white/70"
            title="Go to cover"
          >
            <BookOpen className="size-4" strokeWidth={1.5} />
          </button>

          {chapterEntries.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-white/60">
                Chapters
              </span>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {chapterEntries.map((chapter) => {
                  const isActiveChapter = chapter.chapterIdx === currentChapterIdx;
                  return (
                    <button
                      key={chapter.number}
                      type="button"
                      onClick={() => jumpToIndex(chapter.pageIndex)}
                      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] font-medium shadow-lg backdrop-blur-md transition-all ${
                        isActiveChapter
                          ? "border-white bg-white/90 text-neutral-950"
                          : "border-white/[0.50] bg-neutral-950/70 text-white/70 hover:border-white/20 hover:text-white/70"
                      }`}
                      title={chapter.title}
                    >
                      <span className="shrink-0 font-semibold tracking-[0.03em]">Ch. {chapter.number}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {chapterSubsections.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-white/40">
                In Ch. {currentPageInfo?.chapterNumber}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {chapterSubsections.map((sub) => (
                  <button
                    key={sub.label}
                    type="button"
                    onClick={() => jumpToIndex(sub.pageIndex)}
                    className="flex items-center gap-1.5 rounded-md border border-white/[0.50] bg-neutral-950/70 px-2.5 py-1.5 text-[13px] font-medium text-white/70 shadow-lg backdrop-blur-md transition-all hover:border-white/20 hover:text-white/70"
                    title={sub.fullTitle}
                  >
                    <span className="shrink-0 font-semibold tracking-[0.03em]">{sub.label}</span>
                    <span className="truncate opacity-75">{sub.fullTitle.replace(/^\d+\.\d+\s*/, "")}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      {showFlipbook && (
        <div className="flex h-9 shrink-0 items-center gap-3 border-t border-white/[0.04] bg-neutral-950/80 px-4 backdrop-blur-md sm:px-6">
          <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/80 shrink-0">
            Progress
          </span>
          <div className="relative flex-1 h-px bg-white/[0.06] overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-white/60 transition-[width] duration-500 ease-out"
              style={{ width: `${totalPages ? ((currentPage + 1) / totalPages) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/80 shrink-0">
            &larr; &rarr; to turn
          </span>
        </div>
      )}
    </div>
  );
}


