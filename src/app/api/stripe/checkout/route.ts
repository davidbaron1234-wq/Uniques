import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";

// POST /api/stripe/checkout — create a Stripe Checkout Session for Pro subscription.
// Requires STRIPE_SECRET_KEY and STRIPE_PRICE_ID env vars.
// Returns { url } — redirect the browser to this URL to complete payment.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
      // Stripe not yet configured — signal the client to fall back to the
      // hosted checkout page (simulated flow for development / staging).
      return NextResponse.json({ error: "Stripe not configured", fallback: true }, { status: 503 });
    }

    // Dynamic import so the module is only resolved when Stripe keys are present
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXTAUTH_URL ??
      "https://uniques-app.vercel.app";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode:       "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${appUrl}/settings?upgraded=true`,
      cancel_url:  `${appUrl}/upgrade`,
      customer_email: session.user.email ?? undefined,
      metadata:   { userId: session.user.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[POST /api/stripe/checkout]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
