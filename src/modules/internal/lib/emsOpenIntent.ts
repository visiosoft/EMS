import type { MouseEvent } from "react";

const EMS_OPEN_INTENT_KEY = "iae-ems-open-intent-v1";

export type EmsOpenView = "engagements" | "calendar";

export type EmsEngagementTimingFilter = "all" | "past" | "upcoming";

type EmsOpenIntentPayload = {
  view: EmsOpenView;
  createEngagement?: boolean;
  timingFilter?: EmsEngagementTimingFilter;
  mineOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
  expiresAt: number;
};

export function primeEmsOpenIntent({
  view,
  createEngagement = false,
  timingFilter,
  mineOnly = false,
  dateFrom,
  dateTo,
}: {
  view: EmsOpenView;
  createEngagement?: boolean;
  timingFilter?: EmsEngagementTimingFilter;
  mineOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
}) {
  if (typeof window === "undefined") return;

  const payload: EmsOpenIntentPayload = {
    view,
    expiresAt: Date.now() + 30_000,
  };

  if (view === "engagements") {
    if (createEngagement) payload.createEngagement = true;
    if (timingFilter) payload.timingFilter = timingFilter;
    if (mineOnly) payload.mineOnly = true;
    if (dateFrom) payload.dateFrom = dateFrom;
    if (dateTo) payload.dateTo = dateTo;
  }

  window.localStorage.setItem(EMS_OPEN_INTENT_KEY, JSON.stringify(payload));
}

export function handleOpenEngagements(
  _event: MouseEvent<HTMLAnchorElement>,
  createEngagement = false,
) {
  primeEmsOpenIntent({ view: "engagements", createEngagement });
}

export function handleOpenEmsCalendar(_event: MouseEvent<HTMLAnchorElement>) {
  primeEmsOpenIntent({ view: "calendar" });
}
