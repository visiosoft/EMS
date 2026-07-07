import { useRef, useEffect, useState, type ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  Contact,
  IdCard,
  Star,
  UserRound,
} from "lucide-react";
import { HUB_ACTION_CARDS } from "../constants/quickLinks";
import { primeEmsOpenIntent } from "../lib/emsOpenIntent";
import { useInternalNavigation } from "../routing/InternalNavigationContext";

const CARD_ICONS: Record<(typeof HUB_ACTION_CARDS)[number]["key"], ReactNode> = {
  "my-engagements": (
    <span className="relative inline-flex items-center justify-center">
      <BriefcaseBusiness className="h-[74px] w-[74px]" strokeWidth={1.9} />
      <UserRound className="absolute -right-4 -top-3 h-9 w-9 fill-black" strokeWidth={2.1} />
    </span>
  ),
  "employee-services": <IdCard className="h-[74px] w-[74px]" strokeWidth={1.9} />,
  "employee-directory": <Contact className="h-[74px] w-[74px]" strokeWidth={1.9} />,
  "upcoming-engagements": (
    <span className="relative inline-flex items-center justify-center">
      <CalendarDays className="h-[74px] w-[74px]" strokeWidth={1.9} />
      <Star className="absolute bottom-4 h-8 w-8 fill-black" strokeWidth={2} />
    </span>
  ),
};

function openEmsEngagements(options: { timingFilter?: "all" | "past" | "upcoming"; mineOnly?: boolean }) {
  primeEmsOpenIntent({ view: "engagements", ...options });
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

  const handleCardClick = (key: (typeof HUB_ACTION_CARDS)[number]["key"]) => {
    if (key === "my-engagements") {
      openEmsEngagements({ mineOnly: true, timingFilter: "all" });
      return;
    }
    if (key === "upcoming-engagements") {
      openEmsEngagements({ timingFilter: "upcoming", mineOnly: true });
      return;
    }
    if (key === "employee-directory") {
      navigate("employee-services", { revealDirectory: true });
      return;
    }
    navigate("employee-services");
  };

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

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => handleCardClick(card.key)}
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
