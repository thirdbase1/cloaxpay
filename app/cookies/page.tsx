import Link from "next/link"

export default function CookiePolicy() {
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
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">Cookie Policy</h1>
        <p className="text-muted-foreground mb-6">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. What Are Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They help websites remember
              your preferences, keep you logged in, and provide analytics about how the site is used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. How We Use Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              CloaxPay uses cookies for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <strong>Essential Cookies:</strong> Required for authentication, session management, and security. These
                cannot be disabled.
              </li>
              <li>
                <strong>Functional Cookies:</strong> Remember your preferences such as dashboard settings and display
                options.
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Help us understand how users interact with our service to improve
                performance and user experience.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Types of Cookies We Use</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-muted-foreground border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Cookie Name</th>
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Purpose</th>
                    <th className="text-left py-3 font-semibold text-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 pr-4">sb-access-token</td>
                    <td className="py-3 pr-4">Authentication session</td>
                    <td className="py-3">Session</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 pr-4">sb-refresh-token</td>
                    <td className="py-3 pr-4">Session refresh</td>
                    <td className="py-3">7 days</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 pr-4">theme</td>
                    <td className="py-3 pr-4">Display preference</td>
                    <td className="py-3">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Third-Party Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use Supabase for authentication which may set its own cookies. We do not use third-party advertising
              cookies. Our payment processing partner SideShift.ai does not set cookies through our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Managing Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You can control cookies through your browser settings. Most browsers allow you to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>View what cookies are stored on your device</li>
              <li>Delete all or specific cookies</li>
              <li>Block cookies from specific sites</li>
              <li>Block all cookies (note: this may affect site functionality)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Impact of Disabling Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you disable essential cookies, you will not be able to log into your CloaxPay account or use
              authenticated features. Disabling functional cookies may result in a less personalized experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Updates to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookie Policy from time to time. Any changes will be posted on this page with an
              updated revision date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about our use of cookies, please contact us at privacy@cloaxpay.com
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
