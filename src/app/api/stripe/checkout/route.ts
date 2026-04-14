import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be logged in to upgrade." }, { status: 401 });
    }

    // Optional returnUrl tells Stripe where to send the user after payment.
    // Must be a relative path (e.g. "/inventory") — we prepend appUrl below.
    let returnUrl: string | null = null;
    try {
      const body = await req.json();
      if (typeof body?.returnUrl === "string" && body.returnUrl.startsWith("/")) {
        returnUrl = body.returnUrl;
      }
    } catch { /* no body is fine */ }

    const secretKey = (process.env.STRIPE_SECRET_KEY ?? "").trim();

    console.log("[stripe/checkout] secretKey length:", secretKey.length, "| prefix:", secretKey.slice(0, 12) + "…");

    if (!secretKey) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY is not set." }, { status: 503 });
    }

    const Stripe = (await import("stripe")).default;
    const stripe  = new Stripe(secretKey, { apiVersion: "2026-02-25.clover" });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXTAUTH_URL ??
      "https://uniques-app.vercel.app";

    console.log("[stripe/checkout] creating session — user:", session.user.id, session.user.email);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Uniques Pro Subscription",
              description: "Unlock AI Auto-Scanner, Market Analytics, and Unlimited Vault capacity.",
            },
            unit_amount: 499,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}${returnUrl ?? "/settings"}?upgraded=true`,
      cancel_url:  `${appUrl}${returnUrl ?? "/upgrade"}`,
      customer_email: session.user.email ?? undefined,
      client_reference_id: session.user.id,
      metadata: {
        userId:    session.user.id,
        userEmail: session.user.email ?? "",
      },
    });

    console.log("[stripe/checkout] ✅ session created:", checkoutSession.id);
    return NextResponse.json({ url: checkoutSession.url });

  } catch (err: unknown) {
    console.error("[stripe/checkout] RAW ERROR:", err);

    const stripeErr = err as {
      message?: string;
      type?: string;
      code?: string;
      statusCode?: number;
      raw?: unknown;
    };

    return NextResponse.json(
      {
        error:   stripeErr.message  ?? String(err),
        type:    stripeErr.type     ?? null,
        code:    stripeErr.code     ?? null,
        status:  stripeErr.statusCode ?? null,
        raw:     stripeErr.raw      ?? null,
      },
      { status: 500 },
    );
  }
}
