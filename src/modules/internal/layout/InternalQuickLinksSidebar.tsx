import { ChevronDown, ChevronLeft, Download, File, Folder, Loader2 } from "lucide-react";
import { QUICK_LINKS } from "../constants/quickLinks";
import { useInternalNavigation } from "../routing/InternalNavigationContext";
import { useSidebarDocuments } from "../../../features/document-library/hooks/useSidebarDocuments";
import { downloadFile } from "../../../features/document-library/services/documentApi";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Could not load documents";
}

function getErrorSuggestion(error: unknown): string | undefined {
  if (error && typeof error === "object" && "suggestion" in error) {
    const suggestion = (error as { suggestion?: unknown }).suggestion;
    if (typeof suggestion === "string") return suggestion;
  }
  return undefined;
}

function getFileIconColor(name: string): string {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  const colors: Record<string, string> = {
    ".doc": "text-blue-700", ".docx": "text-blue-700",
    ".xls": "text-green-700", ".xlsx": "text-green-700",
    ".ppt": "text-red-600", ".pptx": "text-red-600",
    ".pdf": "text-red-500", ".txt": "text-neutral-500",
    ".zip": "text-amber-600", ".jpg": "text-sky-500",
    ".jpeg": "text-sky-500", ".png": "text-sky-500",
    ".gif": "text-sky-500", ".svg": "text-sky-500",
    ".mp4": "text-purple-500", ".mov": "text-purple-500",
    ".mp3": "text-pink-500", ".csv": "text-green-700",
    ".html": "text-blue-500", ".htm": "text-blue-500",
  };
  return colors[ext] || "text-neutral-500";
}

export function InternalQuickLinksSidebar() {
  const { navigate } = useInternalNavigation();
  const { items, isLoading, error, refetch, navigateToFolder, canGoUp, goUp } = useSidebarDocuments();

  return (
    <aside className="w-full shrink-0 self-stretch bg-black text-white lg:w-[290px] xl:w-[324px]">
      <div className="flex w-full flex-col overflow-y-auto px-6 pb-10 pt-10 lg:sticky lg:top-[56px] lg:max-h-[calc(100vh-56px)] xl:px-8">
        <section className="animate-slide-up">
          <h2 className="mb-6 text-xl font-semibold tracking-[0.02em] text-white">Quick Links</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:gap-4">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              const className =
                "group flex min-h-[48px] w-full items-center gap-3 rounded-sm bg-white px-4 py-3 text-left text-[14px] font-semibold text-neutral-950 shadow-sm outline-none transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-100 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black";

              const content = (
                <>
                  <Icon className="h-5 w-5 shrink-0 text-neutral-500 transition-colors group-hover:text-black" strokeWidth={1.7} aria-hidden />
                  {link.label}
                </>
              );

              return (
                <li key={link.label}>
                  {link.external && link.href ? (
                    <a href={link.href} target="_blank" rel="noreferrer" className={className}>
                      {content}
                    </a>
                  ) : link.view ? (
                    <button type="button" onClick={() => navigate(link.view!)} className={className}>
                      {content}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        <hr className="my-10 border-white/20 lg:my-12" />

        <section className="animate-slide-up">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-[0.02em] text-white">Documents</h2>
          </div>
          <div className="overflow-hidden rounded-sm bg-white text-neutral-950 shadow-sm">
            <div className="grid grid-cols-[26px_1fr_18px] items-center border-b border-neutral-200 px-4 py-3 text-[13px] font-semibold">
              <File className="h-4 w-4 text-neutral-500" aria-hidden />
              <span>Name</span>
              <ChevronDown className="h-4 w-4 text-neutral-500" aria-hidden />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : error ? (
              <div className="px-4 py-6 text-center text-sm text-neutral-500">
                <p>{getErrorMessage(error)}</p>
                {getErrorSuggestion(error) && (
                  <p className="mt-1 text-xs text-neutral-400">{getErrorSuggestion(error)}</p>
                )}
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-2 text-xs font-semibold text-blue-400 underline underline-offset-2 hover:text-blue-300"
                >
                  Try again
                </button>
              </div>
            ) : items.length === 0 ? (
              <div>
                {canGoUp && (
                  <button
                    type="button"
                    onClick={goUp}
                    className="grid w-full grid-cols-[26px_1fr] items-center border-b border-neutral-100 px-4 py-3 text-left text-[14px] text-neutral-500 transition-colors hover:bg-neutral-100"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    <span>..</span>
                  </button>
                )}
                <div className="px-4 py-6 text-center text-sm text-neutral-500">
                  {canGoUp ? "No documents in this folder" : "No documents available to you yet"}
                </div>
              </div>
            ) : (
              <ul>
                {canGoUp && (
                  <li className="border-b border-neutral-100">
                    <button
                      type="button"
                      onClick={goUp}
                      className="grid w-full grid-cols-[26px_1fr] items-center px-4 py-3 text-left text-[14px] text-neutral-500 transition-colors hover:bg-neutral-100"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                      <span>..</span>
                    </button>
                  </li>
                )}
                {items.map((item) => {
                  const isFolder = item.type === "folder";
                  if (isFolder) {
                    return (
                      <li key={item.id} className="border-b border-neutral-100 last:border-b-0">
                        <button
                          type="button"
                          onClick={() => navigateToFolder(item.path)}
                          className="grid w-full grid-cols-[26px_1fr] items-center px-4 py-3 text-left text-[14px] text-neutral-800 transition-colors hover:bg-neutral-100"
                        >
                          <Folder className="h-4 w-4 text-amber-500" aria-hidden />
                          <span className="truncate" title={item.name}>{item.name}</span>
                        </button>
                      </li>
                    );
                  }
                  return (
                    <li key={item.id} className="border-b border-neutral-100 last:border-b-0">
                      <div className="grid w-full grid-cols-[1fr_36px] items-center transition-colors hover:bg-neutral-100">
                        <button
                          type="button"
                          onClick={() => window.open(item.url, "_blank")}
                          className="grid grid-cols-[26px_1fr] items-center px-4 py-3 text-left text-[14px] text-neutral-800"
                        >
                          <File className={`h-4 w-4 ${getFileIconColor(item.name)}`} aria-hidden />
                          <span className="truncate" title={item.name}>{item.name}</span>
                        </button>
                        <button
                          type="button"
                          title={`Download ${item.name}`}
                          aria-label={`Download ${item.name}`}
                          onClick={() => {
                            void downloadFile(item, "onedrive", { self: true }).catch((err) => {
                              console.error("Download failed", err);
                            });
                          }}
                          className="flex h-full items-center justify-center text-neutral-400 transition-colors hover:text-neutral-800"
                        >
                          <Download className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
