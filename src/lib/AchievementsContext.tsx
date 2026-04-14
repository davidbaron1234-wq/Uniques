"use client";

import {
  createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { ACHIEVEMENTS, DEMO_UNLOCKED_IDS, type Achievement } from "@/lib/achievements";
import { useNotifications } from "@/lib/NotificationContext";
import { isDemoUser } from "@/lib/demo";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AchievementsContextValue {
  achievements:           Achievement[];
  unlockAchievement:      (id: string, catalystItem?: { name: string; imageUrl: string }) => void;
  /** Apply a server-confirmed unlock: updates state + fires notification. Does NOT re-POST to DB. */
  applyServerAchievement: (id: string, catalystItem?: { name: string; imageUrl: string }) => void;
  isUnlocked:             (id: string) => boolean;
}

// ── Persistence helpers ───────────────────────────────────────────────────────

const STORAGE_KEY = "uniques_achievements_v1";

type StoredOverride = {
  id:           string;
  status:       "unlocked" | "locked";
  unlockedAt?:  string;
  catalystItem?: { name: string; imageUrl: string };
};

/** Merge saved override record with the canonical ACHIEVEMENTS array.
 *  Icons, colors, and glow always come from the static data — only
 *  status / unlockedAt / catalystItem are persisted.
 */
function loadAchievements(): Achievement[] {
  if (typeof window === "undefined") return ACHIEVEMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ACHIEVEMENTS;
    const overrides: StoredOverride[] = JSON.parse(raw);
    return ACHIEVEMENTS.map((a) => {
      const o = overrides.find((x) => x.id === a.id);
      if (o?.status === "unlocked") {
        return { ...a, status: "unlocked", unlockedAt: o.unlockedAt, catalystItem: o.catalystItem ?? a.catalystItem };
      }
      return a;
    });
  } catch {
    return ACHIEVEMENTS;
  }
}

function saveAchievements(list: Achievement[]) {
  try {
    const overrides: StoredOverride[] = list.map((a) => ({
      id:          a.id,
      status:      a.status,
      unlockedAt:  a.unlockedAt,
      catalystItem: a.catalystItem,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch { /* quota */ }
}

// ── Context & Provider ────────────────────────────────────────────────────────

const AchievementsContext = createContext<AchievementsContextValue | null>(null);

export function AchievementsProvider({ children }: { children: ReactNode }) {
  const { data: session, status: authStatus } = useSession();
  const [achievements, setAchievements] = useState<Achievement[]>(loadAchievements);
  const { addNotification } = useNotifications();
  const addNotificationRef = useRef(addNotification);
  useEffect(() => { addNotificationRef.current = addNotification; }, [addNotification]);
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  // Re-hydrate on mount in case localStorage was updated elsewhere
  useEffect(() => {
    setAchievements(loadAchievements());
  }, []);

  // Demo account: seed showcase achievements from static data (localStorage cache)
  useEffect(() => {
    if (authStatus === "loading") return;
    if (typeof window === "undefined") return;
    if (!isDemoUser(session?.user?.email)) return; // real users handled by DB sync below
    if (localStorage.getItem(STORAGE_KEY)) return; // respect previously-earned demo state

    const seeded = ACHIEVEMENTS.map((a) => ({
      ...a,
      status:      (DEMO_UNLOCKED_IDS.has(a.id) ? "unlocked" : "locked") as Achievement["status"],
      unlockedAt:  DEMO_UNLOCKED_IDS.has(a.id) ? a.unlockedAt  : undefined,
      catalystItem: DEMO_UNLOCKED_IDS.has(a.id) ? a.catalystItem : undefined,
    }));
    setAchievements(seeded);
    saveAchievements(seeded);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  // Real users: DB is the single source of truth.
  // Re-runs whenever the user's session ID changes (login / account switch).
  // Builds the authoritative achievement list from the canonical ACHIEVEMENTS
  // definitions + DB unlock records — overwriting any stale localStorage cache.
  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session?.user?.id || isDemoUser(session.user.email)) return;

    fetch("/api/achievements")
      .then((r) => r.ok ? r.json() : null)
      .then((data: {
        achievements: {
          achievementId: string;
          unlockedAt:    string;
          catalystName?: string;
          catalystImage?: string;
        }[];
      } | null) => {
        if (!data) return;

        const dbMap   = new Map(data.achievements.map((r) => [r.achievementId, r]));

        // Find achievements unlocked in localStorage but missing from DB.
        // This happens when the POST to /api/achievements failed silently on unlock.
        // Push them to DB now so other users can see them on the public profile.
        const localState = loadAchievements();
        const localUnlocked = localState.filter(
          (a) => a.status === "unlocked" && !dbMap.has(a.id),
        );
        for (const a of localUnlocked) {
          fetch("/api/achievements", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              achievementId: a.id,
              catalystName:  a.catalystItem?.name  ?? null,
              catalystImage: a.catalystItem?.imageUrl ?? null,
            }),
          }).catch(() => {});
          // Optimistically add to dbMap so the authoritative list includes it
          dbMap.set(a.id, {
            achievementId: a.id,
            unlockedAt:    new Date().toISOString(),
            catalystName:  a.catalystItem?.name,
            catalystImage: a.catalystItem?.imageUrl,
          });
        }

        // Rebuild from canonical ACHIEVEMENTS + merged DB records
        const authoritative = ACHIEVEMENTS.map((a) => {
          const record = dbMap.get(a.id);
          if (record) {
            return {
              ...a,
              status:      "unlocked" as const,
              unlockedAt:  new Date(record.unlockedAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              }),
              catalystItem: record.catalystName
                ? { name: record.catalystName, imageUrl: record.catalystImage ?? "" }
                : a.catalystItem,
            };
          }
          return a; // not in DB and not locally unlocked → locked
        });

        setAchievements(authoritative);
        saveAchievements(authoritative);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, authStatus]);

  // Shared state-update + notification logic used by both unlock paths
  const applyUnlock = useCallback(
    (id: string, catalystItem: { name: string; imageUrl: string } | undefined, persistToDB: boolean) => {
      setAchievements((prev) => {
        const target = prev.find((a) => a.id === id);
        if (!target || target.status === "unlocked") return prev;

        const unlockedAt = new Date().toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric",
        });

        const updated = prev.map((a) =>
          a.id === id
            ? { ...a, status: "unlocked" as const, unlockedAt, catalystItem: catalystItem ?? a.catalystItem }
            : a,
        );
        saveAchievements(updated);

        // Notification toast
        setTimeout(() => {
          addNotificationRef.current({
            id:      `achievement-${id}-${Date.now()}`,
            type:    "achievement",
            message: `Achievement Unlocked: ${target.title}! ${target.description}.`,
            time:    "Just now",
            isRead:  false,
            href:    "/inventory",
          });
        }, 0);

        return updated;
      });

      // Persist to DB outside the state updater (side effects must not live inside setState).
      // Server-triggered path already persisted in checkUserAchievements — don't double-write.
      const s = sessionRef.current;
      if (persistToDB && !isDemoUser(s?.user?.email) && s?.user?.id) {
        const userId = s.user.id;
        fetch("/api/achievements", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            achievementId: id,
            catalystName:  catalystItem?.name  ?? null,
            catalystImage: catalystItem?.imageUrl ?? null,
          }),
        })
          .then((r) => {
            if (r.ok) {
              // Broadcast so any visitor currently viewing this user's profile sees
              // the new badge immediately without a manual refresh.
              window.dispatchEvent(
                new CustomEvent("uniques:achievement-unlocked", {
                  detail: { userId, achievementId: id },
                }),
              );
            }
          })
          .catch(() => {});
      }
    },
    [],
  );

  /** Client-triggered unlock: updates state, fires notification, persists to DB + creates Activity. */
  const unlockAchievement = useCallback(
    (id: string, catalystItem?: { name: string; imageUrl: string }) => applyUnlock(id, catalystItem, true),
    [applyUnlock],
  );

  /** Server-confirmed unlock: updates state + fires notification only. Server already wrote to DB. */
  const applyServerAchievement = useCallback(
    (id: string, catalystItem?: { name: string; imageUrl: string }) => applyUnlock(id, catalystItem, false),
    [applyUnlock],
  );

  const isUnlocked = useCallback(
    (id: string) => achievements.some((a) => a.id === id && a.status === "unlocked"),
    [achievements],
  );

  return (
    <AchievementsContext.Provider value={{ achievements, unlockAchievement, applyServerAchievement, isUnlocked }}>
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievements(): AchievementsContextValue {
  const ctx = useContext(AchievementsContext);
  if (!ctx) throw new Error("useAchievements must be used within <AchievementsProvider>");
  return ctx;
}
