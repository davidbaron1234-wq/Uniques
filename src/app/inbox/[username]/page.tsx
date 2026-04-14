"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { mutate as swrMutate } from "swr";
import { ArrowLeft, ArrowLeftRight, Check, CheckCheck, RefreshCw, Send, Smile, X } from "lucide-react";
import confetti from "canvas-confetti";
import { useInventory } from "@/lib/InventoryContext";
import { useNotifications } from "@/lib/NotificationContext";
import { isDemoUser } from "@/lib/demo";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ProposeTradeModal from "@/components/ProposeTradeModal";
import type { CollectibleItem, TradeHistoryEntry } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type EmbeddedTradeOffer = {
  proposer: string;
  // offeredItem = what the proposer is giving; requestedItem = what the proposer wants
  offeredItem?:   { name: string; imageUrl: string };
  requestedItem?: { name: string; imageUrl: string };
  fromCash?: number; // cash proposer is adding
  toCash?:   number; // cash proposer is requesting
  isCounter?: boolean; // true when this card is itself a counter-offer
  tradeId?: string;  // DB trade ID for Accept/Decline/Counter API calls
};

type TradeStatus = "pending" | "accepted" | "my_completion_pending" | "their_completion_pending" | "completed" | "declined" | "countered";

type Msg = {
  id: string;
  from: "me" | "them";
  time: string;
  text?: string;
  tradeOffer?: EmbeddedTradeOffer;
  /** When true, rendered as a centred system announcement pill */
  system?: boolean;
  /** For system messages — the DB trade ID this event refers to */
  tradeId?: string;
  /** For system messages — the lifecycle event type (accepted, declined, cancelled, completed…) */
  eventType?: string;
};

type ConvMeta = {
  name: string;
  handle: string;
  avatar: string;
  online: boolean;
  messages: Msg[];
};

// ── Seed conversations ────────────────────────────────────────────────────────

const CHAT_DATA: Record<string, ConvMeta> = {
  drew: {
    name: "Drew",
    handle: "@drew",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7",
    online: true,
    messages: [
      { id: "d1", from: "them", text: "Hey! I saw your Umbreon VMAX Alt Art 👀 That thing is stunning.", time: "Tue 9:14 AM" },
      { id: "d2", from: "me",   text: "Haha yeah it's one of my absolute favourites. Not sure I wanna let it go.", time: "Tue 9:17 AM" },
      { id: "d3", from: "them", text: "What if I offered my PSA 10 Charizard ex SAR from 151? Straight swap?", time: "Tue 9:22 AM" },
      { id: "d4", from: "me",   text: "PSA 10 is serious… that's actually very tempting 👀", time: "Tue 9:30 AM" },
      { id: "d5", from: "them", text: "I can sweeten it a bit too — happy to add $50 cash on top 🤝", time: "Tue 9:33 AM" },
      { id: "d6", from: "me",   text: "Let me think on it tonight and check recent sales. I'll get back to you!", time: "Tue 9:35 AM" },
      { id: "d7", from: "them", text: "PSA 10 Charizard for your Alt Art? I can add cash! 🔥", time: "2m ago" },
      {
        id: "d8",
        from: "them",
        time: "Just now",
        tradeOffer: {
          proposer:      "Drew",
          offeredItem:   { name: "Charizard (Base Set) PSA 10", imageUrl: "https://images.pokemontcg.io/base1/4.png" },
          requestedItem: { name: "Umbreon VMAX Alt Art",        imageUrl: "https://images.pokemontcg.io/swsh7/215.png" },
          fromCash: 50,
        },
      },
    ],
  },
  ethan: {
    name: "Ethan",
    handle: "@ethan",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1",
    online: true,
    messages: [
      { id: "e1", from: "them", text: "Yo! Your Umbreon VMAX Alt Art is an absolute 🔥 piece. Still available?", time: "Mon 2:05 PM" },
      { id: "e2", from: "me",   text: "Hey! Yeah still have it. What are you thinking?", time: "Mon 2:10 PM" },
      { id: "e3", from: "them", text: "I've got a PSA 10 Shohei Ohtani 2018 Topps Update RC and a few LeBron cards I'd move.", time: "Mon 2:12 PM" },
      { id: "e4", from: "me",   text: "Ooh interesting. What's the Ohtani going for these days?", time: "Mon 2:15 PM" },
      { id: "e5", from: "them", text: "PSA 10 copies are moving for $1400+ on eBay right now. It's had a big run lately.", time: "Mon 2:18 PM" },
      { id: "e6", from: "me",   text: "That's solid. What else would you want in return, or is the Ohtani a straight-up trade?", time: "Mon 2:22 PM" },
      { id: "e7", from: "them", text: "I can add $50 cash if that helps close the deal 🤝", time: "1h ago" },
    ],
  },
  sam: {
    name: "Sam",
    handle: "@sam_vintage",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=FCF9D5",
    online: false,
    messages: [
      { id: "s1", from: "them", text: "Hi! Love your collection, especially the vintage grails section 😍", time: "Yesterday 4:30 PM" },
      { id: "s2", from: "me",   text: "Thanks so much! I've been collecting for years. You into vintage too?", time: "Yesterday 4:45 PM" },
      { id: "s3", from: "them", text: "Big time. Mainly Base Set and Neo era. I sent you a trade offer — take a look!", time: "Yesterday 5:00 PM" },
      { id: "s4", from: "me",   text: "Just checked it, looks really fair actually!", time: "Yesterday 5:10 PM" },
      { id: "s5", from: "them", text: "That trade offer looks fair to me 👍 Let's do it", time: "Yesterday 5:12 PM" },
    ],
  },
  alex: {
    name: "Alex",
    handle: "@alex_funko",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5",
    online: false,
    messages: [
      { id: "a1", from: "me",   text: "Hey Alex! Got any Freddy Funko variants? Especially looking for metallics.", time: "Mon 11:00 AM" },
      { id: "a2", from: "them", text: "Yes! I have the Freddy Funko as Ghost Rider metallic from SDCC 2013. One of the rarest ever made!", time: "Mon 11:30 AM" },
      { id: "a3", from: "me",   text: "No way, that's exactly what I've been hunting. What would you want for it?", time: "Mon 11:32 AM" },
      { id: "a4", from: "them", text: "Open to offers! What do you have that's Funko Pop or high-grade Pokémon?", time: "Mon 12:15 PM" },
    ],
  },
  jordan: {
    name: "Jordan",
    handle: "@j_sneakers",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=CAE6CE",
    online: false,
    messages: [
      { id: "j1", from: "them", text: "Interested in your Nike Dunk Low Panda 👟 What size?", time: "Jan 15, 3:00 PM" },
      { id: "j2", from: "me",   text: "It's a US 10. You looking to buy or trade?", time: "Jan 15, 3:45 PM" },
      { id: "j3", from: "them", text: "Trade ideally! I have a DS Air Jordan 1 Retro High OG 'Chicago' in size 10.", time: "Jan 15, 4:00 PM" },
      { id: "j4", from: "me",   text: "OG Chicago in my size?? That's a big one. Let me look up the current value 👀", time: "Jan 15, 4:03 PM" },
    ],
  },
};

// ── Emoji data: categorised for premium picker ────────────────────────────────

type EmojiItem = { e: string; n: string };
type EmojiCategory = { name: string; emojis: EmojiItem[] };

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: "Smileys & Emotion",
    emojis: [
      { e: "😀", n: "grinning smile" },
      { e: "😁", n: "beaming grin" },
      { e: "😂", n: "joy laugh cry" },
      { e: "🤣", n: "rolling floor laugh" },
      { e: "🥹", n: "holding back tears" },
      { e: "😍", n: "heart eyes love adore" },
      { e: "🤩", n: "star struck amazing wow" },
      { e: "😎", n: "cool sunglasses" },
      { e: "🤔", n: "thinking hmm" },
      { e: "😅", n: "sweat smile nervous" },
      { e: "😭", n: "crying loudly sad" },
      { e: "🥺", n: "pleading puppy eyes please" },
      { e: "😏", n: "smirking smug" },
      { e: "😬", n: "grimacing awkward" },
      { e: "🤯", n: "exploding mind blown" },
      { e: "🥳", n: "party celebrate congrats" },
      { e: "😤", n: "triumph pride huffing" },
      { e: "🙄", n: "eye roll whatever" },
      { e: "😊", n: "smiling happy blush" },
      { e: "😇", n: "angel innocent halo" },
      { e: "🥰", n: "smiling hearts love" },
      { e: "😆", n: "grinning squinting" },
      { e: "😋", n: "yum tasty" },
      { e: "😛", n: "tongue playful" },
      { e: "🤪", n: "zany crazy wacky" },
      { e: "😱", n: "scream shock horror" },
      { e: "🤗", n: "hugging warm" },
      { e: "🫡", n: "saluting respect yes sir" },
      { e: "🫶", n: "heart hands love care" },
      { e: "👏", n: "clap applause bravo" },
      { e: "🤜", n: "right fist bump" },
      { e: "🤛", n: "left fist bump" },
      { e: "😈", n: "devil smiling evil" },
      { e: "💀", n: "skull dead" },
      { e: "😩", n: "weary tired" },
    ],
  },
  {
    name: "Trade & Collectibles",
    emojis: [
      { e: "🔥", n: "fire hot flame" },
      { e: "💎", n: "diamond gem jewel" },
      { e: "👀", n: "eyes looking watching" },
      { e: "🤝", n: "handshake deal agreement" },
      { e: "💰", n: "money bag cash rich" },
      { e: "🎯", n: "target bullseye direct hit" },
      { e: "✨", n: "sparkles shiny magic" },
      { e: "🏆", n: "trophy winner champion" },
      { e: "💯", n: "hundred perfect score" },
      { e: "⚡", n: "lightning bolt fast electric" },
      { e: "🚀", n: "rocket launch blast" },
      { e: "💪", n: "muscle strong flex bicep" },
      { e: "👑", n: "crown king queen royal" },
      { e: "🌟", n: "star glowing shine" },
      { e: "💸", n: "money wings flying cash" },
      { e: "🧧", n: "red envelope gift lucky money" },
      { e: "🪙", n: "coin gold silver" },
      { e: "👍", n: "thumbs up good yes" },
      { e: "❤️", n: "heart love red" },
      { e: "🙏", n: "pray thanks please" },
      { e: "⭐", n: "star yellow favourite" },
      { e: "🥇", n: "gold medal first place" },
      { e: "🏅", n: "sports medal award" },
      { e: "🤑", n: "money mouth face rich" },
      { e: "📈", n: "chart uptrend growing" },
      { e: "💹", n: "chart yen rising" },
      { e: "🔑", n: "key access unlock" },
      { e: "💼", n: "briefcase business" },
      { e: "🛍️", n: "shopping bag buy" },
      { e: "🏷️", n: "label tag price" },
      { e: "💵", n: "dollar bill cash" },
      { e: "🎁", n: "gift present surprise" },
      { e: "🎊", n: "confetti celebration" },
      { e: "💫", n: "dizzy stars wow" },
      { e: "🔐", n: "locked key secure" },
    ],
  },
  {
    name: "Objects",
    emojis: [
      { e: "📦", n: "package box shipping parcel" },
      { e: "🎮", n: "game controller video gaming" },
      { e: "👟", n: "sneaker shoe kick" },
      { e: "📱", n: "phone mobile device" },
      { e: "💻", n: "laptop computer" },
      { e: "🎨", n: "art palette paint" },
      { e: "🧩", n: "puzzle piece jigsaw" },
      { e: "🎸", n: "guitar music" },
      { e: "📸", n: "camera photo" },
      { e: "🔭", n: "telescope space stars" },
      { e: "🧸", n: "teddy bear toy" },
      { e: "🪆", n: "matryoshka nesting doll" },
      { e: "🪅", n: "piñata party" },
      { e: "🎀", n: "ribbon bow pink" },
      { e: "🎋", n: "tanabata tree bamboo" },
      { e: "🧲", n: "magnet attract pull" },
      { e: "🔋", n: "battery energy power" },
      { e: "💡", n: "lightbulb idea bright" },
      { e: "🔎", n: "magnifying glass search" },
      { e: "📚", n: "books read study" },
      { e: "🖼️", n: "frame picture art gallery" },
      { e: "🎭", n: "performing arts theatre" },
      { e: "🛒", n: "shopping cart buy" },
      { e: "🪞", n: "mirror reflection" },
      { e: "📮", n: "postbox mail letter" },
      { e: "🪁", n: "bow arrow slingshot" },
      { e: "🪀", n: "yoyo toy spin" },
      { e: "🎲", n: "dice game chance" },
      { e: "🃏", n: "card joker playing" },
      { e: "🎵", n: "music note song" },
      { e: "🎤", n: "microphone sing" },
      { e: "🎬", n: "clapper film movie" },
      { e: "📺", n: "television tv" },
      { e: "🧦", n: "socks clothing" },
      { e: "🪣", n: "bucket pail" },
    ],
  },
];

// Flatten all emojis for searching
const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis);


// ── Typing indicator (3 bouncing dots) ───────────────────────────────────────

function TypingIndicator({ avatar, name }: { avatar: string; name: string }) {
  return (
    <div className="flex items-end gap-2 justify-start mt-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden bg-surface/20">
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-background-light">
        <div className="flex gap-1 items-center h-3">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-cream/40 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Derive initial tradeStatuses from a loaded message list ──────────────────

function buildTradeStatuses(msgs: Msg[]): Record<string, TradeStatus> {
  const statuses: Record<string, TradeStatus> = {};

  // Group trade-offer message IDs by tradeId (preserving order)
  const offerIdsByTradeId: Record<string, string[]> = {};
  msgs.forEach((m) => {
    const tid = m.tradeOffer?.tradeId;
    if (tid) {
      if (!offerIdsByTradeId[tid]) offerIdsByTradeId[tid] = [];
      offerIdsByTradeId[tid].push(m.id);
    }
  });

  // All offers start pending; earlier ones for the same tradeId are countered
  Object.values(offerIdsByTradeId).forEach((ids) => {
    ids.forEach((id, i) => {
      statuses[id] = i < ids.length - 1 ? "countered" : "pending";
    });
  });

  // Apply system message events to override statuses
  msgs.forEach((m) => {
    if (!m.system || !m.tradeId || !m.eventType) return;
    const ids = offerIdsByTradeId[m.tradeId] ?? [];
    const latestId = ids[ids.length - 1];
    if (!latestId) return;
    if (m.eventType === "accepted") {
      statuses[latestId] = "accepted";
    } else if (m.eventType === "completion_pending") {
      // m.from === "me" means I sent the confirmation → waiting for partner.
      // m.from === "them" means partner confirmed first → I need to act.
      statuses[latestId] = m.from === "me" ? "my_completion_pending" : "their_completion_pending";
    } else if (m.eventType === "completed") {
      statuses[latestId] = "completed";
    } else if (["declined", "cancelled"].includes(m.eventType)) {
      statuses[latestId] = "declined";
    }
  });

  return statuses;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const params   = useParams();
  const router   = useRouter();
  const username = (params.username as string)?.toLowerCase();
  const { data: session } = useSession();
  const { showToast } = useInventory();
  const { addNotification } = useNotifications();

  // Demo mode: username matches a seed key; real mode: username is a conversationId (cuid)
  // Non-demo users always use the real DB path — never show mock chat history
  const isDemo   = isDemoUser(session?.user?.email);
  const demoConv = isDemo ? CHAT_DATA[username] : undefined;
  const isRealConversation = !demoConv && !!username;
  // conversationId is the URL param when in real mode
  const conversationId = isRealConversation ? username : null;

  const [messages,        setMessages]        = useState<Msg[]>([]);

  // Seed demo messages once session confirms demo user
  const demoSeededRef = useRef(false);
  useEffect(() => {
    if (!isDemo || demoSeededRef.current || !CHAT_DATA[username]) return;
    demoSeededRef.current = true;
    setMessages(CHAT_DATA[username].messages);
  }, [isDemo, username]);
  const [draft,           setDraft]           = useState("");
  const [showEmoji,       setShowEmoji]       = useState(false);
  const [emojiSearch,     setEmojiSearch]     = useState("");
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isTyping,        setIsTyping]        = useState(false);
  // Per-message trade status (keyed by msg.id); allows inline resolution without touching seed data
  const [tradeStatuses,   setTradeStatuses]   = useState<Record<string, TradeStatus>>({});
  // The trade-offer message the user wants to counter; drives the counter ProposeTradeModal
  const [counterMsg,      setCounterMsg]      = useState<Msg | null>(null);
  // For real conversations: the other participant's metadata
  const [convMeta,        setConvMeta]        = useState<{ name: string; handle: string; avatar: string; userId?: string } | null>(null);

  // Ref to the messages-fetch function so event listeners can re-trigger it without stale closures
  const fetchMsgsRef = useRef<(() => void) | null>(null);

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirror messages in a ref so Realtime handlers can read current state without stale closures
  const messagesRef = useRef<Msg[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const emojiRef   = useRef<HTMLDivElement>(null);   // emoji panel
  const smileRef   = useRef<HTMLButtonElement>(null); // toggle button

  useEffect(() => {
    if (!username) return;
    try { localStorage.setItem(`inbox_read_${username}`, "1"); } catch { /* noop */ }
  }, [username]);

  // Load real messages + conversation metadata from DB for non-demo conversations
  useEffect(() => {
    if (!isRealConversation || !conversationId) return;

    const myId = session?.user?.id;

    const doFetchMsgs = () => {
      fetch(`/api/messages?conversationId=${conversationId}`)
        .then((r) => r.ok ? r.json() : [])
        .then((data: Array<{
          id: string; senderId: string; senderName: string;
          content: string; type: string; metadata: unknown; createdAt: string;
        }>) => {
          const mapped: Msg[] = data.map((m) => {
            const meta = m.metadata as Record<string, unknown> | null;
            return {
              id:         m.id,
              from:       (m.senderId === myId ? "me" : "them") as "me" | "them",
              time:       new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
              text:       (m.type === "text" || m.type === "system") ? m.content : undefined,
              tradeOffer: m.type === "trade-offer" ? (m.metadata as EmbeddedTradeOffer) : undefined,
              system:     m.type === "system",
              tradeId:    meta?.tradeId    as string | undefined,
              eventType:  meta?.eventType  as string | undefined,
            };
          });
          setMessages(mapped);
          setTradeStatuses(buildTradeStatuses(mapped));
        })
        .catch(() => { /* offline — empty chat */ });
    };

    // Store so event listeners can re-trigger without stale closures
    fetchMsgsRef.current = doFetchMsgs;
    doFetchMsgs();

    // Fetch conversation metadata for the header (live names/handles — no CUID in header)
    fetch(`/api/conversations`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: Array<{ id: string; userId?: string; name: string; handle?: string; avatarUrl: string }>) => {
        const found = data.find((c) => c.id === conversationId);
        if (found) setConvMeta({ name: found.name, handle: found.handle ?? found.name.toLowerCase().replace(/\s+/g, "_"), avatar: found.avatarUrl, userId: found.userId });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRealConversation, conversationId, session?.user?.id]);

  // Re-fetch messages when a trade update fires — fixes tradeId desync on optimistic messages.
  // Two passes: immediate (catches already-committed system messages) +
  // delayed at 800ms (catches system messages that committed after the Trade UPDATE).
  useEffect(() => {
    const handler = () => {
      fetchMsgsRef.current?.();
      setTimeout(() => fetchMsgsRef.current?.(), 800);
    };
    window.addEventListener("uniques:trade-updated", handler);
    return () => window.removeEventListener("uniques:trade-updated", handler);
  }, []);

  // ── Supabase Realtime: messages + typing broadcasts ──────────────────────────
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!isRealConversation || !conversationId || !session?.user?.id) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "Message",
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string; senderId: string; content: string;
            type: string; metadata: unknown; createdAt: string;
          };
          const meta = row.metadata as Record<string, unknown> | null;
          const rowTime = new Date(row.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

          // ── System messages (injected by server, not tied to a user's send) ──
          if (row.type === "system") {
            const tradeId   = meta?.tradeId   as string | undefined;
            const eventType = meta?.eventType as string | undefined;
            setMessages((prev) => [...prev, {
              id: row.id, from: "them" as const, time: rowTime,
              text: row.content, system: true, tradeId, eventType,
            }]);
            if (tradeId && eventType) {
              // Primary: find the trade-offer message by DB tradeId
              const offerMsgs = messagesRef.current.filter(m => m.tradeOffer?.tradeId === tradeId);
              let latestId    = offerMsgs[offerMsgs.length - 1]?.id;

              // Fallback: proposer's side may have an optimistic message with a local temp ID.
              // If no match by tradeId, find the most recent unresolved trade-offer message.
              if (!latestId) {
                const allOffers = messagesRef.current.filter(m => m.tradeOffer && !m.system);
                latestId = allOffers[allOffers.length - 1]?.id;
              }

              if (latestId) {
                let newStatus: TradeStatus = "pending";
                if (eventType === "accepted") {
                  newStatus = "accepted";
                } else if (eventType === "completion_pending") {
                  // row.senderId = the one who confirmed delivery
                  newStatus = row.senderId === session?.user?.id
                    ? "my_completion_pending"
                    : "their_completion_pending";
                } else if (eventType === "completed") {
                  newStatus = "completed";
                  // Bust vault for the other party when trade completes live
                  window.dispatchEvent(new Event("uniques:inventory-updated"));
                } else if (["declined", "cancelled"].includes(eventType)) {
                  newStatus = "declined";
                }
                setTradeStatuses((ts) => ({ ...ts, [latestId!]: newStatus }));
              }
              // Also trigger SWR mutation so Trade History page updates instantly
              swrMutate((key) => key === "/api/trades" || (Array.isArray(key) && key[0] === "/api/trades"));
              // Re-fetch messages to replace any optimistic messages with DB messages
              // (delayed to let server finish any async injectChatMessage calls)
              setTimeout(() => fetchMsgsRef.current?.(), 300);
            }
            return;
          }

          // Skip own non-system messages
          if (row.senderId === session.user!.id) return;
          try { localStorage.setItem("inbox_unread_real", "1"); } catch { /* noop */ }
          // Hide typing indicator when new message arrives
          setIsTyping(false);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

          // ── New trade-offer from other party: mark previous offer for same tradeId as countered ──
          const incomingTradeOffer = row.type === "trade-offer" ? (row.metadata as EmbeddedTradeOffer) : undefined;
          if (incomingTradeOffer?.tradeId) {
            const prevOffer = [...messagesRef.current].reverse().find(
              m => m.tradeOffer?.tradeId === incomingTradeOffer.tradeId
            );
            if (prevOffer) {
              setTradeStatuses((ts) => ({ ...ts, [prevOffer.id]: "countered" }));
            }
          }

          setMessages((prev) => [
            ...prev,
            {
              id:         row.id,
              from:       "them" as const,
              time:       rowTime,
              text:       row.type === "text" ? row.content : undefined,
              tradeOffer: incomingTradeOffer,
              system:     false,
            },
          ]);
        },
      )
      // Listen for broadcast "typing" events from the other user
      .on("broadcast", { event: "typing" }, (payload: { payload?: { userId?: string } }) => {
        if (payload?.payload?.userId === session.user!.id) return; // skip own
        setIsTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setIsTyping(false), 3000);
      })
      .subscribe();

    chatChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      chatChannelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRealConversation, conversationId, session?.user?.id]);

  // ── Chat catcher: pick up trade payload injected via sessionStorage ──────────
  useEffect(() => {
    if (!username) return;
    try {
      const raw = sessionStorage.getItem("injected_trade");
      if (!raw) return;
      let payload: {
        targetUser:     string;
        offeredItems:   Array<{ name: string; imageUrl: string }>;
        requestedItems: Array<{ name: string; imageUrl: string }>;
        cashOffer:      number;
        theirCashOffer: number;
        message?:       string;
      };
      try { payload = JSON.parse(raw); } catch { sessionStorage.removeItem("injected_trade"); return; }
      if (payload.targetUser !== username) return;
      sessionStorage.removeItem("injected_trade");
      const now = Date.now();
      const newMsgs: Msg[] = [];
      if (payload.message?.trim()) {
        newMsgs.push({ id: `msg-text-${now}`, from: "me", time: "Just now", text: payload.message.trim() });
      }
      newMsgs.push({
        id:   `msg-trade-${now}`,
        from: "me",
        time: "Just now",
        tradeOffer: {
          proposer:      "You",
          offeredItem:   payload.offeredItems[0],
          requestedItem: payload.requestedItems[0],
          fromCash: payload.cashOffer      || undefined,
          toCash:   payload.theirCashOffer || undefined,
        },
      });
      setMessages((prev) => [...prev, ...newMsgs]);
    } catch { /* malformed payload */ }
  }, [username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close picker on outside click — refs prevent closing when interacting inside panel or toggle
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: PointerEvent) => {
      if (
        emojiRef.current?.contains(e.target as Node) ||
        smileRef.current?.contains(e.target as Node)
      ) return;
      setShowEmoji(false);
      setEmojiSearch("");
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showEmoji]);

  // ── Inline trade-offer actions ────────────────────────────────────────────

  const appendSystemMsg = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `sys-${Date.now()}`, from: "me", time: "Just now", text, system: true },
    ]);
  };

  // Invalidates both string-key and array-key SWR instances so Trade History
  // updates instantly for both parties (RealtimeProvider handles the other user).
  const invalidateTrades = () => {
    swrMutate((key) => key === "/api/trades" || (Array.isArray(key) && key[0] === "/api/trades"));
    window.dispatchEvent(new Event("uniques:trade-updated"));
  };

  const handleAcceptOffer = async (msg: Msg) => {
    const tradeId = msg.tradeOffer?.tradeId;
    if (!isDemo && isRealConversation && tradeId) {
      try {
        const res = await fetch(`/api/trades?id=${encodeURIComponent(tradeId)}&action=accept`, {
          method: "PATCH",
        });
        if (!res.ok) { console.error("[handleAcceptOffer] API error"); return; }
        invalidateTrades();
      } catch { return; }
    }
    setTradeStatuses((prev) => ({ ...prev, [msg.id]: "accepted" }));
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    appendSystemMsg("Trade Accepted! 🎉");
    addNotification({
      id:      Date.now().toString(),
      type:    "trade",
      message: "✅ Trade accepted! Check your trade history.",
      time:    "Just now",
      isRead:  false,
      href:    "/?tab=history",
    });
  };

  const handleDeclineOffer = async (msg: Msg) => {
    const tradeId = msg.tradeOffer?.tradeId;
    if (!isDemo && isRealConversation && tradeId) {
      try {
        await fetch(`/api/trades?id=${encodeURIComponent(tradeId)}&action=decline`, {
          method: "PATCH",
        });
        invalidateTrades();
      } catch { /* non-fatal */ }
    }
    setTradeStatuses((prev) => ({ ...prev, [msg.id]: "declined" }));
    appendSystemMsg("Trade Declined.");
  };

  const handleCancelSentOffer = async (msg: Msg) => {
    const tradeId = msg.tradeOffer?.tradeId;
    if (!isDemo && isRealConversation && tradeId) {
      try {
        await fetch(`/api/trades?id=${encodeURIComponent(tradeId)}&action=cancel`, {
          method: "PATCH",
        });
        invalidateTrades();
      } catch { /* non-fatal */ }
    }
    setTradeStatuses((prev) => ({ ...prev, [msg.id]: "declined" }));
    appendSystemMsg("Offer cancelled.");
  };

  const handleCompleteOffer = async (msg: Msg) => {
    const tradeId = msg.tradeOffer?.tradeId;
    if (!isDemo && isRealConversation && tradeId) {
      try {
        const res = await fetch(`/api/trades?id=${encodeURIComponent(tradeId)}&action=complete`, {
          method: "PATCH",
        });
        if (!res.ok) { console.error("[handleCompleteOffer] API error"); return; }
        const data = await res.json() as { waiting?: boolean; completed?: boolean };
        invalidateTrades();
        if (data.completed) {
          setTradeStatuses((prev) => ({ ...prev, [msg.id]: "completed" }));
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          appendSystemMsg("Trade Complete! Items exchanged. 🎉");
          window.dispatchEvent(new Event("uniques:inventory-updated"));
          router.refresh(); // bust Next.js router cache so vault + profile reflect the swap
        } else if (data.waiting) {
          setTradeStatuses((prev) => ({ ...prev, [msg.id]: "my_completion_pending" }));
          appendSystemMsg("Waiting for partner...");
        }
      } catch { /* non-fatal */ }
    } else {
      // Demo / offline fallback
      setTradeStatuses((prev) => ({ ...prev, [msg.id]: "completed" }));
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      appendSystemMsg("Trade Complete! 🎉");
    }
  };

  // ── Standard send ─────────────────────────────────────────────────────────

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    const optimisticId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, text, from: "me", time: "Just now" },
    ]);
    setDraft("");
    setShowEmoji(false);
    setEmojiSearch("");
    inputRef.current?.focus();

    // Persist to DB for real (non-demo) conversations
    if (isRealConversation && conversationId) {
      fetch("/api/messages", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ conversationId, content: text, type: "text" }),
      }).catch((err) => console.error("[send message]", err));
    } else {
      // Demo: simulate the other user typing a reply
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      setIsTyping(true);
      typingTimerRef.current = setTimeout(() => setIsTyping(false), 3000);
    }
  };

  const appendEmoji = (emoji: string) => {
    setDraft((prev) => prev + emoji);
    inputRef.current?.focus();
    // keep picker open for multi-emoji entry
  };

  const filteredEmojis = emojiSearch.trim()
    ? ALL_EMOJIS.filter(({ n, e }) =>
        n.includes(emojiSearch.toLowerCase()) || e === emojiSearch
      )
    : null; // null = show categorised view

  // ── Callback: append trade card (+ optional text bubble) when offer is sent ─
  const handleTradeSent = (entry: TradeHistoryEntry, isCounter = false) => {
    const offered   = entry.fromItems[0];
    const requested = entry.toItems[0];
    const now = Date.now();

    const tradeCard: Msg = {
      id:   `msg-trade-${now}`,
      from: "me" as const,
      time: "Just now",
      tradeOffer: {
        proposer:      "You",
        offeredItem:   offered   ? { name: offered.name,   imageUrl: offered.imageUrl   } : undefined,
        requestedItem: requested ? { name: requested.name, imageUrl: requested.imageUrl } : undefined,
        fromCash:  entry.fromCash || undefined,
        toCash:    entry.toCash   || undefined,
        isCounter,
        tradeId:   entry.id || undefined,
      },
    };

    setMessages((prev) => {
      const next = [...prev];
      if (entry.message?.trim()) {
        next.push({
          id:   `msg-text-${now}`,
          from: "me" as const,
          time: "Just now",
          text: entry.message.trim(),
        });
      }
      next.push(tradeCard);
      return next;
    });
    setIsTradeModalOpen(false);
  };

  // ── Not found — only applies to demo key lookups, real conv IDs are valid ──────
  if (!demoConv && !isRealConversation) {
    return (
      <div className="flex flex-col h-dvh overflow-hidden bg-background">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
          <p className="text-5xl">💬</p>
          <p className="text-lg font-bold text-cream">Conversation not found</p>
          <p className="text-sm text-cream/40">
            No chat with <span className="font-mono text-cream/60">@{username}</span>.
          </p>
          <button
            onClick={() => router.push("/inbox")}
            className="mt-2 px-6 py-2.5 rounded-2xl bg-background-light text-cream/60 text-sm font-semibold hover:bg-charcoal-light/50 transition-colors"
          >
            Back to Inbox
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Unified conversation metadata (works for both demo and real conversations)
  // Falls back to CHAT_DATA metadata for display (name/avatar) even for real users at a known handle
  const knownMeta = CHAT_DATA[username];
  const conv = demoConv ?? {
    name:   convMeta?.name   ?? knownMeta?.name   ?? "...",
    // Use the live handle from the API — not the raw URL param which is a conversationId (CUID)
    handle: convMeta?.handle ? `@${convMeta.handle}` : (knownMeta?.handle ?? ""),
    avatar: convMeta?.avatar ?? knownMeta?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&backgroundColor=b6e3f4`,
    online: false,
  };

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-background">
      <Header />

      {/* ── Chat-specific sub-header (back + user info) ── */}
      <div className="glass border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-xl hover:bg-charcoal-light/50 transition-colors flex-shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-cream/60" />
          </button>

          <button
            onClick={() => {
              // Prefer the live handle; fall back to userId if known; raw username last
              // (raw username is the conversationId CUID which would cause "Profile not found")
              const dest = convMeta?.handle || convMeta?.userId || username;
              router.push(`/u/${dest}`);
            }}
            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left"
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-surface/20">
                <img src={conv.avatar} alt={conv.name} className="w-full h-full object-cover" />
              </div>
              {conv.online && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-charcoal-dark" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-cream leading-tight">{conv.name}</p>
              <p className="text-[10px] font-medium leading-tight">
                {conv.online
                  ? <span className="text-green-400">Active now</span>
                  : <span className="text-cream/30">{conv.handle}</span>
                }
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <main className="flex-1 overflow-y-auto pb-4 pt-4 max-w-lg mx-auto w-full px-4">
        <div className="space-y-1.5">
          {messages.map((msg, i) => {
            const isMe   = msg.from === "me";
            const prevMe = i > 0 && messages[i - 1].from === msg.from;
            const showTime = i === messages.length - 1 || messages[i + 1]?.from !== msg.from;

            // ── System announcement pill (e.g. "Trade Accepted! 🎉") ──────────
            if (msg.system) {
              return (
                <div key={msg.id} className="flex justify-center my-3">
                  <span className="px-4 py-1.5 rounded-full bg-white/[0.06] text-cream/40 text-[11px] font-semibold border border-white/[0.06]">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const tradeStatus = msg.tradeOffer ? (tradeStatuses[msg.id] ?? "pending") : null;

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"} ${prevMe ? "mt-0.5" : "mt-3"}`}
              >
                {!isMe && (
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full overflow-hidden bg-surface/20 ${prevMe ? "opacity-0" : ""}`}>
                    <img src={conv.avatar} alt={conv.name} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className={`max-w-[78%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>

                  {msg.tradeOffer ? (
                    /* ── Embedded trade offer card ─────────────────────── */
                    <div className={`w-64 rounded-2xl overflow-hidden bg-background-light border shadow-soft ${
                      isMe ? "rounded-br-sm border-primary/20" : "rounded-bl-sm border-white/[0.07]"
                    }`}>
                      {/* Header */}
                      <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2.5 border-b border-white/[0.05]">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isMe ? "bg-primary/20" : "bg-primary/15"
                        }`}>
                          {msg.tradeOffer.isCounter
                            ? <RefreshCw className="w-3.5 h-3.5 text-primary" />
                            : <ArrowLeftRight className="w-3.5 h-3.5 text-primary" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-primary/70 leading-none mb-0.5">
                            {msg.tradeOffer.isCounter ? "Counter-Offer" : "Trade Offer"}
                          </p>
                          <p className="text-xs font-semibold text-cream leading-tight truncate">
                            {msg.tradeOffer.isCounter
                              ? "You sent a counter-offer"
                              : `${msg.tradeOffer.proposer} proposed a trade`}
                          </p>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="flex items-center gap-2 px-3 py-3">
                        {/* Offered item (what proposer gives) */}
                        <div className="flex-1 flex flex-col items-center gap-1">
                          {msg.tradeOffer.offeredItem ? (
                            <div className="w-[52px] h-[52px] rounded-xl overflow-hidden bg-charcoal-dark/60 flex items-center justify-center p-1">
                              <img src={msg.tradeOffer.offeredItem.imageUrl} alt={msg.tradeOffer.offeredItem.name} className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-[52px] h-[52px] rounded-xl bg-charcoal-dark/40 flex items-center justify-center">
                              <span className="text-lg">💵</span>
                            </div>
                          )}
                          <p className="text-[9px] text-cream/45 text-center line-clamp-2 leading-snug w-full px-0.5">
                            {msg.tradeOffer.offeredItem?.name ?? "Cash only"}
                          </p>
                          {msg.tradeOffer.fromCash != null && msg.tradeOffer.fromCash > 0 && (
                            <span className="text-[8px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-md">
                              +${msg.tradeOffer.fromCash.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Swap icon */}
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center">
                          <ArrowLeftRight className="w-3 h-3 text-cream/20" />
                        </div>

                        {/* Requested item (what proposer wants) */}
                        <div className="flex-1 flex flex-col items-center gap-1">
                          {msg.tradeOffer.requestedItem ? (
                            <div className="w-[52px] h-[52px] rounded-xl overflow-hidden bg-charcoal-dark/60 flex items-center justify-center p-1">
                              <img src={msg.tradeOffer.requestedItem.imageUrl} alt={msg.tradeOffer.requestedItem.name} className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-[52px] h-[52px] rounded-xl bg-charcoal-dark/40 flex items-center justify-center">
                              <span className="text-lg">💵</span>
                            </div>
                          )}
                          <p className="text-[9px] text-cream/45 text-center line-clamp-2 leading-snug w-full px-0.5">
                            {msg.tradeOffer.requestedItem?.name ?? "Cash only"}
                          </p>
                          {msg.tradeOffer.toCash != null && msg.tradeOffer.toCash > 0 && (
                            <span className="text-[8px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md">
                              +${msg.tradeOffer.toCash.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ── CTA section — changes based on direction + status ── */}
                      <div className="px-3 pb-3">
                        {/* ── SETTLED: accepted — both parties need to confirm delivery ── */}
                        {tradeStatus === "accepted" && (
                          <button
                            onClick={() => handleCompleteOffer(msg)}
                            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-primary/15 border border-primary/20 hover:bg-primary/25 hover:border-primary/35 active:scale-[0.97] transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <span className="text-xs font-bold text-primary">Complete Trade</span>
                          </button>
                        )}

                        {/* ── COMPLETION PENDING: I confirmed, waiting for partner ── */}
                        {tradeStatus === "my_completion_pending" && (
                          <div className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <CheckCheck className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-amber-400">Waiting for partner...</span>
                          </div>
                        )}

                        {/* ── COMPLETION PENDING: Partner confirmed, I need to confirm ── */}
                        {tradeStatus === "their_completion_pending" && (
                          <button
                            onClick={() => handleCompleteOffer(msg)}
                            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-primary/15 border border-primary/20 hover:bg-primary/25 hover:border-primary/35 active:scale-[0.97] transition-all cursor-pointer"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <span className="text-xs font-bold text-primary">Complete Trade</span>
                          </button>
                        )}

                        {/* ── COMPLETED: both confirmed, swap done ── */}
                        {tradeStatus === "completed" && (
                          <div className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-green-500/15 border border-green-500/20">
                            <CheckCheck className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            <span className="text-xs font-bold text-green-400">Trade Complete 🎉</span>
                          </div>
                        )}

                        {/* ── SETTLED: declined / cancelled ── */}
                        {tradeStatus === "declined" && (
                          <div className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                            <X className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-xs font-semibold text-red-500">
                              {isMe ? "Offer Cancelled" : "Declined"}
                            </span>
                          </div>
                        )}

                        {/* ── SETTLED: countered ── */}
                        {tradeStatus === "countered" && (
                          <div className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                            <RefreshCw className="w-3.5 h-3.5 text-cream/40" />
                            <span className="text-xs font-semibold text-cream/40">Offer Countered</span>
                          </div>
                        )}

                        {/* ── PENDING, RECEIVED: Accept / Counter / Decline ── */}
                        {tradeStatus === "pending" && !isMe && (
                          <div className="flex gap-1.5">
                            {/* Accept */}
                            <button
                              onClick={() => handleAcceptOffer(msg)}
                              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-green-500 text-white text-[11px] font-bold active:scale-95 hover:bg-green-400 transition-all shadow-sm"
                            >
                              <Check className="w-3 h-3" />
                              Accept
                            </button>
                            {/* Counter */}
                            <button
                              onClick={() => setCounterMsg(msg)}
                              className="flex-1 flex items-center justify-center py-2 rounded-xl border border-white/[0.12] text-cream/60 text-[11px] font-bold active:scale-95 hover:bg-white/[0.06] transition-all"
                            >
                              Counter
                            </button>
                            {/* Decline */}
                            <button
                              onClick={() => handleDeclineOffer(msg)}
                              className="flex-1 flex items-center justify-center py-2 rounded-xl bg-red-500/15 border border-red-500/20 text-red-400 text-[11px] font-bold active:scale-95 hover:bg-red-500/25 transition-all"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {/* ── PENDING, SENT: Pending badge + Cancel ── */}
                        {tradeStatus === "pending" && isMe && (
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-center text-[10px] font-bold text-cream/30 uppercase tracking-wider">
                              Waiting for partner
                            </span>
                            <button
                              onClick={() => handleCancelSentOffer(msg)}
                              className="px-2.5 py-1.5 rounded-xl border border-white/[0.08] text-cream/35 text-[10px] font-bold hover:bg-white/[0.06] active:scale-95 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ── Standard text bubble ──────────────────────────── */
                    <div
                      className={`px-4 py-2.5 ${
                        isMe
                          ? "bg-primary text-charcoal-dark rounded-2xl rounded-br-sm"
                          : "bg-background-light text-cream rounded-2xl rounded-bl-sm"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  )}

                  {showTime && (
                    <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
                      <p className="text-[9px] text-cream/25">{msg.time}</p>
                      {isMe && !msg.tradeOffer && (
                        <CheckCheck className="w-3 h-3 text-teal-400/80 flex-shrink-0" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isTyping && <TypingIndicator avatar={conv.avatar} name={conv.name} />}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* ── Input bar — extra pb clears the fixed BottomNav (≈56px) ── */}
      <div className="flex-shrink-0 bg-charcoal-dark border-t border-white/[0.06] pb-[max(4.5rem,calc(env(safe-area-inset-bottom)+4rem))]">

        {/* ── Emoji picker panel ── */}
        {showEmoji && (
          <div ref={emojiRef} className="border-t border-white/[0.06] animate-slide-up flex flex-col">

            {/* Search bar — always visible at top */}
            <div className="px-4 pt-3 pb-2">
              <input
                type="search"
                value={emojiSearch}
                onChange={(e) => setEmojiSearch(e.target.value)}
                placeholder="Search emojis…"
                className="w-full px-3 py-1.5 rounded-xl bg-background-light text-xs text-cream placeholder:text-cream/25 focus:outline-none focus:ring-1 focus:ring-surface/30 transition-all"
              />
            </div>

            {/* Scrollable emoji list */}
            <div className="overflow-y-auto max-h-64">
              {filteredEmojis ? (
                /* ── Search results: flat grid ── */
                <div className="px-4 pb-4">
                  {filteredEmojis.length === 0 ? (
                    <p className="text-center text-xs text-cream/25 py-6">No results for &ldquo;{emojiSearch}&rdquo;</p>
                  ) : (
                    <div className="grid grid-cols-8 gap-1">
                      {filteredEmojis.map(({ e }) => (
                        <button
                          key={e}
                          onClick={() => appendEmoji(e)}
                          className="text-xl h-9 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* ── Categorised view with sticky headers ── */
                EMOJI_CATEGORIES.map((cat) => (
                  <div key={cat.name}>
                    {/* Sticky category header within the scroll container */}
                    <div className="sticky top-0 z-10 px-4 py-1.5 bg-charcoal-dark/95 backdrop-blur-sm border-b border-white/[0.04]">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-cream/30">
                        {cat.name}
                      </p>
                    </div>
                    <div className="px-4 py-2 grid grid-cols-8 gap-1">
                      {cat.emojis.map(({ e }) => (
                        <button
                          key={e}
                          onClick={() => appendEmoji(e)}
                          className="text-xl h-9 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors"
                          title={cat.name}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Input row ── */}
        <div className="flex items-center gap-2 px-4 py-3 max-w-lg mx-auto w-full">
          {/* Toggle emoji picker */}
          <button
            ref={smileRef}
            onClick={() => {
              setShowEmoji((v) => {
                if (v) setEmojiSearch("");
                return !v;
              });
            }}
            className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              showEmoji ? "bg-primary/20 text-primary" : "hover:bg-white/[0.06] text-cream/35 hover:text-cream/60"
            }`}
            aria-label="Emoji picker"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Attach trade offer */}
          <button
            onClick={() => setIsTradeModalOpen(true)}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/[0.06] text-cream/35 hover:text-cream/60 transition-colors"
            aria-label="Propose a trade"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              // Broadcast typing event to the other participant
              if (isRealConversation && chatChannelRef.current && session?.user?.id) {
                chatChannelRef.current.send({
                  type: "broadcast", event: "typing",
                  payload: { userId: session.user.id },
                }).catch(() => {});
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder={`Message ${conv.name}…`}
            className="flex-1 min-w-0 px-4 py-2.5 rounded-2xl bg-background-light text-sm text-cream placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all"
          />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-soft active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <Send className="w-4 h-4 text-charcoal-dark" />
          </button>
        </div>
      </div>

      {/* ── Propose Trade Modal (new offer) ── */}
      {conv && (
        <ProposeTradeModal
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          targetUser={{ name: conv.name, avatar: conv.avatar, id: convMeta?.userId }}
          targetItem={null}
          onTradeSent={handleTradeSent}
          skipNavigation
        />
      )}

      {/* ── Counter-offer Modal (pre-filled from the received offer) ── */}
      {conv && counterMsg?.tradeOffer && (() => {
        const offer = counterMsg.tradeOffer!;
        // Build a minimal CollectibleItem from what they offered (= what I want)
        const counterTarget: CollectibleItem | null = offer.offeredItem
          ? {
              id:          `counter-target-${counterMsg.id}`,
              name:        offer.offeredItem.name,
              imageUrl:    offer.offeredItem.imageUrl,
              category:    "Pokémon TCG",
              upForTrade:  true,
            }
          : null;
        return (
          <ProposeTradeModal
            isOpen={!!counterMsg}
            onClose={() => setCounterMsg(null)}
            targetUser={{ name: conv.name, avatar: conv.avatar, id: convMeta?.userId }}
            targetItem={null}
            prefill={{
              targetItem:     counterTarget ?? undefined,
              cashOffer:      offer.fromCash ?? 0,
              theirCashOffer: offer.toCash   ?? 0,
            }}
            editTradeId={!isDemo && offer.tradeId ? offer.tradeId : undefined}
            onTradeSent={(entry) => {
              // Mark all previous offers for the same tradeId as countered, then append new card
              if (counterMsg) {
                const tid = counterMsg.tradeOffer?.tradeId;
                setTradeStatuses((prev) => {
                  const updates: Record<string, TradeStatus> = { [counterMsg.id]: "countered" };
                  if (tid) {
                    messagesRef.current.forEach((m) => {
                      if (m.tradeOffer?.tradeId === tid && m.id !== counterMsg.id) {
                        updates[m.id] = "countered";
                      }
                    });
                  }
                  return { ...prev, ...updates };
                });
              }
              handleTradeSent(entry, true);
              setCounterMsg(null);
            }}
            skipNavigation
          />
        );
      })()}

      <BottomNav />
    </div>
  );
}
