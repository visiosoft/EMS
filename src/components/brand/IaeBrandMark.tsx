import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/** How the logo image is composited onto its background. */
export type IaeBrandSurface = "adaptive" | "on-dark" | "on-light";

type IaeLogoIconProps = {
  surface?: IaeBrandSurface;
  className?: string;
};

/** iAE mark image only (`/iae_logo.png`) — same asset as EMS sidebar. */
export function IaeLogoIcon({ surface = "adaptive", className }: IaeLogoIconProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn("animate-pulse rounded bg-elevated", className)}
        style={{ width: 48, height: 24 }}
        aria-hidden
      />
    );
  }

  const isDark =
    surface === "on-dark" ? true : surface === "on-light" ? false : resolvedTheme !== "light";

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded", className)}
      style={{ width: 48, height: 24 }}
    >
      <img
        src="/iae_logo.png"
        alt=""
        className="h-full w-full object-contain"
        style={{
          borderRadius: 4,
          filter: isDark ? "none" : "invert(1)",
          mixBlendMode: isDark ? "screen" : "multiply",
          transition: "filter 0.25s ease",
        }}
      />
    </div>
  );
}

type IaeBrandMarkProps = {
  surface?: IaeBrandSurface;
  showLabels?: boolean;
  subtitle?: string;
  collapseLabelsOnDesktop?: boolean;
  className?: string;
};

/**
 * EMS sidebar brand block: logo + “IAE” / subtitle (default “Event Flow”).
 * Use `surface="on-dark"` on the Company Hub black header.
 */
export function IaeBrandMark({
  surface = "adaptive",
  showLabels = true,
  subtitle = "Event Flow",
  collapseLabelsOnDesktop = false,
  className,
}: IaeBrandMarkProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)} aria-label="IAE">
      <IaeLogoIcon surface={surface} />
      {showLabels ? (
        <div
          className={cn(
            "flex min-w-0 flex-col leading-tight",
            collapseLabelsOnDesktop && "lg:hidden",
          )}
        >
          <span
            className={cn(
              "text-sm font-semibold tracking-wide",
              surface === "on-dark" ? "text-white" : "text-text-primary",
            )}
          >
            IAE
          </span>
          <span
            className={cn(
              "text-[10px] font-medium uppercase tracking-widest",
              surface === "on-dark" ? "text-white/55" : "text-text-muted",
            )}
          >
            {subtitle}
          </span>
        </div>
      ) : null}
    </div>
  );
}

type IaeLogoFullProps = {
  height?: number;
  surface?: IaeBrandSurface;
};

/** Full-width logo image (login, dashboards). */
export function IaeLogoFull({ height = 28, surface = "adaptive" }: IaeLogoFullProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark =
    surface === "on-dark" ? true : surface === "on-light" ? false : resolvedTheme !== "light";

  return (
    <img
      src="/iae_logo.png"
      alt="IAE"
      style={{
        height,
        width: "auto",
        objectFit: "contain",
        filter: isDark ? "none" : "invert(1)",
        mixBlendMode: isDark ? "screen" : "multiply",
        transition: "filter 0.25s ease",
      }}
    />
  );
}
