import { useRef, useEffect, useState, type ReactNode } from "react";
import {
  BadgeDollarSign,
  Briefcase,
  CalendarClock,
  IdCard,
  LineChart,
  RotateCcw,
} from "lucide-react";
import { HUB_ACTION_CARDS } from "../constants/quickLinks";

const CARD_ICONS: Record<(typeof HUB_ACTION_CARDS)[number]["key"], ReactNode> = {
  "sales-update": (
    <span className="relative inline-flex items-center justify-center">
      <LineChart className="h-16 w-16" strokeWidth={1.25} />
      <BadgeDollarSign className="absolute -bottom-2 -right-2 h-7 w-7" strokeWidth={1.5} />
    </span>
  ),
  "employee-services": <IdCard className="h-16 w-16" strokeWidth={1.25} />,
  "past-engagements": (
    <span className="relative inline-flex items-center justify-center">
      <Briefcase className="h-16 w-16" strokeWidth={1.25} />
      <RotateCcw className="absolute -right-2.5 -top-2.5 h-7 w-7 opacity-90" strokeWidth={1.5} />
    </span>
  ),
  "upcoming-engagements": <CalendarClock className="h-16 w-16" strokeWidth={1.25} />,
};

export function HubActionCards() {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Small delay so the hero title animates first, cards follow
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); io.disconnect(); }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
      aria-label="Hub actions"
    >
      {HUB_ACTION_CARDS.map((card, i) => (
        <a
          key={card.key}
          href={`#${card.key}`}
          className="group flex min-h-[180px] sm:min-h-[200px] flex-col items-center justify-center gap-4 rounded-lg bg-[#1a1a1a] px-4 py-8 text-center text-white hover:bg-black active:scale-[0.97]"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0) scale(1)" : "translateY(28px) scale(0.97)",
            transition: `opacity 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 80}ms, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 80}ms, background-color 0.15s ease`,
          }}
        >
          <span
            className="text-white/95 duration-200"
            style={{ transition: "transform 0.2s ease" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1.08)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1)")}
          >
            {CARD_ICONS[card.key]}
          </span>
          <span className="text-sm font-semibold leading-tight sm:text-[15px]">
            {card.label}
          </span>
        </a>
      ))}
    </section>
  );
}