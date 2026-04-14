import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = { title: "Privacy Policy — Uniques" };

const LAST_UPDATED = "April 12, 2026";
const APP_NAME     = "Uniques";
const CONTACT      = "privacy@uniques.app";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-cream">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-surface/5 blur-[140px] rounded-full" />
      </div>

      <div className="relative max-w-2xl mx-auto px-5 py-12 pb-24">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 mb-12">
          <Link href="/" aria-label="Back to Uniques"><Logo /></Link>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-cream">Privacy Policy</h1>
            <p className="text-sm text-cream/40 mt-1">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        <div className="space-y-8 text-[15px] leading-relaxed">

          <Section title="1. Introduction">
            <p>
              {APP_NAME} ("we", "us", or "our") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, store, and protect your personal
              information when you use our Service at uniques-app.vercel.app and related platforms.
            </p>
            <p className="mt-3">
              By using {APP_NAME}, you agree to the collection and use of your information as
              described in this policy.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p className="font-semibold text-cream/80 mb-2">Information you provide directly:</p>
            <ul className="list-disc list-inside space-y-1 text-cream/70">
              <li>Display name and email address (registration)</li>
              <li>Profile bio, username (handle), and avatar image</li>
              <li>Item listings: titles, descriptions, photos, and estimated values</li>
              <li>Payment and shipping preferences (stored as plain text tags, not payment card data)</li>
              <li>Messages sent to other users through the in-app inbox</li>
            </ul>
            <p className="font-semibold text-cream/80 mt-4 mb-2">Information collected automatically:</p>
            <ul className="list-disc list-inside space-y-1 text-cream/70">
              <li>Authentication session tokens (managed by NextAuth.js / Supabase Auth)</li>
              <li>Aggregate usage analytics (page views, feature interactions — no third-party tracking scripts)</li>
              <li>Standard server logs (IP addresses, request timestamps) for security and debugging</li>
            </ul>
            <p className="font-semibold text-cream/80 mt-4 mb-2">Information from third parties:</p>
            <ul className="list-disc list-inside space-y-1 text-cream/70">
              <li>
                <strong>Google OAuth:</strong> If you sign in with Google, we receive your name,
                email address, and profile picture from Google. We use this solely to create and
                identify your account.
              </li>
              <li>
                <strong>Stripe:</strong> When you subscribe to {APP_NAME} Pro, Stripe processes your
                payment and notifies us that a subscription is active. We receive your email address
                and subscription status only — never your card number or CVV.
              </li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <Callout>
              We collect and use your data <strong>strictly to operate and improve the {APP_NAME}
              Service</strong>. We do not sell, rent, or trade your personal information to
              third parties for marketing purposes. Ever.
            </Callout>
            <p className="mt-4">Specifically, we use your information to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-cream/70">
              <li>Create and maintain your account</li>
              <li>Display your profile and vault to other users on the platform</li>
              <li>Facilitate trades and in-app messaging</li>
              <li>Process and manage your Pro subscription via Stripe</li>
              <li>Send transactional notifications (trade updates, messages) — not marketing spam</li>
              <li>Detect fraud, abuse, and violations of our Terms of Service</li>
              <li>Improve the Service based on aggregated, anonymised usage patterns</li>
            </ul>
          </Section>

          <Section title="4. Data Storage & Security">
            <p>
              Your data is stored in a PostgreSQL database hosted on Supabase and served through
              Vercel's serverless infrastructure. Both providers operate data centres in the United
              States and European Union and maintain SOC 2 Type II compliance.
            </p>
            <p className="mt-3">
              Passwords for email/password accounts are never stored by {APP_NAME}. Authentication
              is delegated entirely to Supabase Auth, which stores only a secure hashed credential.
              Google OAuth users have no password stored at all.
            </p>
            <p className="mt-3">
              Avatar images uploaded to the platform are compressed client-side and stored as
              base64-encoded data in the database. We apply server-side MIME-type validation to
              prevent malicious file uploads.
            </p>
            <p className="mt-3">
              While we implement industry-standard security measures, no system is completely
              secure. We recommend using a strong, unique password and enabling two-factor
              authentication on your Google account.
            </p>
          </Section>

          <Section title="5. Stripe Payments">
            <Callout>
              Payment card data is handled exclusively by <a
                href="https://stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary/80 hover:text-primary underline underline-offset-2"
              >Stripe, Inc.</a>, a PCI-DSS Level 1 certified payment processor.
              {APP_NAME} never sees, transmits, or stores your full card number, expiry date, or CVV.
            </Callout>
            <p className="mt-3">
              When you complete a checkout session, Stripe sends us a webhook event confirming your
              subscription. We use your email address from that event to upgrade your account tier.
              For Stripe's own data practices, please review{" "}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary/80 hover:text-primary underline underline-offset-2"
              >
                Stripe's Privacy Policy
              </a>.
            </p>
          </Section>

          <Section title="6. Data Sharing">
            <p>We share your data only in the following limited circumstances:</p>
            <ul className="list-disc list-inside space-y-2 mt-2 text-cream/70">
              <li>
                <strong className="text-cream/85">With other users:</strong> Your public profile
                (display name, handle, avatar, vault items marked as "For Trade") is visible to
                other authenticated users of the platform. You control what you share.
              </li>
              <li>
                <strong className="text-cream/85">With infrastructure providers:</strong> Supabase
                (database/auth), Vercel (hosting), and Stripe (payments) process your data under
                contractual data processing agreements.
              </li>
              <li>
                <strong className="text-cream/85">Legal requirements:</strong> We may disclose
                information if required by law, court order, or to protect the rights and safety of
                our users or the public.
              </li>
            </ul>
          </Section>

          <Section title="7. Cookies & Tracking">
            <p>
              {APP_NAME} uses session cookies managed by NextAuth.js to keep you logged in between
              visits. These are strictly necessary cookies — there are no advertising trackers,
              no Facebook pixel, no Google Analytics scripts embedded in the Service.
            </p>
            <p className="mt-3">
              LocalStorage is used to cache your vault data client-side for faster load times.
              This data is cleared when you sign out.
            </p>
          </Section>

          <Section title="8. Your Rights">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-cream/70">
              <li><strong className="text-cream/85">Access</strong> the personal data we hold about you</li>
              <li><strong className="text-cream/85">Correct</strong> inaccurate information via your profile settings</li>
              <li><strong className="text-cream/85">Delete</strong> your account and associated data (see below)</li>
              <li><strong className="text-cream/85">Port</strong> your data in a machine-readable format</li>
              <li><strong className="text-cream/85">Object</strong> to certain processing activities</li>
            </ul>
            <p className="mt-3">
              To request account deletion or a data export, email us at{" "}
              <a href={`mailto:${CONTACT}`} className="text-primary/80 hover:text-primary underline underline-offset-2">{CONTACT}</a>.
              We will process your request within 30 days.
            </p>
          </Section>

          <Section title="9. Data Retention">
            <p>
              We retain your personal data for as long as your account is active, or as needed to
              provide the Service. If you delete your account, we will remove your personal profile
              data within 30 days. Aggregated, anonymised analytics data may be retained
              indefinitely as it cannot be linked back to you.
            </p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>
              The Service is not directed at children under the age of 13. We do not knowingly
              collect personal information from children under 13. If you believe a child has
              provided us with personal information, please contact us and we will delete it promptly.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting a notice in the app or by emailing the address associated with
              your account. The "Last updated" date at the top of this page always reflects the
              most recent revision.
            </p>
          </Section>

          <Section title="12. Contact Us">
            <p>
              For privacy-related questions, data access requests, or concerns, please contact our
              privacy team at{" "}
              <a href={`mailto:${CONTACT}`} className="text-primary/80 hover:text-primary underline underline-offset-2">{CONTACT}</a>.
            </p>
          </Section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row gap-3 justify-between items-center text-sm text-cream/30">
          <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <Link href="/terms" className="text-primary/60 hover:text-primary transition-colors underline underline-offset-2">
            Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-cream mb-3 pb-2 border-b border-white/[0.06]">{title}</h2>
      <div className="text-cream/65">{children}</div>
    </section>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface/8 border border-surface/20 px-4 py-3.5 text-cream/80 text-[14px] leading-relaxed">
      {children}
    </div>
  );
}
