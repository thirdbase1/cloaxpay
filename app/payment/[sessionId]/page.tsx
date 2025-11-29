import PaymentWidget from "@/components/payment-widget"

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <PaymentWidget sessionId={sessionId} />
    </div>
  )
}
