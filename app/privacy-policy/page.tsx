export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 md:px-8">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Privacy Policy
      </h1>
      <div className="mt-6 space-y-6 text-sm leading-7 text-muted-foreground">
        <p>
          This Privacy Policy explains how Generic collects, uses, and shares
          information when you access our websites, apps, and services
          (collectively, the “Services”). By using the Services, you agree to
          the practices described below.
        </p>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Information we collect
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Account and contact details you provide, such as email address
              and support requests.
            </li>
            <li>
              Wallet and on-chain activity data needed to deliver the Services,
              including public wallet addresses and transaction metadata.
            </li>
            <li>
              Usage and device data, such as IP address, browser type, pages
              visited, and interaction events.
            </li>
            <li>
              Cookies and similar technologies used for security, preferences,
              and analytics.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            How we use information
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Provide, operate, and improve the Services.</li>
            <li>Process transactions and maintain service integrity.</li>
            <li>Send service updates, security notices, or support replies.</li>
            <li>Detect, prevent, and investigate fraud or abuse.</li>
            <li>Comply with legal obligations where applicable.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            How we share information
          </h2>
          <p>
            We share information only with service providers who help operate
            the Services (e.g., analytics, infrastructure, support) or when
            required by law. We do not sell your personal information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Data retention
          </h2>
          <p>
            We retain information only as long as necessary to provide the
            Services, comply with legal requirements, and resolve disputes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Your choices
          </h2>
          <p>
            You can opt out of non-essential communications at any time. If you
            would like to access, correct, or delete your personal information,
            contact us and we will respond as required by applicable law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Security
          </h2>
          <p>
            We use reasonable safeguards designed to protect information. No
            system is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Changes to this policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. Updates will be
            posted on this page with a revised “Last updated” date.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p>
            For privacy questions or requests, contact us at
            privacy@generic.money or through the support channel listed on the
            site.
          </p>
        </section>

        <p>Last updated: January 27, 2026.</p>
      </div>
    </main>
  );
}
