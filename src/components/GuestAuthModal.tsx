"use client";

import Link from "next/link";
import { X, Sparkles } from "lucide-react";

interface Props {
  isOpen:   boolean;
  onClose:  () => void;
  context?: string; // e.g. "propose a trade", "send a message", "like", "radar"
}

function getContextCopy(context?: string): { headline: string; body: string } {
  if (!context) {
    return {
      headline: "The Collector's Marketplace",
      body: "Free vault, real trades, verified community. Join thousands of serious collectors.",
    };
  }
  const c = context.toLowerCase();
  if (c.includes("radar") || c.includes("alert")) {
    return {
      headline: "Never Miss a Grail",
      body: "Create a free account to activate Radar alerts and track any item's market moves.",
    };
  }
  if (c.includes("trade") || c.includes("offer") || c.includes("deal")) {
    return {
      headline: "Ready to Make a Deal?",
      body: "Sign up to build your vault and send official trade offers to any collector.",
    };
  }
  if (c.includes("message") || c.includes("dm") || c.includes("chat")) {
    return {
      headline: "Negotiate Like a Pro",
      body: "Create an account to DM collectors directly and close trades in the chat.",
    };
  }
  if (c.includes("like") || c.includes("comment") || c.includes("interact") || c.includes("conversation")) {
    return {
      headline: "Join the Conversation",
      body: "Sign in to like posts, drop comments, and interact with the collector community.",
    };
  }
  if (c.includes("follow")) {
    return {
      headline: "Follow Your Favourites",
      body: "Create a free account to follow collectors and get their new listings in your feed.",
    };
  }
  // Generic fallback with action name
  return {
    headline: "Unlock the Full Experience",
    body: `Create a free account to ${context} and access everything Uniques has to offer.`,
  };
}

export default function GuestAuthModal({ isOpen, onClose, context }: Props) {
  if (!isOpen) return null;

  const { headline, body } = getContextCopy(context);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-5"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm bg-[#1C1A1A] rounded-3xl border border-white/[0.1] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient accent top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CAE6CE]/50 to-transparent" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.12] transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5 text-cream/50" />
        </button>

        <div className="px-6 pt-7 pb-7">
          {/* Wordmark accent */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#CAE6CE]/10 border border-[#CAE6CE]/20 mb-4">
            <Sparkles className="w-3 h-3 text-[#CAE6CE]" />
            <span className="text-[10px] font-bold text-[#CAE6CE] uppercase tracking-widest">Uniques</span>
          </div>

          {/* Copy */}
          <h2 className="text-[1.15rem] font-bold text-cream leading-tight mb-2">
            {headline}
          </h2>
          <p className="text-sm text-cream/45 leading-relaxed mb-6">
            {body}
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-2.5">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#CAE6CE] text-[#1A1818] font-bold text-sm hover:bg-[#b8d4bc] active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(202,230,206,0.2)]"
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center w-full py-3 rounded-2xl text-cream/55 font-semibold text-sm hover:text-cream/80 transition-colors"
            >
              Already have an account? <span className="text-[#CAE6CE] ml-1">Sign in</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
