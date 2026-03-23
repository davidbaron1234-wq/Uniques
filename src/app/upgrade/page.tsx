"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, X, Zap, TrendingUp, ScanLine, Package, Star, ArrowLeft, Sparkles, Crown, Trophy } from "lucide-react";
import Logo from "@/components/Logo";
const FREE_FEATURES = [
  { label: "Up to 10 vault pieces",  ok: true  },
  { label: "Manual catalog search",  ok: true  },
  { label: "Collector profile page", ok: true  },
  { label: "Trade messaging",        ok: true  },
  { label: "Unlimited vault",        ok: false },
  { label: "AI Auto-Scanner",        ok: false },
  { label: "Market Analytics",       ok: false },
  { label: "Verified Collector Badge", ok: false },
];

const PRO_FEATURES = [
  { label: "Unlimited vault capacity",           icon: Package    },
  { label: "Unlimited Grail Slots",              icon: Crown      },
  { label: "Full Trophy Room Gallery",           icon: Trophy     },
  { label: "AI Auto-Scanner (Vision + OCR)",     icon: ScanLine   },
  { label: "Institutional Market Analytics",     icon: TrendingUp },
  { label: "Verified Collector Pro Badge",       icon: Star       },
  { label: "Priority trade matching",            icon: Zap        },
  { label: "Everything in Free",                 icon: Check      },
];

export default function UpgradePage() {
  const router = useRouter();
  const { status } = useSession();

  if (status === "unauthenticated") {
    router.replace("/api/auth/signin");
    return null;
  }
  if (status === "loading") return null;

  const handleUpgrade = () => {
    router.push("/checkout");
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
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-white/[0.06] text-cream/50 hover:text-cream transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Logo />
        <div className="w-9" />
      </div>

      <div className="relative flex-1 px-5 pb-10 max-w-lg mx-auto w-full space-y-6">

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
            Unlock the full Uniques experience for less than a coffee a month.
          </p>
        </div>

        {/* Price card */}
        <div className="relative rounded-3xl overflow-hidden">
          {/* Glow border */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/30 via-surface/20 to-primary/10 blur-[2px]" />
          <div className="relative bg-charcoal-dark rounded-3xl p-6 border border-primary/25 shadow-2xl">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[11px] font-bold text-primary/70 uppercase tracking-widest mb-1">Pro Plan</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold text-cream">$4.99</span>
                  <span className="text-sm text-cream/35 font-medium">/month</span>
                </div>
                <p className="text-xs text-cream/30 mt-1">Cancel anytime · No commitment</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
            </div>

            <div className="space-y-2.5 mb-6">
              {PRO_FEATURES.map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm text-cream/80 font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleUpgrade}
              className="w-full py-4 rounded-2xl bg-primary text-charcoal-dark font-extrabold text-base hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 relative overflow-hidden group"
            >
              {/* Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative flex items-center justify-center gap-2">
                <Zap className="w-5 h-5" />
                Upgrade to Pro
              </span>
            </button>

            <p className="text-center text-[10px] text-cream/20 mt-3">
              Secured by Stripe · 256-bit SSL encryption
            </p>
          </div>
        </div>

        {/* Comparison table */}
        <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div className="grid grid-cols-3 border-b border-white/[0.06]">
            <div className="px-4 py-3 col-span-1">
              <span className="text-[10px] font-bold text-cream/25 uppercase tracking-wider">Feature</span>
            </div>
            <div className="px-3 py-3 text-center border-l border-white/[0.06]">
              <span className="text-[10px] font-bold text-cream/35 uppercase tracking-wider">Free</span>
            </div>
            <div className="px-3 py-3 text-center border-l border-white/[0.06] bg-primary/5">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Pro</span>
            </div>
          </div>

          {FREE_FEATURES.map(({ label, ok }) => (
            <div key={label} className="grid grid-cols-3 border-b border-white/[0.04] last:border-0">
              <div className="px-4 py-3 flex items-center col-span-1">
                <span className="text-xs text-cream/60">{label}</span>
              </div>
              <div className="px-3 py-3 flex items-center justify-center border-l border-white/[0.04]">
                {ok
                  ? <Check className="w-4 h-4 text-green-400" />
                  : <X     className="w-4 h-4 text-red-400/50" />
                }
              </div>
              <div className="px-3 py-3 flex items-center justify-center border-l border-white/[0.04] bg-primary/[0.03]">
                <Check className="w-4 h-4 text-primary" />
              </div>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div className="text-center space-y-2">
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
