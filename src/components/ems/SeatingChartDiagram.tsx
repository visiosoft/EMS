/**
 * SeatingChartDiagram — generates a simple, recognizable seating-chart preview
 * purely from a venue's name, type, and seating capacity. No backend data.
 *
 * The layout style is chosen from the venue type:
 *   - "round"  → arena / stadium / bowl / theater-in-the-round (seats around a center stage)
 *   - "grid"   → club / ballroom / black box / general admission (flat grid)
 *   - "fan"    → proscenium / theater / amphitheater / hall / default (curved rows facing a stage)
 */
import { useState } from 'react';

type LayoutStyle = 'fan' | 'round' | 'grid';

const MAX_RENDERED_SEATS = 2200;

function pickStyle(venueType: string | null | undefined): LayoutStyle {
  const t = (venueType ?? '').toLowerCase();
  if (/arena|stadium|bowl|round|coliseum|colosseum/.test(t)) return 'round';
  if (/club|ballroom|black\s*box|general admission|standing|festival|flat/.test(t)) return 'grid';
  return 'fan';
}

interface Seat {
  x: number;
  y: number;
}

const VIEW_W = 720;
const VIEW_H = 460;

function buildFanSeats(capacity: number): { seats: Seat[]; stage: { x: number; y: number; w: number; h: number } } {
  const seats: Seat[] = [];
  const focalX = VIEW_W / 2;
  const focalY = 70; // stage sits near the focal point at the top
  const rows = Math.min(26, Math.max(6, Math.round(Math.sqrt(capacity) / 1.15) + 3));
  const rowGap = Math.min(15, (VIEW_H - 120) / rows);
  const r0 = 60;
  const spread = (62 * Math.PI) / 180; // ±62°

  // Distribute seats across rows with weight proportional to the arc radius.
  const radii: number[] = [];
  let weight = 0;
  for (let i = 0; i < rows; i++) {
    const r = r0 + i * rowGap;
    radii.push(r);
    weight += r;
  }
  let placed = 0;
  for (let i = 0; i < rows; i++) {
    const r = radii[i];
    const isLast = i === rows - 1;
    let n = Math.round((capacity * r) / weight);
    if (isLast) n = Math.max(0, capacity - placed);
    n = Math.max(1, n);
    for (let s = 0; s < n && placed < capacity; s++) {
      const a = n === 1 ? 0 : -spread + (2 * spread * s) / (n - 1);
      seats.push({ x: focalX + r * Math.sin(a), y: focalY + r * Math.cos(a) });
      placed++;
    }
  }
  return { seats, stage: { x: focalX - 70, y: 24, w: 140, h: 24 } };
}

function buildRoundSeats(capacity: number): { seats: Seat[]; stage: { x: number; y: number; w: number; h: number } } {
  const seats: Seat[] = [];
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;
  const rings = Math.min(18, Math.max(5, Math.round(Math.sqrt(capacity) / 1.4) + 2));
  const r0 = 70;
  const ringGap = Math.min(16, (Math.min(VIEW_W, VIEW_H) / 2 - r0 - 10) / rings);
  const radii: number[] = [];
  let weight = 0;
  for (let i = 0; i < rings; i++) {
    const r = r0 + i * ringGap;
    radii.push(r);
    weight += r;
  }
  let placed = 0;
  for (let i = 0; i < rings; i++) {
    const r = radii[i];
    const isLast = i === rings - 1;
    let n = Math.round((capacity * r) / weight);
    if (isLast) n = Math.max(0, capacity - placed);
    n = Math.max(1, n);
    for (let s = 0; s < n && placed < capacity; s++) {
      const a = (2 * Math.PI * s) / n;
      // Oval to fit the viewBox aspect ratio.
      seats.push({ x: cx + r * 1.15 * Math.cos(a), y: cy + r * 0.78 * Math.sin(a) });
      placed++;
    }
  }
  return { seats, stage: { x: cx - 38, y: cy - 20, w: 76, h: 40 } };
}

function buildGridSeats(capacity: number): { seats: Seat[]; stage: { x: number; y: number; w: number; h: number } } {
  const seats: Seat[] = [];
  const usableW = VIEW_W - 80;
  const usableH = VIEW_H - 120;
  const aspect = usableW / usableH;
  const cols = Math.max(1, Math.round(Math.sqrt(capacity * aspect)));
  const rows = Math.max(1, Math.ceil(capacity / cols));
  const gx = usableW / cols;
  const gy = usableH / rows;
  let placed = 0;
  for (let r = 0; r < rows && placed < capacity; r++) {
    for (let c = 0; c < cols && placed < capacity; c++) {
      seats.push({ x: 40 + gx * (c + 0.5), y: 90 + gy * (r + 0.5) });
      placed++;
    }
  }
  return { seats, stage: { x: VIEW_W / 2 - 80, y: 24, w: 160, h: 26 } };
}

export function SeatingChartDiagram({
  venueName,
  venueType,
  capacity,
  className,
}: {
  venueName: string | null | undefined;
  venueType: string | null | undefined;
  capacity: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const cap = Number.isFinite(capacity) ? Math.max(0, Math.trunc(capacity)) : 0;

  const headerLabel = cap > 0
    ? `${venueType?.trim() || 'Seating'} · ${cap.toLocaleString()} seats`
    : 'Seating Chart';

  if (cap <= 0) {
    return (
      <div className={`rounded-md border border-dashed border-border bg-surface/40 ${className ?? ''}`}>
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
          aria-expanded={expanded}
        >
          <span className="text-xs font-medium text-text-muted">Venue Seating Chart</span>
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
        {expanded && (
          <div className="border-t border-border px-3 pb-3 pt-2 text-center text-sm text-text-muted">
            Enter a seating capacity to preview a generated seating chart.
          </div>
        )}
      </div>
    );
  }

  const style = pickStyle(venueType);
  const rendered = Math.min(cap, MAX_RENDERED_SEATS);
  const isRepresentative = cap > MAX_RENDERED_SEATS;

  const { seats, stage } =
    style === 'round'
      ? buildRoundSeats(rendered)
      : style === 'grid'
        ? buildGridSeats(rendered)
        : buildFanSeats(rendered);

  // Seat radius scales down as the count grows so dense charts stay readable.
  const seatR = Math.max(1.6, Math.min(4, 220 / Math.sqrt(rendered)));

  return (
    <div className={`rounded-md border border-border bg-surface/40 ${className ?? ''}`}>
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-xs font-semibold text-text-primary">
            {venueName?.trim() || 'Untitled venue'}
          </span>
          <span className="text-[11px] text-text-muted">{headerLabel}</span>
        </div>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Expandable chart body */}
      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-2">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="mx-auto h-auto w-80 text-ems-accent"
            role="img"
            aria-label={`Generated seating chart for ${venueName ?? 'venue'} (${cap} seats)`}
          >
            {/* Stage */}
            <rect
              x={stage.x}
              y={stage.y}
              width={stage.w}
              height={stage.h}
              rx={4}
              fill="rgb(71 85 105)"
            />
            <text
              x={stage.x + stage.w / 2}
              y={stage.y + stage.h / 2 + 4}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill="#ffffff"
            >
              STAGE
            </text>

            {/* Seats */}
            {seats.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={seatR} fill="currentColor" opacity={0.85} />
            ))}
          </svg>
          <p className="mt-1 text-[11px] text-text-muted">
            Auto-generated layout from venue type &amp; capacity
            {isRepresentative ? ` (showing ${MAX_RENDERED_SEATS.toLocaleString()} of ${cap.toLocaleString()} seats)` : ''}
            . Not an exact floor plan.
          </p>
        </div>
      )}
    </div>
  );
}

export default SeatingChartDiagram;
