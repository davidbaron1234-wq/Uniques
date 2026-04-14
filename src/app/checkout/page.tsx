"use client";

// This page previously hosted a mock card form that bypassed Stripe entirely.
// It is replaced by an auto-redirect to the real Stripe-hosted checkout.
// Anyone who lands here (e.g. from a saved link) gets sent to Stripe immediately.

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import Logo from "@/components/Logo";

export default function CheckoutRedirectPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res  = await fetch("/api/stripe/checkout", { method: "POST" });
        const data = await res.json() as { url?: string; error?: string };
        if (cancelled) return;

        if (data.url) {
          window.location.href = data.url;
        } else {
          setError(data.error ?? "Could not start checkout. Please try again.");
        }
      } catch {
        if (!cancelled) setError("Network error — please try again.");
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-5">
      <Logo />

      {error ? (
        <div className="flex items-start gap-3 max-w-sm w-full px-4 py-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-400 mb-1">Checkout unavailable</p>
            <p className="text-xs text-red-400/70">{error}</p>
            <button
              onClick={() => window.location.href = "/upgrade"}
              className="mt-3 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
            >
              ← Back to upgrade page
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-cream/50">Redirecting to Stripe…</p>
        </div>
      )}
    </div>
  );
}
