export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { PaymentWidget } from '@/components/payment-widget'
import { notFound } from 'next/navigation'

export default async function WidgetPage({
  params,
}: {
  params: { sessionId: string }
}) {
  const { sessionId } = params

  console.log('[v0] Widget loading for session:', sessionId)

  const supabase = await createClient()

  // Fetch session data
  const { data: session, error: sessionError } = await supabase
    .from('payment_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (sessionError || !session) {
    console.error('[v0] Session not found:', sessionError)
    notFound()
  }

  // Fetch merchant data
  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', session.merchant_id)
    .single()

  if (merchantError || !merchant) {
    console.error('[v0] Merchant not found:', merchantError)
    notFound()
  }

  console.log('[v0] Widget loaded successfully')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <PaymentWidget
        sessionId={sessionId}
        amount={session.amount}
        currency={session.currency}
        depositAddress={session.deposit_address || 'Generating...'}
        depositChain={session.deposit_chain}
        merchantName={merchant.business_name}
        merchantContact={merchant.email}
        status={session.status}
      />
    </div>
  )
}
