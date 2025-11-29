"use client"

import { useState, useEffect } from "react"
import { Search, Copy, Check, Activity, Clock, RefreshCw, Box, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"

export function TransactionExplorerClient() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [recentTxs, setRecentTxs] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const mode = "live"
  const [stats, setStats] = useState({ total: 0, last24h: 0, volume: 0 })
  const [autoRefresh, setAutoRefresh] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadRecentTransactions()
    loadStats()

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadRecentTransactions()
        loadStats()
      }, 3000) // Refresh every 3 seconds

      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  async function loadRecentTransactions() {
    try {
      const response = await fetch(`/api/explorer/recent?mode=${mode}&limit=20`)
      const data = await response.json()
      setRecentTxs(data.transactions || [])
    } catch (error) {
      console.error("Failed to load recent transactions:", error)
    }
  }

  async function loadStats() {
    try {
      const response = await fetch(`/api/explorer/stats?mode=${mode}`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Failed to load stats:", error)
    }
  }

  async function handleSearch() {
    if (!query.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(`/api/explorer/search?q=${encodeURIComponent(query)}&mode=${mode}`)
      const data = await response.json()
      setResults(data.transactions || [])

      if (data.transactions?.length === 0) {
        toast({
          title: "No results",
          description: "No transactions found matching your search",
        })
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Failed to search transactions",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 ring-1 ring-slate-200">
        <CardContent className="p-2">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                type="text"
                placeholder="Search by Session ID, Tx Hash, or Wallet Address..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 h-12 text-base border-0 focus-visible:ring-0 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2 px-2">
              <Button onClick={handleSearch} disabled={isSearching} size="lg" className="h-10 px-8 font-medium">
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-200 text-[10px] font-medium text-green-700">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              Live Mainnet Data
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Transactions</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.total.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Box className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">24h Volume</p>
                <h3 className="text-2xl font-bold text-slate-900">${stats.volume.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Latest Block</p>
                <h3 className="text-2xl font-bold text-slate-900">
                  {stats.last24h > 0 ? "Active" : "Waiting"}
                  <span className="text-xs font-normal text-muted-foreground ml-2 block">
                    {stats.last24h} txs in last 24h
                  </span>
                </h3>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 py-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Latest Transactions</CardTitle>
            {autoRefresh && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto-Update" : "Paused"}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {(results.length > 0 ? results : recentTxs).map((tx, index) => (
              <TransactionRow key={tx.id} tx={tx} onCopy={handleCopy} copiedId={copiedId} index={index} />
            ))}

            {results.length === 0 && recentTxs.length === 0 && (
              <div className="text-center py-16">
                <div className="bg-slate-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No transactions found</h3>
                <p className="text-slate-500 mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </CardContent>
        {recentTxs.length > 0 && (
          <div className="p-4 border-t bg-slate-50/50 text-center">
            <Button variant="link" className="text-blue-600">
              View All Transactions <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}

function TransactionRow({ tx, onCopy, copiedId, index }: any) {
  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      awaiting_payment: "bg-blue-50 text-blue-700 border-blue-200",
      detected: "bg-blue-50 text-blue-700 border-blue-200",
      confirming: "bg-purple-50 text-purple-700 border-purple-200",
      confirmed: "bg-indigo-50 text-indigo-700 border-indigo-200",
      processing: "bg-purple-50 text-purple-700 border-purple-200",
      settled: "bg-green-50 text-green-700 border-green-200",
      completed: "bg-green-50 text-green-700 border-green-200",
      failed: "bg-red-50 text-red-700 border-red-200",
      cancelled: "bg-orange-50 text-orange-700 border-orange-200",
      expired: "bg-slate-100 text-slate-700 border-slate-200",
    }
    return colors[status] || "bg-slate-100 text-slate-700 border-slate-200"
  }

  return (
    <div
      className="flex flex-col md:flex-row md:items-center gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
      onClick={() => (window.location.href = `/explorer/tx/${tx.session_id || tx.id}`)}
    >
      <div className="hidden md:flex items-center justify-center w-8 font-mono text-slate-400 text-sm">{index + 1}</div>

      <div className="flex items-center gap-3 md:w-[200px] shrink-0">
        <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white transition-colors border border-slate-200">
          <Box className="h-5 w-5 text-slate-500" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-mono text-sm font-medium text-blue-600 truncate max-w-[120px]">
              {tx.session_id?.slice(0, 12)}...
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-slate-400 hover:text-slate-600"
              onClick={(e) => {
                e.stopPropagation()
                onCopy(tx.session_id || tx.sideshift_id, tx.id)
              }}
            >
              {copiedId === tx.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(tx.created_at))} ago</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 items-center">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">From</span>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm">
              {tx.deposit_amount || tx.from_amount
                ? `${tx.deposit_amount || tx.from_amount} ${tx.deposit_coin || tx.from_token || ""}`
                : `${tx.amount} ${tx.currency}`}
            </span>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground">
              {tx.deposit_chain?.split("/")[0] || "Any Chain"}
            </Badge>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-center">
          <ArrowRight className="h-4 w-4 text-slate-300" />
        </div>

        <div className="flex flex-col md:items-end">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium md:text-right">To</span>
          <div className="flex items-center gap-1.5 md:justify-end">
            <span className="font-medium text-sm">
              {tx.settle_amount || tx.to_amount || "Pending"} {tx.settle_coin || tx.to_token}
            </span>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground">
              {tx.metadata?.settlement_network || tx.settle_chain?.split("/")[0] || "Pending"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="md:w-[140px] shrink-0 flex justify-end">
        <Badge variant="outline" className={`${getStatusColor(tx.status)} capitalize px-3 py-1`}>
          {tx.status.replace("_", " ")}
        </Badge>
      </div>
    </div>
  )
}
