export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { PaymentWidget } from "@/components/payment-widget"
import { createClient } from "@/lib/supabase/server"

interface PageProps {
  params: Promise<{ sessionId: string }>
}

export default async function PayPage({ params }: PageProps) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()

    console.log("[v0] Pay page accessed - sessionId:", sessionId)

    const { data: session, error } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle()

    console.log("[v0] Session query result:", { found: !!session, error: error?.message })

    if (error || !session) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-blue-50 flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Session Not Found</h1>
            <p className="text-gray-600">
              Session ID: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{sessionId}</code>
            </p>
            <p className="text-sm text-gray-500">
              {error ? `Error: ${error.message}` : "This payment link may have expired or doesn't exist."}
            </p>
          </div>
        </div>
      )
    }

    const { data: merchant } = await supabase
      .from("merchants")
      .select("business_name, email, webhook_url")
      .eq("id", session.merchant_id)
      .maybeSingle()

    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-blue-50 flex items-center justify-center p-2 sm:p-4">
        <PaymentWidget
          sessionId={session.session_id}
          initialAmount={session.amount}
          initialCurrency={session.currency}
          merchantName={merchant?.business_name || "Merchant"}
          merchantEmail={merchant?.email || "support@merchant.com"}
          initialStatus={session.status}
          expiresAt={session.expires_at}
          createdAt={session.created_at}
        />
      </div>
    )
  } catch (error) {
    console.error("[v0] Pay page error:", error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600">Error Loading Widget</h1>
          <p className="text-gray-600">{error instanceof Error ? error.message : "An unexpected error occurred"}</p>
        </div>
      </div>
    )
  }
}

export async function generateMetadata({ params }: PageProps) {
  return {
    title: "Complete Your Payment | CloaxPay",
    description: "Secure crypto payment gateway",
    robots: "noindex, nofollow",
  }
}
