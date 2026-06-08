import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, Banknote, BookOpen, ChevronLeft, ChevronRight, ClipboardCheck, Home, Lectern, Star, UserRoundCog, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ReactFlipBook } from "@vuvandinh203/react-flipbook";
import type { ReactFlipBookRef } from "@vuvandinh203/react-flipbook";
import { fetchHandbookSections } from "@/api/employeeHandbookApi";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import { useInternalNavigation } from "../routing/InternalNavigationContext";
import type { EmployeeHandbookView } from "../routing/internalSessionRoute";

export type { EmployeeHandbookView };

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

const CHAR_COLS = 55;

function blockHeight(block: HandbookContentBlock): number {
  const lh = 30;
  switch (block.kind) {
    case 'heading':
      return 30;
    case 'paragraph':
    case 'list-item': {
      const lines = Math.max(1, Math.ceil(block.text.length / CHAR_COLS));
      return lines * lh;
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
    const lineH = 30;
    const linesThatFit = Math.max(1, Math.floor(availableSpace / lineH));
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
  return <p className={`text-left text-[15px] leading-[1.85] text-neutral-800 md:text-justify ${italic ? "italic" : ""}`}>{children}</p>;
}

function renderContentBlock(block: HandbookContentBlock, index: number) {
  if (block.kind === "heading") {
    return (
      <h3 key={`${block.text}-${index}`} className={`text-[15px] font-semibold leading-[1.65] text-neutral-900 ${block.italic ? "italic" : ""}`}>
        {block.text}
      </h3>
    );
  }

  if (block.kind === "list") {
    return (
      <ul key={`list-${index}`} className="list-disc space-y-[11px] pl-[18px] text-[15px] leading-[1.85] text-neutral-800">
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
      <p key={`li-${block.text}-${index}`} className="relative pl-[18px] text-left text-[15px] leading-[1.85] text-neutral-800 md:text-justify">
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
  const { navigateHandbook } = useInternalNavigation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className="min-h-full bg-neutral-950 text-white ink-grain">
      <div className="mx-auto flex min-h-full max-w-[1200px] flex-col px-6 py-12 sm:px-10 lg:flex-row lg:gap-20 lg:px-12 lg:py-16">

        {/* ── Left: cover / branding ── */}
        <div className="flex flex-col justify-between lg:sticky lg:top-16 lg:h-[calc(100vh-8rem)] lg:w-[420px] lg:shrink-0">
          <div>
            <div className="flex items-center gap-3 text-[9px] font-medium uppercase tracking-[0.25em] text-white/25">
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
                    <Icon className="h-[18px] w-[18px] shrink-0 text-white/25 transition-colors group-hover:text-white/50" strokeWidth={1.5} aria-hidden />
                    <span className="leading-tight">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function EmployeeHandbookSectionPage({ handbookHash }: { handbookHash?: string }) {
  const { navigateHandbook, openEmployeeHandbook } = useInternalNavigation();
  const { data: handbookData = {}, isLoading, isError, error } = useHandbookSections();
  const section = getSectionForHash(handbookHash ?? "", handbookData);
  const sectionMeta = section ? handbookSections.find((item) => item.id === section.id) : undefined;
  const isIndex = !handbookHash || handbookHash === "handbook";

  useEffect(() => {
    const targetId = normalizeHash(handbookHash ?? "");

    window.requestAnimationFrame(() => {
      if (!targetId || targetId === sectionMeta?.hash) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }

      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ block: "start", behavior: "auto" });
      }
    });
  }, [handbookHash, sectionMeta?.hash]);

  type BookPage = {
    kind: "cover" | "toc" | "chapter-intro" | "content" | "back-cover";
    theme: "ink" | "paper";
    chapterIdx?: number;
    chapterNumber?: number;
    chapterTitle?: string;
    pageInChapter?: number;
    totalInChapter?: number;
    blocks?: HandbookContentBlock[];
    subsectionTitle?: string;
    tocSections?: { number: number; title: string; pageIndex: number }[];
  };

  const stageRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<ReactFlipBookRef>(null);
  const navLabel = isIndex ? "Index" : (section?.heroTitle ?? "Handbook");
  const [currentPage, setCurrentPage] = useState(0);
  const [stage, setStage] = useState({ w: 0, h: 0 });

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

  const bookPages: BookPage[] = useMemo(() => {
    const result: BookPage[] = [];

    const buildSections = (sectionsList: HandbookDetailSection[]) => {
      const sectionPageEntries: { number: number; title: string; pageIndex: number }[] = [];

      sectionsList.forEach((sec, si) => {
        const pageIndex = result.length;
        const number = si + 1;
        sectionPageEntries.push({ number, title: sec.heroTitle, pageIndex });

        result.push({
          kind: "chapter-intro",
          theme: "ink",
          chapterIdx: si,
          chapterNumber: number,
          chapterTitle: sec.heroTitle,
        });

        for (const sub of sec.subsections) {
          const pageBlocks = splitPages(sub.blocks, contentHeight);
          pageBlocks.forEach((chunk, ci) => {
            result.push({
              kind: "content",
              theme: "paper",
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

      return sectionPageEntries;
    };

    if (isIndex && Object.keys(handbookData).length > 0) {
      result.push({ kind: "cover", theme: "ink" });
      const sectionsList = Object.values(handbookData);
      const tocEntries = buildSections(sectionsList);
      result.splice(1, 0, { kind: "toc", theme: "paper", tocSections: tocEntries });
      tocEntries.forEach(entry => { entry.pageIndex += 1; });
      result.push({ kind: "back-cover", theme: "ink" });
    } else if (section) {
      result.push({ kind: "cover", theme: "ink" });
      result.push({ kind: "toc", theme: "paper", tocSections: [{ number: 1, title: section.heroTitle, pageIndex: 2 }] });
      buildSections([section]);
      result.push({ kind: "back-cover", theme: "ink" });
    }

    if (result.length % 2 === 0) {
      result.splice(result.length - 1, 0, { kind: "content", theme: "paper", blocks: [] });
    }

    return result;
  }, [isIndex, section, handbookData, contentHeight]);

  const currentChapterIdx = bookPages[currentPage]?.chapterIdx ?? -1;

  const chapterSubsections = useMemo(() => {
    if (currentChapterIdx < 0) return [];
    const entries: { label: string; pageIndex: number }[] = [];
    bookPages.forEach((page, i) => {
      if (page.chapterIdx === currentChapterIdx && page.subsectionTitle) {
        const numMatch = page.subsectionTitle.match(/^(\d+\.\d+)/);
        const label = numMatch ? numMatch[1] : page.subsectionTitle;
        entries.push({ label, pageIndex: i });
      }
    });
    return entries;
  }, [currentChapterIdx, bookPages]);

  if (isError) {
    return (
      <InternalPageFrame>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-5 px-4 animate-fade-in">
          <div className="flex size-14 items-center justify-center r  ounded-full bg-ems-coral-dim">
            <AlertCircle className="size-7 text-ems-coral" />
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <p className="text-base font-semibold text-text-secondary">Failed to load handbook</p>
            <p className="max-w-[400px] text-sm leading-relaxed text-text-secondary">
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
      </InternalPageFrame>
    );
  }

  if (isLoading) {
    return (
      <InternalPageFrame>
        <div className="flex min-h-[400px] items-center justify-center text-neutral-500">
          Loading...
        </div>
      </InternalPageFrame>
    );
  }

  if (!isIndex && !section) {
    return (
      <InternalPageFrame>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-2 text-neutral-500">
          <p>Section not found.</p>
          <p className="text-sm">The handbook hash "{handbookHash}" did not match any loaded section.</p>
        </div>
      </InternalPageFrame>
    );
  }

  const totalPages = bookPages.length;
  const isMobile = stage.w > 0 && stage.w < 768;

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
            <div className="flex items-end justify-between text-[9px] font-medium uppercase tracking-[0.25em] text-white/25">
              <span>Innovation Arts Entertainment</span>
              <span>No. 001</span>
            </div>
          </div>
          <div className={`flex shrink-0 items-center justify-between border-t px-5 py-2 ${ink ? "border-white/[0.06] text-white/25" : "border-neutral-100 text-neutral-300"}`}>
            <span className="text-[8px] font-medium uppercase tracking-[0.2em]">iAE Employee Handbook</span>
            <span className="text-[8px] font-medium uppercase tracking-[0.2em]">{String(pageNumber).padStart(3, "0")} / {String(totalPages).padStart(3, "0")}</span>
          </div>
        </div>
      );
    }

    if (page.kind === "toc" && page.tocSections) {
      const sectionIcons = [Lectern, UserRoundCog, Home, Banknote, Star, BookOpen, ClipboardCheck];
      return (
        <div className={`flex h-full w-full flex-col ${themeClasses} ${isMobile ? "" : "page-edge"}`}>
          <div className="flex-1 overflow-hidden p-8 md:p-10">
            <h2 className="font-display text-xl tracking-tight mb-4">Contents</h2>
            <div className="h-px w-8 bg-current/20 mb-5" />
            <nav className="space-y-[3px]">
              {page.tocSections.map((sec) => {
                const Icon = sectionIcons[sec.number - 1] || BookOpen;
                return (
                  <button
                    key={sec.number}
                    type="button"
                    onClick={() => bookRef.current?.flip(Math.min(sec.pageIndex + 1, totalPages - 1))}
                    className="group flex h-[44px] w-full items-center gap-3 border-t border-neutral-200 px-0 text-left text-[12px] text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline-none"
                  >
                    <span className="w-5 text-[10px] font-medium text-neutral-300 group-hover:text-neutral-500">
                      {String(sec.number).padStart(2, "0")}
                    </span>
                    <Icon className="size-[16px] shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-500" strokeWidth={1.5} aria-hidden />
                    <span className="leading-tight">{sec.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex shrink-0 items-center justify-between border-t border-neutral-100 px-5 py-2 text-neutral-300">
            <span className="text-[8px] font-medium uppercase tracking-[0.2em]">iAE Employee Handbook</span>
            <span className="text-[8px] font-medium uppercase tracking-[0.2em]">{String(pageNumber).padStart(3, "0")} / {String(totalPages).padStart(3, "0")}</span>
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
          <div className="flex shrink-0 items-center justify-between border-t border-white/[0.06] px-5 py-2 text-white/25">
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
          <div className={`flex shrink-0 items-center justify-between border-t px-5 py-2 ${ink ? "border-white/[0.06] text-white/25" : "border-neutral-100 text-neutral-300"}`}>
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
        <div className={`flex shrink-0 items-center justify-between border-t px-5 py-2 ${ink ? "border-white/[0.06] text-white/25" : "border-neutral-100 text-neutral-300"}`}>
          <span className="text-[8px] font-medium uppercase tracking-[0.2em]">iAE Employee Handbook</span>
          <span className="text-[8px] font-medium uppercase tracking-[0.2em]">{String(pageNumber).padStart(3, "0")} / {String(totalPages).padStart(3, "0")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 ink-grain">
      {/* Top bar */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.04] bg-neutral-950/80 px-4 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={() => openEmployeeHandbook("services")}
          className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-white/30 transition-colors hover:text-white/60"
        >
          <X className="size-3.5" strokeWidth={2} />
          Close
        </button>
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/20">
          {navLabel}
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/30" />
        </div>
      </div>

      {/* Flipbook area */}
      <div
        ref={stageRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-2 pt-1 sm:px-6 sm:pb-4"
      >
        {pageW > 0 && pageH > 0 && (
          <div
            className="book-shadow"
            style={{ width: isMobile ? pageW : pageW * 2, height: pageH }}
          >
            <ReactFlipBook
              key={bookPages.length}
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
              startPage={0}
              mobileScrollSupport={false}
              onFlip={(e: { data: number }) => setCurrentPage(e.data)}
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
                  <span className="rounded-full bg-neutral-950/80 px-3 py-0.5 text-[10px] font-medium text-white/30 backdrop-blur-sm">
                    {current + 1} / {total}
                  </span>
                </div>
              )}
            >
              {bookPages.map((page, index) => (
                <div key={index} style={{ width: pageW, height: pageH }}>
                  {renderBookPage(page, index, index + 1)}
                </div>
              ))}
            </ReactFlipBook>
          </div>
        )}

        {/* ── Floating buttons: desktop (left side) ── */}
        <div className="absolute left-2 top-1/2 z-20 -translate-y-1/2 flex-col gap-1.5 hidden md:flex">
          <button
            type="button"
            onClick={() => bookRef.current?.flip(0)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-neutral-950/70 text-white/40 shadow-lg backdrop-blur-md transition-all hover:border-white/20 hover:text-white/70"
            title="Go to cover"
          >
            <BookOpen className="size-3.5" strokeWidth={1.5} />
          </button>

          {chapterSubsections.length > 0 && (
            <div className="flex flex-col gap-1">
              {chapterSubsections.map((sub) => (
                <button
                  key={sub.label}
                  type="button"
                  onClick={() => bookRef.current?.flip(sub.pageIndex)}
                  className="flex h-6 items-center justify-center rounded-full border border-white/[0.08] bg-neutral-950/70 px-2 text-[8px] font-medium uppercase tracking-[0.1em] text-white/35 shadow-lg backdrop-blur-md transition-all hover:border-white/20 hover:text-white/70"
                  title={sub.label}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile buttons: below flipbook ── */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-2 md:hidden">
        <button
          type="button"
          onClick={() => bookRef.current?.flip(0)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-neutral-950/70 text-white/40 shadow-lg backdrop-blur-md transition-all hover:border-white/20 hover:text-white/70"
          title="Go to cover"
        >
          <BookOpen className="size-3.5" strokeWidth={1.5} />
        </button>

        {chapterSubsections.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chapterSubsections.map((sub) => (
              <button
                key={sub.label}
                type="button"
                onClick={() => bookRef.current?.flip(sub.pageIndex)}
                className="flex h-6 items-center justify-center rounded-full border border-white/[0.08] bg-neutral-950/70 px-2.5 text-[8px] font-medium uppercase tracking-[0.1em] text-white/35 shadow-lg backdrop-blur-md transition-all hover:border-white/20 hover:text-white/70"
                title={sub.label}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex h-9 shrink-0 items-center gap-3 border-t border-white/[0.04] bg-neutral-950/80 px-4 backdrop-blur-md sm:px-6">
        <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/20 shrink-0">
          Progress
        </span>
        <div className="relative flex-1 h-px bg-white/[0.06] overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-white/30 transition-[width] duration-500 ease-out"
            style={{ width: `${totalPages ? ((currentPage + 1) / totalPages) * 100 : 0}%` }}
          />
        </div>
        <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/20 shrink-0">
          &larr; &rarr; to turn
        </span>
      </div>
    </div>
  );
}


