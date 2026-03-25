"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { isDemoUser } from "@/lib/demo";

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotifType = "trade" | "match" | "alert" | "achievement";

export interface Notification {
  id: string;
  type: NotifType;
  message: string;
  time: string;
  isRead: boolean;
  href?: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  addNotification: (n: Notification) => void;
}

// ── Seed data (demo account only) ─────────────────────────────────────────────

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id:      "n0",
    type:    "achievement",
    message: "Achievement Unlocked: Dealmaker! You've completed 10 successful trades.",
    time:    "Just now",
    isRead:  false,
    href:    "/inventory",
  },
  {
    id:      "n1",
    type:    "trade",
    message: "Ethan offered a trade for your Charizard Base Set.",
    time:    "2m ago",
    isRead:  false,
    href:    "/",
  },
  {
    id:      "n2",
    type:    "match",
    message: "Perfect Match! Drew just listed the Rolex Daytona you're looking for.",
    time:    "15m ago",
    isRead:  false,
    href:    "/search",
  },
  {
    id:      "n3",
    type:    "alert",
    message: "Market Alert: The value of 1933 Saint-Gaudens Double Eagle dropped by 5%.",
    time:    "1h ago",
    isRead:  true,
    href:    "/search",
  },
];

const WELCOME_NOTIFICATION: Notification = {
  id:      "welcome-beta",
  type:    "achievement",
  message: "Welcome to Uniques Beta! You are an early adopter. Explore, trade, collect.",
  time:    "Just now",
  isRead:  false,
  href:    "/inventory",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Context & Provider ────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const seeded = useRef(false);

  // Seed / load once after auth resolves
  useEffect(() => {
    if (status === "loading" || seeded.current) return;
    seeded.current = true;

    if (isDemoUser(session?.user?.email)) {
      // Demo: use rich mock feed
      setNotifications(DEMO_NOTIFICATIONS);
      return;
    }

    // Real users: fetch from DB. New users will see an empty inbox until their first
    // notification arrives (e.g. the early-adopter achievement toast on first item add).
    fetch("/api/notifications")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { notifications: Array<{
        id: string; type: string; message: string; isRead: boolean; href: string | null; createdAt: string;
      }> } | null) => {
        if (!data) return;
        setNotifications(
          data.notifications.map((n) => ({
            id:      n.id,
            type:    n.type as NotifType,
            message: n.message,
            time:    relativeTime(n.createdAt),
            isRead:  n.isRead,
            href:    n.href ?? undefined,
          }))
        );
      })
      .catch(() => {
        // Offline: fall back to welcome notification in memory
        setNotifications([WELCOME_NOTIFICATION]);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.email]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    // Persist to DB for real users (fire-and-forget)
    if (!isDemoUser(session?.user?.email)) {
      fetch("/api/notifications", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ all: true }),
      }).catch(() => {});
    }
  }, [session?.user?.email]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    // Persist to DB for real users (fire-and-forget)
    if (!isDemoUser(session?.user?.email)) {
      fetch("/api/notifications", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ids: [id] }),
      }).catch(() => {});
    }
  }, [session?.user?.email]);

  const addNotification = useCallback((notif: Notification) => {
    setNotifications((prev) => [notif, ...prev]);
    // For real users, also persist to DB
    if (!isDemoUser(session?.user?.email)) {
      fetch("/api/notifications", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: notif.message, type: notif.type, href: notif.href }),
      }).catch(() => {});
    }
  }, [session?.user?.email]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllAsRead, markAsRead, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within <NotificationProvider>");
  return ctx;
}
