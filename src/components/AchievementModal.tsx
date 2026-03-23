"use client";

import { X, Lock, CheckCircle2, Pin, PinOff } from "lucide-react";
import type { Achievement } from "@/lib/achievements";

export default function AchievementModal({
  achievement,
  onClose,
  isPinned,
  onPin,
}: {
  achievement: Achievement;
  onClose:     () => void;
  /** When provided, shows the pin button (owner-only) */
  isPinned?:   boolean;
  onPin?:      () => void;
}) {
  const locked = achievement.status === "locked";
  const Icon   = achievement.icon;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-5">
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm bg-[#1A1818] rounded-3xl p-7 animate-scale-in border border-white/[0.08] shadow-2xl overflow-hidden"
        style={
          !locked
            ? { boxShadow: `0 0 80px -20px ${achievement.glow}` }
            : undefined
        }
      >
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/10 flex items-center justify-center transition-colors z-10"
        >
          <X className="w-4 h-4 text-cream/50" />
        </button>

        {/* Giant icon */}
        <div className="flex justify-center mb-5 relative z-10">
          <div
            className={`w-24 h-24 rounded-[28px] flex items-center justify-center ${
              locked ? "bg-white/[0.04] grayscale" : "bg-white/[0.07]"
            }`}
            style={
              !locked
                ? {
                    boxShadow: `0 0 40px -8px ${achievement.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
                  }
                : undefined
            }
          >
            <Icon
              className={`w-11 h-11 ${locked ? "text-cream/20" : achievement.color}`}
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Status badge */}
        <div className="flex justify-center mb-4 relative z-10">
          {locked ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide bg-white/[0.05] text-cream/30 border border-white/[0.06]">
              <Lock className="w-2.5 h-2.5" /> Locked
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide bg-green-500/10 text-green-400 border border-green-500/30">
              <CheckCircle2 className="w-2.5 h-2.5" /> Unlocked
            </span>
          )}
        </div>

        {/* Title + description */}
        <h2
          className={`text-xl font-black text-center mb-2 relative z-10 ${
            locked ? "text-cream/40" : "text-cream"
          }`}
        >
          {achievement.title}
        </h2>
        <p className="text-sm text-cream/45 text-center leading-relaxed mb-5 relative z-10">
          {achievement.description}
        </p>

        {/* Milestone Memory */}
        {!locked && (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 space-y-3.5 relative z-10">
            {achievement.unlockedAt && (
              <div className="flex items-center gap-2 text-xs text-cream/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span>
                  Unlocked on{" "}
                  <strong className="text-cream/70 font-bold">
                    {achievement.unlockedAt}
                  </strong>
                </span>
              </div>
            )}
            {achievement.catalystItem && (
              <div>
                <p className="text-[10px] text-cream/25 font-bold uppercase tracking-widest mb-2.5">
                  Triggered by
                </p>
                <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-2.5 border border-white/[0.04]">
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/[0.06] flex-shrink-0">
                    <img
                      src={achievement.catalystItem.imageUrl}
                      alt={achievement.catalystItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-sm font-bold text-cream/80 leading-tight">
                    {achievement.catalystItem.name}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pin to Profile — owner-only action */}
        {!locked && onPin && (
          <button
            onClick={onPin}
            className={`relative z-10 mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-[0.97] ${
              isPinned
                ? "bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25"
                : "bg-white/[0.04] text-cream/50 border border-white/[0.07] hover:bg-white/[0.08] hover:text-cream/70"
            }`}
          >
            {isPinned ? (
              <><PinOff className="w-3.5 h-3.5" /> Unpin from Profile</>
            ) : (
              <><Pin className="w-3.5 h-3.5" /> Pin to Profile Front</>
            )}
          </button>
        )}

        {/* Bottom glow strip */}
        {!locked && (
          <div
            className="absolute bottom-0 left-8 right-8 h-[2px] rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${achievement.glow}, transparent)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
