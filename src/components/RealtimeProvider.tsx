"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { createClient } from "@supabase/supabase-js";
import { mutate } from "swr";
import { isDemoUser } from "@/lib/demo";
import { useNotifications } from "@/lib/NotificationContext";
import type { NotifType } from "@/lib/NotificationContext";

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

// Lazily create one Supabase client per browser session (no auth persistence needed)
let _client: ReturnType<typeof createClient> | null = null;
function getClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return _client;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RealtimeProvider() {
  const { data: session, status } = useSession();
  const { injectNotification } = useNotifications();
  const channelsRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]>[]>([]);

  useEffect(() => {
    if (status === "loading") return;
    const uid = session?.user?.id;
    if (!uid || isDemoUser(session?.user?.email)) return;

    const sb = getClient();

    // ── 1. Notification INSERT listener ──────────────────────────────────────
    const notifChannel = sb
      .channel(`notif:${uid}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "Notification",
          filter: `userId=eq.${uid}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string; type: string; message: string;
            isRead: boolean; href: string | null; createdAt: string;
          };
          injectNotification({
            id:      row.id,
            type:    row.type as NotifType,
            message: row.message,
            time:    relativeTime(row.createdAt),
            isRead:  row.isRead,
            href:    row.href ?? undefined,
          });
        },
      )
      .subscribe();

    // ── 2. Trade UPDATE listeners (one per party role) ───────────────────────
    // Supabase postgres_changes filter doesn't support OR, so we need two channels.
    // Fires when any trade status changes → SWR mutate + custom event for instant refresh.
    // Broadcast-style mutate — invalidates BOTH string key ("/api/trades") and
    // array keys (["/api/trades", userId]) used by user-scoped SWR instances.
    const mutateTradeCache = () =>
      mutate((key) => key === "/api/trades" || (Array.isArray(key) && key[0] === "/api/trades"));
    const mutateConvCache = () =>
      mutate((key) => key === "/api/conversations" || (Array.isArray(key) && key[0] === "/api/conversations"));

    const dispatchTradeUpdate = () => {
      mutateTradeCache();
      mutateConvCache();
      window.dispatchEvent(new Event("uniques:trade-updated"));    // backward-compat listeners
    };

    const tradeAsProposerChannel = sb
      .channel(`trade-proposer:${uid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Trade", filter: `proposerId=eq.${uid}` },
        dispatchTradeUpdate,
      )
      .subscribe();

    const tradeAsRecipientChannel = sb
      .channel(`trade-recipient:${uid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Trade", filter: `recipientId=eq.${uid}` },
        dispatchTradeUpdate,
      )
      .subscribe();

    // ── Trade INSERT listener — fires when someone proposes a NEW trade to this user ──
    const tradeNewForRecipientChannel = sb
      .channel(`trade-new-recipient:${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Trade", filter: `recipientId=eq.${uid}` },
        () => {
          mutateTradeCache();
          mutateConvCache();
          window.dispatchEvent(new Event("uniques:trade-updated"));
          try { localStorage.setItem("inbox_unread_real", "1"); } catch { /* noop */ }
          window.dispatchEvent(new Event("uniques:new-message"));
        },
      )
      .subscribe();

    // ── Achievement INSERT listener ───────────────────────────────────────────
    // Watches the UserAchievement table globally so that any user currently
    // viewing another user's public profile gets an instant badge update.
    const achievementChannel = sb
      .channel("achievements-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "UserAchievement" },
        (payload) => {
          const row = payload.new as { userId: string; achievementId: string };
          window.dispatchEvent(
            new CustomEvent("uniques:achievement-unlocked", {
              detail: { userId: row.userId, achievementId: row.achievementId },
            }),
          );
        },
      )
      .subscribe();

    channelsRef.current.push(tradeAsProposerChannel, tradeAsRecipientChannel, tradeNewForRecipientChannel, achievementChannel);

    // ── 3. Message INSERT listener ────────────────────────────────────────────
    // We need the user's conversation IDs to filter. Fetch them once on mount.
    let msgChannel: ReturnType<typeof sb.channel> | null = null;

    fetch("/api/conversations")
      .then((r) => r.ok ? r.json() : null)
      .then((data: Array<{ id: string }> | null) => {
        // GET /api/conversations returns a plain array (not wrapped)
        const convIds = (Array.isArray(data) ? data : []).map((c) => c.id);
        if (convIds.length === 0) return;

        // Supabase filter supports `in` for multiple values
        msgChannel = sb
          .channel(`msg:${uid}`)
          .on(
            "postgres_changes",
            {
              event:  "INSERT",
              schema: "public",
              table:  "Message",
              filter: `conversationId=in.(${convIds.join(",")})`,
            },
            (payload) => {
              const row = payload.new as { senderId: string; conversationId: string; type: string };
              // Only flag unread when the message is from someone else
              if (row.senderId === uid) return;
              mutateConvCache();                                       // refresh inbox list
              // Don't badge for system/status messages, or if user is actively viewing this conversation
              const isSystemMsg       = row.type === "system";
              const isViewingThisConv = typeof window !== "undefined"
                && window.location.pathname === `/inbox/${row.conversationId}`;
              if (!isSystemMsg && !isViewingThisConv) {
                try { localStorage.setItem("inbox_unread_real", "1"); } catch { /* ignore */ }
                window.dispatchEvent(new Event("uniques:new-message")); // BottomNav badge
              }
            },
          )
          .subscribe();

        channelsRef.current.push(msgChannel);
      })
      .catch(() => {});

    channelsRef.current.push(notifChannel);

    return () => {
      channelsRef.current.forEach((ch) => sb.removeChannel(ch));
      channelsRef.current = [];
    };
  // Re-subscribe if the signed-in user changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.id]);

  return null; // render-less provider
}
