"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Star, TrendingDown, Trophy } from "lucide-react";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <path fillRule="evenodd" clipRule="evenodd" d="M9.92157 16.95C9.92157 17.5012 10.1405 18.0299 10.5303 18.4196C10.9201 18.8094 11.4487 19.0284 12 19.0284C12.5512 19.0284 13.0798 18.8094 13.4696 18.4196C13.8594 18.0299 14.0784 17.5012 14.0784 16.95H9.92157ZM11.8881 4.05C10.6151 4.05003 9.39431 4.55571 8.49418 5.4558L8.30578 5.6442C7.40569 6.54434 6.90001 7.76515 6.89998 9.0381V9.9198C6.89998 11.5398 6.25648 13.0938 5.11048 14.2398C4.96222 14.3881 4.86127 14.5771 4.82039 14.7828C4.77951 14.9885 4.80054 15.2017 4.88081 15.3954C4.96108 15.5892 5.097 15.7548 5.27138 15.8713C5.44575 15.9878 5.65076 16.05 5.86048 16.05H18.1395C18.3493 16.05 18.5543 15.9879 18.7288 15.8713C18.9032 15.7548 19.0392 15.5892 19.1195 15.3954C19.1997 15.2016 19.2207 14.9883 19.1798 14.7825C19.1389 14.5768 19.0378 14.3878 18.8895 14.2395C18.3221 13.6722 17.872 12.9988 17.565 12.2575C17.2579 11.5163 17.0999 10.7218 17.1 9.9195V9.0381C17.0999 7.76515 16.5943 6.54434 15.6942 5.6442L15.5058 5.4558C14.6056 4.55571 13.3848 4.05003 12.1119 4.05H11.8881Z" fill="currentColor"/>
    </svg>
  );
}
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
    chipBg:    "bg-violet-500/10",
    iconClass: "text-violet-400",
    unreadDot: "bg-violet-400",
  },
  alert: {
    Icon: TrendingDown,
    chipBg:    "bg-surface/10",
    iconClass: "text-surface-light",
    unreadDot: "bg-surface",
  },
  achievement: {
    Icon:      Trophy,
    chipBg:    "bg-[#D4AF37]/10",
    iconClass: "text-[#D4AF37]",
    unreadDot: "bg-[#D4AF37]",
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
    <div ref={wrapperRef} className="relative flex-shrink-0 flex items-center">

      {/* ── Bell trigger ───────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl hover:bg-charcoal-light/50 transition-colors active:scale-95"
        aria-label="Notifications"
      >
        <BellIcon className="w-6 h-6 text-cream" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-[13px] h-[13px] rounded-full bg-red-500 text-center text-[8px] text-white font-bold select-none" style={{ lineHeight: "13px" }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ─────────────────────────────────────────────────── */}
      {open && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-80 max-w-[calc(100vw-2rem)] bg-charcoal-dark border border-white/10 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-fade-in">

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
