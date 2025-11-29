"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  DollarSign,
  Activity,
  Clock,
  Wallet,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Timer,
  Globe,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"

interface UnifiedDashboardProps {
  merchant: any
  sessions: any[]
  events: any[]
  transactions: any[]
}

export function UnifiedDashboard({ merchant, sessions, events, transactions }: UnifiedDashboardProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d")

  // Filter sessions by time range
  const filteredSessions = useMemo(() => {
    if (timeRange === "all") return sessions
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return sessions.filter((s) => new Date(s.created_at) >= cutoff)
  }, [sessions, timeRange])

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    const completedSessions = filteredSessions.filter((s) => s.status === "completed")
    const pendingSessions = filteredSessions.filter((s) =>
      ["pending", "awaiting_payment", "processing", "confirming"].includes(s.status),
    )
    const failedSessions = filteredSessions.filter((s) => s.status === "failed")
    const expiredSessions = filteredSessions.filter((s) => s.status === "expired")

    const totalRevenue = completedSessions.reduce((sum, s) => sum + (s.amount || 0), 0)
    const conversionRate = filteredSessions.length > 0 ? (completedSessions.length / filteredSessions.length) * 100 : 0

    // Calculate average transaction value
    const avgTransactionValue = completedSessions.length > 0 ? totalRevenue / completedSessions.length : 0

    // Calculate average confirmation time
    const confirmedTxs = transactions.filter((t) => t.confirmed_at && t.created_at)
    const avgConfirmTime =
      confirmedTxs.length > 0
        ? confirmedTxs.reduce((sum, t) => {
            const diff = new Date(t.confirmed_at).getTime() - new Date(t.created_at).getTime()
            return sum + diff
          }, 0) /
          confirmedTxs.length /
          1000 /
          60
        : 0

    // Get unique chains used
    const uniqueChains = new Set(filteredSessions.map((s) => s.deposit_chain?.split("/")[0]).filter(Boolean))

    // Today's stats
    const today = new Date().toISOString().split("T")[0]
    const todaySessions = filteredSessions.filter((s) => s.created_at.split("T")[0] === today)
    const todayCompleted = todaySessions.filter((s) => s.status === "completed")
    const todayRevenue = todayCompleted.reduce((sum, s) => sum + (s.amount || 0), 0)

    return {
      totalSessions: filteredSessions.length,
      completedSessions: completedSessions.length,
      pendingSessions: pendingSessions.length,
      failedSessions: failedSessions.length,
      expiredSessions: expiredSessions.length,
      totalRevenue,
      conversionRate,
      avgTransactionValue,
      avgConfirmTime: Math.round(avgConfirmTime),
      uniqueChains: uniqueChains.size,
      todaySessions: todaySessions.length,
      todayCompleted: todayCompleted.length,
      todayRevenue,
    }
  }, [filteredSessions, transactions])

  // Daily volume chart data
  const dailyVolumeData = useMemo(() => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365
    const data: any[] = []

    for (let i = Math.min(days, 30) - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      const daySessions = filteredSessions.filter((s) => s.created_at.split("T")[0] === dateStr)
      const completed = daySessions.filter((s) => s.status === "completed")
      const revenue = completed.reduce((sum, s) => sum + (s.amount || 0), 0)

      data.push({
        date: dateStr,
        displayDate: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        sessions: daySessions.length,
        completed: completed.length,
        failed: daySessions.filter((s) => s.status === "failed").length,
        revenue,
      })
    }

    return data
  }, [filteredSessions, timeRange])

  // Chain distribution
  const chainDistribution = useMemo(() => {
    const chains: Record<string, { count: number; revenue: number }> = {}

    filteredSessions.forEach((s) => {
      if (s.deposit_chain) {
        const chain = s.deposit_chain.split("/")[0]
        if (!chains[chain]) chains[chain] = { count: 0, revenue: 0 }
        chains[chain].count += 1
        if (s.status === "completed") chains[chain].revenue += s.amount || 0
      }
    })

    return Object.entries(chains)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
  }, [filteredSessions])

  // Status distribution
  const statusDistribution = useMemo(() => {
    return [
      { name: "Completed", value: metrics.completedSessions, color: "#22c55e" },
      { name: "Pending", value: metrics.pendingSessions, color: "#3b82f6" },
      { name: "Failed", value: metrics.failedSessions, color: "#ef4444" },
      { name: "Expired", value: metrics.expiredSessions, color: "#94a3b8" },
    ].filter((s) => s.value > 0)
  }, [metrics])

  // Conversion funnel
  const conversionFunnel = useMemo(() => {
    const widgetOpens = filteredSessions.length
    const addressCopied = events.filter((e) => e.event_type === "copy_address").length
    const markedPaid = events.filter((e) => e.event_type === "marked_paid").length
    const completed = metrics.completedSessions

    return [
      { stage: "Payment Initiated", count: widgetOpens, percentage: 100 },
      {
        stage: "Address Copied",
        count: addressCopied,
        percentage: widgetOpens > 0 ? (addressCopied / widgetOpens) * 100 : 0,
      },
      {
        stage: "Marked as Paid",
        count: markedPaid,
        percentage: widgetOpens > 0 ? (markedPaid / widgetOpens) * 100 : 0,
      },
      { stage: "Confirmed", count: completed, percentage: widgetOpens > 0 ? (completed / widgetOpens) * 100 : 0 },
    ]
  }, [filteredSessions, events, metrics])

  // Recent transactions (last 10)
  const recentTransactions = sessions.slice(0, 10)

  const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500">
            Welcome back, <span className="font-semibold text-slate-700">{merchant?.business_name || "Merchant"}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-[140px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/dashboard/try-widget">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Create Payment <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={`$${metrics.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`$${metrics.todayRevenue.toFixed(2)} today`}
          icon={<DollarSign className="h-5 w-5" />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <MetricCard
          title="Total Transactions"
          value={metrics.totalSessions.toLocaleString()}
          subtitle={`${metrics.todaySessions} today`}
          icon={<Activity className="h-5 w-5" />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Success Rate"
          value={`${metrics.conversionRate.toFixed(1)}%`}
          subtitle={`${metrics.completedSessions} completed`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <MetricCard
          title="Avg. Confirm Time"
          value={metrics.avgConfirmTime > 0 ? `${metrics.avgConfirmTime}m` : "N/A"}
          subtitle="Block confirmation"
          icon={<Clock className="h-5 w-5" />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{metrics.pendingSessions}</p>
              </div>
              <Timer className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Failed</p>
                <p className="text-2xl font-bold text-red-600">{metrics.failedSessions}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Avg. Value</p>
                <p className="text-2xl font-bold text-slate-800">${metrics.avgTransactionValue.toFixed(2)}</p>
              </div>
              <Wallet className="h-8 w-8 text-slate-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Chains Used</p>
                <p className="text-2xl font-bold text-cyan-600">{metrics.uniqueChains}</p>
              </div>
              <Globe className="h-8 w-8 text-cyan-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue & Volume Chart - Takes 2 columns */}
        <Card className="lg:col-span-2 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Revenue & Volume</CardTitle>
            <CardDescription>Daily transaction volume and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyVolumeData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  fill="url(#colorRevenue)"
                  name="Revenue ($)"
                  strokeWidth={2}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="sessions"
                  stroke="#22c55e"
                  fill="url(#colorSessions)"
                  name="Transactions"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Status Breakdown</CardTitle>
            <CardDescription>Transaction status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {statusDistribution.map((status, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                        <span>{status.name}</span>
                      </div>
                      <span className="font-medium">{status.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-slate-400">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chain Distribution & Funnel */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chain Distribution */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Chain Distribution</CardTitle>
            <CardDescription>Payment volume by blockchain network</CardDescription>
          </CardHeader>
          <CardContent>
            {chainDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chainDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Transactions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">No chain data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Conversion Funnel</CardTitle>
            <CardDescription>User journey from payment to confirmation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conversionFunnel.map((stage, index) => (
                <div key={index} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{stage.stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{stage.count}</span>
                      <Badge variant="outline" className="text-xs">
                        {stage.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg transition-all duration-500"
                      style={{
                        width: `${stage.percentage}%`,
                        backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <CardDescription>Latest payment activity</CardDescription>
            </div>
            <Link href="/dashboard/transactions">
              <Button variant="outline" size="sm">
                View All <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-slate-50/50">
                <tr>
                  <th className="text-left p-3 font-medium text-sm text-slate-600">Session</th>
                  <th className="text-left p-3 font-medium text-sm text-slate-600">Amount</th>
                  <th className="text-left p-3 font-medium text-sm text-slate-600">Chain</th>
                  <th className="text-left p-3 font-medium text-sm text-slate-600">Status</th>
                  <th className="text-left p-3 font-medium text-sm text-slate-600">Time</th>
                  <th className="text-right p-3 font-medium text-sm text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((session) => {
                  const network = session.deposit_network || session.deposit_chain?.split("/")[0]
                  return (
                    <tr key={session.id} className="border-b last:border-0 hover:bg-slate-50/50">
                      <td className="p-3">
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                          {session.session_id.substring(0, 16)}...
                        </code>
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-semibold">${session.amount?.toFixed(2) || "0.00"}</div>
                        {session.deposit_amount && (
                          <div className="text-xs text-slate-500">
                            {Number.parseFloat(session.deposit_amount).toFixed(6)} {session.deposit_coin?.toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {network ? (
                          <Badge variant="outline" className="text-xs">
                            {network}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={session.status} />
                      </td>
                      <td className="p-3 text-sm text-slate-500">{formatTimeAgo(session.created_at)}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/dashboard/transactions/${session.session_id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {recentTransactions.length === 0 && (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No transactions yet</p>
              <p className="text-sm text-slate-400">Create your first payment to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
}) {
  return (
    <Card className="bg-white">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs md:text-sm text-slate-500 uppercase tracking-wide">{title}</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900">{value}</p>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
          <div className={`p-2 md:p-3 rounded-lg ${iconBg} ${iconColor}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
    pending: { variant: "secondary", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
    awaiting_payment: { variant: "outline", className: "border-blue-200 text-blue-600" },
    processing: { variant: "default", className: "bg-blue-500" },
    confirming: { variant: "default", className: "bg-blue-500" },
    completed: { variant: "default", className: "bg-green-500 hover:bg-green-500" },
    failed: { variant: "destructive", className: "" },
    expired: { variant: "secondary", className: "bg-slate-100 text-slate-500" },
  }

  const { variant, className } = config[status] || { variant: "secondary", className: "" }

  return (
    <Badge variant={variant} className={`text-xs capitalize ${className}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  )
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "Just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}
