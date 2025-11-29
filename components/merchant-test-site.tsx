"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import PaymentWidget from "@/components/payment-widget"
import { Loader2, ShoppingCart, Wallet, CheckCircle2, TrendingUp, ExternalLink } from "lucide-react"

interface MerchantTestSiteProps {
  secretKey?: string
  businessName: string
}

export function MerchantTestSite({ secretKey, businessName }: MerchantTestSiteProps) {
  const [amount, setAmount] = useState("10")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [balance, setBalance] = useState(0)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [currentPayment, setCurrentPayment] = useState<any>(null)

  useEffect(() => {
    if (!sessionId) return

    let pollCount = 0
    let hasCompleted = false

    const pollStatus = async () => {
      if (hasCompleted) return

      try {
        pollCount++
        const response = await fetch(`/api/widget/status/${sessionId}`)
        const data = await response.json()

        console.log(`[v0] Real-time status update ${pollCount}:`, data.status)

        setCurrentPayment(data)

        if (data.status === "completed" || data.status === "settled") {
          hasCompleted = true
          setPaymentStatus("completed")
          setBalance((prev) => prev + Number.parseFloat(amount))
          setTransactions((prev) => [
            {
              id: sessionId,
              amount: Number.parseFloat(amount),
              status: "completed",
              timestamp: new Date().toISOString(),
              crypto: data.crypto_amount,
              coin: data.deposit_coin,
            },
            ...prev,
          ])

          setTimeout(() => {
            setSessionId(null)
            setCurrentPayment(null)
          }, 3000)

          clearInterval(interval)
        }

        if (data.status === "failed" || data.status === "cancelled" || data.status === "expired") {
          hasCompleted = true
          setPaymentStatus(data.status)
          setTimeout(() => {
            setSessionId(null)
            setCurrentPayment(null)
          }, 3000)
          clearInterval(interval)
        }
      } catch (error) {
        console.error("[v0] Failed to poll status:", error)
      }
    }

    const interval = setInterval(pollStatus, 3000)
    pollStatus() // Initial check

    return () => {
      clearInterval(interval)
      hasCompleted = true
    }
  }, [sessionId, amount])

  const handlePayment = async () => {
    if (!secretKey || !amount) return

    const amountNum = Number.parseFloat(amount)
    if (amountNum < 1 || amountNum > 10) {
      alert("Amount must be between $1 and $10 for safe testing")
      return
    }

    setIsCreating(true)
    setPaymentStatus(null)
    setCurrentPayment(null)

    try {
      console.log("[v0] Creating payment session with amount:", amount)

      const response = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secretKey}`,
        },
        body: JSON.stringify({
          amount: amountNum,
          currency: "USD",
          metadata: { test: true, source: "test_widget" },
        }),
      })

      const data = await response.json()

      console.log("[v0] Payment init response:", data)

      if (data.session_id) {
        console.log("[v0] Payment session created:", data.session_id)
        setSessionId(data.session_id)
      } else if (data.widget_url || data.payment_url) {
        const url = data.widget_url || data.payment_url
        const parts = url.split("/")
        const possibleId = parts[parts.length - 1]
        if (possibleId.startsWith("sess_")) {
          setSessionId(possibleId)
        } else {
          window.location.href = url
        }
      } else {
        console.error("[v0] Invalid response format:", data)
        alert(`Payment initialization failed: ${data.error || "No payment URL received"}`)
      }
    } catch (error) {
      console.error("[v0] Payment initialization failed:", error)
      alert("Failed to initialize payment. Check console for details.")
    } finally {
      setIsCreating(false)
    }
  }

  const primaryColor = "rgb(37, 99, 235)" // blue-600 default

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              Merchant Wallet Balance
            </span>
            <span className="text-3xl font-bold text-green-600">${balance.toFixed(2)}</span>
          </CardTitle>
          <CardDescription>Updates in real-time when payments complete via SideShift</CardDescription>
        </CardHeader>
      </Card>

      {/* Payment Form */}
      <Card className="border-2" style={{ borderColor: primaryColor + "40" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" style={{ color: primaryColor }} />
            {businessName} - Test Checkout
          </CardTitle>
          <CardDescription>This simulates your customer's checkout experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount to Pay (USD) - Max $10</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.00"
                className="text-lg h-12"
                step="0.01"
                min="1"
                max="10"
              />
              <p className="text-xs text-muted-foreground mt-1">Recommended: Start with $1-2 for your first test</p>
            </div>
            <Button
              onClick={handlePayment}
              disabled={
                !secretKey || !amount || isCreating || Number.parseFloat(amount) < 1 || Number.parseFloat(amount) > 10
              }
              className="w-full h-12 text-base"
              size="lg"
              style={{ backgroundColor: primaryColor }}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Pay with Crypto"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {sessionId && currentPayment && (
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                Payment Status: {currentPayment.status}
              </span>
              {paymentStatus === "completed" && (
                <span className="flex items-center gap-2 text-green-600 text-sm animate-in fade-in slide-in-from-right">
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmed!
                </span>
              )}
            </CardTitle>
            <CardDescription>Updates every 3 seconds - Real SideShift payment tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-semibold capitalize">{currentPayment.status}</p>
              </div>
              {currentPayment.deposit_coin && (
                <div>
                  <p className="text-muted-foreground">Crypto</p>
                  <p className="font-semibold">{currentPayment.deposit_coin.toUpperCase()}</p>
                </div>
              )}
              {currentPayment.crypto_amount && (
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold">
                    {currentPayment.crypto_amount} {currentPayment.deposit_coin?.toUpperCase()}
                  </p>
                </div>
              )}
              {currentPayment.deposit_address && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Deposit Address</p>
                  <p className="font-mono text-xs break-all">{currentPayment.deposit_address}</p>
                </div>
              )}
            </div>

            <a
              href={`/widget/${sessionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Open widget in new tab
            </a>
          </CardContent>
        </Card>
      )}

      {/* Widget Display */}
      {sessionId && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">CloaxPay Payment Widget</CardTitle>
            <CardDescription>This is the embedded payment widget your customers will see</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentWidget sessionId={sessionId} />
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Transaction History
            </CardTitle>
            <CardDescription>Recent confirmed payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-mono text-muted-foreground">{tx.id.substring(0, 20)}...</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.timestamp).toLocaleString()}</p>
                    {tx.crypto && tx.coin && (
                      <p className="text-xs text-muted-foreground">
                        {tx.crypto} {tx.coin.toUpperCase()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">${tx.amount.toFixed(2)}</p>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{tx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
