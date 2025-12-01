import { createClient } from "@/lib/supabase/server"
import { TransactionsList } from "@/components/transactions-list"
import { redirect } from "next/navigation"

export default async function TransactionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: sessions } = await supabase
    .from("payment_sessions")
    .select("*")
    .eq("merchant_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Transactions
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">View and manage all your payment history</p>
      </div>

      <TransactionsList sessions={sessions || []} />
    </>
  )
}
