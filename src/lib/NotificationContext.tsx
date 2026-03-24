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

// ── Context & Provider ────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const seeded = useRef(false);

  // Seed once after auth resolves — demo gets rich mock feed, real users get welcome message
  useEffect(() => {
    if (status === "loading" || seeded.current) return;
    seeded.current = true;
    if (isDemoUser(session?.user?.email)) {
      setNotifications(DEMO_NOTIFICATIONS);
    } else {
      setNotifications([WELCOME_NOTIFICATION]);
    }
  }, [status, session?.user?.email]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = useCallback(
    () => setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true }))),
    [],
  );

  const markAsRead = useCallback(
    (id: string) =>
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      ),
    [],
  );

  const addNotification = useCallback((notif: Notification) => {
    setNotifications((prev) => [notif, ...prev]);
  }, []);

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
