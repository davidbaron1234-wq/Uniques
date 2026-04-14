"use client";

import { useState, useCallback } from "react";

/**
 * Hook that manages the full Stripe checkout redirect flow with
 * loading state, error state, and protection against double-clicks.
 *
 * Usage:
 *   const { goCheckout, isLoading, error } = useCheckout();
 *   <button onClick={() => goCheckout(window.location.pathname)} disabled={isLoading}>...</button>
 *   {error && <p>{error}</p>}
 *
 * Pass an optional returnUrl so Stripe redirects back to the exact page
 * the user was on when they clicked Upgrade.
 */
export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError    ] = useState<string | null>(null);

  const goCheckout = useCallback(async (returnUrl?: string) => {
    if (isLoading) return; // prevent double-click
    setIsLoading(true);
    setError(null);

    try {
      console.log("[useCheckout] calling /api/stripe/checkout, returnUrl:", returnUrl);
      const res = await fetch("/api/stripe/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ returnUrl: returnUrl ?? null }),
      });

      let data: { url?: string; error?: string } = {};
      try { data = await res.json(); } catch { /* empty body */ }

      console.log("[useCheckout] response", res.status, data);

      if (data.url) {
        // Hard-navigate to Stripe-hosted checkout — do NOT setIsLoading(false)
        // because the page is about to unload.
        window.location.href = data.url;
        return;
      }

      const msg = data.error ?? `Checkout unavailable (HTTP ${res.status})`;
      console.error("[useCheckout] no URL in response:", msg);
      setError(msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error — please try again.";
      console.error("[useCheckout] fetch failed:", msg);
      setError(msg);
    }

    setIsLoading(false);
  }, [isLoading]);

  return { goCheckout, isLoading, error };
}
