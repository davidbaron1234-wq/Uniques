"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import {
  ArrowLeft, Lock, CreditCard, Zap, Check, Package, ScanLine, TrendingUp, Star, Loader2,
} from "lucide-react";
import Logo from "@/components/Logo";
import confetti from "canvas-confetti";

const PRO_ITEMS = [
  { icon: Package,    label: "Unlimited vault capacity" },
  { icon: ScanLine,   label: "AI Auto-Scanner (Vision + OCR)" },
  { icon: TrendingUp, label: "Institutional Market Analytics" },
  { icon: Star,       label: "Verified Collector Pro Badge" },
  { icon: Zap,        label: "Priority trade matching" },
];

function formatCardNumber(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const isFormValid =
    cardNumber.replace(/\s/g, "").length === 16 &&
    expiry.length === 5 &&
    cvc.length >= 3 &&
    cardName.trim().length > 0;

  const handlePay = async () => {
    if (!isFormValid || isProcessing) return;
    setError("");
    setIsProcessing(true);

    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 2000));

    // Set mock pro cookie (1 year)
    document.cookie = "mock_pro_status=true; path=/; max-age=31536000";

    // Re-authenticate to get new JWT with tier: 'pro'
    const email = session?.user?.email || "admin@uniques.com";
    await signIn("credentials", { email, password: "any", redirect: false });

    // Confetti celebration
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.55 },
      colors: ["#CAE6CE", "#AA95C5", "#ffffff", "#a78bfa"],
    });

    setTimeout(() => {
      router.push("/settings");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 blur-[130px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-surface/8 blur-[100px] rounded-full" />
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
        <div className="flex items-center gap-1.5 text-cream/30">
          <Lock className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold">Secure Checkout</span>
        </div>
      </div>

      <div className="relative flex-1 px-5 pb-10 max-w-lg mx-auto w-full space-y-5">

        {/* Order summary */}
        <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-primary/70 uppercase tracking-widest mb-0.5">Order Summary</p>
              <p className="text-base font-extrabold text-cream">Uniques Pro</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-cream">$4.99</p>
              <p className="text-[11px] text-cream/30">/month · cancel anytime</p>
            </div>
          </div>
          <div className="px-5 py-3 space-y-2">
            {PRO_ITEMS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-md bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-2.5 h-2.5 text-primary" />
                </div>
                <span className="text-xs text-cream/60">{label}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-cream/40 font-semibold">Total due today</span>
            <span className="text-sm font-extrabold text-cream">$4.99</span>
          </div>
        </div>

        {/* Card form */}
        <div className="rounded-3xl bg-charcoal-dark border border-white/[0.08] p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold text-cream">Payment Details</p>
            <div className="flex items-center gap-2">
              {/* Visa */}
              <div className="px-2 py-0.5 rounded bg-white/[0.08] border border-white/[0.1]">
                <span className="text-[10px] font-black text-blue-400 tracking-tight">VISA</span>
              </div>
              {/* Mastercard circles */}
              <div className="flex">
                <div className="w-5 h-5 rounded-full bg-red-500/70" />
                <div className="w-5 h-5 rounded-full bg-amber-400/70 -ml-2" />
              </div>
            </div>
          </div>

          {/* Card number */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-cream/40 uppercase tracking-wider">Card Number</label>
            <div className="flex items-center gap-2.5 rounded-2xl bg-background-light focus-within:ring-2 focus-within:ring-surface/30 transition-all">
              <CreditCard className="ml-3.5 w-4.5 h-4.5 text-cream/25 flex-shrink-0" />
              <input
                type="text"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                className="w-full pr-4 py-3 bg-transparent text-cream placeholder:text-cream/20 focus:outline-none font-mono tracking-widest text-sm"
              />
            </div>
          </div>

          {/* Expiry + CVC */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-cream/40 uppercase tracking-wider">Expiry</label>
              <input
                type="text"
                inputMode="numeric"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                className="w-full px-4 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/20 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-cream/40 uppercase tracking-wider">CVC</label>
              <input
                type="text"
                inputMode="numeric"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="123"
                className="w-full px-4 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/20 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all font-mono text-sm"
              />
            </div>
          </div>

          {/* Name on card */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-cream/40 uppercase tracking-wider">Name on Card</label>
            <input
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Full name"
              className="w-full px-4 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/20 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all text-sm"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 font-semibold px-1">{error}</p>
          )}
        </div>

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={!isFormValid || isProcessing}
          className={`w-full py-4 rounded-2xl font-extrabold text-base active:scale-[0.98] transition-all shadow-lg relative overflow-hidden group ${
            isFormValid && !isProcessing
              ? "bg-primary text-charcoal-dark hover:bg-primary/90 shadow-primary/20"
              : "bg-background-light text-cream/20 cursor-not-allowed"
          }`}
        >
          {isFormValid && !isProcessing && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          )}
          <span className="relative flex items-center justify-center gap-2">
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Pay & Subscribe · $4.99/mo
              </>
            )}
          </span>
        </button>

        {/* Trust signals */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-cream/20">
            <Lock className="w-3 h-3" />
            <span className="text-[10px]">256-bit SSL encryption · Powered by Stripe</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            {["No hidden fees", "Cancel anytime", "Instant access"].map((t) => (
              <div key={t} className="flex items-center gap-1">
                <Check className="w-3 h-3 text-primary/50" />
                <span className="text-[10px] text-cream/25">{t}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
