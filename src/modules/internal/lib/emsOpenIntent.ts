import type { MouseEvent } from "react";

const EMS_OPEN_INTENT_KEY = "iae-ems-open-intent-v1";

export function primeEngagementsTab(createEngagement = false) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    EMS_OPEN_INTENT_KEY,
    JSON.stringify({
      view: "engagements",
      createEngagement,
      expiresAt: Date.now() + 30_000,
    }),
  );
}

export function handleOpenEngagements(
  _event: MouseEvent<HTMLAnchorElement>,
  createEngagement = false,
) {
  primeEngagementsTab(createEngagement);
}
