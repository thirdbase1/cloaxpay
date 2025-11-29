// PHASE 6: Ultra-clean, minimalist payment modal
// Big QR, Copy button, Timer, Status updates - Stripe/Paystack style

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, CheckCircle2, Clock, Loader2, ExternalLink } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface PaymentWidgetLeanProps {
  sessionId: string
  amount: number
  currency: string
  merchantName: string
}

interface Coin {
  coin: string
  name: string
  networks: string[]
}

export function PaymentWidgetLean({
  sessionId,
  amount,
  currency,
  merchantName,
}: PaymentWidgetLeanProps) {
  // PHASE 7: Localstorage session - user can refresh and payment resumes
  const [step, setStep] = useState<'select' | 'refund' | 'payment'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`payment_${sessionId}`)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.depositAddress) return 'payment'
        if (data.refundAddress) return 'refund'
      }
    }
    return 'select'
  })

  const [coins, setCoins] = useState<Coin[]>([])
  const [selectedCoin, setSelectedCoin] = useState<string>('')
  const [refundAddress, setRefundAddress] = useState('')
  const [depositAddress, setDepositAddress] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [depositMemo, setDepositMemo] = useState<string | undefined>()
  const [expiresAt, setExpiresAt] = useState<string>('')
  const [status, setStatus] = useState<'waiting' | 'pending' | 'settling' | 'settled' | 'expired'>('waiting')
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // PHASE 7: Restore from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`payment_${sessionId}`)
      if (saved) {
        const data = JSON.parse(saved)
        setSelectedCoin(data.selectedCoin || '')
        setRefundAddress(data.refundAddress || '')
        setDepositAddress(data.depositAddress || '')
        setDepositAmount(data.depositAmount || '')
        setDepositMemo(data.depositMemo)
        setExpiresAt(data.expiresAt || '')
      }
    }
  }, [sessionId])

  // PHASE 2: Step 2 - Fetch coins
  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const response = await fetch('/api/widget/coins')
        if (response.ok) {
          const data = await response.json()
          setCoins(data.coins || [])
        }
      } catch (error) {
        console.error('[v0] Failed to fetch coins:', error)
      }
    }
    fetchCoins()
  }, [])

  // Timer countdown
  useEffect(() => {
    if (!expiresAt) return

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeLeft('Expired')
        setStatus('expired')
        clearInterval(interval)
      } else {
        const minutes = Math.floor(diff / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  // PHASE 3: Step 4 - Poll shift status every 5 seconds
  useEffect(() => {
    if (step !== 'payment' || status === 'settled' || status === 'expired') return

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/widget/status/${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          setStatus(data.status)
          
          if (data.status === 'settled') {
            // PHASE 3: Step 5 - Redirect to success URL
            console.log('[v0] Payment settled! Redirecting...')
            // Save completion to localStorage
            localStorage.removeItem(`payment_${sessionId}`)
          }
        }
      } catch (error) {
        console.error('[v0] Failed to poll status:', error)
      }
    }

    const interval = setInterval(pollStatus, 5000)
    return () => clearInterval(interval)
  }, [step, status, sessionId])

  // PHASE 3: Step 3 - Create quote and show deposit address
  const handleCreatePayment = async () => {
    if (!selectedCoin || !refundAddress) return

    setLoading(true)
    try {
      const response = await fetch('/api/widget/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          depositCoin: selectedCoin,
          refundAddress,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setDepositAddress(data.depositAddress)
        setDepositAmount(data.depositAmount)
        setDepositMemo(data.depositMemo)
        setExpiresAt(data.expiresAt)
        setStep('payment')

        // PHASE 7: Save to localStorage
        localStorage.setItem(`payment_${sessionId}`, JSON.stringify({
          selectedCoin,
          refundAddress,
          depositAddress: data.depositAddress,
          depositAmount: data.depositAmount,
          depositMemo: data.depositMemo,
          expiresAt: data.expiresAt,
        }))
      }
    } catch (error) {
      console.error('[v0] Failed to create payment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // PHASE 6: UI/UX - Select crypto
  if (step === 'select') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Pay {merchantName}</CardTitle>
          <p className="text-center text-3xl font-bold">${amount} {currency}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Cryptocurrency</Label>
            <select
              className="w-full mt-2 p-2 border rounded"
              value={selectedCoin}
              onChange={(e) => setSelectedCoin(e.target.value)}
            >
              <option value="">Choose...</option>
              {coins.map((coin) => (
                <option key={coin.coin} value={coin.coin}>
                  {coin.name} ({coin.coin.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
          <Button
            className="w-full"
            disabled={!selectedCoin}
            onClick={() => setStep('refund')}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    )
  }

  // PHASE 5: Security - Refund address required
  if (step === 'refund') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Refund Address</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Enter your {selectedCoin.toUpperCase()} wallet for refunds if needed
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Your {selectedCoin.toUpperCase()} Address</Label>
            <Input
              type="text"
              placeholder="0x..."
              value={refundAddress}
              onChange={(e) => setRefundAddress(e.target.value)}
              className="mt-2"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('select')} className="w-full">
              Back
            </Button>
            <Button
              className="w-full"
              disabled={!refundAddress || loading}
              onClick={handleCreatePayment}
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Create Payment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // PHASE 6: UI/UX - Payment screen (Ultra clean, big QR, copy button, timer)
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant={status === 'settled' ? 'default' : 'secondary'}>
            {status === 'settled' ? (
              <><CheckCircle2 className="w-4 h-4 mr-1" /> Paid</>
            ) : (
              <><Clock className="w-4 h-4 mr-1" /> {timeLeft}</>
            )}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {selectedCoin.toUpperCase()}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* PHASE 6: Big amount display */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Send exactly</p>
          <p className="text-4xl font-bold">{depositAmount}</p>
          <p className="text-lg text-muted-foreground">{selectedCoin.toUpperCase()}</p>
        </div>

        <Separator />

        {/* PHASE 6: Big QR code */}
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-lg">
            <QRCodeSVG value={depositAddress} size={200} />
          </div>
        </div>

        {/* PHASE 6: Copy button */}
        <div className="space-y-2">
          <Label>Deposit Address</Label>
          <div className="flex gap-2">
            <Input
              value={depositAddress}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => handleCopy(depositAddress)}
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {depositMemo && (
          <div className="space-y-2">
            <Label>Memo (Required)</Label>
            <div className="flex gap-2">
              <Input
                value={depositMemo}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleCopy(depositMemo)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* PHASE 6: Status updates */}
        <div className="text-center text-sm text-muted-foreground">
          {status === 'waiting' && 'Waiting for deposit...'}
          {status === 'pending' && 'Confirming transaction...'}
          {status === 'settling' && 'Processing payment...'}
          {status === 'settled' && 'Payment complete!'}
          {status === 'expired' && 'Payment expired'}
        </div>
      </CardContent>
    </Card>
  )
}
