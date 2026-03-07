"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2, Check } from "lucide-react";
import Logo from "@/components/Logo";

const NICHES = [
  { label: "Pokémon TCG", emoji: "🃏" },
  { label: "Sports Cards", emoji: "⚾" },
  { label: "Watches",      emoji: "⌚" },
  { label: "Coins",        emoji: "🪙" },
  { label: "Sneakers",     emoji: "👟" },
  { label: "Funko Pop",    emoji: "🎭" },
  { label: "Lego",         emoji: "🧱" },
  { label: "Comics",       emoji: "📚" },
];

export default function RegisterPage() {
  const router  = useRouter();
  const [step,      setStep]      = useState<1 | 2>(1);
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [niches,    setNiches]    = useState<string[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const toggleNiche = (label: string) =>
    setNiches((prev) =>
      prev.includes(label) ? prev.filter((n) => n !== label) : [...prev, label]
    );

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setStep(2);
  };

  const handleComplete = async () => {
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      name,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Something went wrong. Please try again.");
      setStep(1);
    } else {
      router.push("/");
    }
  };

  // ── Shared glow background ──────────────────────────────────────────────
  const BgGlow = () => (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-surface/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/8 blur-[100px] rounded-full" />
    </div>
  );

  // ── Google SVG ──────────────────────────────────────────────────────────
  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <BgGlow />

      <div className="relative w-full max-w-sm space-y-8">
        {/* Logo + step indicator */}
        <div className="flex flex-col items-center gap-3">
          <Logo />
          <div className="flex items-center gap-2 mt-1">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? "w-8 bg-primary" : s < step ? "w-4 bg-primary/50" : "w-4 bg-white/10"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-cream/40">
            {step === 1 ? "Create your account" : "What do you collect?"}
          </p>
        </div>

        {/* ── Step 1: Credentials ── */}
        {step === 1 && (
          <div className="glass border border-white/[0.08] rounded-3xl p-6 space-y-5 shadow-2xl">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-cream/70 text-sm font-semibold hover:bg-white/[0.1] active:scale-[0.98] transition-all"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[10px] text-cream/25 font-semibold uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <form onSubmit={handleStep1} className="space-y-3">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/25 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Display name"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-background-light border border-white/[0.06] text-cream placeholder:text-cream/25 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/25 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-background-light border border-white/[0.06] text-cream placeholder:text-cream/25 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/25 pointer-events-none" />
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min. 6 characters)"
                  className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-background-light border border-white/[0.06] text-cream placeholder:text-cream/25 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-cream/25 hover:text-cream/50 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && <p className="text-xs text-red-400 px-1">{error}</p>}

              <p className="text-[10px] text-cream/25 px-1 leading-relaxed">
                By continuing you agree to our{" "}
                <span className="text-primary/60 cursor-pointer hover:text-primary transition-colors">Terms</span>
                {" "}and{" "}
                <span className="text-primary/60 cursor-pointer hover:text-primary transition-colors">Privacy Policy</span>.
              </p>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-charcoal-dark text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ── Step 2: Niche picker ── */}
        {step === 2 && (
          <div className="glass border border-white/[0.08] rounded-3xl p-6 space-y-5 shadow-2xl">
            <div>
              <p className="text-xs font-bold text-cream/40 uppercase tracking-wider mb-1">Select all that apply</p>
              <p className="text-cream/60 text-sm">We&apos;ll personalise your feed and suggest the best trades for you.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {NICHES.map(({ label, emoji }) => {
                const selected = niches.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleNiche(label)}
                    className={`relative flex items-center gap-3 px-3.5 py-3 rounded-2xl border text-left transition-all active:scale-[0.97] ${
                      selected
                        ? "bg-primary/15 border-primary/40 text-cream"
                        : "bg-white/[0.03] border-white/[0.07] text-cream/50 hover:border-white/20 hover:text-cream/70"
                    }`}
                  >
                    <span className="text-xl leading-none">{emoji}</span>
                    <span className="text-xs font-bold leading-tight">{label}</span>
                    {selected && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-charcoal-dark" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {error && <p className="text-xs text-red-400 px-1">{error}</p>}

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleComplete}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-charcoal-dark text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Complete Registration <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
              {niches.length === 0 && (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-full py-2.5 text-xs text-cream/30 hover:text-cream/50 transition-colors"
                >
                  Skip for now
                </button>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-sm text-cream/35">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
