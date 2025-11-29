"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2, Search } from 'lucide-react'

export default function ApiKeyDebugPage() {
  const [apiKey, setApiKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function checkKey() {
    if (!apiKey) return
    
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch("/api/debug/check-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey }),
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: "Failed to check key" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Key Debugger</h1>
        <p className="text-muted-foreground">
          Diagnose issues with merchant API keys. This tool checks the database directly.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Validate API Key</CardTitle>
          <CardDescription>
            Enter the full API key (starting with sk_live_ or sk_test_) to check its status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="api-key" className="sr-only">API Key</Label>
              <Input
                id="api-key"
                placeholder="sk_live_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono"
              />
            </div>
            <Button onClick={checkKey} disabled={loading || !apiKey}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Check Key
            </Button>
          </div>

          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <Alert variant={result.valid ? "default" : "destructive"} className={result.valid ? "border-green-500 bg-green-50" : ""}>
                {result.valid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertTitle className={result.valid ? "text-green-800" : ""}>
                  {result.valid ? "Valid API Key" : "Invalid API Key"}
                </AlertTitle>
                <AlertDescription className={result.valid ? "text-green-700" : ""}>
                  {result.message}
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">Key Details</h3>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt>Format Check:</dt>
                      <dd className={result.format_valid ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {result.format_valid ? "Pass" : "Fail"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Prefix:</dt>
                      <dd className="font-mono">{result.prefix || "N/A"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Environment:</dt>
                      <dd className="font-mono">{result.environment || "N/A"}</dd>
                    </div>
                  </dl>
                </div>

                {result.db_record && (
                  <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground">Database Record</h3>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt>Found:</dt>
                        <dd className="text-green-600 font-medium">Yes</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Revoked:</dt>
                        <dd className={result.db_record.revoked ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                          {result.db_record.revoked ? "Yes" : "No"}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Merchant ID:</dt>
                        <dd className="font-mono text-xs truncate max-w-[100px]" title={result.db_record.merchant_id}>
                          {result.db_record.merchant_id}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Created:</dt>
                        <dd className="text-xs">
                          {new Date(result.db_record.created_at).toLocaleDateString()}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
