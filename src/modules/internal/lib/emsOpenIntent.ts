import type { MouseEvent } from "react";

const EMS_OPEN_INTENT_KEY = "iae-ems-open-intent-v1";

export type EmsOpenView = "engagements" | "calendar";

type EmsOpenIntentPayload = {
  view: EmsOpenView;
  createEngagement?: boolean;
  expiresAt: number;
};

export function primeEmsOpenIntent({
  view,
  createEngagement = false,
}: {
  view: EmsOpenView;
  createEngagement?: boolean;
}) {
  if (typeof window === "undefined") return;

  const payload: EmsOpenIntentPayload = {
    view,
    expiresAt: Date.now() + 30_000,
  };

  if (view === "engagements" && createEngagement) {
    payload.createEngagement = true;
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
