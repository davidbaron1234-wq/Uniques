"use client";

import {
  createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { ACHIEVEMENTS, type Achievement } from "@/lib/achievements";
import { useNotifications } from "@/lib/NotificationContext";
import { isDemoUser } from "@/lib/demo";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AchievementsContextValue {
  achievements:      Achievement[];
  unlockAchievement: (id: string, catalystItem?: { name: string; imageUrl: string }) => void;
  isUnlocked:        (id: string) => boolean;
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

  // Re-hydrate on mount in case localStorage was updated elsewhere
  useEffect(() => {
    setAchievements(loadAchievements());
  }, []);

  // Once auth resolves: real users start with only "early-adopter" unlocked
  // (only applied when there's no saved localStorage state — respects earned achievements)
  useEffect(() => {
    if (authStatus === "loading") return;
    if (isDemoUser(session?.user?.email)) return; // demo keeps all unlocked achievements
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return; // user already has saved achievements
    const cleanSlate = ACHIEVEMENTS.map((a) => ({
      ...a,
      status: (a.id === "early-adopter" ? "unlocked" : "locked") as Achievement["status"],
      unlockedAt: a.id === "early-adopter" ? a.unlockedAt : undefined,
      catalystItem: a.id === "early-adopter" ? a.catalystItem : undefined,
    }));
    setAchievements(cleanSlate);
    saveAchievements(cleanSlate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  const unlockAchievement = useCallback(
    (id: string, catalystItem?: { name: string; imageUrl: string }) => {
      setAchievements((prev) => {
        const target = prev.find((a) => a.id === id);
        // Already unlocked or unknown id — skip silently
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

        // Fire notification after state update using ref to avoid stale closures
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
    },
    [],
  );

  const isUnlocked = useCallback(
    (id: string) => achievements.some((a) => a.id === id && a.status === "unlocked"),
    [achievements],
  );

  return (
    <AchievementsContext.Provider value={{ achievements, unlockAchievement, isUnlocked }}>
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievements(): AchievementsContextValue {
  const ctx = useContext(AchievementsContext);
  if (!ctx) throw new Error("useAchievements must be used within <AchievementsProvider>");
  return ctx;
}
