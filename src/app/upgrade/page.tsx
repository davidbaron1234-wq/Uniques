"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, X, Zap, ArrowLeft, Sparkles, Loader2, AlertCircle } from "lucide-react";
import Logo from "@/components/Logo";

type FeatureRow = { label: string; free: string | boolean; pro: string | boolean };

const FEATURES: FeatureRow[] = [
  // Shared checkmarks — users see what they already have
  { label: "Collector profile",        free: true,          pro: true         },
  { label: "Trade messaging",          free: true,          pro: true         },
  // Premium checkmarks — locked for free
  { label: "AI Auto-Scanner",          free: false,         pro: true         },
  { label: "Full Trophy Room",         free: false,         pro: true         },
  { label: "Market Analytics",         free: false,         pro: true         },
  { label: "Verified Pro Badge",       free: false,         pro: true         },
  // Text-value rows at bottom
  { label: "Vault capacity",           free: "10 items",    pro: "Unlimited"  },
  { label: "Custom Grail Selection",   free: "Auto",        pro: "Custom"     },
];

function FeatureValue({ value, isPro }: { value: string | boolean; isPro: boolean }) {
  if (typeof value === "string") {
    return (
      <span className={`text-[11px] font-bold leading-tight text-center ${
        isPro ? "text-primary" : "text-cream/35"
      }`}>{value}</span>
    );
  }
  if (value) {
    return <Check className={`w-4 h-4 flex-shrink-0 ${isPro ? "text-primary" : "text-cream/30"}`} />;
  }
  return <X className="w-3.5 h-3.5 flex-shrink-0 text-cream/12" />;
}

export default function UpgradePage() {
  const router = useRouter();
  const { status } = useSession();
  const [upgrading, setUpgrading]   = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (status === "unauthenticated") { router.replace("/api/auth/signin"); return null; }
  if (status === "loading") return null;

  const handleUpgrade = async () => {
    setUpgrading(true);
    setCheckoutError(null);
    try {
      const res  = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url; // ← hard-navigate to Stripe-hosted checkout
        return;
      }
      setCheckoutError(data.error ?? "Could not start checkout. Please try again.");
    } catch {
      setCheckoutError("Network error. Please check your connection and try again.");
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/8 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-surface/8 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 pt-5 pb-4 max-w-lg mx-auto w-full">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-white/[0.06] text-cream/50 hover:text-cream transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Logo />
        <div className="w-9" />
      </div>

      <div className="relative flex-1 px-5 pb-10 max-w-lg mx-auto w-full space-y-5">

        {/* Hero */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Uniques Pro</span>
          </div>
          <h1 className="text-3xl font-extrabold text-cream leading-tight">
            Collect smarter.<br />Trade faster.
          </h1>
          <p className="text-sm text-cream/40 max-w-xs mx-auto">
            See everything you&apos;re leaving on the table with the Free tier.
          </p>
        </div>

        {/* Plan header cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Free */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-cream/25 uppercase tracking-widest">Free</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-extrabold text-cream/40">$0</span>
              <span className="text-[11px] text-cream/20">/mo</span>
            </div>
            <span className="mt-1.5 inline-block text-[10px] font-semibold text-cream/20 bg-white/[0.04] px-2 py-0.5 rounded-full w-fit">
              Current plan
            </span>
          </div>

          {/* Pro */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/5 blur-[2px]" />
            <div className="relative rounded-2xl bg-charcoal-dark border border-primary/35 p-4 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Pro</p>
                <span className="text-[9px] font-extrabold text-charcoal-dark bg-primary px-1.5 py-0.5 rounded-full leading-none">BEST</span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-extrabold text-cream">$4.99</span>
                <span className="text-[11px] text-cream/40">/mo</span>
              </div>
              <span className="text-[10px] text-cream/30 mt-0.5">Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Feature comparison */}
        <div className="rounded-2xl overflow-hidden border border-white/[0.07]">
          {/* Column header row */}
          <div className="grid grid-cols-[1fr_68px_68px] bg-white/[0.025] border-b border-white/[0.07]">
            <div className="px-4 py-2.5" />
            <div className="py-2.5 flex items-center justify-center">
              <span className="text-[10px] font-bold text-cream/25 uppercase tracking-wider">Free</span>
            </div>
            <div className="py-2.5 flex items-center justify-center bg-primary/[0.07]">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Pro</span>
            </div>
          </div>

          {FEATURES.map(({ label, free, pro }, i) => (
            <div
              key={label}
              className={`grid grid-cols-[1fr_68px_68px] ${i < FEATURES.length - 1 ? "border-b border-white/[0.04]" : ""}`}
            >
              <div className="px-4 py-3 flex items-center">
                <span className="text-[11px] text-cream/55 leading-tight">{label}</span>
              </div>
              <div className="py-3 flex items-center justify-center border-l border-white/[0.04] px-1">
                <FeatureValue value={free} isPro={false} />
              </div>
              <div className="py-3 flex items-center justify-center border-l border-white/[0.04] bg-primary/[0.04] px-1">
                <FeatureValue value={pro} isPro={true} />
              </div>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={handleUpgrade}
          disabled={upgrading}
          className="w-full py-4 rounded-2xl bg-primary text-charcoal-dark font-extrabold text-base hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {!upgrading && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          )}
          <span className="relative flex items-center justify-center gap-2">
            {upgrading
              ? <><Loader2 className="w-5 h-5 animate-spin" />Redirecting to checkout…</>
              : <><Zap className="w-5 h-5" />Upgrade to Pro — $4.99/mo</>
            }
          </span>
        </button>
        <p className="text-center text-[10px] text-cream/20 -mt-2">
          Secured by Stripe · 256-bit SSL · Cancel anytime
        </p>
        {checkoutError && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 -mt-1">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 leading-relaxed">{checkoutError}</p>
          </div>
        )}

        {/* Social proof */}
        <div className="text-center space-y-2 pb-2">
          <div className="flex justify-center -space-x-2">
            {["Alex", "Sam", "Jordan", "Drew", "Riley"].map((s) => (
              <img
                key={s}
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s}&backgroundColor=b6e3f4,c0aede,ffd5dc`}
                alt={s}
                className="w-8 h-8 rounded-full border-2 border-charcoal-dark"
              />
            ))}
          </div>
          <p className="text-xs text-cream/30">
            Join <span className="text-cream/60 font-semibold">2,400+ Verified Collectors</span> already in the vault
          </p>
        </div>
      </div>
    </div>
  );
}
