import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Shield, Zap, Globe2, Lock, CheckCircle2, Wallet, Sparkles, RefreshCw, Layers } from "lucide-react"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>
}) {
  const { platform } = await searchParams
  const isMobileApp = platform === "mobile"

  return (
    <div className={`min-h-screen bg-background flex flex-col ${isMobileApp ? "p-4 justify-center" : ""}`}>
      {!isMobileApp && (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center max-w-7xl">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm sm:text-base transition-transform group-hover:scale-105">
                CP
              </div>
              <span className="font-bold text-lg sm:text-xl tracking-tight">CloaxPay</span>
            </Link>
          </div>
        </header>
      )}

      {/* Hero Section */}
      <section className={`relative ${isMobileApp ? "py-4" : "py-16 sm:py-24 md:py-32 lg:py-40"} overflow-hidden`}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] sm:bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]" />

        <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />

        <div className="container mx-auto px-4 sm:px-6 max-w-7xl relative">
          <div className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
            {isMobileApp && (
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-3xl shadow-xl shadow-primary/20">
                  CP
                </div>
              </div>
            )}
            <h1 className={`${isMobileApp ? "text-4xl" : "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"} font-bold tracking-tight text-balance animate-in fade-in slide-in-from-bottom-6 duration-700`}>
              Get Paid in
              <span className="text-primary"> Any Chain.</span>
              <br />
              Receive in
              <span className="text-primary"> Any Token.</span>
            </h1>

            <p className={`${isMobileApp ? "text-base" : "text-base sm:text-lg md:text-xl lg:text-2xl"} text-muted-foreground max-w-3xl mx-auto text-balance leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 px-2`}>
              {isMobileApp ? "Accept 200+ cryptocurrencies across 40+ blockchains. Auto-converted and non-custodial." : "Your customers pay with 200+ cryptocurrencies across 40+ blockchains. We auto-convert and send it directly to your wallet in your preferred token. Zero fees. Truly decentralized. Non-custodial."}
            </p>

            {!isMobileApp && (
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-4 animate-in fade-in duration-700 delay-200">
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  </div>
                  <span className="font-medium">Zero Fees</span>
                </div>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  </div>
                  <span className="font-medium">Auto Convert</span>
                </div>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  </div>
                  <span className="font-medium">Non-Custodial</span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center pt-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 max-w-md mx-auto sm:max-w-none">
              <Link href="/auth/sign-up" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full h-12 sm:h-14 px-6 sm:px-10 text-sm sm:text-base rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105"
                >
                  Get Started <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <Link href="/auth/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full h-12 sm:h-14 px-6 sm:px-10 text-sm sm:text-base rounded-xl bg-transparent hover:bg-primary/5"
                >
                  Login to Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      {!isMobileApp && (
        <section id="features" className="py-16 sm:py-20 md:py-28 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
                Payments Made Simple. Finally.
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground text-balance">
                No middlemen. No complexity. No fees. Just direct, decentralized crypto payments straight to your wallet.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <CardContent className="p-5 sm:p-6 md:p-8 space-y-3 sm:space-y-4">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center">
                    <Globe2 className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold">200+ Coins, 40+ Chains</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Accept Bitcoin, Ethereum, Solana, USDC, and 200+ more cryptocurrencies across 40+ blockchains. Your
                    customers pay however they want.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <CardContent className="p-5 sm:p-6 md:p-8 space-y-3 sm:space-y-4">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center">
                    <Wallet className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold">You Choose What You Receive</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Want USDC? ETH? BTC? Any token? You decide. Coins are automatically converted and sent directly to
                    your wallet. Your keys, your coins.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 md:col-span-2 lg:col-span-1">
                <CardContent className="p-5 sm:p-6 md:p-8 space-y-3 sm:space-y-4">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center">
                    <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold">Zero Platform Fees</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    We don't charge you a single cent. No platform fees, no monthly subscriptions, no hidden costs. Keep
                    100% of what you earn.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mt-6 sm:mt-8">
              <Card className="bg-background/50 hover:bg-background transition-colors">
                <CardContent className="p-3 sm:p-4 md:p-5 flex items-start gap-2 sm:gap-3 md:gap-4">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs sm:text-sm md:text-base">Non-Custodial</h4>
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">We never hold your funds</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/50 hover:bg-background transition-colors">
                <CardContent className="p-3 sm:p-4 md:p-5 flex items-start gap-2 sm:gap-3 md:gap-4">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs sm:text-sm md:text-base">Lightning Fast</h4>
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">3-5 min settlements</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/50 hover:bg-background transition-colors">
                <CardContent className="p-3 sm:p-4 md:p-5 flex items-start gap-2 sm:gap-3 md:gap-4">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs sm:text-sm md:text-base">Auto Convert</h4>
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Instant token swaps</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/50 hover:bg-background transition-colors">
                <CardContent className="p-3 sm:p-4 md:p-5 flex items-start gap-2 sm:gap-3 md:gap-4">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs sm:text-sm md:text-base">Direct to Wallet</h4>
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Your keys, your coins</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Developer Section */}
      {!isMobileApp && (
        <section id="how-it-works" className="py-16 sm:py-20 md:py-28">
          <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-16 items-center">
              <div className="space-y-4 sm:space-y-6 order-2 lg:order-1">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
                  Built by Developers,
                  <br />
                  <span className="text-primary">for Developers.</span>
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
                  Simple REST API. Real-time webhooks. Works on any platform - websites, mobile apps, e-commerce, SaaS, or
                  any system that can make HTTP requests. No SDKs required. Just a few lines of code.
                </p>

                <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                  {[
                    { icon: Lock, title: "Secure by Design", desc: "HMAC webhook signatures & API key authentication" },
                    { icon: Zap, title: "Real-time Webhooks", desc: "Instant notifications when payments complete" },
                    { icon: Globe2, title: "Platform Agnostic", desc: "Web, iOS, Android, Desktop - works everywhere" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 sm:gap-4">
                      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <item.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">{item.title}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative order-1 lg:order-2">
                <div className="absolute -inset-4 sm:-inset-6 bg-primary/5 rounded-2xl sm:rounded-3xl blur-2xl sm:blur-3xl" />
                <div className="relative bg-card rounded-xl sm:rounded-2xl border-2 shadow-xl sm:shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-4 border-b bg-muted/50">
                    <div className="flex gap-1.5 sm:gap-2">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400" />
                    </div>
                    <span className="ml-2 sm:ml-4 text-[10px] sm:text-xs font-mono text-muted-foreground">
                      payment.js
                    </span>
                  </div>
                  <div className="p-3 sm:p-5 md:p-6 font-mono text-[9px] sm:text-xs md:text-sm overflow-x-auto">
                    <pre className="text-foreground whitespace-pre-wrap break-all sm:break-words sm:whitespace-pre">
                      {`// That's it. Seriously.
const payment = await fetch(
  '/api/payment/initialize',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer sk_live_...'
    },
    body: JSON.stringify({
      amount: 99.99,
      currency: 'USD'
    })
  }
);

const { widget_url } = await payment.json();
window.location.href = widget_url;`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      {!isMobileApp && (
        <section className="py-16 sm:py-20 md:py-28 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
            <Card className="relative overflow-hidden border-2 border-primary/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
              <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <CardContent className="relative p-6 sm:p-10 md:p-14 lg:p-16 text-center space-y-5 sm:space-y-8">
                <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
                  <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
                    Ready to go decentralized?
                  </h2>
                  <p className="text-sm sm:text-base md:text-lg text-muted-foreground text-balance">
                    Join developers building the future of payments. Free forever. No credit card needed.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-lg mx-auto pt-2 sm:pt-4">
                  <Link href="/auth/sign-up" className="w-full sm:w-auto sm:flex-1">
                    <Button
                      size="lg"
                      className="w-full h-11 sm:h-14 px-5 sm:px-8 text-sm sm:text-base rounded-xl shadow-lg shadow-primary/20"
                    >
                      Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/auth/login" className="w-full sm:w-auto sm:flex-1">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full h-11 sm:h-14 px-5 sm:px-8 text-sm sm:text-base rounded-xl bg-transparent"
                    >
                      Login to Dashboard
                    </Button>
                  </Link>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground">
                  200+ coins. 40+ chains. Zero fees. Unlimited possibilities.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {!isMobileApp && (
        <footer className="border-t bg-muted/20 py-8 sm:py-10 mt-auto">
          <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
            <div className="flex flex-col items-start gap-6">
              {/* Logo - left aligned */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                  CP
                </div>
                <span className="font-bold text-base">CloaxPay</span>
              </div>

              {/* Links stacked vertically - left aligned */}
              <nav className="flex flex-col items-start gap-2 text-sm">
                <Link
                  href="/dashboard/integration"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Integration Guide
                </Link>
                <Link
                  href="/dashboard/try-widget"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Live Demo
                </Link>
                <Link href="/explorer" className="text-muted-foreground hover:text-foreground transition-colors">
                  Explorer
                </Link>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
                <Link href="/cookies" className="text-muted-foreground hover:text-foreground transition-colors">
                  Cookie Policy
                </Link>
              </nav>

              <div className="w-full pt-6 border-t border-muted text-center space-y-1">
                <p className="text-sm text-muted-foreground">
                  Powered by{" "}
                  <a
                    href="https://sideshift.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    SideShift.ai
                  </a>
                </p>
                <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CloaxPay</p>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
