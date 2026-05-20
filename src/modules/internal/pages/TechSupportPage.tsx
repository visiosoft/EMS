import { Search, ChevronDown, BookOpen, HelpCircle, MessageSquareWarning } from "lucide-react";
import { IaeLogoIcon } from "@/components/brand/IaeBrandMark";

export function TechSupportPage() {
  return (
    <div className="min-h-screen bg-white text-[#1f2933]">
      <header className="relative overflow-hidden bg-[#153f6d] text-white">
        <div className="absolute inset-0 opacity-55" aria-hidden>
          <div className="absolute -bottom-28 -left-16 h-64 w-[48%] rounded-[50%] bg-[#0c315a]" />
          <div className="absolute -bottom-24 right-0 h-72 w-[46%] rounded-tl-[100%] bg-[#0b315b]" />
          <div className="absolute bottom-0 left-[28%] h-40 w-[40%] rounded-t-[80%] bg-[#0f3864]" />
        </div>

        <nav className="relative mx-auto flex max-w-[1480px] flex-col items-start justify-between gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
          <div className="flex items-center gap-3 text-base font-semibold sm:text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95">
              <IaeLogoIcon surface="on-light" className="h-6 w-6" />
            </span>
            <span className="leading-tight">Innovation Arts and Entertainment</span>
            <span className="hidden text-white/70 sm:inline">| Help Center</span>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
            <button type="button" className="inline-flex h-10 items-center rounded-md bg-[#0f5fc6] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#0c55b3]">Submit a Request</button>
            <button type="button" className="inline-flex h-10 items-center rounded-md bg-white px-4 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-100">Sign In</button>
          </div>
        </nav>

        <div className="relative mx-auto flex min-h-[315px] max-w-[900px] flex-col items-center justify-center px-4 pb-16 pt-10 text-center sm:px-5 sm:pb-24 sm:pt-12">
          <h1 className="text-[clamp(2rem,10vw,3.625rem)] font-bold tracking-[0.03em] sm:tracking-[0.08em]">How can we help, today?</h1>
          <div className="mt-8 flex w-full max-w-[535px] flex-col overflow-hidden rounded-sm shadow-sm sm:flex-row">
            <label className="flex h-11 flex-1 items-center gap-3 bg-white px-4 text-neutral-500">
              <Search className="h-4 w-4" aria-hidden />
              <input className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-neutral-500" placeholder="Search our knowledge base articles and FAQs..." />
            </label>
            <button className="flex h-11 items-center justify-center gap-2 bg-[#5f7fa2] px-4 text-sm font-semibold text-white sm:justify-start">
              Helpdesk <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 pb-24">
        <section className="relative z-10 -mt-12 grid gap-6 md:grid-cols-3">
          {[
            { title: "Report an Issue", text: "Open a help desk request for any acute issue you're facing.", icon: MessageSquareWarning, muted: true },
            { title: "Knowledge Base", text: "Check our internal guides for detailed help and info.", icon: BookOpen },
            { title: "FAQs", text: "Quickly find answers to questions we've all asked.", icon: HelpCircle },
          ].map(({ title, text, icon: Icon, muted }) => (
            <article key={title} className="flex min-h-[145px] flex-col items-center justify-center rounded bg-white px-6 py-6 text-center shadow-[0_1px_5px_rgba(0,0,0,0.35)]">
              <Icon className={`h-12 w-12 ${muted ? "text-red-200" : "text-[#0e7a91]"}`} strokeWidth={1.35} aria-hidden />
              <h2 className="mt-4 text-xl font-semibold text-neutral-800">{title}</h2>
              <p className="mt-2 text-sm leading-snug text-neutral-500">{text}</p>
            </article>
          ))}
        </section>

        <section className="mt-20 space-y-10 sm:mt-36 sm:space-y-12">
          <div className="grid gap-4 border-b border-neutral-200 pb-8 sm:grid-cols-[190px_1fr] sm:gap-12 sm:pb-10">
            <h2 className="text-xl font-semibold leading-tight text-neutral-900">Recent Knowledge<br />Base Articles</h2>
            <p className="pt-1 text-sm font-medium text-neutral-900">No Articles to show.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[190px_1fr] sm:gap-12">
            <h2 className="text-xl font-semibold text-neutral-900">Recent FAQs</h2>
            <p className="pt-1 text-sm font-medium text-neutral-900">No FAQs to show.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
