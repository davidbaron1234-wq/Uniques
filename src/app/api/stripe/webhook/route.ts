import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── helpers ───────────────────────────────────────────────────────────────────

async function upgradeUserByEmail(email: string, eventId: string): Promise<void> {
  console.log(`[stripe/webhook][${eventId}] upgradeUserByEmail → "${email}"`);

  const result = await prisma.user.upsert({
    where:  { email },
    update: { tier: "pro" },
    create: {
      email,
      name:           "",
      hashedPassword: "__stripe_managed__", // Supabase-auth users; password never used
      tier:           "pro",
    },
    select: { id: true, email: true, tier: true },
  });

  console.log(`[stripe/webhook][${eventId}] ✅ DB updated — User ${result.id} (${result.email}) tier → ${result.tier}`);
}

// ── route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const eventTag = Date.now().toString(36); // short tag for correlating log lines
  console.log(`[stripe/webhook][${eventTag}] ▶ request received`);

  const secretKey     = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log(`[stripe/webhook][${eventTag}] STRIPE_SECRET_KEY set: ${!!secretKey} | STRIPE_WEBHOOK_SECRET set: ${!!webhookSecret}`);

  if (!secretKey) {
    console.error(`[stripe/webhook][${eventTag}] ❌ STRIPE_SECRET_KEY missing`);
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  // ── Raw body — MUST be read before any JSON parsing for Stripe sig check ──
  const rawBody = await req.text();
  const sig     = req.headers.get("stripe-signature");
  console.log(`[stripe/webhook][${eventTag}] rawBody length: ${rawBody.length} | stripe-signature present: ${!!sig}`);

  const stripe = new Stripe(secretKey, { apiVersion: "2026-02-25.clover" });

  // ── Signature verification ────────────────────────────────────────────────
  // SECURITY: STRIPE_WEBHOOK_SECRET is mandatory. Without it we cannot verify
  // the request origin and must refuse all calls to prevent free-upgrade exploits.
  if (!webhookSecret) {
    console.error(`[stripe/webhook][${eventTag}] ❌ STRIPE_WEBHOOK_SECRET not set — refusing request`);
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  if (!sig) {
    console.error(`[stripe/webhook][${eventTag}] ❌ stripe-signature header missing`);
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log(`[stripe/webhook][${eventTag}] ✅ signature verified — event.type: ${event.type} | event.id: ${event.id}`);
  } catch (err) {
    console.error(`[stripe/webhook][${eventTag}] ❌ constructEvent failed:`, err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── Event dispatch ────────────────────────────────────────────────────────
  console.log(`[stripe/webhook][${eventTag}] handling event.type: ${event.type}`);

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event, eventTag, stripe);

    } else if (event.type === "invoice.paid") {
      await handleInvoicePaid(event, eventTag, stripe);

    } else {
      console.log(`[stripe/webhook][${eventTag}] ignored event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe/webhook][${eventTag}] ❌ handler threw:`, err);
    // Return 500 so Stripe retries
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ── checkout.session.completed ────────────────────────────────────────────────

async function handleCheckoutCompleted(
  event: Stripe.Event,
  tag: string,
  stripe: Stripe,
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;

  console.log(`[stripe/webhook][${tag}] checkout session id: ${session.id}`);
  console.log(`[stripe/webhook][${tag}] metadata:`, JSON.stringify(session.metadata ?? {}));
  console.log(`[stripe/webhook][${tag}] customer_details.email: ${session.customer_details?.email ?? "null"}`);
  console.log(`[stripe/webhook][${tag}] customer_email: ${session.customer_email ?? "null"}`);
  console.log(`[stripe/webhook][${tag}] customer id: ${session.customer ?? "null"}`);

  // Only upgrade on successful payment
  if (session.payment_status !== "paid") {
    console.log(`[stripe/webhook][${tag}] payment_status is "${session.payment_status}" — skipping upgrade`);
    return;
  }

  const email = await resolveEmail(session, tag, stripe);
  if (!email) {
    console.error(`[stripe/webhook][${tag}] ❌ could not resolve email — aborting upgrade`);
    return;
  }

  await upgradeUserByEmail(email, tag);
}

// ── invoice.paid ──────────────────────────────────────────────────────────────
// Fires on every successful subscription billing cycle including the first one.

async function handleInvoicePaid(
  event: Stripe.Event,
  tag: string,
  stripe: Stripe,
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;

  console.log(`[stripe/webhook][${tag}] invoice id: ${invoice.id} | billing_reason: ${invoice.billing_reason}`);

  // Expand the customer to get their email if not already present
  let email: string | null = invoice.customer_email ?? null;

  if (!email && invoice.customer) {
    try {
      const customerId = typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer.id;
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) {
        email = (customer as Stripe.Customer).email ?? null;
        console.log(`[stripe/webhook][${tag}] resolved customer email from Stripe: ${email}`);
      }
    } catch (err) {
      console.error(`[stripe/webhook][${tag}] failed to retrieve customer:`, err);
    }
  }

  if (!email) {
    console.error(`[stripe/webhook][${tag}] ❌ no email on invoice — cannot upgrade user`);
    return;
  }

  await upgradeUserByEmail(email, tag);
}

// ── email resolution (checkout session) ──────────────────────────────────────
// Priority: metadata.userEmail → customer_details.email → customer_email → Stripe customer lookup

async function resolveEmail(
  session: Stripe.Checkout.Session,
  tag: string,
  stripe: Stripe,
): Promise<string | null> {
  // 1. Metadata — most reliable, set by us at session creation
  if (session.metadata?.userEmail) {
    console.log(`[stripe/webhook][${tag}] email from metadata.userEmail`);
    return session.metadata.userEmail;
  }

  // 2. customer_details (populated after payment)
  if (session.customer_details?.email) {
    console.log(`[stripe/webhook][${tag}] email from customer_details.email`);
    return session.customer_details.email;
  }

  // 3. customer_email (set before payment)
  if (session.customer_email) {
    console.log(`[stripe/webhook][${tag}] email from customer_email`);
    return session.customer_email;
  }

  // 4. Look up via Stripe Customer object
  if (session.customer) {
    try {
      const customerId = typeof session.customer === "string"
        ? session.customer
        : session.customer.id;
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted && (customer as Stripe.Customer).email) {
        const email = (customer as Stripe.Customer).email!;
        console.log(`[stripe/webhook][${tag}] email from Stripe Customer object`);
        return email;
      }
    } catch (err) {
      console.error(`[stripe/webhook][${tag}] customer lookup failed:`, err);
    }
  }

  return null;
}
