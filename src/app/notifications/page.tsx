"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, ArrowLeftRight, Bell, Star, TrendingDown, Trophy } from "lucide-react";
import { useNotifications } from "@/lib/NotificationContext";
import type { NotifType } from "@/lib/NotificationContext";
import BottomNav from "@/components/BottomNav";

// ── Per-type visual config (mirrors NotificationDropdown) ─────────────────────

const TYPE_META: Record<
  NotifType,
  {
    Icon: React.ComponentType<{ className?: string }>;
    chipBg: string;
    iconClass: string;
    unreadDot: string;
    label: string;
  }
> = {
  trade: {
    Icon: ArrowLeftRight,
    chipBg:    "bg-green-400/10",
    iconClass: "text-green-400",
    unreadDot: "bg-green-400",
    label:     "Trade",
  },
  match: {
    Icon: Star,
    chipBg:    "bg-violet-500/10",
    iconClass: "text-violet-400",
    unreadDot: "bg-violet-400",
    label:     "Match",
  },
  alert: {
    Icon: TrendingDown,
    chipBg:    "bg-surface/10",
    iconClass: "text-surface-light",
    unreadDot: "bg-surface",
    label:     "Alert",
  },
  achievement: {
    Icon:      Trophy,
    chipBg:    "bg-[#D4AF37]/10",
    iconClass: "text-[#D4AF37]",
    unreadDot: "bg-[#D4AF37]",
    label:     "Achievement",
  },
};

export default function NotificationsPage() {
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const router = useRouter();
  const { status } = useSession();

  if (status === "unauthenticated") {
    router.replace("/api/auth/signin");
    return null;
  }
  if (status === "loading") return null;

  return (
    <div className="min-h-screen pb-24 bg-background">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 glass">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-charcoal-light/50 transition-colors active:scale-95 flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-cream" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-cream leading-tight">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-[11px] text-cream/40">{unreadCount} unread</p>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] text-primary font-semibold hover:text-primary/70 transition-colors flex-shrink-0"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <main className="max-w-lg mx-auto px-4 pt-4">

        {notifications.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-cream/20" />
            </div>
            <p className="text-cream/40 font-semibold text-sm">All quiet in the vault</p>
            <p className="text-cream/25 text-xs mt-1 max-w-[200px] leading-relaxed">
              Trade offers, Radar matches, and market alerts will show up here.
            </p>
          </div>
        ) : (
          /* ── Notification list ───────────────────────────────────────────── */
          <div className="space-y-2">
            {notifications.map((n) => {
              const { Icon, chipBg, iconClass, unreadDot, label } = TYPE_META[n.type];
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id);
                    if (n.href) router.push(n.href);
                  }}
                  className={`w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                    !n.isRead
                      ? "bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.07]"
                      : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Icon chip */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${chipBg} flex items-center justify-center mt-0.5`}>
                    <Icon className={`w-4 h-4 ${iconClass}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${iconClass}`}>
                        {label}
                      </span>
                    </div>
                    <p className={`text-sm leading-snug ${
                      !n.isRead ? "text-cream/90 font-medium" : "text-cream/50"
                    }`}>
                      {n.message}
                    </p>
                    <p className="text-[11px] text-cream/30 mt-1">{n.time}</p>
                  </div>

                  {/* Unread dot */}
                  {!n.isRead && (
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full ${unreadDot} mt-2`} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
