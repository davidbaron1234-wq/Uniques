/**
 * Calls /api/stripe/checkout, receives the Stripe-hosted checkout URL,
 * and hard-redirects the browser there.
 *
 * Never falls back to our own /checkout page — that page is a mock and
 * bypasses Stripe entirely, which is why webhooks never fire.
 */
export async function startCheckout(): Promise<void> {
  const res = await fetch("/api/stripe/checkout", { method: "POST" });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
    throw new Error(error ?? `HTTP ${res.status}`);
  }

  const { url } = await res.json() as { url?: string };
  if (!url) throw new Error("No checkout URL returned from Stripe");

  // Hard-navigate the browser to Stripe's hosted page
  window.location.href = url;
}
