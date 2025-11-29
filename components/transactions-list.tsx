"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  Search,
  ExternalLink,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Filter,
  ArrowUpDown,
} from "lucide-react"
import { getBlockchainExplorer, getNetworkDisplayName } from "@/lib/blockchain-explorer"

interface TransactionsListProps {
  sessions: any[]
}

export function TransactionsList({ sessions }: TransactionsListProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredSessions = sessions
    .filter((session) => {
      const matchesSearch =
        session.session_id.toLowerCase().includes(search.toLowerCase()) ||
        session.deposit_address?.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "all" || session.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB
    })

  const stats = {
    total: filteredSessions.length,
    completed: filteredSessions.filter((s) => s.status === "completed").length,
    pending: filteredSessions.filter((s) => ["pending", "awaiting_payment", "processing"].includes(s.status)).length,
    failed: filteredSessions.filter((s) => s.status === "failed").length,
    totalVolume: filteredSessions.filter((s) => s.status === "completed").reduce((sum, s) => sum + (s.amount || 0), 0),
  }

  async function handleExport() {
    const csv = [
      ["Session ID", "Amount", "Currency", "Status", "Created At", "Deposit Chain", "Deposit Address", "TX Hash"],
      ...filteredSessions.map((s) => [
        s.session_id,
        s.amount,
        s.currency,
        s.status,
        new Date(s.created_at).toISOString(),
        s.deposit_chain || "N/A",
        s.deposit_address || "N/A",
        s.tx_hash || "N/A",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Completed</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Volume</p>
                <p className="text-lg sm:text-2xl font-bold">
                  ${stats.totalVolume.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">$</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg sm:text-xl">All Transactions</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {filteredSessions.length} transactions found
                </CardDescription>
              </div>
              <Button onClick={handleExport} variant="outline" size="sm" className="w-full sm:w-auto bg-transparent">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by session ID or address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-sm h-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] h-10">
                    <Filter className="h-4 w-4 mr-2 sm:hidden" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="awaiting_payment">Awaiting</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 bg-transparent"
                  onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0 sm:px-6">
          <div className="block lg:hidden space-y-3 px-4 sm:px-0">
            {filteredSessions.map((session) => {
              const network = session.deposit_network || session.deposit_chain?.split("/")[0]
              const explorer = network ? getBlockchainExplorer(network) : null
              const { date, time } = formatDate(session.created_at)

              return (
                <Card key={session.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={session.status} />
                          {session.deposit_chain && (
                            <Badge variant="outline" className="text-[10px] px-1.5">
                              {session.deposit_chain.split("/")[0]}
                            </Badge>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(session.session_id, session.id)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <code className="truncate max-w-[150px]">{session.session_id.substring(0, 16)}...</code>
                          {copiedId === session.id ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-base">${session.amount}</div>
                        <div className="text-[10px] text-muted-foreground">{session.currency}</div>
                      </div>
                    </div>

                    {session.deposit_amount && (
                      <div className="flex items-center justify-between text-xs bg-muted/50 rounded-lg p-2">
                        <span className="text-muted-foreground">Received</span>
                        <span className="font-medium text-green-600">
                          {Number.parseFloat(session.deposit_amount).toFixed(6)} {session.deposit_coin?.toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        <div>{date}</div>
                        <div>{time}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {explorer && (
                          <Button variant="outline" size="sm" className="h-8 px-2 bg-transparent" asChild>
                            <a href={explorer.url} target="_blank" rel="noopener noreferrer">
                              {explorer.icon}
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                          <a href={`/dashboard/transactions/${session.session_id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="hidden lg:block rounded-lg border mx-0 sm:mx-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Session
                    </th>
                    <th className="text-left p-4 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Amount
                    </th>
                    <th className="text-left p-4 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Chain
                    </th>
                    <th className="text-left p-4 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left p-4 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Created
                    </th>
                    <th className="text-right p-4 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session) => {
                    const network = session.deposit_network || session.deposit_chain?.split("/")[0]
                    const explorer = network ? getBlockchainExplorer(network) : null
                    const { date, time } = formatDate(session.created_at)

                    return (
                      <tr key={session.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <button
                            onClick={() => copyToClipboard(session.session_id, session.id)}
                            className="flex items-center gap-2 group"
                          >
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                              {session.session_id.substring(0, 20)}...
                            </code>
                            {copiedId === session.id ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-semibold">${session.amount}</div>
                          <div className="text-xs text-muted-foreground">{session.currency}</div>
                          {session.deposit_amount && (
                            <div className="text-xs text-green-600 font-medium mt-1">
                              {Number.parseFloat(session.deposit_amount).toFixed(6)}{" "}
                              {session.deposit_coin?.toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {session.deposit_chain ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="w-fit">
                                {session.deposit_chain.split("/")[0]}
                              </Badge>
                              {network && (
                                <span className="text-xs text-muted-foreground">{getNetworkDisplayName(network)}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Not set</span>
                          )}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={session.status} />
                        </td>
                        <td className="p-4">
                          <div className="text-sm">{date}</div>
                          <div className="text-xs text-muted-foreground">{time}</div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {explorer && (
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent" asChild>
                                <a
                                  href={explorer.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`View on ${explorer.name}`}
                                >
                                  {explorer.icon}
                                </a>
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                              <a href={`/dashboard/transactions/${session.session_id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {filteredSessions.length === 0 && (
            <div className="text-center py-12 px-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No transactions found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first payment to get started"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; className: string }
  > = {
    pending: {
      variant: "secondary",
      icon: <Clock className="h-3 w-3" />,
      className: "bg-amber-100 text-amber-700 border-amber-200",
    },
    awaiting_payment: {
      variant: "outline",
      icon: <Clock className="h-3 w-3" />,
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    processing: {
      variant: "default",
      icon: <Clock className="h-3 w-3 animate-spin" />,
      className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    completed: {
      variant: "default",
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: "bg-green-100 text-green-700 border-green-200",
    },
    failed: {
      variant: "destructive",
      icon: <XCircle className="h-3 w-3" />,
      className: "bg-red-100 text-red-700 border-red-200",
    },
    expired: {
      variant: "secondary",
      icon: <AlertCircle className="h-3 w-3" />,
      className: "bg-slate-100 text-slate-600 border-slate-200",
    },
  }

  const { icon, className } = config[status] || { icon: null, className: "bg-slate-100 text-slate-600" }

  return (
    <Badge variant="outline" className={`flex items-center gap-1 text-xs ${className}`}>
      {icon}
      <span className="capitalize">{status.replace("_", " ")}</span>
    </Badge>
  )
}
