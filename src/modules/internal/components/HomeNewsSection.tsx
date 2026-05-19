import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, Plus, UserRound, X } from "lucide-react";
import { HOME_NEWS_ITEMS } from "../constants/quickLinks";

type NewsAccent = "slate" | "orange" | "charcoal" | "yellow";

type NewsFormValues = {
  title: string;
  summary: string;
  body: string;
  author: string;
  publishDate: string;
  views: string;
  accent: NewsAccent;
  featured: boolean;
};

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  body?: string;
  author: string;
  date: string;
  views: string;
  accent: NewsAccent;
};

type NewsFormErrors = Partial<Record<keyof NewsFormValues, string>>;

const DEFAULT_FEATURED_NEWS: NewsItem = {
  id: "featured-company-news",
  title: "Company News",
  summary: "Company News Stay updated with the latest announcements, achievements, and company-wide updates.",
  author: "Haider Khalil",
  date: "about an hour ago",
  views: "45 views",
  accent: "yellow",
};

const DEFAULT_FORM_VALUES: NewsFormValues = {
  title: "",
  summary: "",
  body: "",
  author: "",
  publishDate: new Date().toISOString().slice(0, 10),
  views: "0",
  accent: "slate",
  featured: false,
};

function NewsImage({ variant, featured = false }: { variant: string; featured?: boolean }) {
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

  const variantClass =
    variant === "orange"
      ? "bg-[radial-gradient(circle_at_20%_40%,#ef8c4b_0,#ef8c4b_22%,#ff762d_23%,#ff762d_55%,#fff_56%)]"
      : variant === "charcoal"
        ? "bg-[linear-gradient(135deg,#efefef_0%,#efefef_40%,#565656_41%,#565656_100%)]"
        : "bg-[linear-gradient(180deg,#f4f4f4_0%,#f4f4f4_45%,#545454_46%,#545454_100%)]";

  return <div className={`h-[78px] w-full shrink-0 overflow-hidden ${variantClass} md:w-[166px]`} aria-hidden />;
}

function formatNewsDate(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Today";

  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(date);
}

function validateNewsForm(values: NewsFormValues): NewsFormErrors {
  const errors: NewsFormErrors = {};
  const trimmedTitle = values.title.trim();
  const trimmedSummary = values.summary.trim();
  const trimmedBody = values.body.trim();
  const trimmedAuthor = values.author.trim();
  const viewCount = Number(values.views);

  if (!trimmedTitle) errors.title = "Title is required.";
  else if (trimmedTitle.length < 3) errors.title = "Title must be at least 3 characters.";
  else if (trimmedTitle.length > 120) errors.title = "Title must be 120 characters or fewer.";

  if (!trimmedSummary) errors.summary = "Short summary is required.";
  else if (trimmedSummary.length < 10) errors.summary = "Summary must be at least 10 characters.";
  else if (trimmedSummary.length > 220) errors.summary = "Summary must be 220 characters or fewer.";

  if (!trimmedBody) errors.body = "News body is required.";
  else if (trimmedBody.length < 20) errors.body = "News body must be at least 20 characters.";
  else if (trimmedBody.length > 5000) errors.body = "News body must be 5,000 characters or fewer.";

  if (!trimmedAuthor) errors.author = "Author name is required.";
  else if (trimmedAuthor.length > 80) errors.author = "Author name must be 80 characters or fewer.";

  if (!values.publishDate) errors.publishDate = "Publish date is required.";

  if (values.views === "") errors.views = "Views are required.";
  else if (!Number.isInteger(viewCount) || viewCount < 0) errors.views = "Views must be a whole number greater than or equal to 0.";
  else if (viewCount > 999999) errors.views = "Views must be 999,999 or fewer.";

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

    setValues({ ...DEFAULT_FORM_VALUES, publishDate: new Date().toISOString().slice(0, 10) });
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
    const validationErrors = validateNewsForm(values);
    setErrors(validationErrors);
    setTouched({
      title: true,
      summary: true,
      body: true,
      author: true,
      publishDate: true,
      views: true,
      accent: true,
      featured: true,
    });

    if (Object.keys(validationErrors).length > 0) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await onSubmit(values);
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

      <div className="relative flex max-h-[calc(100vh-48px)] w-full max-w-[760px] animate-slide-up flex-col overflow-hidden rounded-lg bg-white shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">Company Hub</p>
            <h3 id="add-news-title" className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-neutral-950">
              Add news
            </h3>
            <p className="mt-1 max-w-[560px] text-sm leading-relaxed text-neutral-600">
              Create the news card content now. Backend persistence will plug into this same submit flow later.
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

            <label className="sm:col-span-2">
              <span className="text-sm font-semibold text-neutral-900">News body *</span>
              <textarea
                value={values.body}
                onChange={(event) => setField("body", event.target.value)}
                onBlur={() => markTouched("body")}
                maxLength={5000}
                rows={6}
                className="mt-2 w-full resize-y rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                placeholder="Write the full announcement or update here."
                aria-invalid={Boolean(errors.body)}
              />
              <div className="mt-1 flex items-start justify-between gap-3">
                <FieldError message={errors.body} />
                <span className="ml-auto text-xs text-neutral-500">{values.body.length}/5000</span>
              </div>
            </label>

            <label>
              <span className="text-sm font-semibold text-neutral-900">Author *</span>
              <input
                value={values.author}
                onChange={(event) => setField("author", event.target.value)}
                onBlur={() => markTouched("author")}
                maxLength={80}
                className="mt-2 h-11 w-full rounded-md border border-neutral-300 px-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                placeholder="Author name"
                aria-invalid={Boolean(errors.author)}
              />
              <FieldError message={errors.author} />
            </label>

            <label>
              <span className="text-sm font-semibold text-neutral-900">Publish date *</span>
              <input
                type="date"
                value={values.publishDate}
                onChange={(event) => setField("publishDate", event.target.value)}
                onBlur={() => markTouched("publishDate")}
                className="mt-2 h-11 w-full rounded-md border border-neutral-300 px-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                aria-invalid={Boolean(errors.publishDate)}
              />
              <FieldError message={errors.publishDate} />
            </label>

            <label>
              <span className="text-sm font-semibold text-neutral-900">Initial views *</span>
              <input
                type="number"
                min={0}
                max={999999}
                value={values.views}
                onChange={(event) => setField("views", event.target.value)}
                onBlur={() => markTouched("views")}
                className="mt-2 h-11 w-full rounded-md border border-neutral-300 px-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                aria-invalid={Boolean(errors.views)}
              />
              <FieldError message={errors.views} />
            </label>

            <label>
              <span className="text-sm font-semibold text-neutral-900">Card artwork</span>
              <select
                value={values.accent}
                onChange={(event) => setField("accent", event.target.value as NewsAccent)}
                className="mt-2 h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              >
                <option value="slate">Slate banner</option>
                <option value="orange">Orange feature</option>
                <option value="charcoal">Charcoal diagonal</option>
                <option value="yellow">Calendar yellow</option>
              </select>
            </label>

            <label className="flex items-start gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={values.featured}
                onChange={(event) => setField("featured", event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-neutral-300 text-black focus:ring-black"
              />
              <span>
                <span className="block text-sm font-semibold text-neutral-900">Make this the featured news story</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-neutral-600">
                  It will replace the large Company News card on this screen until the page refreshes or backend data is connected.
                </span>
              </span>
            </label>
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
  const [featuredNews, setFeaturedNews] = useState<NewsItem>(DEFAULT_FEATURED_NEWS);
  const [newsItems, setNewsItems] = useState<NewsItem[]>(
    HOME_NEWS_ITEMS.map((item, index) => ({
      id: `sample-news-${index}`,
      title: item.title,
      summary: item.summary,
      author: item.author,
      date: item.date,
      views: item.views,
      accent: item.accent as NewsAccent,
    })),
  );

  const handleAddNews = async (values: NewsFormValues) => {
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    const nextNewsItem: NewsItem = {
      id: `local-news-${Date.now()}`,
      title: values.title.trim(),
      summary: values.summary.trim(),
      body: values.body.trim(),
      author: values.author.trim(),
      date: formatNewsDate(values.publishDate),
      views: `${Number(values.views).toLocaleString()} views`,
      accent: values.accent,
    };

    if (values.featured) {
      setFeaturedNews(nextNewsItem);
      return;
    }

    setNewsItems((previous) => [nextNewsItem, ...previous].slice(0, 6));
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
        <article className="group min-w-0">
          <NewsImage variant={featuredNews.accent} featured />
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
                <strong className="font-semibold text-neutral-900">{featuredNews.author}</strong> {featuredNews.date}
                <br />
                <span className="text-neutral-500">{featuredNews.views}</span>
              </span>
            </div>
          </div>
        </article>

        <div className="space-y-0 divide-y divide-neutral-200">
          {newsItems.map((item) => (
            <article
              key={item.id}
              className="group flex flex-col gap-4 py-3 transition-colors duration-200 first:pt-0 hover:bg-neutral-50 md:flex-row md:px-2"
            >
              <NewsImage variant={item.accent} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[16px] font-semibold text-neutral-950 group-hover:underline group-hover:underline-offset-4">
                  {item.title}
                </h3>
                <p className="mt-2 line-clamp-1 text-[13px] text-neutral-600">{item.summary}</p>
                <p className="mt-5 text-xs text-neutral-700">
                  <strong className="font-semibold text-neutral-900">{item.author}</strong> {item.date}
                </p>
                <p className="text-xs text-neutral-500">{item.views}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <AddNewsModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddNews} />
    </section>
  );
}
