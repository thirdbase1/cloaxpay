"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Check,
  Copy,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Clock,
  Wallet,
  Zap,
  Shield,
  ShieldAlert,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Chain {
  coin: string
  network: string
  name: string
  min: string
  max: string
  hasMemo?: boolean // Added hasMemo
}

interface PaymentWidgetProps {
  sessionId: string
  initialAmount?: number
  initialCurrency?: string
  merchantName?: string
  merchantEmail?: string
  initialStatus?: string
  expiresAt?: string
  createdAt?: string // Added createdAt prop
}

export function PaymentWidget({
  sessionId,
  initialAmount,
  initialCurrency,
  merchantName,
  merchantEmail,
  initialStatus = "pending",
  expiresAt,
  createdAt, // Destructure createdAt
}: PaymentWidgetProps) {
  const [sessionData, setSessionData] = useState<any>(
    initialAmount && initialCurrency
      ? {
          amount: initialAmount,
          currency: initialCurrency,
          status: initialStatus,
          expires_at: expiresAt,
          created_at: createdAt, // Initialize created_at
          merchant: {
            business_name: merchantName,
            email: merchantEmail,
          },
        }
      : null,
  )
  const [chains, setChains] = useState<Chain[]>([])
  const [selectedChain, setSelectedChain] = useState<string>("")
  const [depositAddress, setDepositAddress] = useState<string>("")
  const [isLoadingChains, setIsLoadingChains] = useState(true)
  const [isLoadingSession, setIsLoadingSession] = useState(!initialAmount) // Only load if no initial data
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(true)
  const [status, setStatus] = useState(initialStatus)
  const [isChecking, setIsChecking] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes in seconds
  const [sessionExpired, setSessionExpired] = useState(false)
  const [hasClickedPaid, setHasClickedPaid] = useState(false)
  const [cryptoAmount, setCryptoAmount] = useState<string>("")
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [refundAddress, setRefundAddress] = useState<string>("")
  const [refundMemo, setRefundMemo] = useState<string>("") // Added refundMemo state
  const [merchantError, setMerchantError] = useState<boolean>(false)
  const [pairInfo, setPairInfo] = useState<{ min: string; max: string; rate: string } | null>(null)
  const [quoteDetails, setQuoteDetails] = useState<{
    depositAmount: string
    settleAmount: string
    settleAmountUSD?: string
    rate: string
    depositCoin: string
    depositNetwork: string
    settleCoin: string
    settleNetwork: string
    networkFee?: string
    networkFeeUsd?: string
    samePair?: boolean // Added samePair
    message?: string // Added message
  } | null>(null)
  const [geoBlocked, setGeoBlocked] = useState(false)
  const [amountError, setAmountError] = useState<{ min?: string; max?: string; message?: string } | null>(null)
  const [samePairError, setSamePairError] = useState<{
    message: string
    depositCoin: string
    depositNetwork: string
    settleCoin: string
    settleNetwork: string
  } | null>(null)
  const { toast } = useToast()

  const [merchantBranding, setMerchantBranding] = useState<{
    logo?: string
    color?: string
    companyUrl?: string
    successUrl?: string // Added successUrl
    cancelUrl?: string // Added cancelUrl
  }>({})

  const [isRefundAddressValid, setIsRefundAddressValid] = useState<boolean | null>(null)
  const [coinAvailability, setCoinAvailability] = useState<
    Record<string, { available: boolean; reason?: string }> // Removed speed/feeLevel from state type
  >({})
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [isValidatingCoin, setIsValidatingCoin] = useState(false) // Added isValidatingCoin state
  const [validatingMessage, setValidatingMessage] = useState<string>("")
  const [showPaidConfirmation, setShowPaidConfirmation] = useState(false)
  const [chainSearch, setChainSearch] = useState("") // Added chainSearch state

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const needsMemo = () => {
    if (!selectedChain) return false
    const [coin, network] = selectedChain.split("/")
    const chain = chains.find((c) => c.coin === coin && c.network === network)
    return chain?.hasMemo || false
  }

  const validateAddress = (address: string, network: string): boolean => {
    if (!address) return false
    const cleanAddr = address.trim()
    const net = network.toLowerCase()

    // EVM Chains (Ethereum, BSC, Polygon, Base, Arbitrum, Optimism, Avalanche, etc.)
    if (
      [
        "ethereum",
        "bsc",
        "polygon",
        "base",
        "arbitrum",
        "optimism",
        "avalanche",
        "fantom",
        "cronos",
        "gnosis",
        "kava",
        "manta",
        "moonbeam",
        "celo",
      ].includes(net)
    ) {
      return /^0x[a-fA-F0-9]{40}$/.test(cleanAddr)
    }

    // Bitcoin
    if (net === "bitcoin" || net === "mainnet") {
      // Legacy (1...), P2SH (3...), Bech32 (bc1...)
      return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/.test(cleanAddr)
    }

    // Solana
    if (net === "solana") {
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleanAddr)
    }

    // Litecoin
    if (net === "litecoin") {
      return /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(cleanAddr)
    }

    // Dogecoin
    if (net === "dogecoin") {
      return /^D{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}$/.test(cleanAddr)
    }

    // Tron
    if (net === "tron") {
      return /^T[a-zA-Z0-9]{33}$/.test(cleanAddr)
    }

    // Ripple (XRP)
    if (net === "ripple" || net === "xrp") {
      return /^r[0-9a-zA-Z]{24,34}$/.test(cleanAddr)
    }

    // Default length check for unknown chains
    return cleanAddr.length > 10
  }

  useEffect(() => {
    async function fetchSessionData() {
      try {
        console.log("[v0] Fetching session data for:", sessionId)
        const response = await fetch(`/api/widget/status/${sessionId}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("[v0] Session fetch failed:", response.status, errorText)
          throw new Error(`Failed to load session: ${response.status}`)
        }

        const data = await response.json()

        console.log("[v0] Session data loaded:", data)

        if (data.error) {
          throw new Error(data.error)
        }

        setSessionData(data)
        if (data.status && data.status !== status) {
          setStatus(data.status)
        }

        if (data.merchant) {
          setMerchantBranding({
            logo: undefined, // Removed branding_logo_url since it doesn't exist in DB
            color: undefined, // Removed branding_color since it doesn't exist in DB
            companyUrl: undefined, // Removed branding_company_url since it doesn't exist in DB
            successUrl: data.callback_url || data.merchant.success_url, // Prioritize session callback, then merchant setting
            cancelUrl: data.merchant.cancel_url, // Set cancel URL
          })
        }
      } catch (error) {
        console.error("[v0] Failed to fetch session data:", error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load payment session",
          variant: "destructive",
        })
      } finally {
        setIsLoadingSession(false)
      }
    }

    fetchSessionData()
  }, [sessionId])

  useEffect(() => {
    async function fetchChains() {
      try {
        const response = await fetch("/api/chains/supported")
        const data = await response.json()
        setChains(data.chains || [])
      } catch (error) {
        console.error("[v0] Failed to fetch chains:", error)
        toast({
          title: "Error",
          description: "Failed to load payment methods",
          variant: "destructive",
        })
      } finally {
        setIsLoadingChains(false)
      }
    }

    fetchChains()

    try {
      fetch("/api/widget/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          event: "widget_opened",
        }),
      })
    } catch (e) {
      console.error("Telemetry error:", e)
    }
  }, [sessionId])

  // Users should be able to refresh or switch tabs without losing their session

  useEffect(() => {
    if (!sessionData || !sessionId) return

    if (["completed", "cancelled", "expired", "failed", "refunded"].includes(status)) return

    let pollInterval: NodeJS.Timeout

    async function pollStatus() {
      try {
        const response = await fetch(`/api/widget/status/${sessionId}`)

        if (!response.ok) {
          console.warn("[v0] Polling failed:", response.status)
          return
        }

        const data = await response.json()

        if (data.status !== status) {
          setStatus(data.status)

          if (["cancelled", "expired", "failed"].includes(data.status)) {
            setHasClickedPaid(false)
            localStorage.removeItem(`payment_${sessionId}`)
          }

          // Show appropriate toast based on status
          if (data.status === "confirming") {
            toast({
              title: "✅ Payment Detected",
              description: "Waiting for blockchain confirmations...",
            })
          } else if (data.status === "swapping") {
            toast({
              title: "🔄 Exchanging",
              description: "Converting your payment...",
            })
          } else if (data.status === "completed") {
            toast({
              title: "🎉 Payment Completed",
              description: "Transaction successful!",
            })

            if (merchantBranding.successUrl) {
              setTimeout(() => {
                try {
                  const url = new URL(merchantBranding.successUrl!)
                  url.searchParams.set("session_id", sessionId)
                  url.searchParams.set("status", "completed")
                  window.location.href = url.toString()
                } catch (e) {
                  console.error("Invalid success URL:", e)
                }
              }, 2000) // 2 second delay to show success message
            }

            clearInterval(pollInterval)
          }
        }

        if (sessionData.created_at) {
          const createdAtTime = new Date(sessionData.created_at).getTime()
          const tenMinutesLater = createdAtTime + 10 * 60 * 1000
          const now = Date.now()
          const remaining = Math.max(0, Math.floor((tenMinutesLater - now) / 1000))

          setTimeLeft(remaining)

          if (remaining === 0 && !["completed", "confirming", "swapping"].includes(data.status)) {
            setSessionExpired(true)
            clearInterval(pollInterval)
          }
        } else if (data.expires_at) {
          // Fallback if created_at is missing (legacy)
          const expiresTime = new Date(data.expires_at).getTime()
          const now = Date.now()
          const remaining = Math.max(0, Math.floor((expiresTime - now) / 1000))
          setTimeLeft(remaining)
        }
        // </CHANGE> Start - Polling logic unchanged, but context moved
      } catch (error) {
        console.error("[v0] Status poll failed:", error)
      }
    }

    // Start polling every 3 seconds
    pollInterval = setInterval(pollStatus, 3000)

    return () => clearInterval(pollInterval)
  }, [sessionData, depositAddress, sessionId, status, merchantBranding.successUrl])

  useEffect(() => {
    const savedState = localStorage.getItem(`payment_${sessionId}`)
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        if (["cancelled", "expired", "failed"].includes(initialStatus)) {
          localStorage.removeItem(`payment_${sessionId}`)
          return
        }

        setSelectedChain(parsed.selectedChain || "")
        setDepositAddress(parsed.depositAddress || "")
        // setHasClickedPaid(parsed.hasClickedPaid || false)
        setRefundAddress(parsed.refundAddress || "")
        setRefundMemo(parsed.refundMemo || "") // Restore refundMemo

        if (parsed.depositAddress) {
          // checkPaymentStatus()
        }
      } catch (e) {
        console.error("[v0] Failed to restore session:", e)
      }
    }
  }, [sessionId, initialStatus])

  useEffect(() => {
    if (depositAddress || selectedChain || refundAddress || refundMemo) {
      // Include refundMemo
      localStorage.setItem(
        `payment_${sessionId}`,
        JSON.stringify({
          selectedChain,
          depositAddress,
          // hasClickedPaid,
          refundAddress,
          refundMemo, // Save refundMemo
          timestamp: Date.now(),
        }),
      )
    }
  }, [sessionId, selectedChain, depositAddress, hasClickedPaid, refundAddress, refundMemo]) // Add refundMemo dependency

  useEffect(() => {
    if (!selectedChain || !sessionData?.amount) return

    const fetchCryptoAmount = async () => {
      setIsLoadingQuote(true)
      setGeoBlocked(false)
      setAmountError(null)
      setQuoteDetails(null)
      setSamePairError(null)

      try {
        const [coin, network] = selectedChain.split("/")

        const response = await fetch("/api/widget/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: sessionData.amount,
            currency: sessionData.currency || "USD",
            depositCoin: coin,
            depositNetwork: network,
            sessionId: sessionId,
          }),
        })

        const data = await response.json()

        if (data.error === "same_pair" || data.samePair === true) {
          setSamePairError({
            message:
              data.message ||
              `Cannot deposit ${coin.toUpperCase()} on ${network} - merchant receives on the same chain.`,
            depositCoin: coin.toUpperCase(),
            depositNetwork: network,
            settleCoin: data.settleCoin || "",
            settleNetwork: data.settleNetwork || "",
          })
          setCryptoAmount("")
          return
        }

        if (data.geoBlocked) {
          setGeoBlocked(true)
          toast({
            title: "Service Unavailable",
            description: "SideShift.ai is not available in your region due to geo-restrictions.",
            variant: "destructive",
          })
          return
        }

        // Consolidated error handling
        if (data.error) {
          setAmountError({
            message: data.error,
          })
          return
        }

        if (data.code === "AMOUNT_RANGE_ERROR" || data.code === "AMOUNT_TOO_LOW") {
          setAmountError({
            min: data.min,
            max: data.max,
            message: data.error,
          })
          return
        }

        if (data.success) {
          if (data.depositAmount) {
            setCryptoAmount(data.depositAmount)
            setQuoteDetails({
              depositAmount: data.depositAmount,
              settleAmount: data.settleAmount,
              settleAmountUSD: data.settleAmountUSD,
              rate: data.rate,
              depositCoin: data.depositCoin,
              depositNetwork: data.depositNetwork,
              settleCoin: data.settleCoin,
              settleNetwork: data.settleNetwork,
              networkFee: data.networkFee,
              networkFeeUsd: data.networkFeeUsd,
            })
          }
          console.log("[v0] Quote received:", data)
        }
      } catch (error) {
        console.error("[v0] Failed to get crypto quote:", error)
        setAmountError({
          message: "Failed to fetch rate. Please try again.",
        })
      } finally {
        setIsLoadingQuote(false)
      }
    }

    fetchCryptoAmount()
    const interval = setInterval(fetchCryptoAmount, 30000)
    return () => clearInterval(interval)
  }, [selectedChain, sessionData?.amount, sessionId])

  async function handleChainSelect(chainValue: string) {
    if (!refundAddress || refundAddress.trim().length < 5) {
      toast({
        title: "Refund Address Required",
        description: "Please enter a valid refund address before continuing.",
        variant: "destructive",
      })
      return
    }

    if (needsMemo() && (!refundMemo || refundMemo.trim().length === 0)) {
      toast({
        title: "Memo Required",
        description: "This coin requires a memo/tag for the refund address.",
        variant: "destructive",
      })
      return
    }

    const [coin, network] = chainValue.split("/")
    const isValid = validateAddress(refundAddress, network)

    if (!isValid) {
      setIsRefundAddressValid(false)
      toast({
        title: "Invalid Address",
        description: `The refund address does not look like a valid ${network} address.`,
        variant: "destructive",
      })
      return
    }
    setIsRefundAddressValid(true)

    if (amountError || samePairError) {
      toast({
        title: "Selection Error",
        description: amountError?.message || samePairError?.message || "Please select a different coin.",
        variant: "destructive",
      })
      return
    }

    setIsValidatingCoin(true)
    setValidatingMessage("Checking limits...")

    try {
      const validationResponse = await fetch("/api/widget/validate-coin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositCoin: coin,
          depositNetwork: network,
          settleCoin: "USDC", // This is now determined by the API based on merchant settings
          settleNetwork: "ethereum", // This is now determined by the API based on merchant settings
          amount: sessionData.amount,
          affiliateId: process.env.NEXT_PUBLIC_SIDESHIFT_AFFILIATE_ID,
          sessionId: sessionId,
        }),
      })

      const validationData = await validationResponse.json()

      if (validationData.geoBlocked) {
        setGeoBlocked(true)
        toast({
          title: "Service Unavailable",
          description: "SideShift.ai is not available in your region.",
          variant: "destructive",
        })
        setIsValidatingCoin(false)
        setValidatingMessage("")
        return
      }

      if (!validationData.available) {
        setAmountError({
          min: validationData.min,
          max: validationData.max,
          message: validationData.reason,
        })
        setIsValidatingCoin(false)
        setValidatingMessage("")
        return
      }

      // Clear any previous errors
      setAmountError(null)
      setGeoBlocked(false)
    } catch (error) {
      console.error("[v0] Coin validation failed:", error)
      toast({
        title: "Validation Error",
        description: "Unable to validate this payment method. Please try another.",
        variant: "destructive",
      })
      setIsValidatingCoin(false)
      setValidatingMessage("")
      return
    }

    setIsValidatingCoin(false)
    setValidatingMessage("")

    // Now proceed with address generation
    setSelectedChain(chainValue)
    setIsGeneratingAddress(true)
    setMerchantError(false)

    fetch("/api/widget/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        event: "chain_selected",
        metadata: { chain: chainValue },
      }),
    })

    try {
      const response = await fetch("/api/widget/select-chain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          depositCoin: coin,
          depositNetwork: network,
          refundAddress: refundAddress.trim(),
          refundMemo: refundMemo.trim(), // Pass refundMemo
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.code === "MISSING_MERCHANT_WALLET") {
          setMerchantError(true)
          throw new Error("Merchant wallet configuration missing")
        }
        // Handle SideShift Geo-Blocking
        if (data.error && data.error.includes("access denied")) {
          throw new Error("Service unavailable in your region (Geo-restricted)")
        }
        throw new Error(data.error || "Failed to generate deposit address")
      }

      setDepositAddress(data.depositAddress)
      if (data.depositAmount) setCryptoAmount(data.depositAmount)

      toast({
        title: "Ready to receive payment",
        description: "Send your crypto to the address below",
      })
    } catch (error) {
      console.error("[v0] Failed to generate deposit address:", error)
      if ((error as Error).message !== "Merchant wallet configuration missing") {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to generate deposit address",
          variant: "destructive",
        })
      }
      setSelectedChain("")
    } finally {
      setIsGeneratingAddress(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(depositAddress)
      setCopied(true)

      fetch("/api/widget/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          event: "address_copied",
        }),
      })

      toast({
        title: "Copied!",
        description: "Address copied to clipboard",
      })

      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy address",
        variant: "destructive",
      })
    }
  }

  async function handleCopyAmount() {
    try {
      await navigator.clipboard.writeText(cryptoAmount)
      toast({
        title: "Copied!",
        description: "Amount copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy amount",
        variant: "destructive",
      })
    }
  }

  async function checkPaymentStatus() {
    setIsChecking(true)
    try {
      const response = await fetch(`/api/widget/status/${sessionId}`)
      const data = await response.json()

      if (data.status !== status) {
        setStatus(data.status)

        if (data.status === "completed") {
          toast({
            title: "Payment Confirmed!",
            description: "Your payment has been successfully processed.",
          })
        } else if (data.status === "confirming") {
          toast({
            title: "Payment Detected!",
            description: "Waiting for blockchain confirmation...",
          })
          setTimeout(checkPaymentStatus, 5000)
        } else if (status !== "completed") {
          setTimeout(checkPaymentStatus, 5000)
        }
      } else {
        if (status !== "completed") {
          setTimeout(checkPaymentStatus, 5000)
        }
      }
    } catch (error) {
      console.error("[v0] Failed to check payment status:", error)
    } finally {
      setIsChecking(false)
    }
  }

  // </CHANGE> Start - Replaced handleHaveSent with handlePaidClick
  async function handlePaidClick() {
    setShowPaidConfirmation(false)
    setHasClickedPaid(true)
    setIsChecking(true)

    toast({
      title: "Checking Payment",
      description: "Monitoring the blockchain for your deposit...",
    })

    // Trigger immediate check via POST
    try {
      const response = await fetch(`/api/widget/status/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_payment" }),
      })

      const data = await response.json()

      if (data.status && data.status !== status) {
        setStatus(data.status)

        if (data.status === "confirming") {
          toast({
            title: "Payment Detected!",
            description: "Waiting for blockchain confirmations...",
          })
        } else if (data.status === "completed") {
          toast({
            title: "Payment Confirmed!",
            description: "Your payment has been processed successfully.",
          })
        }
      }

      // Start continuous polling
      if (data.status !== "completed" && data.status !== "failed" && data.status !== "expired") {
        setTimeout(checkPaymentStatus, 3000)
      }
    } catch (e) {
      console.error("[v0] Failed to trigger check:", e)
      // Still start polling even if initial check fails
      setTimeout(checkPaymentStatus, 3000)
    } finally {
      setIsChecking(false)
    }
  }
  // </CHANGE> End

  async function handleCancel() {
    if (hasClickedPaid) {
      toast({
        title: "Cannot Cancel",
        description:
          "You've indicated payment was sent. Cancelling now could result in loss of funds. Please wait for blockchain confirmation or contact support.",
        variant: "destructive",
      })
      return
    }

    if (
      status === "detected" ||
      status === "confirming" ||
      status === "processing" ||
      status === "swapping" ||
      status === "settling"
    ) {
      // Added more status checks
      toast({
        title: "Cannot Cancel",
        description:
          "Payment has been detected on the blockchain. Cancellation is no longer possible to prevent loss of funds.",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Are you sure you want to cancel this payment?")) {
      return
    }

    setIsCancelling(true)
    try {
      const response = await fetch("/api/widget/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })

      if (response.ok) {
        localStorage.removeItem(`payment_${sessionId}`)
        toast({
          title: "Payment Cancelled",
          description: "This payment has been cancelled.",
        })
        setStatus("cancelled")

        if (merchantBranding.cancelUrl) {
          setTimeout(() => {
            window.location.href = merchantBranding.cancelUrl!
          }, 1500)
        }
      } else {
        throw new Error("Failed to cancel payment")
      }
    } catch (error) {
      console.error("[v0] Failed to cancel payment:", error)
      toast({
        title: "Error",
        description: "Failed to cancel payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCancelling(false)
    }
  }

  // REMOVED REDUNDANT formatTime function
  const isFinalStatus = ["completed", "cancelled", "expired", "failed", "refunded"].includes(status)

  if (!isMounted) {
    return (
      <div className="w-full max-w-md mx-auto p-4">
        <Card className="h-[400px] flex items-center justify-center bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </Card>
      </div>
    )
  }

  if (isLoadingSession) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="overflow-hidden border-0 shadow-2xl bg-black/90 backdrop-blur-xl ring-1 ring-white/10">
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <span className="ml-3 text-white">Loading payment session...</span>
          </div>
        </Card>
      </div>
    )
  }

  if (!sessionData) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="overflow-hidden border-0 shadow-2xl bg-black/90 backdrop-blur-xl ring-1 ring-white/10">
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Session Not Found</h3>
            <p className="text-sm text-white/60">This payment session could not be loaded.</p>
          </div>
        </Card>
      </div>
    )
  }

  if (merchantError) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="overflow-hidden border-0 shadow-2xl bg-black/90 backdrop-blur-xl ring-1 ring-white/10">
          <div className="p-6 flex flex-col items-center justify-center gap-6 text-center">
            <div className="h-20 w-20 rounded-full bg-amber-500/20 flex items-center justify-center ring-8 ring-amber-500/10">
              <Wallet className="h-10 w-10 text-amber-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Setup Required</h3>
              <p className="text-white/60 max-w-[280px] mx-auto leading-relaxed">
                The merchant hasn't configured their wallet for this network yet.
              </p>
            </div>

            <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-200">What should I do?</p>
                <p className="text-xs text-amber-400/80 leading-relaxed">
                  Please contact the site owner and let them know they need to add a wallet for{" "}
                  <strong>{selectedChain.split("/")[0].toUpperCase()}</strong> in their dashboard settings.
                </p>
              </div>
            </div>

            <Button
              onClick={() => {
                setMerchantError(false)
                setSelectedChain("")
              }}
              variant="outline"
              className="w-full border-2 border-white/10 bg-white/10 text-white hover:bg-white/20"
            >
              Try Different Payment Method
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const { amount, currency, merchant } = sessionData

  if (status === "completed") {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="overflow-hidden border-0 shadow-2xl bg-black/90 backdrop-blur-xl ring-1 ring-white/10">
          <div className="p-6 flex flex-col items-center justify-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Payment Confirmed!</h3>
              <p className="text-white/60">
                Your payment of ${amount?.toLocaleString()} {currency} has been processed successfully.
              </p>
            </div>
            <p className="text-sm text-white/40 mt-2">You can close this window now.</p>
          </div>
        </Card>
      </div>
    )
  }

  if (status === "cancelled") {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="overflow-hidden border-0 shadow-2xl bg-black/90 backdrop-blur-xl ring-1 ring-white/10">
          <div className="p-6 flex flex-col items-center justify-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
              <X className="h-10 w-10 text-gray-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Payment Cancelled</h3>
              <p className="text-white/60">This payment session has been cancelled.</p>
            </div>
            <p className="text-sm text-white/40 mt-2">You can close this window now.</p>
          </div>
        </Card>
      </div>
    )
  }

  if (status === "expired" || sessionExpired) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="overflow-hidden border-0 shadow-2xl bg-black/90 backdrop-blur-xl ring-1 ring-white/10">
          <div className="p-6 flex flex-col items-center justify-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Session Expired</h3>
              <p className="text-white/60">This payment session expired after 10 minutes of inactivity.</p>
            </div>
            <p className="text-sm text-white/40 mt-2">Please request a new payment link from the merchant.</p>
          </div>
        </Card>
      </div>
    )
  }

  if (status === "failed") {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="overflow-hidden border-0 shadow-2xl bg-black/90 backdrop-blur-xl ring-1 ring-white/10">
          <div className="p-6 flex flex-col items-center justify-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Session Expired</h3>
              <p className="text-white/60">This payment session expired after 10 minutes of inactivity.</p>
            </div>
            <p className="text-sm text-white/40 mt-2">Please request a new payment link from the merchant.</p>
          </div>
        </Card>
      </div>
    )
  }

  const renderPaymentStatus = () => {
    if (hasClickedPaid && ["pending", "waiting", "awaiting_payment"].includes(status)) {
      return (
        <div className="w-full p-4 rounded-xl bg-primary/5 border-2 border-primary/10 animate-pulse flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="relative bg-primary/10 p-2 rounded-full">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-primary">Confirming your deposit, be patient...</span>
              <span className="text-xs text-muted-foreground">Looking for your transaction</span>
            </div>
          </div>
          <div className="w-full bg-primary/10 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-primary/50 w-1/3 animate-[shimmer_2s_infinite]" />
          </div>
        </div>
      )
    }

    // Only show button if we haven't clicked paid OR if we have but status changed (handled above)
    // Actually, if status is confirming/etc, the main loop handles it.
    // This button is specifically for the manual "I sent it" action.

    return (
      <Button
        onClick={() => setShowPaidConfirmation(true)}
        disabled={hasClickedPaid || isChecking || !["pending", "waiting", "awaiting_payment"].includes(status)}
        className={`w-full h-14 text-base font-bold rounded-lg transition-all ${
          hasClickedPaid || !["pending", "waiting", "awaiting_payment"].includes(status)
            ? "bg-muted text-muted-foreground cursor-not-allowed hidden" // Hide if clicked to show the feedback UI above instead
            : "bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/20"
        }`}
      >
        {isChecking ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking Status...
          </div>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5 mr-2" />I Have Sent Payment
          </>
        )}
      </Button>
    )
  }
  // </CHANGE>

  const filteredChains = chains.filter((chain) => {
    if (!chainSearch) return true
    const searchLower = chainSearch.toLowerCase()
    return (
      chain.coin.toLowerCase().includes(searchLower) ||
      chain.network.toLowerCase().includes(searchLower) ||
      chain.name.toLowerCase().includes(searchLower)
    )
  })

  if (!isMounted) {
    return null
  }

  if (isLoadingSession) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-gradient-to-b from-card to-card/95">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </Card>
    )
  }

  if (!sessionData) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-2xl border-0">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Session Not Found</h2>
          <p className="text-muted-foreground">This payment session doesn't exist or has expired.</p>
        </div>
      </Card>
    )
  }

  if (status === "completed") {
    return (
      <Card className="w-full max-w-md mx-auto shadow-2xl border-0 overflow-hidden">
        {/* Progress bar at top */}
        <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500" />
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center animate-in zoom-in duration-300">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Payment Completed!</h2>
            <p className="text-muted-foreground">
              Your payment of{" "}
              <span className="font-semibold text-foreground">
                ${sessionData.amount} {sessionData.currency}
              </span>{" "}
              has been received.
            </p>
          </div>
          {merchantBranding.successUrl && (
            <p className="text-sm text-muted-foreground">Redirecting you back to the merchant...</p>
          )}
        </div>
      </Card>
    )
  }

  if (status === "cancelled") {
    return (
      <Card className="w-full max-w-md mx-auto shadow-2xl border-0 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-gray-400 to-gray-500" />
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <X className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Payment Cancelled</h2>
            <p className="text-muted-foreground">This payment session has been cancelled.</p>
          </div>
        </div>
      </Card>
    )
  }

  if (status === "expired" || sessionExpired) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-2xl border-0 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Clock className="h-10 w-10 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Session Expired</h2>
            <p className="text-muted-foreground">This payment session has expired. Please request a new one.</p>
          </div>
        </div>
      </Card>
    )
  }

  if (status === "failed") {
    return (
      <Card className="w-full max-w-md mx-auto shadow-2xl border-0 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-red-500 to-rose-500" />
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-destructive">Payment Failed</h2>
            <p className="text-muted-foreground">
              There was an issue processing your payment. Please contact support or try again.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-gradient-to-b from-card to-card/95 overflow-hidden">
      {/* Progress bar at top */}
      <div className="h-2 bg-gradient-to-r from-primary to-primary/80" />

      {/* Header - Restored original centered design with shield icon */}
      <div className="relative bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-6 border-b">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Secure Payment</p>
            <p className="text-sm font-medium text-foreground">End-to-End Encrypted</p>
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Total Amount</p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-bold tracking-tight">{sessionData.amount}</span>
            <span className="text-xl font-semibold text-muted-foreground">{sessionData.currency}</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Payment method selection or deposit address */}
        {depositAddress ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Status indicator */}
            {(status === "confirming" || status === "swapping") && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {status === "confirming" ? "Payment Detected!" : "Converting Payment..."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {status === "confirming"
                      ? "Waiting for blockchain confirmations..."
                      : "Your payment is being converted..."}
                  </p>
                </div>
              </div>
            )}

            {/* QR Code and Address */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Send exactly:</Label>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={handleCopyAmount}>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Amount
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border-2 border-dashed border-primary/30">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold font-mono">{cryptoAmount}</span>
                  <span className="text-lg font-semibold text-primary">
                    {selectedChain.split("/")[0].toUpperCase()}
                  </span>
                </div>
              </div>

              {showQR && (
                <div className="flex justify-center p-4 bg-white rounded-xl">
                  <QRCodeSVG value={depositAddress} size={180} level="H" includeMargin />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-semibold">To this address:</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 rounded-lg bg-muted/50 border font-mono text-xs break-all">
                    {depositAddress}
                  </div>
                  <Button variant="outline" size="icon" className="shrink-0 bg-transparent" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Time remaining:</span>
                </div>
                <span className="font-mono font-bold text-amber-600">{formatTime(timeLeft)}</span>
              </div>
            </div>

            {/* I Have Paid Button - Show only when deposit address is displayed and payment not yet confirmed */}
            <div className="space-y-3 pt-2">{renderPaymentStatus()}</div>
            {/* </CHANGE> */}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Chain Selection - Restored original dropdown design with coin icons */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Select Payment Method</Label>
              <div className="relative">
                <Input
                  placeholder="Search coin or chain..."
                  value={chainSearch}
                  onChange={(e) => setChainSearch(e.target.value)}
                  className="h-12 rounded-lg bg-muted/50 border-2 border-transparent hover:border-primary/30 focus:border-primary/50"
                />
              </div>
              <Select value={selectedChain} onValueChange={setSelectedChain} disabled={isLoadingChains}>
                <SelectTrigger className="h-14 rounded-lg bg-muted/50 border-2 border-primary/30 focus:border-primary/50">
                  <SelectValue placeholder={isLoadingChains ? "Loading chains..." : "Choose cryptocurrency..."} />
                </SelectTrigger>
                <SelectContent className="max-h-80 overflow-y-auto">
                  {filteredChains.map((chain) => (
                    <SelectItem
                      key={`${chain.coin}/${chain.network}`}
                      value={`${chain.coin}/${chain.network}`}
                      className="py-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {/* Circular placeholder icon */}
                        <div className="h-10 w-10 rounded-full bg-muted border-2 border-muted-foreground/20 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-muted-foreground">
                            {chain.coin.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        {/* Coin name and network */}
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{chain.name || chain.coin}</span>
                          <span className="text-xs text-muted-foreground uppercase">{chain.network}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quote Details */}
            {selectedChain && (
              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  Transaction Preview
                </div>

                {isLoadingQuote ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : isValidatingCoin ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {validatingMessage || "Validating..."}
                  </div>
                ) : amountError ? (
                  <div className="space-y-1">
                    <div className="flex items-start gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span className="text-sm font-medium">{amountError.message}</span>
                    </div>
                    {amountError.min && (
                      <p className="text-sm text-destructive pl-6">
                        Min: {amountError.min} {selectedChain?.split("/")[0].toUpperCase()}
                      </p>
                    )}
                    {amountError.max && (
                      <p className="text-sm text-destructive pl-6">
                        Max: {amountError.max} {selectedChain?.split("/")[0].toUpperCase()}
                      </p>
                    )}
                  </div>
                ) : samePairError ? (
                  <div className="space-y-1">
                    <div className="flex items-start gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span className="text-sm font-medium">{samePairError.message}</span>
                    </div>
                    <p className="text-sm text-destructive pl-6">
                      {samePairError.depositCoin} cannot be exchanged for {samePairError.settleCoin}.
                    </p>
                  </div>
                ) : (
                  quoteDetails && (
                    <>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-muted-foreground">You Send</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-foreground">
                            {Number.parseFloat(quoteDetails.depositAmount).toFixed(6)}{" "}
                            <span className="text-sm font-semibold text-primary">{quoteDetails.depositCoin}</span>
                          </span>
                        </div>
                      </div>

                      <div className="h-px bg-border" />

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Merchant Receives</span>
                        <div className="text-right">
                          <span className="font-mono text-sm font-semibold text-foreground">
                            $
                            {quoteDetails.settleAmountUSD ||
                              Number.parseFloat(quoteDetails.settleAmount || "0").toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({Number.parseFloat(quoteDetails.settleAmount || "0").toFixed(6)} {quoteDetails.settleCoin})
                          </span>
                        </div>
                      </div>

                      {quoteDetails.samePair ? (
                        <div className="flex gap-2 items-start p-3 rounded-lg bg-card/50 border border-primary/10">
                          <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground leading-relaxed">{quoteDetails.message}</p>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-start p-3 rounded-lg bg-card/50 border border-primary/10">
                          <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Rate updates every 30 seconds. Final amount may vary slightly.
                          </p>
                        </div>
                      )}
                    </>
                  )
                )}
              </div>
            )}

            {geoBlocked && (
              <div className="p-4 rounded-xl bg-destructive/10 border-2 border-destructive/30 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Service Unavailable</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    SideShift.ai is not available in your region due to geo-restrictions. Please try a VPN or contact
                    the merchant for alternative payment methods.
                  </p>
                </div>
              </div>
            )}

            {/* Refund Address Input */}
            {selectedChain && !depositAddress && !isGeneratingAddress && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <Label className="text-sm font-semibold text-foreground">
                  Your {selectedChain.split("/")[0].toUpperCase()} address
                </Label>
                <div className="relative">
                  <Input
                    value={refundAddress}
                    onChange={(e) => {
                      setRefundAddress(e.target.value)
                      setIsRefundAddressValid(null)
                    }}
                    placeholder={`Your ${selectedChain.split("/")[0].toUpperCase()} address`}
                    className={`h-12 rounded-lg border-2 pr-10 ${
                      isRefundAddressValid === true
                        ? "border-green-500/50 focus:border-green-500"
                        : isRefundAddressValid === false
                          ? "border-destructive/50 focus:border-destructive"
                          : "bg-muted/50 border-transparent hover:border-primary/30 focus:border-primary/50"
                    }`}
                  />
                  {isRefundAddressValid === true && (
                    <Check className="absolute right-3 top-3.5 h-5 w-5 text-green-500 animate-in fade-in zoom-in" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll send your crypto back here if the transaction fails or is overpaid.
                </p>
                {needsMemo() && (
                  <div className="space-y-2 pt-1">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      Refund Memo / Destination Tag
                      <span className="text-xs font-normal text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        Required for Exchanges
                      </span>
                    </Label>
                    <Input
                      value={refundMemo}
                      onChange={(e) => setRefundMemo(e.target.value)}
                      placeholder="123456789"
                      className="h-12 rounded-lg bg-muted/50 border-2 border-transparent hover:border-primary/30 focus:border-primary/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      If you are using an exchange wallet (Coinbase, Binance, etc.), you MUST include this.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            {!depositAddress && (
              <div className="space-y-3 pt-2">
                <Button
                  className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 rounded-lg shadow-lg shadow-primary/20 transition-all"
                  onClick={() => handleChainSelect(selectedChain)}
                  disabled={
                    isLoadingChains ||
                    !selectedChain ||
                    !refundAddress ||
                    isGeneratingAddress ||
                    isValidatingCoin || // Disabled during validation
                    !!amountError || // Disabled if there's an amount error
                    !!samePairError || // Disabled if there's a same-pair error
                    geoBlocked || // Disabled if geo-blocked
                    (needsMemo() && !refundMemo) || // Disable button if memo is required but not provided
                    isRefundAddressValid === false // Disable button if refund address is invalid
                  }
                >
                  {isValidatingCoin ? ( // Show validation state
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Validating...</span>
                    </div>
                  ) : isGeneratingAddress ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating Address...</span>
                    </div>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5 mr-2" />
                      Continue to Payment
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-12 text-muted-foreground hover:text-foreground"
                  onClick={handleCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Cancel Payment"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-muted/20">
        <p className="text-xs text-center text-muted-foreground">
          Secured by CloaxPay • Non-Custodial • End-to-End Encrypted
        </p>
      </div>

      <AlertDialog open={showPaidConfirmation} onOpenChange={setShowPaidConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment Sent</AlertDialogTitle>
            <AlertDialogDescription>
              Have you sent exactly{" "}
              <strong>
                {cryptoAmount} {selectedChain?.split("/")[0].toUpperCase()}
              </strong>{" "}
              to the deposit address?
              <br />
              <br />
              Once you confirm, we will start monitoring the blockchain for your transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not Yet</AlertDialogCancel>
            <AlertDialogAction onClick={handlePaidClick}>Yes, I've Sent It</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* </CHANGE> */}
    </Card>
  )
}

export default PaymentWidget
