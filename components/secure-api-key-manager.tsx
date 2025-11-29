"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Eye, Copy, Key, Shield, AlertTriangle, Clock, CheckCircle2, WalletIcon } from "lucide-react"
import Link from "next/link"

interface ApiKey {
  id: string
  key_type: string
  is_live: boolean
  created_at: string
  last_used_at?: string
}

interface SecureApiKeyManagerProps {
  merchantId: string
  existingKeys: ApiKey[]
  hasWallets: boolean
}

export function SecureApiKeyManager({ merchantId, existingKeys, hasWallets }: SecureApiKeyManagerProps) {
  const [keyType, setKeyType] = useState<"public" | "secret">("secret")
  const [loading, setLoading] = useState(false)
  const [generatedKeys, setGeneratedKeys] = useState<{ public_key: string; secret_key: string } | null>(null)
  const [viewingKeyId, setViewingKeyId] = useState<string | null>(null)
  const [viewPassword, setViewPassword] = useState("")
  const [viewedKey, setViewedKey] = useState<string | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [generatePassword, setGeneratePassword] = useState("")
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  function initiateGenerate() {
    if (!hasWallets) {
      toast({
        title: "⚠️ Wallet Required",
        description: "Add a settlement wallet in Settings before generating API keys",
        variant: "destructive",
      })
      return
    }

    setShowPasswordDialog(true)
    setGeneratePassword("")
    setError(null)
  }

  async function generateKey() {
    if (!generatePassword) {
      toast({
        title: "Password Required",
        description: "Enter your password to generate new API keys",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setGeneratedKeys(null)
    setError(null)

    try {
      const response = await fetch("/api/keys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: generatePassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || "Failed to generate keys"
        setError(errorMessage)
        throw new Error(errorMessage)
      }

      if (data.success && data.public_key && data.secret_key) {
        setGeneratedKeys({
          public_key: data.public_key,
          secret_key: data.secret_key,
        })
        setShowPasswordDialog(false)
        setGeneratePassword("")

        toast({
          title: "✅ Keys Generated Successfully",
          description: "Copy and save both keys securely now. You won't see them again without password verification.",
        })

        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        throw new Error(data.error || "Invalid response from server")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate API keys"
      setError(errorMessage)
      console.error("[v0] Key generation error:", error)
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function viewKey(keyId: string) {
    if (!viewPassword) {
      toast({
        title: "Password Required",
        description: "Enter your password to view this key",
        variant: "destructive",
      })
      return
    }

    setViewLoading(true)
    try {
      const response = await fetch("/api/keys/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key_id: keyId,
          password: viewPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Invalid password or key not found")
      }

      setViewedKey(data.key_value)
      toast({
        title: "✅ Key Retrieved",
        description: "Key will be hidden again when you close this dialog",
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Failed to retrieve key",
        variant: "destructive",
      })
    } finally {
      setViewLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast({
      title: "✅ Copied",
      description: "API key copied to clipboard",
    })
  }

  function closeViewDialog() {
    setViewingKeyId(null)
    setViewPassword("")
    setViewedKey(null)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {!hasWallets && (
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-background dark:border-orange-800">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-orange-900 dark:text-orange-200">
              <WalletIcon className="h-5 w-5" />
              Settlement Wallet Required
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Add your wallet address before generating API keys
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <Alert className="bg-white dark:bg-background border-orange-300 dark:border-orange-700">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-xs sm:text-sm">
                <p className="font-semibold mb-2">Why is a wallet required?</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Your wallet receives all payment settlements</li>
                  <li>Prevents generating keys without a way to receive funds</li>
                  <li>Ensures your payment system is production-ready</li>
                </ul>
              </AlertDescription>
            </Alert>
            <Link href="/dashboard/settings">
              <Button className="w-full" size="lg">
                <WalletIcon className="mr-2 h-4 w-4" />
                Go to Settings & Add Wallet
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background dark:border-blue-800">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Key className="h-4 w-4 sm:h-5 sm:w-5" />
            Generate API Keys
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Generates both Public Key (pk) and Secret Key (sk) together
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
          <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-900 dark:text-orange-200 text-xs sm:text-sm">
              <strong>Security Policy:</strong> Generating new keys instantly invalidates all previous keys to prevent
              unauthorized access.
            </AlertDescription>
          </Alert>

          {generatedKeys && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription>
                <div className="space-y-3 sm:space-y-4">
                  <p className="text-xs sm:text-sm font-bold text-green-900 dark:text-green-200 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    API Keys Generated Successfully - Copy Them Now!
                  </p>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">
                        Public Key (pk) - Safe for client-side:
                      </p>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white dark:bg-background p-2 sm:p-3 rounded border-2 border-green-300 dark:border-green-700">
                        <code className="text-[10px] sm:text-xs break-all flex-1 font-mono font-bold text-green-900 dark:text-green-200">
                          {generatedKeys.public_key}
                        </code>
                        <Button
                          size="sm"
                          onClick={() => copyToClipboard(generatedKeys.public_key)}
                          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                        >
                          <Copy className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                          <span className="sm:inline">Copy</span>
                        </Button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-red-800 dark:text-red-300 mb-1">
                        Secret Key (sk) - Server-side ONLY, never expose:
                      </p>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white dark:bg-background p-2 sm:p-3 rounded border-2 border-red-300 dark:border-red-700">
                        <code className="text-[10px] sm:text-xs break-all flex-1 font-mono font-bold text-red-900 dark:text-red-200">
                          {generatedKeys.secret_key}
                        </code>
                        <Button
                          size="sm"
                          onClick={() => copyToClipboard(generatedKeys.secret_key)}
                          className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                        >
                          <Copy className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                          <span className="sm:inline">Copy</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] sm:text-xs text-green-800 dark:text-green-300 font-semibold">
                    ⚠️ IMPORTANT: These keys will only be shown once. To view them again, you'll need password
                    authentication.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogTrigger asChild>
              <Button onClick={initiateGenerate} disabled={loading || !hasWallets} className="w-full" size="lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Keys...
                  </>
                ) : !hasWallets ? (
                  <>
                    <WalletIcon className="mr-2 h-4 w-4" />
                    Add Wallet First
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Generate API Keys
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">Confirm Key Generation</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Enter your password to generate new API keys
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800">
                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <AlertDescription className="text-orange-900 dark:text-orange-200 text-xs">
                    Generating new keys will immediately revoke all existing keys.
                  </AlertDescription>
                </Alert>

                {error && (
                  <Alert className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-900 dark:text-red-200 text-xs">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="gen-password" className="text-xs sm:text-sm">
                    Your Password
                  </Label>
                  <Input
                    id="gen-password"
                    type="password"
                    value={generatePassword}
                    onChange={(e) => setGeneratePassword(e.target.value)}
                    placeholder="Enter your password"
                    onKeyDown={(e) => e.key === "Enter" && generateKey()}
                    className="text-sm"
                    autoFocus
                  />
                </div>
                <Button onClick={generateKey} disabled={loading || !generatePassword} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Confirm & Generate Keys"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Your API Keys</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Password authentication required to view full keys
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {existingKeys.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {existingKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-muted/30 gap-3"
                >
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {key.key_type === "public" ? "Public Key" : "Secret Key"}
                      </Badge>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Created {new Date(key.created_at).toLocaleDateString()}{" "}
                      {new Date(key.created_at).toLocaleTimeString()}
                    </p>
                    {key.last_used_at && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        Last used {new Date(key.last_used_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <Dialog open={viewingKeyId === key.id} onOpenChange={(open) => !open && closeViewDialog()}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingKeyId(key.id)}
                        className="w-full sm:w-auto"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        View Key
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg">View API Key</DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">
                          Enter your account password to view this key
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {!viewedKey ? (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="password" className="text-xs sm:text-sm">
                                Your Password
                              </Label>
                              <Input
                                id="password"
                                type="password"
                                value={viewPassword}
                                onChange={(e) => setViewPassword(e.target.value)}
                                placeholder="Enter your password"
                                onKeyDown={(e) => e.key === "Enter" && viewKey(key.id)}
                                className="text-sm"
                                autoFocus
                              />
                            </div>
                            <Button
                              onClick={() => viewKey(key.id)}
                              disabled={viewLoading || !viewPassword}
                              className="w-full"
                            >
                              {viewLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                "View Key"
                              )}
                            </Button>
                          </>
                        ) : (
                          <div className="space-y-3">
                            <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
                              <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <AlertDescription>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
                                  <code className="text-[10px] sm:text-xs break-all flex-1 font-mono bg-white dark:bg-background p-2 rounded border">
                                    {viewedKey}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(viewedKey)}
                                    className="w-full sm:w-auto"
                                  >
                                    <Copy className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                                    <span className="sm:inline">Copy</span>
                                  </Button>
                                </div>
                              </AlertDescription>
                            </Alert>
                            <Button variant="outline" onClick={closeViewDialog} className="w-full bg-transparent">
                              Close
                            </Button>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">
              {hasWallets
                ? "No API keys generated yet. Create your first keys above."
                : "Add a settlement wallet first, then generate your API keys."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
