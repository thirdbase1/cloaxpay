"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  WalletIcon,
  Globe,
  SettingsIcon,
  RefreshCw,
  Eye,
  EyeOff,
  RotateCcw,
  Search,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"

interface MerchantSettings {
  business_name: string
  webhook_url: string
  webhook_secret?: string
  success_url: string
  cancel_url: string
  preferred_token: string
  settlement_tokens: SettlementToken[]
  accept_any_chain: boolean
  auto_gas_coverage: boolean
  notification_webhook_enabled: boolean
  notification_daily_summary: boolean
}

interface SettlementToken {
  symbol: string
  network: string
  enabled: boolean
}

interface AvailableToken {
  coin: string
  network: string
  name: string
  hasMemo?: boolean
}

interface MerchantWallet {
  id: string
  chain: string
  address: string
  token?: string
  network?: string
  is_primary: boolean
}

interface WebhookLog {
  id: string
  event_type: string
  url: string
  status_code: number
  success: boolean
  created_at: string
  response_body: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<MerchantSettings>({
    business_name: "",
    webhook_url: "",
    webhook_secret: "",
    success_url: "",
    cancel_url: "",
    preferred_token: "USDC",
    settlement_tokens: [{ symbol: "USDC", network: "ethereum", enabled: true }],
    accept_any_chain: true,
    auto_gas_coverage: false,
    notification_webhook_enabled: false,
    notification_daily_summary: false,
  })
  const [wallets, setWallets] = useState<MerchantWallet[]>([])
  const [newWallet, setNewWallet] = useState({ chain: "", address: "", token: "", network: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const [walletValidation, setWalletValidation] = useState<{ valid: boolean; network: string } | null>(null)
  const [tokenSearch, setTokenSearch] = useState("")
  const [availableTokens, setAvailableTokens] = useState<AvailableToken[]>([])
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [showSecret, setShowSecret] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([])
  const [resendingLogId, setResendingLogId] = useState<string | null>(null)
  const [addingWallet, setAddingWallet] = useState(false)
  const [removingWallet, setRemovingWallet] = useState(false)

  useEffect(() => {
    loadSettings()
    loadWallets()
    loadAvailableTokens()
  }, [])

  useEffect(() => {
    if (activeTab === "webhooks") {
      loadWebhookLogs()
    }
  }, [activeTab])

  async function loadSettings() {
    try {
      const response = await fetch("/api/merchant/settings")
      const data = await response.json()
      if (data.success) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
    } finally {
      setLoading(false)
    }
  }

  async function loadWallets() {
    try {
      const response = await fetch("/api/merchant/wallets")
      const data = await response.json()

      if (data.success) {
        setWallets(data.wallets)
      }
    } catch (error) {
      console.error("Failed to load wallets:", error)
    }
  }

  async function loadAvailableTokens() {
    setLoadingTokens(true)
    try {
      const response = await fetch("/api/chains/supported")
      const data = await response.json()
      if (data.success && Array.isArray(data.chains)) {
        setAvailableTokens(data.chains)
      } else {
        throw new Error("Invalid data format")
      }
    } catch (error) {
      console.error("Failed to load available tokens:", error)
      // Fallback tokens
      setAvailableTokens([
        { coin: "USDC", network: "ethereum", name: "USDC (Ethereum)" },
        { coin: "USDC", network: "base", name: "USDC (Base)" },
        { coin: "USDC", network: "solana", name: "USDC (Solana)" },
        { coin: "USDT", network: "ethereum", name: "USDT (Ethereum)" },
        { coin: "USDT", network: "tron", name: "USDT (Tron)" },
        { coin: "ETH", network: "ethereum", name: "Ethereum" },
        { coin: "BTC", network: "bitcoin", name: "Bitcoin" },
        { coin: "SOL", network: "solana", name: "Solana" },
      ])
    } finally {
      setLoadingTokens(false)
    }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      const response = await fetch("/api/merchant/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Settings saved!",
          description: "Your preferences have been updated successfully.",
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function addWallet() {
    if (!newWallet.token || !newWallet.network || !newWallet.address) {
      toast({
        title: "Error",
        description: "Please select a token and enter your wallet address",
        variant: "destructive",
      })
      return
    }

    setAddingWallet(true)
    try {
      const response = await fetch("/api/merchant/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chain: newWallet.network,
          address: newWallet.address,
          token: newWallet.token,
          network: newWallet.network,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setWallets([...wallets, data.wallet])
        setNewWallet({ chain: "", address: "", token: "", network: "" })
        setWalletValidation(null)
        setTokenSearch("")
        toast({
          title: "Wallet added!",
          description: `You will now receive ${newWallet.token} on ${newWallet.network}`,
        })
      } else {
        throw new Error(data.error || "Failed to add wallet")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add wallet",
        variant: "destructive",
      })
    } finally {
      setAddingWallet(false)
    }
  }

  async function removeWallet(id: string) {
    setRemovingWallet(true)
    try {
      const response = await fetch(`/api/merchant/wallets/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        setWallets(wallets.filter((w) => w.id !== id))
        toast({
          title: "Wallet removed",
          description: "You can now add a different wallet.",
        })
      } else {
        throw new Error(data.error || "Failed to remove wallet")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove wallet",
        variant: "destructive",
      })
    } finally {
      setRemovingWallet(false)
    }
  }

  // Address validation effect
  useEffect(() => {
    if (!newWallet.address) {
      setWalletValidation(null)
      return
    }

    const detectNetwork = () => {
      const address = newWallet.address.trim()

      if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
        setWalletValidation({ valid: true, network: "EVM (Ethereum/BSC/Polygon/Base...)" })
        return
      }

      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
        setWalletValidation({ valid: true, network: "Solana" })
        return
      }

      if (/^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address)) {
        setWalletValidation({ valid: true, network: "Bitcoin" })
        return
      }

      if (/^T[A-Za-z0-9]{33}$/.test(address)) {
        setWalletValidation({ valid: true, network: "Tron" })
        return
      }

      if (/^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(address)) {
        setWalletValidation({ valid: true, network: "Litecoin" })
        return
      }

      setWalletValidation({ valid: false, network: "Unknown" })
    }

    const debounce = setTimeout(detectNetwork, 300)
    return () => clearTimeout(debounce)
  }, [newWallet.address])

  async function loadWebhookLogs() {
    try {
      const response = await fetch("/api/merchant/webhook/logs")
      const data = await response.json()
      if (data.logs) {
        setWebhookLogs(data.logs)
      }
    } catch (error) {
      console.error("Failed to load webhook logs:", error)
    }
  }

  async function resendWebhook(logId: string) {
    setResendingLogId(logId)
    try {
      const response = await fetch("/api/merchant/webhook/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId }),
      })
      const data = await response.json()
      if (data.success) {
        toast({
          title: "Webhook resent",
          description: "The webhook has been triggered again.",
        })
        loadWebhookLogs()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend webhook",
        variant: "destructive",
      })
    } finally {
      setResendingLogId(null)
    }
  }

  const filteredTokens = availableTokens.filter((token) => {
    if (!tokenSearch) return true
    const searchLower = tokenSearch.toLowerCase()
    return (
      token.coin.toLowerCase().includes(searchLower) ||
      token.name.toLowerCase().includes(searchLower) ||
      token.network.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto py-4 md:py-8 px-4">
      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 shrink-0 space-y-2 md:space-y-1">
          <div className="mb-4 md:mb-6 px-2">
            <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Manage your account</p>
          </div>

          <nav className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            <Button
              variant={activeTab === "general" ? "secondary" : "ghost"}
              className="justify-start whitespace-nowrap shrink-0"
              size="sm"
              onClick={() => setActiveTab("general")}
            >
              <SettingsIcon className="mr-2 h-4 w-4" /> General
            </Button>
            <Button
              variant={activeTab === "wallets" ? "secondary" : "ghost"}
              className="justify-start whitespace-nowrap shrink-0"
              size="sm"
              onClick={() => setActiveTab("wallets")}
            >
              <WalletIcon className="mr-2 h-4 w-4" /> Wallets
            </Button>
            <Button
              variant={activeTab === "webhooks" ? "secondary" : "ghost"}
              className="justify-start whitespace-nowrap shrink-0"
              size="sm"
              onClick={() => setActiveTab("webhooks")}
            >
              <Globe className="mr-2 h-4 w-4" /> Webhooks
            </Button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-4 md:space-y-6">
          {activeTab === "general" && (
            <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card>
                <CardHeader>
                  <CardTitle>Business Profile</CardTitle>
                  <CardDescription>Your public business information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Business Name</Label>
                    <Input
                      id="business_name"
                      value={settings.business_name}
                      onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                      placeholder="Acme Corp"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="success_url">Success URL (Callback)</Label>
                      <Input
                        id="success_url"
                        value={settings.success_url || ""}
                        onChange={(e) => setSettings({ ...settings, success_url: e.target.value })}
                        placeholder="https://your-site.com/success"
                        className="font-mono text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground">Where to redirect users after payment.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cancel_url">Cancel URL</Label>
                      <Input
                        id="cancel_url"
                        value={settings.cancel_url || ""}
                        onChange={(e) => setSettings({ ...settings, cancel_url: e.target.value })}
                        placeholder="https://your-site.com/cancel"
                        className="font-mono text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground">Where to redirect users if they cancel.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "wallets" && (
            <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Info Alert */}
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>How It Works:</strong> Choose ANY token from SideShift to receive payments. Users can deposit
                  any cryptocurrency and SideShift will convert it to your chosen token automatically.
                  <br />
                  <span className="text-xs text-blue-600 mt-1 block">
                    You can only accept payments to one wallet at a time. Remove current wallet to add a new one.
                  </span>
                </AlertDescription>
              </Alert>

              {/* Current Active Wallet */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Active Settlement Wallet</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    This is where all payments will be received
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {wallets.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed rounded-lg">
                      <WalletIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No wallet configured yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add your wallet below to start receiving payments
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border-2 overflow-hidden">
                              <img
                                src={`https://sideshift.ai/api/v2/coins/icon/${wallets[0].token?.toLowerCase() || wallets[0].chain}-${wallets[0].network || wallets[0].chain}`}
                                alt={wallets[0].token || wallets[0].chain}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = `https://sideshift.ai/api/v2/coins/icon/${wallets[0].token?.toLowerCase() || wallets[0].chain}`
                                }}
                              />
                            </div>
                            <div>
                              <p className="font-semibold">{wallets[0].token || wallets[0].chain.toUpperCase()}</p>
                              <p className="text-xs text-muted-foreground">
                                on {wallets[0].network || wallets[0].chain}
                              </p>
                            </div>
                          </div>
                          <p className="font-mono text-sm break-all font-medium text-gray-700">{wallets[0].address}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge className="bg-green-600">Active</Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeWallet(wallets[0].id)}
                          disabled={removingWallet}
                          className="shrink-0"
                        >
                          {removingWallet ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add New Wallet - only show if no wallet exists */}
              {wallets.length === 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add Settlement Wallet</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Choose any token from SideShift to receive payments
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Search Input */}
                    <div className="space-y-2">
                      <Label htmlFor="token-search" className="text-sm font-medium">
                        Search Tokens
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="token-search"
                          type="text"
                          placeholder="Search by token name, symbol, or network..."
                          value={tokenSearch}
                          onChange={(e) => setTokenSearch(e.target.value)}
                          className="h-10 pl-10"
                        />
                      </div>
                    </div>

                    {/* Token List */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Available Tokens ({filteredTokens.length})</Label>
                      {loadingTokens ? (
                        <div className="p-8 text-center border rounded-lg">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Loading tokens from SideShift...</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-64 border rounded-lg">
                          <div className="divide-y">
                            {filteredTokens.length === 0 ? (
                              <div className="p-4 text-center text-muted-foreground">
                                No tokens found matching "{tokenSearch}"
                              </div>
                            ) : (
                              filteredTokens.map((token) => (
                                <button
                                  key={`${token.coin}-${token.network}`}
                                  type="button"
                                  onClick={() => {
                                    setNewWallet({
                                      chain: token.network,
                                      network: token.network,
                                      token: token.coin.toUpperCase(),
                                      address: newWallet.address,
                                    })
                                    setTokenSearch("")
                                  }}
                                  className={`w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left ${
                                    newWallet.token === token.coin.toUpperCase() && newWallet.network === token.network
                                      ? "bg-primary/10 border-l-4 border-l-primary"
                                      : ""
                                  }`}
                                >
                                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 border overflow-hidden">
                                    <img
                                      src={`https://sideshift.ai/api/v2/coins/icon/${token.coin.toLowerCase()}-${token.network}`}
                                      alt={token.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.src = `https://sideshift.ai/api/v2/coins/icon/${token.coin.toLowerCase()}`
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-col items-start flex-1 min-w-0">
                                    <span className="font-semibold text-sm truncate w-full">{token.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {token.coin.toUpperCase()} on {token.network}
                                    </span>
                                  </div>
                                  {newWallet.token === token.coin.toUpperCase() &&
                                    newWallet.network === token.network && (
                                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                    )}
                                </button>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      )}
                    </div>

                    {/* Selected Token Display */}
                    {newWallet.token && newWallet.network && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-sm font-medium mb-2">Selected Token:</p>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border overflow-hidden">
                            <img
                              src={`https://sideshift.ai/api/v2/coins/icon/${newWallet.token.toLowerCase()}-${newWallet.network}`}
                              alt={newWallet.token}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = `https://sideshift.ai/api/v2/coins/icon/${newWallet.token.toLowerCase()}`
                              }}
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{newWallet.token}</p>
                            <p className="text-xs text-muted-foreground">on {newWallet.network}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Address Input */}
                    <div className="space-y-2">
                      <Label htmlFor="address-input" className="text-sm font-medium">
                        Wallet Address
                      </Label>
                      <Input
                        id="address-input"
                        placeholder={
                          newWallet.network
                            ? `Enter your ${newWallet.network} wallet address`
                            : "Select a token first, then enter your wallet address"
                        }
                        value={newWallet.address}
                        onChange={(e) => setNewWallet({ ...newWallet, address: e.target.value })}
                        className="font-mono text-xs"
                        disabled={!newWallet.token}
                      />
                      {walletValidation && (
                        <div
                          className={`text-xs flex items-center gap-2 p-2 rounded ${
                            walletValidation.valid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                          }`}
                        >
                          {walletValidation.valid ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          <span>
                            {walletValidation.valid
                              ? `Valid ${walletValidation.network} address detected`
                              : "Invalid address format"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Add Wallet Button */}
                    <Button
                      onClick={addWallet}
                      className="w-full"
                      size="lg"
                      disabled={!newWallet.token || !newWallet.network || !newWallet.address || addingWallet}
                    >
                      {addingWallet ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding Wallet...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" /> Set This as My Payment Wallet
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Change Wallet Card - show only when wallet exists */}
              {wallets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Change Wallet</CardTitle>
                    <CardDescription className="text-xs">
                      Remove your current wallet to add a different one
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full text-destructive hover:bg-destructive/10 bg-transparent"
                      onClick={() => removeWallet(wallets[0].id)}
                      disabled={removingWallet}
                    >
                      {removingWallet ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" /> Remove Current Wallet
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* How it works */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs md:text-sm">
                  <strong>How it works:</strong> Users can deposit any cryptocurrency. SideShift automatically converts
                  it to your chosen token and sends it to your wallet. If a user deposits the same token you're
                  receiving, they'll be notified that direct payment isn't supported yet.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {activeTab === "webhooks" && (
            <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card>
                <CardHeader>
                  <CardTitle>Webhook Configuration</CardTitle>
                  <CardDescription>Receive real-time updates for payments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg bg-muted/30">
                    <div className="space-y-0.5">
                      <Label className="text-base">Enable Webhooks</Label>
                      <p className="text-xs text-muted-foreground">
                        Send HTTP POST requests to your endpoint when payments occur
                      </p>
                    </div>
                    <Switch
                      checked={settings.notification_webhook_enabled}
                      onCheckedChange={(checked) => setSettings({ ...settings, notification_webhook_enabled: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="webhook_url">Webhook URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="webhook_url"
                        value={settings.webhook_url}
                        onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
                        placeholder="https://api.yoursite.com/webhooks/paystack"
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        onClick={async () => {
                          if (!settings.webhook_url) {
                            toast({ title: "Error", description: "Please enter a URL first", variant: "destructive" })
                            return
                          }
                          setTestingWebhook(true)
                          try {
                            const res = await fetch("/api/merchant/webhook", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                type: "test",
                                url: settings.webhook_url,
                                secret: settings.webhook_secret,
                              }),
                            })
                            const data = await res.json()
                            if (data.success) {
                              toast({ title: "Success", description: "Test webhook sent successfully" })
                              loadWebhookLogs()
                            } else {
                              toast({
                                title: "Error",
                                description: "Failed to send test webhook",
                                variant: "destructive",
                              })
                            }
                          } catch (e) {
                            toast({
                              title: "Error",
                              description: "Failed to send test webhook",
                              variant: "destructive",
                            })
                          } finally {
                            setTestingWebhook(false)
                          }
                        }}
                        disabled={testingWebhook}
                      >
                        {testingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test Webhook"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      We'll send a POST request to this URL when a payment is completed.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook Secret</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          readOnly
                          value={settings.webhook_secret || ""}
                          type={showSecret ? "text" : "password"}
                          className="font-mono text-sm pr-10"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowSecret(!showSecret)}
                        >
                          {showSecret ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          if (!confirm("Are you sure? This will invalidate the old secret.")) return
                          try {
                            const res = await fetch("/api/merchant/settings/rotate-secret", { method: "POST" })
                            const data = await res.json()
                            if (data.success) {
                              setSettings({ ...settings, webhook_secret: data.secret })
                              toast({ title: "Success", description: "Secret rotated successfully" })
                            }
                          } catch (e) {
                            toast({ title: "Error", description: "Failed to rotate secret", variant: "destructive" })
                          }
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" /> Rotate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use this secret to verify the <code>X-CloaxPay-Signature</code> header.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900">Webhook Implementation</p>
                      <p className="text-xs text-blue-800">
                        See the{" "}
                        <a href="/docs" className="underline font-semibold">
                          documentation
                        </a>{" "}
                        for webhook implementation examples and how to verify signatures with your secret.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Recent Deliveries</h3>
                      <Button variant="ghost" size="sm" onClick={loadWebhookLogs}>
                        <RefreshCw className="h-3 w-3 mr-2" /> Refresh
                      </Button>
                    </div>

                    <div className="rounded-md border">
                      <ScrollArea className="h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">Status</TableHead>
                              <TableHead>Event</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead className="text-right">Response</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {webhookLogs.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                  No webhook logs found
                                </TableCell>
                              </TableRow>
                            ) : (
                              webhookLogs.map((log) => (
                                <TableRow key={log.id}>
                                  <TableCell>
                                    <Badge variant={log.success ? "default" : "destructive"} className="text-[10px]">
                                      {log.status_code || "ERR"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">{log.event_type}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                  </TableCell>
                                  <TableCell className="text-right text-xs font-mono max-w-[200px] truncate">
                                    {log.response_body || "-"}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => resendWebhook(log.id)}
                                      disabled={resendingLogId === log.id}
                                      title="Resend Webhook"
                                    >
                                      {resendingLogId === log.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <RotateCcw className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 md:py-4 border-t md:border-0 -mx-4 px-4 md:mx-0 md:px-0 flex justify-end">
            <Button onClick={saveSettings} disabled={saving} size="lg" className="w-full md:w-auto">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
