import Link from "next/link"

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center max-w-7xl">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm sm:text-base transition-transform group-hover:scale-105">
              CP
            </div>
            <span className="font-bold text-lg sm:text-xl tracking-tight">CloaxPay</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-6">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using CloaxPay's services, you agree to be bound by these Terms of Service. If you do not
              agree to these terms, do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              CloaxPay provides a non-custodial cryptocurrency payment gateway that enables merchants to accept payments
              in 200+ cryptocurrencies across 40+ blockchain networks. Payments are automatically converted to the
              merchant's preferred token using SideShift.ai's swap infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">To use our services, you must:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Create an account with accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Provide a valid wallet address for receiving payments</li>
              <li>Be at least 18 years old or the legal age in your jurisdiction</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Non-Custodial Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              CloaxPay is a non-custodial service. We never hold, control, or have access to your funds. Payments flow
              directly from customers to your designated wallet address via SideShift.ai's swap infrastructure. You are
              solely responsible for the security of your wallet and private keys.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Fees</h2>
            <p className="text-muted-foreground leading-relaxed">
              CloaxPay does not charge platform fees. However, cryptocurrency network fees and SideShift.ai swap fees
              (approximately 0.5%) apply to all transactions. These fees are deducted from the payment amount before
              settlement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Prohibited Activities</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You agree not to use our services for:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Illegal activities or transactions</li>
              <li>Money laundering or terrorist financing</li>
              <li>Fraud or deceptive practices</li>
              <li>Violating any applicable laws or regulations</li>
              <li>Circumventing security measures</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              CloaxPay is provided "as is" without warranties of any kind. We are not liable for any losses resulting
              from cryptocurrency price volatility, network delays, failed transactions, or third-party service
              interruptions. Our total liability is limited to the fees paid to us in the preceding 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account at any time for violation of these terms or
              suspected fraudulent activity. You may terminate your account at any time by contacting support.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may modify these terms at any time. Continued use of our services after changes constitutes acceptance
              of the new terms. We will notify users of material changes via email or dashboard notification.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, contact us at legal@cloaxpay.com
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <Link href="/" className="text-blue-500 hover:text-blue-600 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  )
}
