import { useRef, useEffect, useState, type ReactNode, type MouseEvent } from "react";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  CalendarDays,
  IdCard,
  LineChart,
  RotateCcw,
  Star,
} from "lucide-react";
import { HUB_ACTION_CARDS } from "../constants/quickLinks";
import { useInternalNavigation } from "../routing/InternalNavigationContext";

const SALES_UPDATE_URL =
  "https://innovationae.sharepoint.com/:x:/s/IAECloudServer/EZwsYuu0QX9PjJW6GzC8JtkB50cSo1vLBDSscx4pmSy0tg?e=9mVJip&wdLOR=c02714DFC-8E9B-A44E-B239-9078B0C8BD68&web=1";
const EMS_OPEN_INTENT_KEY = "iae-ems-open-intent-v1";

const CARD_ICONS: Record<(typeof HUB_ACTION_CARDS)[number]["key"], ReactNode> = {
  "sales-update": (
    <span className="relative inline-flex items-center justify-center">
      <LineChart className="h-[70px] w-[70px]" strokeWidth={2.15} />
      <BadgeDollarSign className="absolute -left-3 top-1 h-8 w-8 fill-black text-white" strokeWidth={2.25} />
    </span>
  ),
  "employee-services": <IdCard className="h-[74px] w-[74px]" strokeWidth={1.9} />,
  "past-engagements": (
    <span className="relative inline-flex items-center justify-center">
      <BriefcaseBusiness className="h-[74px] w-[74px]" strokeWidth={1.9} />
      <RotateCcw className="absolute -right-4 -top-3 h-10 w-10" strokeWidth={2} />
    </span>
  ),
  "upcoming-engagements": (
    <span className="relative inline-flex items-center justify-center">
      <CalendarDays className="h-[74px] w-[74px]" strokeWidth={1.9} />
      <Star className="absolute bottom-4 h-8 w-8 fill-black" strokeWidth={2} />
    </span>
  ),
};

function primeEngagementsTab(timingFilter: "past" | "upcoming") {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    EMS_OPEN_INTENT_KEY,
    JSON.stringify({
      view: "engagements",
      timingFilter,
      expiresAt: Date.now() + 120_000,
    }),
  );
}

function handleEngagementCardClick(event: MouseEvent<HTMLButtonElement>, key: "past-engagements" | "upcoming-engagements") {
  event.preventDefault();
  primeEngagementsTab(key === "past-engagements" ? "past" : "upcoming");
  window.open("/", "_blank", "noopener,noreferrer");
}

export function HubActionCards() {
  const { navigate } = useInternalNavigation();
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4"
      aria-label="Hub actions"
    >
      {HUB_ACTION_CARDS.map((card, i) => {
        const sharedClass =
          "group relative flex min-h-[148px] w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-[#101010] px-3 py-5 text-center text-white shadow-[0_4px_12px_rgba(0,0,0,0.22)] outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-black hover:shadow-[0_18px_36px_rgba(0,0,0,0.28)] focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4 active:scale-[0.985] sm:min-h-[190px] sm:px-5 sm:py-8 xl:min-h-[198px]";
        const sharedStyle = {
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(28px) scale(0.97)",
          transitionDelay: `${i * 80}ms`,
        };

        if (card.key === "sales-update") {
          return (
            <a
              key={card.key}
              href={SALES_UPDATE_URL}
              target="_blank"
              rel="noreferrer"
              className={sharedClass}
              style={sharedStyle}
            >
              <CardContent card={card} />
            </a>
          );
        }

        if (card.key === "employee-services") {
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => navigate("employee-services")}
              className={sharedClass}
              style={sharedStyle}
            >
              <CardContent card={card} />
            </button>
          );
        }

        return (
          <button
            key={card.key}
            type="button"
            onClick={(event) => handleEngagementCardClick(event, card.key)}
            className={sharedClass}
            style={sharedStyle}
          >
            <CardContent card={card} />
          </button>
        );
      })}
    </section>
  );
}

function CardContent({ card }: { card: (typeof HUB_ACTION_CARDS)[number] }) {
  return (
    <>
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/20" aria-hidden />
      <span
        className="mb-3 scale-[0.78] text-white transition-transform duration-300 group-hover:scale-[0.86] sm:mb-5 sm:scale-100 sm:group-hover:scale-110"
        aria-hidden
      >
        {CARD_ICONS[card.key]}
      </span>
      <span className="text-[13px] font-semibold leading-tight tracking-[0.01em] sm:text-[15px]">{card.label}</span>
    </>
  );
}
