import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = { title: "Terms of Service — Uniques" };

const LAST_UPDATED = "April 12, 2026";
const APP_NAME     = "Uniques";
const CONTACT      = "legal@uniques.app";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-cream">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 blur-[140px] rounded-full" />
      </div>

      <div className="relative max-w-2xl mx-auto px-5 py-12 pb-24">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 mb-12">
          <Link href="/" aria-label="Back to Uniques"><Logo /></Link>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-cream">Terms of Service</h1>
            <p className="text-sm text-cream/40 mt-1">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        <div className="space-y-8 text-[15px] leading-relaxed">

          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using {APP_NAME} ("the App", "the Service", "we", "us", or "our"),
              you agree to be bound by these Terms of Service and our Privacy Policy. If you do not
              agree to these terms, please do not use the Service.
            </p>
            <p className="mt-3">
              We reserve the right to update these terms at any time. Continued use of the Service
              after changes constitutes acceptance of the revised terms.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <p>
              You must be at least 13 years old to use the Service. If you are between 13 and 18,
              you represent that a parent or legal guardian has reviewed and agreed to these terms
              on your behalf. By creating an account, you represent that all registration information
              is accurate and truthful.
            </p>
          </Section>

          <Section title="3. User Accounts">
            <p>
              You are responsible for maintaining the security of your account credentials and for
              all activity that occurs under your account. You agree to notify us immediately at{" "}
              <a href={`mailto:${CONTACT}`} className="text-primary/80 hover:text-primary underline underline-offset-2">{CONTACT}</a>{" "}
              if you suspect any unauthorized access.
            </p>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate these terms,
              engage in fraudulent activity, or harm other users of the Service.
            </p>
          </Section>

          <Section title="4. Marketplace & Trading">
            <p>
              {APP_NAME} is a platform that facilitates connections between collectors who wish to
              trade collectible items. We are not a party to any transaction between users.
              All trades are negotiated and agreed upon solely between the parties involved.
            </p>
            <p className="mt-3">
              You agree not to use the platform to facilitate illegal sales, counterfeit goods,
              stolen property, or any items prohibited by applicable law.
            </p>
          </Section>

          <Section title="5. Financial Disclaimer — Market Prices & Analytics">
            <Callout>
              The market prices, valuations, price history, portfolio analytics, and any other
              financial data displayed in the App are provided for <strong>informational and
              entertainment purposes only</strong>. They do not constitute financial advice,
              investment advice, or a recommendation to buy, sell, or hold any asset.
            </Callout>
            <p className="mt-3">
              Market data is sourced from third-party APIs (including eBay and other marketplaces)
              and may be delayed, incomplete, or inaccurate. {APP_NAME} makes no warranty,
              express or implied, as to the accuracy or completeness of any pricing data.
            </p>
            <p className="mt-3">
              <strong className="text-cream">You agree that {APP_NAME} shall not be liable</strong>{" "}
              for any trading losses, financial decisions, or damages arising from your reliance
              on price data or analytics displayed within the Service.
            </p>
          </Section>

          <Section title="6. User-Generated Content">
            <p>
              You retain ownership of all content you upload to {APP_NAME}, including item photos,
              profile pictures, and descriptions ("User Content"). By uploading User Content, you
              grant {APP_NAME} a non-exclusive, worldwide, royalty-free licence to display and
              distribute that content solely for the purpose of operating the Service.
            </p>
            <p className="mt-3">You agree <strong className="text-cream">not</strong> to upload content that:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-cream/70">
              <li>Is illegal, obscene, defamatory, or infringing on intellectual property rights</li>
              <li>Contains malware, scripts, or executable files of any kind</li>
              <li>Depicts minors in a sexual or exploitative manner</li>
              <li>Promotes violence, hate speech, or discrimination</li>
              <li>Misrepresents the identity, condition, or authenticity of an item</li>
            </ul>
            <p className="mt-3">
              We reserve the right to remove any User Content that violates these terms without
              prior notice.
            </p>
          </Section>

          <Section title="7. Payments & Subscriptions (Stripe)">
            <Callout>
              All payment processing for {APP_NAME} Pro subscriptions is handled exclusively by
              Stripe, Inc. {APP_NAME} does not store your credit card number, CVV, or full payment
              details on our servers. By subscribing, you also agree to{" "}
              <a
                href="https://stripe.com/legal/ssa"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary/80 hover:text-primary underline underline-offset-2"
              >
                Stripe's Terms of Service
              </a>.
            </Callout>
            <p className="mt-3">
              {APP_NAME} Pro is billed monthly on a recurring basis. You may cancel your
              subscription at any time via your account settings. Cancellation takes effect at
              the end of the current billing period. We do not offer refunds for partial months.
            </p>
          </Section>

          <Section title="8. Prohibited Conduct">
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-cream/70">
              <li>Attempt to reverse-engineer, scrape, or abuse the Service's APIs</li>
              <li>Create multiple accounts to circumvent restrictions or bans</li>
              <li>Use automated bots or scripts to interact with the Service</li>
              <li>Impersonate another user, collector, or member of {APP_NAME} staff</li>
              <li>Interfere with or disrupt the infrastructure of the Service</li>
              <li>Use the Service for any unlawful purpose</li>
            </ul>
          </Section>

          <Section title="9. Disclaimers & Limitation of Liability">
            <p>
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties
              of any kind, either express or implied.
            </p>
            <p className="mt-3">
              To the maximum extent permitted by applicable law, {APP_NAME} shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages, including
              loss of profits, data, or goodwill, arising out of or in connection with your use
              of the Service.
            </p>
          </Section>

          <Section title="10. Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with applicable law.
              Any disputes arising out of these Terms or the Service shall be resolved through
              binding arbitration where permitted by law.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              For questions about these Terms, please contact us at{" "}
              <a href={`mailto:${CONTACT}`} className="text-primary/80 hover:text-primary underline underline-offset-2">{CONTACT}</a>.
            </p>
          </Section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row gap-3 justify-between items-center text-sm text-cream/30">
          <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <Link href="/privacy" className="text-primary/60 hover:text-primary transition-colors underline underline-offset-2">
            Privacy Policy →
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
    <div className="rounded-2xl bg-primary/8 border border-primary/20 px-4 py-3.5 text-cream/80 text-[14px] leading-relaxed">
      {children}
    </div>
  );
}
