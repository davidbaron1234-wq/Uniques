"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ArrowLeftRight, Star, TrendingDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/lib/NotificationContext";
import type { NotifType } from "@/lib/NotificationContext";

// ── Per-type visual config ─────────────────────────────────────────────────────

const TYPE_META: Record<
  NotifType,
  {
    Icon: React.ComponentType<{ className?: string }>;
    chipBg: string;
    iconClass: string;
    unreadDot: string;
  }
> = {
  trade: {
    Icon: ArrowLeftRight,
    chipBg:    "bg-green-400/10",
    iconClass: "text-green-400",
    unreadDot: "bg-green-400",
  },
  match: {
    Icon: Star,
    chipBg:    "bg-yellow-400/10",
    iconClass: "text-yellow-400",
    unreadDot: "bg-yellow-400",
  },
  alert: {
    Icon: TrendingDown,
    chipBg:    "bg-blue-400/10",
    iconClass: "text-blue-400",
    unreadDot: "bg-blue-400",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationDropdown() {
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapperRef      = useRef<HTMLDivElement>(null);
  const router          = useRouter();

  // Smart limit: baseline 5, expand up to 10 when there are many unreads
  const visibleNotifs = notifications.slice(0, Math.max(5, Math.min(unreadCount, 10)));

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative flex-shrink-0">

      {/* ── Bell trigger ───────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl hover:bg-charcoal-light/50 transition-colors active:scale-95"
        aria-label="Notifications"
      >
        <Bell
          className={`w-5 h-5 transition-colors ${
            open ? "text-cream" : "text-cream/60"
          }`}
        />
        {/* Numbered badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center rounded-full leading-none ring-2 ring-charcoal-dark">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ─────────────────────────────────────────────────── */}
      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 w-80 max-w-[calc(100vw-2rem)] bg-[#1C1C1E] border border-white/10 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-fade-in">

          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-cream">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-extrabold leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-primary font-semibold hover:text-primary/70 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification rows */}
          <div>
            {visibleNotifs.map((n) => {
              const { Icon, chipBg, iconClass, unreadDot } = TYPE_META[n.type];
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id);
                    setOpen(false);
                    router.push(n.href ?? "/");
                  }}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-white/[0.04] last:border-0 text-left transition-colors hover:bg-white/[0.04] active:bg-white/[0.07] ${
                    !n.isRead ? "bg-white/[0.035]" : ""
                  }`}
                >
                  {/* Type icon chip */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-xl ${chipBg} flex items-center justify-center mt-0.5`}>
                    <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
                  </div>

                  {/* Message + time */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug ${
                      !n.isRead ? "text-cream/90 font-medium" : "text-cream/50 font-normal"
                    }`}>
                      {n.message}
                    </p>
                    <p className="text-[10px] text-cream/30 mt-1">{n.time}</p>
                  </div>

                  {/* Unread colour dot */}
                  {!n.isRead && (
                    <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${unreadDot} mt-2`} />
                  )}
                </button>
              );
            })}

            {notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-cream/30">
                No notifications yet
              </p>
            )}
          </div>

          {/* Footer — view all */}
          <div className="border-t border-white/[0.06]">
            <button
              onClick={() => { setOpen(false); router.push("/notifications"); }}
              className="w-full py-3 text-[11px] text-primary/70 hover:text-primary font-semibold transition-colors"
            >
              View all activity →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
