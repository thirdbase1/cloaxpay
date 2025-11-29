export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { PaymentWidget } from "@/components/payment-widget"
import { createClient } from "@/lib/supabase/server"

interface PageProps {
  params: Promise<{ sessionId: string }>
}

export default async function WidgetPage({ params }: PageProps) {
  console.log("[v0] Widget page accessed")

  try {
    const { sessionId } = await params
    console.log("[v0] Session ID:", sessionId)

    const supabase = await createClient()

    const { data: session, error: sessionError } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle()

    if (sessionError) {
      console.error("[v0] Database error:", sessionError)
      throw new Error(`Database error: ${sessionError.message}`)
    }

    if (!session) {
      console.log("[v0] Session not found:", sessionId)
      return (
        <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-blue-50 flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Session Not Found</h1>
            <p className="text-gray-600">
              Session ID: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{sessionId}</code>
            </p>
            <p className="text-sm text-gray-500">This payment link may have expired or doesn't exist.</p>
          </div>
        </div>
      )
    }

    console.log("[v0] Session found:", session.session_id)

    const { data: merchant } = await supabase
      .from("merchants")
      .select("business_name, email, webhook_url")
      .eq("id", session.merchant_id)
      .maybeSingle()

    const sessionWithMerchant = {
      ...session,
      merchant_profiles: merchant || {
        business_name: "Merchant",
        email: "support@merchant.com",
        webhook_url: null,
      },
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-blue-50 flex items-center justify-center p-2 sm:p-4">
        <PaymentWidget session={sessionWithMerchant} />
      </div>
    )
  } catch (error) {
    console.error("[v0] Widget page error:", error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600">Error Loading Widget</h1>
          <p className="text-gray-600">{error instanceof Error ? error.message : "An unexpected error occurred"}</p>
          <a href="/" className="inline-block mt-4 px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600">
            Go Home
          </a>
        </div>
      </div>
    )
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { sessionId } = await params
  return {
    title: "Complete Your Payment | CloaxPay",
    description: "Secure crypto payment gateway",
    robots: "noindex, nofollow",
  }
}
