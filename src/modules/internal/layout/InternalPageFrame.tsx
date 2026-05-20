import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type InternalPageFrameProps = {
  children: ReactNode;
  /** Rendered at the bottom of the viewport when main content is short (e.g. Company News links bar). */
  footer?: ReactNode;
  className?: string;
};

/**
 * Standard page wrapper for Company Hub screens.
 * Grows to fill the layout column so footers stay at the bottom on tall viewports.
 */
export function InternalPageFrame({ children, footer, className }: InternalPageFrameProps) {
  const hasFooter = Boolean(footer);

  return (
    <div className={cn("flex min-h-0 w-full flex-1 flex-col text-black", className)}>
      <div
        className={cn(
          "bg-white",
          hasFooter ? "shrink-0 pb-12 sm:pb-16" : "flex min-h-0 flex-1 flex-col",
        )}
      >
        {children}
      </div>
      {footer ? (
        <div className="mt-auto flex w-full flex-1 flex-col justify-start bg-black">{footer}</div>
      ) : null}
    </div>
  );
}
