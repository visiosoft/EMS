import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bold,
  Eraser,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pilcrow,
  Plus,
  Underline,
  UserRound,
  X,
} from "lucide-react";
import { HOME_NEWS_ITEMS } from "../constants/quickLinks";

type NewsFormValues = {
  title: string;
  summary: string;
  body: string;
};

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  body?: string;
  createdBy: string;
};

type NewsFormErrors = Partial<Record<keyof NewsFormValues, string>>;

type EditorCommand = {
  label: string;
  icon: typeof Bold;
  action: () => void;
};

const CURRENT_USER_ID = "current-user";
const MAX_BODY_TEXT_LENGTH = 5000;

const DEFAULT_FORM_VALUES: NewsFormValues = {
  title: "",
  summary: "",
  body: "",
};

const ALLOWED_NEWS_HTML_TAGS = new Set(["a", "b", "blockquote", "br", "div", "em", "h2", "h3", "li", "ol", "p", "span", "strong", "u", "ul"]);

function getTextFromHtml(html: string) {
  if (!html) return "";

  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function sanitizeNewsHtml(html: string) {
  if (!html || typeof document === "undefined") return html.trim();

  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach((element) => element.remove());

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
  const elements: Element[] = [];

  while (walker.nextNode()) {
    elements.push(walker.currentNode as Element);
  }

  elements.forEach((element) => {
    const tagName = element.tagName.toLowerCase();

    if (!ALLOWED_NEWS_HTML_TAGS.has(tagName)) {
      element.replaceWith(document.createTextNode(element.textContent ?? ""));
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      const isSafeHref = tagName === "a" && name === "href" && /^(https?:\/\/|mailto:|#)/i.test(value);
      const isAnchorTarget = tagName === "a" && name === "target";
      const isAnchorRel = tagName === "a" && name === "rel";

      if (isSafeHref || isAnchorTarget || isAnchorRel) return;
      element.removeAttribute(attribute.name);
    });

    if (tagName === "a") {
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noreferrer");
    }
  });

  return template.innerHTML.trim();
}

function NewsImage({ featured = false }: { featured?: boolean }) {
  if (featured) {
    return (
      <div className="relative h-[220px] overflow-hidden bg-[#f2d400] md:h-[250px]">
        <div className="absolute -left-12 top-0 h-[130%] w-[48%] rotate-[-10deg] bg-white shadow-[10px_0_20px_rgba(0,0,0,0.12)]" />
        <div className="absolute left-5 top-5 grid h-[210px] w-[180px] rotate-[-10deg] grid-cols-4 grid-rows-7 gap-px border border-neutral-300 bg-neutral-200 opacity-90">
          {Array.from({ length: 28 }).map((_, index) => (
            <span key={index} className="flex items-center justify-center bg-white text-[11px] text-neutral-500">
              {index % 5 === 0 ? index + 1 : ""}
            </span>
          ))}
        </div>
        <div className="absolute right-0 top-0 h-full w-[58%] bg-gradient-to-l from-[#f5d900] via-[#f2d400] to-[#e9cb00]" />
      </div>
    );
  }

  return (
    <div
      className="relative h-[78px] w-full shrink-0 overflow-hidden bg-[linear-gradient(135deg,#f5f5f5_0%,#f5f5f5_40%,#5a5a5a_41%,#5a5a5a_100%)] md:w-[166px]"
      aria-hidden
    >
      <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_22%_32%,rgba(255,255,255,0.7)_0,rgba(255,255,255,0.7)_18%,transparent_19%)]" />
    </div>
  );
}

function validateNewsForm(values: NewsFormValues): NewsFormErrors {
  const errors: NewsFormErrors = {};
  const trimmedTitle = values.title.trim();
  const trimmedSummary = values.summary.trim();
  const bodyText = getTextFromHtml(values.body);

  if (!trimmedTitle) errors.title = "Title is required.";
  else if (trimmedTitle.length < 3) errors.title = "Title must be at least 3 characters.";
  else if (trimmedTitle.length > 120) errors.title = "Title must be 120 characters or fewer.";

  if (!trimmedSummary) errors.summary = "Short summary is required.";
  else if (trimmedSummary.length < 10) errors.summary = "Summary must be at least 10 characters.";
  else if (trimmedSummary.length > 220) errors.summary = "Summary must be 220 characters or fewer.";

  if (!bodyText) errors.body = "News body is required.";
  else if (bodyText.length < 20) errors.body = "News body must be at least 20 characters.";
  else if (bodyText.length > MAX_BODY_TEXT_LENGTH) errors.body = "News body must be 5,000 characters or fewer.";

  return errors;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-600">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

function HtmlEditor({
  value,
  onChange,
  onBlur,
  hasError,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  hasError?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const bodyTextLength = getTextFromHtml(value).length;

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor || editor.innerHTML === value) return;
    editor.innerHTML = value;
  }, [value]);

  const syncValue = () => onChange(editorRef.current?.innerHTML ?? "");

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    syncValue();
  };

  const addLink = () => {
    const rawUrl = window.prompt("Paste the link URL");
    if (!rawUrl) return;

    const trimmedUrl = rawUrl.trim();
    const safeUrl = /^(https?:\/\/|mailto:|#)/i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
    runCommand("createLink", safeUrl);
  };

  const commands: EditorCommand[] = [
    { label: "Heading", icon: Heading2, action: () => runCommand("formatBlock", "h2") },
    { label: "Paragraph", icon: Pilcrow, action: () => runCommand("formatBlock", "p") },
    { label: "Bold", icon: Bold, action: () => runCommand("bold") },
    { label: "Italic", icon: Italic, action: () => runCommand("italic") },
    { label: "Underline", icon: Underline, action: () => runCommand("underline") },
    { label: "Bulleted list", icon: List, action: () => runCommand("insertUnorderedList") },
    { label: "Numbered list", icon: ListOrdered, action: () => runCommand("insertOrderedList") },
    { label: "Link", icon: Link2, action: addLink },
    { label: "Clear formatting", icon: Eraser, action: () => runCommand("removeFormat") },
  ];

  return (
    <div className={`mt-2 overflow-hidden rounded-md border bg-white ${hasError ? "border-red-400" : "border-neutral-300"}`}>
      <div className="flex flex-wrap gap-1 border-b border-neutral-200 bg-neutral-50 p-2">
        {commands.map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={action}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded border border-transparent px-2 text-neutral-700 transition hover:border-neutral-300 hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            aria-label={label}
            title={label}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        ))}
      </div>

      <div className="relative">
        {!getTextFromHtml(value) ? (
          <p className="pointer-events-none absolute left-4 top-3 text-sm text-neutral-400">Write the full announcement or update here. Use the toolbar for formatting.</p>
        ) : null}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-invalid={hasError}
          onInput={syncValue}
          onBlur={onBlur}
          className="min-h-[190px] w-full overflow-y-auto px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-inset focus:ring-black/10 [&_a]:font-semibold [&_a]:text-black [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-4 [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
        />
      </div>

      <div className="flex items-center justify-between border-t border-neutral-100 bg-white px-3 py-2 text-xs text-neutral-500">
        <span>Supports headings, bold, italic, underline, lists, quotes, and links.</span>
        <span className={bodyTextLength > MAX_BODY_TEXT_LENGTH ? "font-semibold text-red-600" : ""}>
          {bodyTextLength}/{MAX_BODY_TEXT_LENGTH}
        </span>
      </div>
    </div>
  );
}

function AddNewsModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: NewsFormValues) => Promise<void>;
}) {
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [values, setValues] = useState<NewsFormValues>(DEFAULT_FORM_VALUES);
  const [errors, setErrors] = useState<NewsFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof NewsFormValues, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentErrors = useMemo(() => validateNewsForm(values), [values]);
  const isFormValid = Object.keys(currentErrors).length === 0;

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => titleInputRef.current?.focus(), 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, onClose, open]);

  useEffect(() => {
    if (open) return;

    setValues(DEFAULT_FORM_VALUES);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setSubmitError(null);
  }, [open]);

  if (!open) return null;

  const setField = <Field extends keyof NewsFormValues>(field: Field, value: NewsFormValues[Field]) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setSubmitError(null);

    if (touched[field]) {
      const nextValues = { ...values, [field]: value };
      setErrors(validateNewsForm(nextValues));
    }
  };

  const markTouched = (field: keyof NewsFormValues) => {
    setTouched((previous) => ({ ...previous, [field]: true }));
    setErrors(validateNewsForm(values));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const sanitizedValues: NewsFormValues = {
      title: values.title.trim(),
      summary: values.summary.trim(),
      body: sanitizeNewsHtml(values.body),
    };
    const validationErrors = validateNewsForm(sanitizedValues);

    setErrors(validationErrors);
    setTouched({ title: true, summary: true, body: true });

    if (Object.keys(validationErrors).length > 0) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await onSubmit(sanitizedValues);
      onClose();
    } catch {
      setSubmitError("Something went wrong while preparing the news item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6" role="dialog" aria-modal="true" aria-labelledby="add-news-title">
      <button
        type="button"
        aria-label="Close add news modal"
        className="absolute inset-0 cursor-default bg-black/62 backdrop-blur-[2px]"
        onClick={() => (!isSubmitting ? onClose() : undefined)}
      />

      <div className="relative flex max-h-[calc(100vh-48px)] w-full max-w-[820px] animate-slide-up flex-col overflow-hidden rounded-lg bg-white shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">Company Hub</p>
            <h3 id="add-news-title" className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-neutral-950">
              Add news
            </h3>
            <p className="mt-1 max-w-[620px] text-sm leading-relaxed text-neutral-600">
              The author will be taken from the logged-in user and saved through created_by. The body is stored as sanitized HTML.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-5 sm:px-7">
          {submitError ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-semibold text-neutral-900">Title *</span>
              <input
                ref={titleInputRef}
                value={values.title}
                onChange={(event) => setField("title", event.target.value)}
                onBlur={() => markTouched("title")}
                maxLength={120}
                className="mt-2 h-11 w-full rounded-md border border-neutral-300 px-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                placeholder="Example: Company News"
                aria-invalid={Boolean(errors.title)}
              />
              <FieldError message={errors.title} />
            </label>

            <label className="sm:col-span-2">
              <span className="text-sm font-semibold text-neutral-900">Short summary *</span>
              <textarea
                value={values.summary}
                onChange={(event) => setField("summary", event.target.value)}
                onBlur={() => markTouched("summary")}
                maxLength={220}
                rows={3}
                className="mt-2 w-full resize-none rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                placeholder="A short preview that appears on the news card."
                aria-invalid={Boolean(errors.summary)}
              />
              <div className="mt-1 flex items-start justify-between gap-3">
                <FieldError message={errors.summary} />
                <span className="ml-auto text-xs text-neutral-500">{values.summary.length}/220</span>
              </div>
            </label>

            <div className="sm:col-span-2">
              <span className="text-sm font-semibold text-neutral-900">News body *</span>
              <HtmlEditor
                value={values.body}
                onChange={(nextValue) => setField("body", nextValue)}
                onBlur={() => markTouched("body")}
                hasError={Boolean(errors.body)}
              />
              <FieldError message={errors.body} />
            </div>
          </div>

          <div className="sticky bottom-0 -mx-5 mt-6 flex flex-col-reverse gap-3 border-t border-neutral-200 bg-white/96 px-5 py-4 backdrop-blur sm:-mx-7 sm:flex-row sm:items-center sm:justify-end sm:px-7">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="inline-flex h-11 items-center justify-center rounded-md bg-black px-6 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Saving...
                </>
              ) : (
                "Submit news"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function HomeNewsSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newsItems, setNewsItems] = useState<NewsItem[]>(
    HOME_NEWS_ITEMS.map((item, index) => ({
      id: `sample-news-${index}`,
      title: item.title,
      summary: item.summary,
      createdBy: item.createdBy,
    })),
  );

  const [featuredNews, ...sideNewsItems] = newsItems;

  const handleAddNews = async (values: NewsFormValues) => {
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    const nextNewsItem: NewsItem = {
      id: `local-news-${Date.now()}`,
      title: values.title,
      summary: values.summary,
      body: values.body,
      createdBy: CURRENT_USER_ID,
    };

    setNewsItems((previous) => [nextNewsItem, ...previous].slice(0, 7));
  };

  return (
    <section id="company-news" className="mt-14 animate-slide-up md:mt-16">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-[0.01em] text-neutral-950">News</h2>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-neutral-900 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add
          </button>
        </div>
        <a href="#see-news" className="text-xs font-semibold text-neutral-900 underline-offset-4 hover:underline">
          See all
        </a>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(330px,0.92fr)]">
        {featuredNews ? (
          <article className="group min-w-0">
            <NewsImage featured />
            <div className="mt-4">
              <h3 className="text-xl font-semibold text-neutral-950">{featuredNews.title}</h3>
              <p className="mt-2 line-clamp-2 max-w-[560px] text-[15px] leading-relaxed text-neutral-600">
                {featuredNews.summary}
              </p>
              <div className="mt-6 flex items-center gap-3 text-xs text-neutral-700">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-neutral-500">
                  <UserRound className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <strong className="font-semibold text-neutral-900">{featuredNews.createdBy}</strong>
                </span>
              </div>
            </div>
          </article>
        ) : null}

        <div className="space-y-0 divide-y divide-neutral-200">
          {sideNewsItems.map((item) => (
            <article
              key={item.id}
              className="group flex flex-col gap-4 py-3 transition-colors duration-200 first:pt-0 hover:bg-neutral-50 md:flex-row md:px-2"
            >
              <NewsImage />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[16px] font-semibold text-neutral-950 group-hover:underline group-hover:underline-offset-4">
                  {item.title}
                </h3>
                <p className="mt-2 line-clamp-1 text-[13px] text-neutral-600">{item.summary}</p>
                <p className="mt-5 text-xs text-neutral-700">
                  <strong className="font-semibold text-neutral-900">{item.createdBy}</strong>
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <AddNewsModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddNews} />
    </section>
  );
}
