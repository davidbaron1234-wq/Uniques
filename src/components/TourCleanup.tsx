"use client";

/**
 * TourCleanup — runs once on every app load.
 *
 * Problem: The multi-page driver.js tour passes batons between pages by
 * writing tourStep flags to localStorage right before navigating.  If the
 * user closes the browser mid-tour (e.g., after step 5 sets tourStep=messages
 * but before /inbox is visited), those flags are permanently stuck.  Every
 * subsequent visit to /inbox or /inventory will fire the tour unexpectedly.
 *
 * Fix: On mount we check each transient tour flag.  If the flag exists AND
 * was written more than TOUR_TTL_MS ago (60 seconds), it is considered stale
 * and removed.  If it was written within the TTL window we leave it alone so
 * the normal in-page tour logic can consume it.
 *
 * Freshness is tracked via a paired timestamp key (e.g., tourStep_ts).
 * When a page sets tourStep it ALSO sets tourStep_ts = Date.now() so that
 * this component can evaluate freshness on the next app load.
 *
 * ─── All localStorage keys used by this app ──────────────────────────────
 *
 * INVENTORY / TRADE DATA
 *   uniques_inventory_v2          — main inventory items (JSON array)
 *   uniques_trade_history         — trade history entries (JSON array)
 *   trade_completed_[id]          — ISO timestamp when a trade was completed
 *
 * INBOX STATE  (per-conversation flags, id = "drew" | "ethan" | "sam" | "alex" | "jordan")
 *   inbox_read_[id]               — conversation has been opened / read
 *   inbox_dot_[id]                — manually marked as unread (dot badge)
 *   inbox_pin_[id]                — pinned to top of list
 *   inbox_del_[id]                — conversation deleted (hidden)
 *   inbox_block_[id]              — user blocked
 *
 * ONBOARDING / TOUR  (transient — cleaned up by this component if stale)
 *   needsTour                     — set by onboarding page; triggers home tour (steps 1–2)
 *   continueTour                  — set by home page; triggers search tour (steps 3–5)
 *   tourStep                      — "messages" | "profile"; triggers inbox/inventory tour steps 6–7
 *   tourStep_ts                   — timestamp (ms) when tourStep was last written (freshness guard)
 *   continueTour_ts               — timestamp (ms) when continueTour was last written (freshness guard)
 *   needsTour_ts                  — timestamp (ms) when needsTour was last written (freshness guard)
 *
 * USER PROFILE / PREFERENCES
 *   uniques_profile               — serialised UserProfile object (name, avatar, bio, …)
 *   uniques_pinned_grails         — JSON array of grail item IDs
 *   uniques_pinned_achievements   — JSON array of pinned achievement IDs
 *   uniques_user_preferences      — serialised preferences (favorite categories, …)
 *   uniques_achievements_v1       — serialised achievement unlock overrides
 *   last_name_change              — timestamp (ms) of last username change (90-day lock)
 *
 * SETTINGS
 *   uniques_notif_push            — "true" | "false" (push notifications toggle)
 *   uniques_notif_trades          — "true" | "false" (trade notifications toggle)
 *   uniques_notif_market          — "true" | "false" (market alerts toggle)
 * ─────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from "react";

/** How long (ms) a transient tour flag is considered fresh after being written. */
const TOUR_TTL_MS = 60_000; // 60 seconds

/**
 * Transient tour flags that should be auto-expired if they outlive their TTL.
 * Each entry is [flagKey, timestampKey].
 */
const TRANSIENT_TOUR_FLAGS: [string, string][] = [
  ["tourStep",    "tourStep_ts"],
  ["continueTour","continueTour_ts"],
  ["needsTour",   "needsTour_ts"],
];

export default function TourCleanup() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const now = Date.now();

    for (const [flagKey, tsKey] of TRANSIENT_TOUR_FLAGS) {
      const flagVal = localStorage.getItem(flagKey);
      if (!flagVal) continue; // nothing to clean up

      const ts = Number(localStorage.getItem(tsKey) ?? "0");

      if (!ts || now - ts > TOUR_TTL_MS) {
        // Flag is either missing a timestamp (written before this guard was
        // added) or older than the TTL — treat as stale and remove both.
        localStorage.removeItem(flagKey);
        localStorage.removeItem(tsKey);
      }
      // else: flag is fresh — leave it for the page-level tour effect to consume.
    }
  // Intentionally empty deps — run exactly once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This component renders nothing visible.
  return null;
}
