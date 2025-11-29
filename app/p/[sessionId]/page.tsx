import { notFound } from "next/navigation"
import { createServiceRoleClient } from "@/lib/supabase/server"
import PaymentWidget from "@/components/payment-widget"

interface PageProps {
  params: Promise<{ sessionId: string }>
}

export default async function WidgetPage({ params }: PageProps) {
  const { sessionId } = await params

  const supabase = createServiceRoleClient()

  const { data: session, error } = await supabase
    .from("payment_sessions")
    .select(`
      *,
      merchants!inner(business_name, email)
    `)
    .eq("session_id", sessionId)
    .maybeSingle()

  if (error || !session) {
    console.error("[v0] Failed to load payment session:", error)
    notFound()
  }

  // Check if expired
  if (new Date(session.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-lg shadow-lg">
          <div className="text-6xl">⏰</div>
          <h1 className="text-2xl font-bold">Payment Session Expired</h1>
          <p className="text-muted-foreground">
            This payment link has expired. Please contact the merchant to request a new payment link.
          </p>
          {session.merchants.email && (
            <a
              href={`mailto:${session.merchants.email}`}
              className="inline-block text-blue-600 hover:underline font-medium"
            >
              Contact {session.merchants.business_name}
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50 p-4">
      <PaymentWidget
        sessionId={session.session_id}
        initialAmount={session.amount} // Pass initial props
        initialCurrency={session.currency}
        merchantName={session.merchants.business_name}
        merchantEmail={session.merchants.email}
        initialStatus={session.status}
        expiresAt={session.expires_at}
      />
    </div>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { sessionId } = await params

  const supabase = createServiceRoleClient()
  const { data: session } = await supabase
    .from("payment_sessions")
    .select("amount, currency, merchants!inner(business_name)")
    .eq("session_id", sessionId)
    .maybeSingle()

  if (!session) {
    return {
      title: "Payment - CloaxPay",
    }
  }

  return {
    title: `Pay ${session.amount} ${session.currency} - ${session.merchants.business_name}`,
    description: `Secure crypto payment powered by CloaxPay`,
  }
}
