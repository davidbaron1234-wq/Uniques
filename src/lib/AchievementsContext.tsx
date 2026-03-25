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

  // Once auth resolves: seed achievements if no localStorage state exists yet.
  // Demo account → unlock the showcase set; real users → only "early-adopter".
  // If localStorage already has data it is respected (earned achievements survive).
  useEffect(() => {
    if (authStatus === "loading") return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return; // respect previously-earned state

    const demo = isDemoUser(session?.user?.email);
    const seeded = ACHIEVEMENTS.map((a) => {
      const shouldUnlock = demo ? DEMO_UNLOCKED_IDS.has(a.id) : a.id === "early-adopter";
      return {
        ...a,
        status:      (shouldUnlock ? "unlocked" : "locked") as Achievement["status"],
        unlockedAt:  shouldUnlock ? a.unlockedAt  : undefined,
        catalystItem: shouldUnlock ? a.catalystItem : undefined,
      };
    });
    setAchievements(seeded);
    saveAchievements(seeded);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  // Sync DB achievements on login — cross-device persistence
  const dbAchSynced = useRef(false);
  useEffect(() => {
    if (authStatus === "loading" || dbAchSynced.current) return;
    if (!session?.user?.id || isDemoUser(session.user.email)) return;
    dbAchSynced.current = true;
    fetch("/api/achievements")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { achievements: { achievementId: string; unlockedAt: string; catalystName?: string; catalystImage?: string }[] } | null) => {
        if (!data?.achievements?.length) return;
        setAchievements((prev) => {
          let changed = false;
          const next = prev.map((a) => {
            const record = data.achievements.find((r) => r.achievementId === a.id);
            if (record && a.status !== "unlocked") {
              changed = true;
              return {
                ...a,
                status: "unlocked" as const,
                unlockedAt: new Date(record.unlockedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                catalystItem: record.catalystName
                  ? { name: record.catalystName, imageUrl: record.catalystImage ?? "" }
                  : a.catalystItem,
              };
            }
            return a;
          });
          if (changed) saveAchievements(next);
          return changed ? next : prev;
        });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, session?.user?.id]);

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

        // Persist to DB for real users (client-triggered path only)
        // Server-triggered path already persisted in checkUserAchievements — don't double-write
        const s = sessionRef.current;
        if (persistToDB && !isDemoUser(s?.user?.email) && s?.user?.id) {
          fetch("/api/achievements", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              achievementId: id,
              catalystName:  catalystItem?.name,
              catalystImage: catalystItem?.imageUrl,
            }),
          }).catch(() => {});
        }

        return updated;
      });
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
