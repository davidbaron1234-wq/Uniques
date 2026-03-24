"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isDemoUser } from "@/lib/demo";
import { driver } from "driver.js";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { AlertTriangle, Edit, MessageSquare, Search, X, Pin, PinOff, BellDot, Trash2, UserX, ShieldOff, Shield } from "lucide-react";

// ── Conversation type ─────────────────────────────────────────────────────────

type Conv = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  hasDot: boolean;
  online: boolean;
  pinned: boolean;
  sortTs: number;  // unix ms — used for stable sort within non-pinned group
  messages: string[];  // full message text for deep search
};

// ── Seed data ─────────────────────────────────────────────────────────────────

// sortTs offsets are relative to module load — ordering stays stable across renders
const _now = Date.now();

const SEED: Omit<Conv, "pinned" | "hasDot">[] = [
  {
    id: "drew",
    name: "Drew",
    handle: "@drew",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7",
    lastMessage: "PSA 10 Charizard for your Alt Art? I can add cash! 🔥",
    time: "2m",
    unread: 2,
    online: true,
    sortTs: _now - 2 * 60 * 1000,
    messages: [
      "Hey! I saw your Umbreon VMAX Alt Art 👀 That thing is stunning.",
      "Haha yeah it's one of my absolute favourites. Not sure I wanna let it go.",
      "What if I offered my PSA 10 Charizard ex SAR from 151? Straight swap?",
      "PSA 10 is serious… that's actually very tempting 👀",
      "I can sweeten it a bit too — happy to add $50 cash on top 🤝",
      "Let me think on it tonight and check recent sales. I'll get back to you!",
      "PSA 10 Charizard for your Alt Art? I can add cash! 🔥",
    ],
  },
  {
    id: "ethan",
    name: "Ethan",
    handle: "@ethan",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1",
    lastMessage: "I can add $50 cash if that helps close the deal 🤝",
    time: "1h",
    unread: 1,
    online: true,
    sortTs: _now - 60 * 60 * 1000,
    messages: [
      "Yo! Your Umbreon VMAX Alt Art is an absolute 🔥 piece. Still available?",
      "Hey! Yeah still have it. What are you thinking?",
      "I've got a PSA 10 Shohei Ohtani 2018 Topps Update RC and a few LeBron cards I'd move.",
      "Ooh interesting. What's the Ohtani going for these days?",
      "PSA 10 copies are moving for $1400+ on eBay right now. It's had a big run lately.",
      "That's solid. What else would you want in return, or is the Ohtani a straight-up trade?",
      "I can add $50 cash if that helps close the deal 🤝",
    ],
  },
  {
    id: "sam",
    name: "Sam",
    handle: "@sam_vintage",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=FCF9D5",
    lastMessage: "That trade offer looks fair to me 👍 Let's do it",
    time: "Yesterday",
    unread: 0,
    online: false,
    sortTs: _now - 24 * 60 * 60 * 1000,
    messages: [
      "Hi! Love your collection, especially the vintage grails section 😍",
      "Thanks so much! I've been collecting for years. You into vintage too?",
      "Big time. Mainly Base Set and Neo era. I sent you a trade offer — take a look!",
      "Just checked it, looks really fair actually!",
      "That trade offer looks fair to me 👍 Let's do it",
    ],
  },
  {
    id: "alex",
    name: "Alex",
    handle: "@alex_funko",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5",
    lastMessage: "You: Got any Freddy Funko variants? Looking for metallic",
    time: "Mon",
    unread: 0,
    online: false,
    sortTs: _now - 3 * 24 * 60 * 60 * 1000,
    messages: [
      "Hey Alex! Got any Freddy Funko variants? Especially looking for metallics.",
      "Yes! I have the Freddy Funko as Ghost Rider metallic from SDCC 2013. One of the rarest ever made!",
      "No way, that's exactly what I've been hunting. What would you want for it?",
      "Open to offers! What do you have that's Funko Pop or high-grade Pokémon?",
    ],
  },
  {
    id: "jordan",
    name: "Jordan",
    handle: "@j_sneakers",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=CAE6CE",
    lastMessage: "Interested in your Nike Dunk Low Panda 👟",
    time: "Jan 15",
    unread: 0,
    online: false,
    sortTs: _now - 38 * 24 * 60 * 60 * 1000,
    messages: [
      "Interested in your Nike Dunk Low Panda 👟 What size?",
      "It's a US 10. You looking to buy or trade?",
      "Trade ideally! I have a DS Air Jordan 1 Retro High OG 'Chicago' in size 10.",
      "OG Chicago in my size?? That's a big one. Let me look up the current value 👀",
    ],
  },
];

// ── Context menu ─────────────────────────────────────────────────────────────

type CtxMenu = { id: string; x: number; y: number };

function ContextMenu({
  menu,
  isPinned,
  onPin,
  onMarkUnread,
  onDelete,
  onBlock,
  onClose,
}: {
  menu: CtxMenu;
  isPinned: boolean;
  onPin: () => void;
  onMarkUnread: () => void;
  onDelete: () => void;
  onBlock: () => void;
  onClose: () => void;
}) {
  const left = Math.min(menu.x, window.innerWidth - 220);
  const top  = Math.min(menu.y, window.innerHeight - 200);

  return (
    <>
      <div className="fixed inset-0 z-[200]" onPointerDown={onClose} />
      <div
        className="fixed z-[201] w-52 bg-charcoal-light rounded-2xl shadow-soft-xl border border-white/10 overflow-hidden animate-scale-in"
        style={{ left, top }}
      >
        {[
          { icon: isPinned ? PinOff : Pin, label: isPinned ? "Unpin"            : "Pin to top",         action: onPin,        colour: "text-cream/70" },
          { icon: BellDot,                 label: "Mark as unread",              action: onMarkUnread,   colour: "text-cream/70" },
          { icon: Trash2,                  label: "Delete conversation",         action: onDelete,       colour: "text-red-400"  },
          { icon: UserX,                   label: "Block user",                  action: onBlock,        colour: "text-red-400"  },
        ].map(({ icon: Icon, label, action, colour }) => (
          <button
            key={label}
            onClick={() => { action(); onClose(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold whitespace-nowrap ${colour} hover:bg-white/[0.06] transition-colors`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

// ── New Message bottom-sheet ──────────────────────────────────────────────────

function NewMessageSheet({
  convs,
  onSelect,
  onClose,
}: {
  convs: Conv[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[150] flex items-end">
      <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-auto bg-charcoal-dark rounded-t-3xl border-t border-white/10 shadow-soft-xl animate-slide-up">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="text-base font-bold text-cream">New Message</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="w-3.5 h-3.5 text-cream/60" />
          </button>
        </div>
        <p className="px-5 text-xs text-cream/35 mb-3">Start a conversation with:</p>
        <div className="pb-10">
          {convs.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="w-full flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/[0.04] transition-colors"
            >
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-surface/20">
                  <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                </div>
                {c.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-charcoal-dark" />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-cream">{c.name}</p>
                <p className="text-xs text-cream/35">{c.handle}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Blocked Users Sheet ───────────────────────────────────────────────────────

function BlockedUsersSheet({
  seed,
  onUnblock,
  onClose,
}: {
  seed: Omit<Conv, "pinned" | "hasDot">[];
  onUnblock: (id: string) => void;
  onClose: () => void;
}) {
  // Read blocked IDs from localStorage in an effect to avoid SSR render-time reads
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      setBlockedIds(
        seed.map((c) => c.id).filter((id) => !!localStorage.getItem(`inbox_block_${id}`))
      );
    } catch { /* localStorage unavailable */ }
  }, [seed]);

  const blockedUsers = seed.filter((c) => blockedIds.includes(c.id));

  return (
    <div className="fixed inset-0 z-[150] flex items-end">
      <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-auto bg-charcoal-dark rounded-t-3xl border-t border-white/10 shadow-soft-xl animate-slide-up">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-cream/50" />
            <h3 className="text-base font-bold text-cream">Blocked Users</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-cream/60" />
          </button>
        </div>

        {blockedUsers.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-3 pb-14">
            <ShieldOff className="w-8 h-8 text-cream/15" />
            <p className="text-sm text-cream/35 font-medium">No blocked users</p>
            <p className="text-xs text-cream/20">Users you block will appear here.</p>
          </div>
        ) : (
          <div className="pb-10">
            {blockedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3.5 px-5 py-3.5 border-b border-white/[0.04] last:border-0"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-surface/20 flex-shrink-0">
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-cream">{user.name}</p>
                  <p className="text-xs text-cream/35">{user.handle}</p>
                </div>
                <button
                  onClick={() => onUnblock(user.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 active:scale-95 transition-all border border-primary/20"
                >
                  <ShieldOff className="w-3.5 h-3.5" />
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  action,
  convName,
  onConfirm,
  onCancel,
}: {
  action: "block" | "delete";
  convName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isBlock = action === "block";
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-charcoal-light rounded-3xl p-6 shadow-soft-xl border border-white/10 animate-slide-up">
        <div className="flex items-center gap-3 mb-3">
          {isBlock
            ? <UserX className="w-5 h-5 text-red-400 flex-shrink-0" />
            : <Trash2 className="w-5 h-5 text-red-400 flex-shrink-0" />}
          <h3 className="text-base font-bold text-cream">
            {isBlock ? "Block Collector?" : "Delete Chat?"}
          </h3>
        </div>
        <p className="text-sm text-cream/50 leading-relaxed mb-5">
          {isBlock
            ? `Block ${convName} from contacting you?`
            : `Wipe chat with ${convName}?`}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-2xl bg-white/[0.06] text-cream/50 text-sm font-bold hover:bg-white/10 active:scale-[0.97] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-2xl bg-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/30 active:scale-[0.97] transition-all border border-red-500/20"
          >
            {isBlock ? "Block" : "Delete"}
          </button>
        </div>
        <p className="text-xs text-rose-500 mt-3 text-center">
          <AlertTriangle className="w-3 h-3 inline mr-1" />
          {isBlock
            ? "They won't be able to message or trade with you."
            : "This action cannot be undone."}
        </p>
      </div>
    </div>
  );
}

// ── Conversation row ──────────────────────────────────────────────────────────

function ConversationRow({
  conv,
  index,
  matchSnippet,
  onClick,
  onContextMenu,
  onLongPress,
}: {
  conv: Conv;
  index: number;
  matchSnippet?: string | null;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onLongPress: (e: React.PointerEvent) => void;
}) {
  const timerRef   = useRef<ReturnType<typeof setTimeout>>();
  const didLongRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    didLongRef.current = false;
    timerRef.current = setTimeout(() => {
      didLongRef.current = true;
      onLongPress(e);
    }, 500);
  };

  const handlePointerUp = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleClick = () => {
    if (didLongRef.current) return;
    onClick();
  };

  const hasActivity = conv.unread > 0 || conv.hasDot;

  return (
    <div className="relative" onContextMenu={onContextMenu}>
      {conv.pinned && (
        <Pin className="absolute top-3.5 right-5 w-3 h-3 text-cream/20" />
      )}
      <button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors text-left animate-slide-up"
        style={{ animationDelay: `${index * 0.06}s`, animationFillMode: "both" }}
      >
        {/* Avatar + online dot */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-surface/20">
            <img src={conv.avatar} alt={conv.name} className="w-full h-full object-cover" />
          </div>
          {conv.online && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-charcoal-dark" />
          )}
        </div>

        {/* Name + snippet */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <span className={`text-sm font-bold truncate ${hasActivity ? "text-cream" : "text-cream/70"}`}>
              {conv.name}
            </span>
            <span className={`text-[10px] flex-shrink-0 ${hasActivity ? "text-primary font-semibold" : "text-cream/30"}`}>
              {conv.time}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs truncate ${matchSnippet ? "text-primary/70 italic" : hasActivity ? "text-cream/60 font-medium" : "text-cream/35"}`}>
              {matchSnippet ?? conv.lastMessage}
            </p>
            {/* Number badge for seed unread counts */}
            {conv.unread > 0 && (
              <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-charcoal-dark text-[10px] font-extrabold flex items-center justify-center leading-none">
                {conv.unread}
              </span>
            )}
            {/* Dot indicator for manually marked-as-unread */}
            {conv.hasDot && conv.unread === 0 && (
              <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-primary" />
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/api/auth/signin");
  }, [status, router]);

  // ── Tour step 6 of 7 — baton passed from /search via tourStep=messages ──
  useEffect(() => {
    if (localStorage.getItem("tourStep") !== "messages") return;

    const t = setTimeout(() => {
      if (localStorage.getItem("tourStep") !== "messages") return;
      localStorage.removeItem("tourStep");

      const shouldNavToProfileRef = { current: false };

      const driverObj = driver({
        showProgress: true,
        allowClose: true,
        stagePadding: 8,
        disableActiveInteraction: true,
        onDestroyStarted: () => {
          const nav = shouldNavToProfileRef.current;
          driverObj.destroy();
          if (nav) {
            localStorage.setItem("tourStep", "profile");
            localStorage.setItem("tourStep_ts", String(Date.now()));
            setTimeout(() => router.push("/inventory"), 150);
          }
        },
        onCloseClick: () => {
          shouldNavToProfileRef.current = false;
          driverObj.destroy();
        },
        steps: [
          {
            element: "[data-tour='profile-tab']",
            onHighlightStarted: () => { shouldNavToProfileRef.current = true; },
            popover: {
              title: "🛡️ Your Digital Vault",
              description: "Flex your heavy hitters. Catalog your PC and track your portfolio's real-time market value.",
              side: "top" as const,
              align: "center" as const,
              nextBtnText: "Next →",
              progressText: "6 of 7",
            },
          },
        ],
      });
      driverObj.drive();
    }, 2000);

    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [query,       setQuery]       = useState("");
  const [showNew,     setShowNew]     = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [ctxMenu,     setCtxMenu]     = useState<CtxMenu | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "block" | "delete"; id: string } | null>(null);

  // Convs start empty; demo users get SEED after auth resolves
  const [convs, setConvs] = useState<Conv[]>([]);
  const convSeeded = useRef(false);

  useEffect(() => {
    if (status === "loading" || convSeeded.current) return;
    convSeeded.current = true;
    if (!isDemoUser(session?.user?.email)) return; // real users keep empty inbox
    if (typeof window === "undefined") return;
    setConvs(
      SEED
        .filter((c) =>
          !localStorage.getItem(`inbox_del_${c.id}`) &&
          !localStorage.getItem(`inbox_block_${c.id}`)
        )
        .map((c) => {
          const hasDot = !!localStorage.getItem(`inbox_dot_${c.id}`);
          const isRead = !!localStorage.getItem(`inbox_read_${c.id}`);
          return {
            ...c,
            pinned: !!localStorage.getItem(`inbox_pin_${c.id}`),
            hasDot,
            unread: hasDot || isRead ? 0 : c.unread,
          };
        })
    );
  }, [status, session?.user?.email]);

  // Re-sync read state when page regains focus (chat room sets inbox_read_*)
  // Debounced to prevent race conditions on rapid tab switches
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const sync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setConvs((prev) =>
          prev.map((c) =>
            localStorage.getItem(`inbox_read_${c.id}`) ? { ...c, unread: 0 } : c
          )
        );
      }, 80);
    };
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  if (status === "loading" || status === "unauthenticated") return null;

  // ── Conversation mutations ────────────────────────────────────────────────

  const markAsRead = (id: string) => {
    try {
      localStorage.setItem(`inbox_read_${id}`, "1");
      localStorage.removeItem(`inbox_dot_${id}`);
    } catch { /* noop */ }
    setConvs((prev) => prev.map((c) => c.id === id ? { ...c, unread: 0, hasDot: false } : c));
  };

  const pinConv = (id: string) => {
    setConvs((prev) => {
      const target = prev.find((c) => c.id === id);
      if (!target) return prev;
      const newPinned = !target.pinned;
      try {
        if (newPinned) localStorage.setItem(`inbox_pin_${id}`, "1");
        else           localStorage.removeItem(`inbox_pin_${id}`);
      } catch { /* noop */ }
      if (newPinned) {
        const rest = prev.filter((c) => c.id !== id);
        return [{ ...target, pinned: true }, ...rest];
      }
      return prev.map((c) => c.id === id ? { ...c, pinned: false } : c);
    });
  };

  const markUnread = (id: string) => {
    try {
      localStorage.setItem(`inbox_dot_${id}`, "1");
      localStorage.removeItem(`inbox_read_${id}`);
    } catch { /* noop */ }
    setConvs((prev) => prev.map((c) => c.id === id ? { ...c, hasDot: true } : c));
  };

  const deleteConv = (id: string) => {
    try { localStorage.setItem(`inbox_del_${id}`, "1"); } catch { /* noop */ }
    setConvs((prev) => prev.filter((c) => c.id !== id));
  };

  const blockConv = (id: string) => {
    try {
      localStorage.setItem(`inbox_block_${id}`, "1");
      localStorage.removeItem(`inbox_pin_${id}`);
    } catch { /* noop */ }
    setConvs((prev) => prev.filter((c) => c.id !== id));
  };

  const unblockUser = (id: string) => {
    try { localStorage.removeItem(`inbox_block_${id}`); } catch { /* noop */ }
    // Re-add the user from SEED if not already in the list
    const seedUser = SEED.find((s) => s.id === id);
    if (!seedUser) return;
    setConvs((prev) => {
      if (prev.some((c) => c.id === id)) return prev;
      return [...prev, { ...seedUser, pinned: false, hasDot: false, unread: 0 }];
    });
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const totalActivity = convs.filter((c) => c.unread > 0 || c.hasDot).length;

  const sorted = [...convs].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.sortTs - a.sortTs;  // most-recent first within unpinned group
  });

  // Deep search: match on name/handle OR inside message content
  const filtered: { conv: Conv; matchSnippet: string | null }[] = query.trim()
    ? (() => {
        const q = query.trim().toLowerCase();
        return sorted
          .map((c) => {
            // Name / handle match — no snippet needed
            if (c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q)) {
              return { conv: c, matchSnippet: null };
            }
            // Deep message search — surface the matched line as the subtitle
            const matched = c.messages.find((m) => m.toLowerCase().includes(q));
            if (matched) {
              const idx = matched.toLowerCase().indexOf(q);
              const start = Math.max(0, idx - 18);
              const snippet =
                (start > 0 ? "…" : "") +
                matched.slice(start, idx + q.length + 35) +
                (idx + q.length + 35 < matched.length ? "…" : "");
              return { conv: c, matchSnippet: snippet };
            }
            return null;
          })
          .filter((item): item is { conv: Conv; matchSnippet: string | null } => item !== null);
      })()
    : sorted.map((c) => ({ conv: c, matchSnippet: null }));

  const onlineConvs = sorted.filter((c) => c.online);

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="max-w-lg mx-auto">
        {/* ── Title bar ── */}
        <div className="px-5 pt-6 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-cream flex items-center gap-2">
              Messages
              {totalActivity > 0 && (
                <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 leading-none">
                  {totalActivity} new
                </span>
              )}
            </h1>
            <p className="text-sm text-cream/35 font-medium mt-0.5">
              {convs.length} conversation{convs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBlocked(true)}
              className="w-9 h-9 rounded-2xl bg-background-light flex items-center justify-center hover:bg-charcoal-light/60 transition-colors"
              aria-label="Blocked users"
            >
              <Shield className="w-4 h-4 text-cream/50" />
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="w-9 h-9 rounded-2xl bg-background-light flex items-center justify-center hover:bg-charcoal-light/60 transition-colors"
              aria-label="New message"
            >
              <Edit className="w-4 h-4 text-cream/50" />
            </button>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="px-5 mb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/25 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-background-light text-sm text-cream placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all"
            />
          </div>
        </div>

        {/* ── Active now strip ── */}
        {!query && onlineConvs.length > 0 && (
          <div className="mb-2">
            <p className="px-5 text-[10px] text-cream/25 font-bold uppercase tracking-wider mb-2">
              Active now
            </p>
            <div className="flex gap-4 px-5 overflow-x-auto scrollbar-none pb-1">
              {onlineConvs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { markAsRead(c.id); router.push(`/inbox/${c.id}`); }}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-surface/20 ring-2 ring-primary/30">
                      <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-charcoal-dark" />
                  </div>
                  <span className="text-[10px] text-cream/50 font-medium">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Divider ── */}
        <div className="h-px bg-white/[0.05] mx-5 my-3" />

        {/* ── Conversation list ── */}
        <div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <MessageSquare className="w-8 h-8 text-cream/15" />
              <p className="text-sm text-cream/30 text-center px-6">
                {query ? "No conversations found" : "Your inbox is waiting. Find your next grail and start a conversation."}
              </p>
            </div>
          ) : (
            filtered.map(({ conv, matchSnippet }, i) => (
              <ConversationRow
                key={conv.id}
                conv={conv}
                index={i}
                matchSnippet={matchSnippet}
                onClick={() => {
                  markAsRead(conv.id);
                  router.push(`/inbox/${conv.id}`);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCtxMenu({ id: conv.id, x: e.clientX, y: e.clientY });
                }}
                onLongPress={(e) => {
                  setCtxMenu({ id: conv.id, x: e.clientX, y: e.clientY });
                }}
              />
            ))
          )}
        </div>
      </main>

      <BottomNav />

      {/* ── Context Menu ── */}
      {ctxMenu && (
        <ContextMenu
          menu={ctxMenu}
          isPinned={convs.find((c) => c.id === ctxMenu.id)?.pinned ?? false}
          onPin={() => pinConv(ctxMenu.id)}
          onMarkUnread={() => markUnread(ctxMenu.id)}
          onDelete={() => {
            const id = ctxMenu.id;
            setCtxMenu(null);
            setConfirmAction({ type: "delete", id });
          }}
          onBlock={() => {
            const id = ctxMenu.id;
            setCtxMenu(null);
            setConfirmAction({ type: "block", id });
          }}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* ── New Message Sheet ── */}
      {showNew && (
        <NewMessageSheet
          convs={convs}
          onSelect={(id) => {
            setShowNew(false);
            markAsRead(id);
            router.push(`/inbox/${id}`);
          }}
          onClose={() => setShowNew(false)}
        />
      )}

      {/* ── Blocked Users Sheet ── */}
      {showBlocked && (
        <BlockedUsersSheet
          seed={SEED}
          onUnblock={(id) => {
            unblockUser(id);
            // Keep sheet open so user can unblock more
          }}
          onClose={() => setShowBlocked(false)}
        />
      )}

      {/* ── Confirm Delete / Block ── */}
      {confirmAction && (
        <ConfirmModal
          action={confirmAction.type}
          convName={convs.find((c) => c.id === confirmAction.id)?.name ?? confirmAction.id}
          onConfirm={() => {
            if (confirmAction.type === "block") blockConv(confirmAction.id);
            else deleteConv(confirmAction.id);
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
