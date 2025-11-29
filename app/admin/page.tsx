import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AdminCharts } from "@/components/admin-charts"
import { Activity, DollarSign, AlertCircle, Users } from "lucide-react"

export default async function AdminPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check if user is admin
  const isAdmin = data.user.user_metadata?.is_admin === true
  if (!isAdmin) {
    redirect("/dashboard")
  }

  const { data: merchants } = await supabase.from("merchants").select("*").order("created_at", { ascending: false })

  const { data: unresolvedTransactions } = await supabase
    .from("unresolved_transactions")
    .select(`
      *,
      transaction:transactions(*),
      merchant:merchants(business_name, email)
    `)
    .eq("resolved", false)
    .order("created_at", { ascending: false })

  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select(`
      *,
      merchant:merchants(business_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(20)

  // Comprehensive analytics queries
  const { data: totalVolume } = await supabase.from("transactions").select("from_amount").eq("status", "settled")

  const volume = totalVolume?.reduce((sum, tx) => sum + Number(tx.from_amount), 0) || 0

  // Last 7 days activity
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: dailyStats } = await supabase
    .from("transactions")
    .select("created_at, from_amount, status")
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at")

  // Process daily stats
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const dateStr = date.toISOString().split("T")[0]

    const dayTransactions = dailyStats?.filter((tx) => tx.created_at.startsWith(dateStr)) || []

    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      transactions: dayTransactions.length,
      volume: dayTransactions.reduce((sum, tx) => sum + Number(tx.from_amount), 0),
      successful: dayTransactions.filter((tx) => tx.status === "settled").length,
    }
  })

  // Chain distribution
  const { data: chainStats } = await supabase.from("transactions").select("from_chain").eq("status", "settled")

  const chainDistribution =
    chainStats?.reduce((acc: any[], tx) => {
      const existing = acc.find((item) => item.chain === tx.from_chain)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ chain: tx.from_chain, count: 1 })
      }
      return acc
    }, []) || []

  // Status breakdown
  const { data: statusStats } = await supabase.from("transactions").select("status")

  const statusBreakdown =
    statusStats?.reduce((acc: any[], tx) => {
      const existing = acc.find((item) => item.status === tx.status)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ status: tx.status, count: 1 })
      }
      return acc
    }, []) || []

  // Recent activity logs
  const { data: recentActivity } = await supabase
    .from("activity_logs")
    .select(`
      *,
      merchant:merchants(business_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-semibold">CloaxPay Admin</h1>
          <Badge variant="destructive">Admin Panel</Badge>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Admin Dashboard</h2>
          <p className="text-muted-foreground">Comprehensive platform analytics and monitoring</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{merchants?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Active merchant accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${volume.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground">All-time settled transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{unresolvedTransactions?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Requiring attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">24h Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentTransactions?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Recent transactions</p>
            </CardContent>
          </Card>
        </div>

        <AdminCharts dailyData={dailyData} chainDistribution={chainDistribution} statusBreakdown={statusBreakdown} />

        <Tabs defaultValue="activity" className="w-full">
          <TabsList>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
            <TabsTrigger value="merchants">Merchants</TabsTrigger>
            <TabsTrigger value="unresolved">Unresolved Queue</TabsTrigger>
            <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Comprehensive platform activity log</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity && recentActivity.length > 0 ? (
                    recentActivity.map((log) => (
                      <div key={log.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Activity className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm">
                                {log.activity_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {log.merchant?.business_name || "System"} • {log.merchant?.email}
                              </p>
                            </div>
                            <Badge variant="outline" className="shrink-0">
                              {log.entity_type || "system"}
                            </Badge>
                          </div>
                          {log.description && <p className="text-sm text-muted-foreground mt-1">{log.description}</p>}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No activity logged yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="merchants" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Merchant Profiles</CardTitle>
                <CardDescription>All registered merchants</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {merchants && merchants.length > 0 ? (
                    merchants.map((merchant) => (
                      <div key={merchant.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                        <div>
                          <p className="font-semibold">{merchant.business_name}</p>
                          <p className="text-sm text-muted-foreground">{merchant.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={merchant.test_mode ? "secondary" : "default"}>
                            {merchant.test_mode ? "Test" : "Live"}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(merchant.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No merchants found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unresolved" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Unresolved Transactions</CardTitle>
                <CardDescription>Transactions requiring manual review</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {unresolvedTransactions && unresolvedTransactions.length > 0 ? (
                    unresolvedTransactions.map((item) => (
                      <div key={item.id} className="flex flex-col gap-2 border-b pb-4 last:border-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{item.merchant?.business_name}</p>
                            <p className="text-sm text-muted-foreground">{item.merchant?.email}</p>
                          </div>
                          <Badge variant="destructive">Unresolved</Badge>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted-foreground">Reason: {item.reason}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No unresolved transactions</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest platform activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions && recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex flex-col gap-2 border-b pb-4 last:border-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">
                              {tx.from_amount} {tx.from_token}
                            </p>
                            <p className="text-sm text-muted-foreground">{tx.merchant?.business_name}</p>
                          </div>
                          <Badge
                            variant={
                              tx.status === "settled"
                                ? "default"
                                : tx.status === "unresolved"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {tx.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p>Chain: {tx.from_chain}</p>
                          <p>Hash: {tx.tx_hash.slice(0, 16)}...</p>
                          <p>{new Date(tx.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No transactions found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
