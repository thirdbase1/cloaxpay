import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UnifiedDashboard } from "@/components/unified-dashboard"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Fetch all data needed for comprehensive dashboard
  const [merchantResult, sessionsResult, eventsResult, transactionsResult] = await Promise.all([
    supabase.from("merchants").select("*").eq("id", data.user.id).single(),
    supabase
      .from("payment_sessions")
      .select("*")
      .eq("merchant_id", data.user.id)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("widget_events").select("*").order("created_at", { ascending: false }).limit(2000),
    supabase
      .from("transactions")
      .select("*")
      .eq("merchant_id", data.user.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ])

  const merchant = merchantResult.data
  const sessions = sessionsResult.data || []
  const events = eventsResult.data || []
  const transactions = transactionsResult.data || []

  return <UnifiedDashboard merchant={merchant} sessions={sessions} events={events} transactions={transactions} />
}
