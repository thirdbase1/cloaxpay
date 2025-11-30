"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Info, ExternalLink } from "lucide-react"

const MAX_TRY_AMOUNT = 10

export default function TryWidgetPage() {
  const [amount, setAmount] = useState("2")
  const [loading, setLoading] = useState(false)
  const [widgetUrl, setWidgetUrl] = useState("")
  const [showWarning, setShowWarning] = useState(true)
  const [apiKey, setApiKey] = useState("")
  const [loadingKey, setLoadingKey] = useState(true)

  useEffect(() => {
    // Fetch merchant's API key
    async function fetchApiKey() {
      try {
        const response = await fetch("/api/keys/list")
        const data = await response.json()

        const secretKey = data.keys?.find((k: any) => k.key_type === "secret" && !k.revoked_at)

        if (secretKey) {
          setApiKey(secretKey.key_value)
        } else {
          // No keys found - user needs to create one
          setApiKey("")
        }
      } catch (error) {
        console.error("[v0] Failed to fetch API keys:", error)
      } finally {
        setLoadingKey(false)
      }
    }

    fetchApiKey()
  }, [])

  const handleTry = async () => {
    if (!apiKey) {
      alert("Please create an API key first")
      return
    }

    const numAmount = Number.parseFloat(amount)

    if (numAmount > MAX_TRY_AMOUNT) {
      alert(`For safety, try amounts are limited to $${MAX_TRY_AMOUNT}. This helps developers test without risk.`)
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          amount: numAmount,
          currency: "USD",
          successUrl: `${window.location.origin}/dashboard/try-widget?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/try-widget`,
        }),
      })

      const data = await response.json()

      if (data.widget_url) {
        setWidgetUrl(data.widget_url)
        window.open(data.widget_url, "_blank")
      } else if (data.error) {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("[v0] Try widget error:", error)
      alert("Failed to create payment")
    } finally {
      setLoading(false)
    }
  }

  if (loadingKey) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!apiKey) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Try Payment Widget</CardTitle>
            <CardDescription>Create an API key first to test the payment flow</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Please create an API key in the{" "}
                <a href="/dashboard/api-keys" className="underline font-semibold">
                  API Keys page
                </a>{" "}
                first.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              CP
            </div>
            Try Payment Widget
          </CardTitle>
          <CardDescription>Test the live payment flow before integrating into your site</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showWarning && (
            <Alert className="border-amber-500 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <strong>IMPORTANT:</strong> This uses REAL cryptocurrency with SideShift's live API. SideShift has no
                sandbox environment. Transactions will:
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  <li>Use real blockchain networks</li>
                  <li>Incur real network fees</li>
                  <li>Be limited to ${MAX_TRY_AMOUNT} maximum for safety</li>
                  <li>Settle to your actual settlement wallet</li>
                </ul>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-auto p-0 text-amber-700 underline"
                  onClick={() => setShowWarning(false)}
                >
                  I understand, continue
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              We recommend starting with $1-2 for your first try. Once you verify the flow works, you can test with
              slightly larger amounts (up to ${MAX_TRY_AMOUNT}). Your branding and customization from Settings will
              appear in the widget.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              max={MAX_TRY_AMOUNT}
              step="0.01"
              value={amount}
              onChange={(e) => {
                const val = Number.parseFloat(e.target.value)
                if (val > MAX_TRY_AMOUNT) {
                  alert(`Try mode limited to $${MAX_TRY_AMOUNT} for safety`)
                  setAmount(MAX_TRY_AMOUNT.toString())
                } else {
                  setAmount(e.target.value)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Maximum ${MAX_TRY_AMOUNT} to keep testing safe. Recommended: $1-2 for initial tries.
            </p>
          </div>

          <Button
            onClick={handleTry}
            disabled={loading || Number.parseFloat(amount) > MAX_TRY_AMOUNT || !apiKey}
            className="w-full"
            size="lg"
          >
            {loading ? "Opening Payment Widget..." : "Try Payment Widget"}
          </Button>

          {widgetUrl && (
            <Alert>
              <AlertDescription className="flex items-center justify-between">
                <span>Widget opened in new tab</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(widgetUrl, "_blank")}
                  className="h-auto p-1"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Using API Key:</strong>{" "}
              <code className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{apiKey.substring(0, 20)}...</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
