"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, Copy, Loader2, AlertCircle, CheckCircle2, X, Clock, Wallet, Zap, ShieldAlert } from "lucide-react"
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
  const [depositAddress, setDepositAddress] = useState("")
  const [shiftId, setShiftId] = useState<string | null>(null) // Added state to store SideShift order ID
  const [isLoadingChains, setIsLoadingChains] = useState(true)
  const [isLoadingSession, setIsLoadingSession] = useState(!initialAmount) // Only load if no initial data
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(true)
  const [status, setStatus] = useState(initialStatus)
  const [isChecking, setIsChecking] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes in seconds
  const [shiftCreatedAt, setShiftCreatedAt] = useState<number | null>(null)
  const [cancelAvailableIn, setCancelAvailableIn] = useState<number>(0)
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

  const formatCancelTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  useEffect(() => {
    if (!shiftCreatedAt) return

    const updateCancelTimer = () => {
      const elapsed = Math.floor((Date.now() - shiftCreatedAt) / 1000)
      const remaining = Math.max(0, 300 - elapsed) // 300 seconds = 5 minutes
      setCancelAvailableIn(remaining)
    }

    updateCancelTimer()
    const interval = setInterval(updateCancelTimer, 1000)

    return () => clearInterval(interval)
  }, [shiftCreatedAt])

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
        setShiftId(parsed.shiftId || null) // Restore shiftId
        setHasClickedPaid(parsed.hasClickedPaid || false) // Restore hasClickedPaid
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
    if (selectedChain || depositAddress || refundAddress || refundMemo) {
      // Include shiftId, refundMemo and hasClickedPaid
      localStorage.setItem(
        `payment_${sessionId}`,
        JSON.stringify({
          selectedChain,
          depositAddress,
          shiftId, // Save shiftId
          hasClickedPaid, // Save hasClickedPaid state
          refundAddress,
          refundMemo, // Save refundMemo
          timestamp: Date.now(),
        }),
      )
    }
  }, [sessionId, selectedChain, depositAddress, shiftId, hasClickedPaid, refundAddress, refundMemo]) // Add shiftId, refundMemo and hasClickedPaid dependency

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
      setShiftId(data.shiftId) // Store the SideShift order ID
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

  async function handlePaidClick() {
    setShowPaidConfirmation(false)
    setHasClickedPaid(true)
    setIsChecking(true)

    toast({
      title: "Checking Payment",
      description: "Monitoring the blockchain for your deposit...",
    })

    localStorage.setItem(
      `payment_${sessionId}`,
      JSON.stringify({
        selectedChain,
        depositAddress,
        shiftId, // Include shiftId in saved state
        hasClickedPaid: true,
        refundAddress,
        refundMemo,
      }),
    )

    // Trigger immediate check via POST
    try {
      console.log("[v0] Triggering manual payment check for session:", sessionId)

      const response = await fetch(`/api/widget/status/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_payment" }),
      })

      const data = await response.json()
      console.log("[v0] Manual check response:", data)

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
      } else {
        toast({
          title: "Monitoring Started",
          description: data.message || "We're watching for your transaction. This may take a few minutes.",
        })
      }

      // Start continuous polling
      if (data.status !== "completed" && data.status !== "failed" && data.status !== "expired") {
        setTimeout(checkPaymentStatus, 3000)
      }
    } catch (e) {
      console.error("[v0] Failed to trigger check:", e)
      toast({
        title: "Monitoring Started",
        description: "We're watching for your transaction. This may take a few minutes.",
      })
      // Still start polling even if initial check fails
      setTimeout(checkPaymentStatus, 3000)
    } finally {
      setIsChecking(false)
    }
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this payment?")) return

    setIsCancelling(true)
    try {
      const response = await fetch("/api/widget/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.removeItem(`payment_${sessionId}`)
        toast({
          title: "Payment Cancelled",
          description: "This payment has been cancelled.",
        })
        setStatus("cancelled")

        const redirectUrl = data.cancelUrl || merchantBranding.cancelUrl
        if (redirectUrl) {
          console.log("[v0] Redirecting to cancel URL:", redirectUrl)
          setTimeout(() => {
            try {
              const url = new URL(redirectUrl)
              url.searchParams.set("session_id", sessionId)
              url.searchParams.set("status", "cancelled")
              window.location.href = url.toString()
            } catch (e) {
              // If URL is invalid, try direct redirect
              window.location.href = redirectUrl
            }
          }, 1500)
        }
      } else {
        throw new Error(data.error || "Failed to cancel payment")
      }
    } catch (error) {
      console.error("[v0] Failed to cancel payment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCancelling(false)
    }
  }

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

  const filteredChains = chains.filter((chain) => {
    if (!chainSearch) return true
    const searchLower = chainSearch.toLowerCase()
    return (
      chain.coin.toLowerCase().includes(searchLower) ||
      chain.network.toLowerCase().includes(searchLower) ||
      chain.name.toLowerCase().includes(searchLower)
    )
  })

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-0">
      <div className="flex flex-col gap-6 p-8">
        {/* Merchant Info */}
        {(merchantBranding.logo || merchantBranding.companyUrl || merchantName) && (
          <div className="flex items-center gap-4">
            {merchantBranding.logo && (
              <img src={merchantBranding.logo || "/placeholder.svg"} alt="Merchant Logo" className="h-10 w-auto" />
            )}
            <div className="flex flex-col">
              {merchantName && <h3 className="text-lg font-semibold text-foreground">{merchantName}</h3>}
              {merchantBranding.companyUrl && (
                <a
                  href={merchantBranding.companyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:underline"
                >
                  {merchantBranding.companyUrl.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Amount and Status */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <p className="text-lg text-muted-foreground">Amount:</p>
            <p className="text-lg font-bold text-foreground">
              ${sessionData.amount} {sessionData.currency}
            </p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-lg text-muted-foreground">Status:</p>
            <div className="flex items-center gap-2 capitalize">
              {status === "pending" && <Clock className="h-5 w-5 text-amber-500" />}
              {status === "confirming" && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
              {status === "swapping" && <Zap className="h-5 w-5 text-violet-500" />}
              {status === "awaiting_payment" && <Wallet className="h-5 w-5 text-gray-500" />}
              <span
                className={`font-semibold ${status === "pending" || status === "awaiting_payment" ? "text-amber-500" : status === "confirming" ? "text-blue-500" : status === "swapping" ? "text-violet-500" : "text-green-500"}`}
              >
                {status}
              </span>
              {(status === "pending" || status === "awaiting_payment") && (
                <p className="text-sm text-muted-foreground">({formatTime(timeLeft)})</p>
              )}
            </div>
          </div>
        </div>

        {/* Deposit Information */}
        {!depositAddress && !isGeneratingAddress && !merchantError && !amountError && !samePairError && !geoBlocked && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="deposit-currency" className="text-muted-foreground">
                Select Deposit Currency
              </Label>
              <Select onValueChange={handleChainSelect} defaultValue={selectedChain}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a cryptocurrency..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <div className="sticky top-0 z-10 bg-background p-2">
                    <Input
                      placeholder="Search for a currency..."
                      value={chainSearch}
                      onChange={(e) => setChainSearch(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  {isLoadingChains ? (
                    <SelectItem value="" disabled className="flex justify-center items-center">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </SelectItem>
                  ) : filteredChains.length === 0 ? (
                    <SelectItem value="" disabled className="text-center text-muted-foreground">
                      No matching currencies found.
                    </SelectItem>
                  ) : (
                    filteredChains.map((chain) => (
                      <SelectItem key={`${chain.coin}/${chain.network}`} value={`${chain.coin}/${chain.network}`}>
                        {chain.coin.toUpperCase()} ({chain.network})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Refund Address and Memo */}
            {(selectedChain || refundAddress) && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="refund-address" className="text-muted-foreground">
                  Refund Address ({selectedChain.split("/")[0].toUpperCase()})
                </Label>
                <Input
                  id="refund-address"
                  value={refundAddress}
                  onChange={(e) => {
                    setRefundAddress(e.target.value)
                    setIsRefundAddressValid(null) // Reset validation on input change
                  }}
                  placeholder={`Enter your ${selectedChain.split("/")[0].toUpperCase()} address for refunds`}
                  className={isRefundAddressValid === false ? "border-destructive" : ""}
                />
                {isRefundAddressValid === false && (
                  <p className="text-xs text-destructive mt-1">Invalid refund address format.</p>
                )}
                {needsMemo() && (
                  <>
                    <Label htmlFor="refund-memo" className="text-muted-foreground">
                      Refund Memo
                    </Label>
                    <Input
                      id="refund-memo"
                      value={refundMemo}
                      onChange={(e) => setRefundMemo(e.target.value)}
                      placeholder="Enter memo/tag for refund"
                      className={!refundMemo && selectedChain ? "border-destructive" : ""}
                    />
                  </>
                )}
              </div>
            )}

            {amountError && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">
                  {amountError.message}
                  {amountError.min && ` Minimum: ${amountError.min}`}
                  {amountError.max && ` Maximum: ${amountError.max}`}
                </p>
              </div>
            )}

            {samePairError && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">{samePairError.message}</p>
              </div>
            )}

            {geoBlocked && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">Service is unavailable in your region.</p>
              </div>
            )}
          </>
        )}

        {/* Deposit Address & Amount */}
        {depositAddress && (
          <div className="flex flex-col gap-4 p-4 border border-primary/20 rounded-lg bg-primary/5">
            {quoteDetails && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <p className="text-muted-foreground">Deposit Amount:</p>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground">{cryptoAmount}</p>
                    <Button variant="ghost" size="icon" onClick={handleCopyAmount}>
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                {quoteDetails.networkFee && quoteDetails.networkFeeUsd && (
                  <div className="flex justify-between items-center">
                    <p className="text-muted-foreground">Network Fee:</p>
                    <p className="text-foreground text-sm">
                      {quoteDetails.networkFee} {quoteDetails.depositCoin.toUpperCase()}
                      {quoteDetails.networkFeeUsd && ` (~$${quoteDetails.networkFeeUsd})`}
                    </p>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <p className="text-muted-foreground">Exchange Rate:</p>
                  <p className="text-foreground text-sm">{quoteDetails.rate}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-muted-foreground">You'll Receive:</p>
                  <p className="font-bold text-foreground">
                    {quoteDetails.settleAmount} {quoteDetails.settleCoin.toUpperCase()}
                    {quoteDetails.settleAmountUSD && ` (~$${quoteDetails.settleAmountUSD})`}
                  </p>
                </div>
                {quoteDetails.message && <p className="text-xs text-yellow-500">{quoteDetails.message}</p>}
              </div>
            )}

            <div className="flex flex-col items-center gap-3">
              {showQR ? (
                <QRCodeSVG
                  value={`${depositAddress}?amount=${cryptoAmount}&asset=${selectedChain.split("/")[0].toUpperCase()}`}
                  size={150}
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"H"}
                  includeMargin={true}
                />
              ) : (
                <div className="w-full p-3 border rounded-md text-center break-all border-primary/20 bg-primary/5">
                  {depositAddress}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowQR(!showQR)} className="text-muted-foreground">
                {showQR ? "Show Address" : "Show QR Code"}
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2">
                <Input
                  type="text"
                  value={depositAddress}
                  readOnly
                  className="text-center focus-visible:ring-0 focus-visible:ring-offset-0 h-10"
                />
                <Button size="icon" onClick={handleCopy} disabled={copied}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Instruction */}
            <div className="text-center text-muted-foreground text-sm">
              Send exactly {cryptoAmount} {selectedChain.split("/")[0].toUpperCase()} to the address above.
              <br />
              Your payment will be confirmed shortly.
            </div>

            {renderPaymentStatus()}
          </div>
        )}

        {isGeneratingAddress && (
          <div className="flex flex-col items-center justify-center gap-4 p-4 border border-primary/20 rounded-lg bg-primary/5 min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-primary">Generating deposit address...</p>
          </div>
        )}

        {merchantError && (
          <div className="p-4 rounded-md bg-destructive/10 border border-destructive flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <p className="text-sm text-destructive">
              Merchant wallet configuration is missing. Please contact the merchant or support.
            </p>
          </div>
        )}

        {/* Cancel Button */}
        {status !== "completed" && status !== "cancelled" && status !== "expired" && status !== "failed" && (
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isCancelling}
            className="mt-4 text-destructive hover:text-destructive hover:border-destructive bg-transparent"
          >
            {isCancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
            Cancel Payment
          </Button>
        )}
      </div>

      {/* Confirmation Modal for "I have paid" */}
      <AlertDialog open={showPaidConfirmation} onOpenChange={setShowPaidConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment Sent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you have sent the correct amount of {cryptoAmount}{" "}
              {selectedChain.split("/")[0].toUpperCase()}
              to the deposit address? Once confirmed, we will start monitoring for your transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowPaidConfirmation(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePaidClick}>Yes, I Have Sent Payment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

export default PaymentWidget
