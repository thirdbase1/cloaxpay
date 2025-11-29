const SIDESHIFT_BASE_URL = "https://sideshift.ai/api/v2"

interface SideShiftConfig {
  secret: string
  affiliateId?: string
  maxRetries?: number
  retryDelay?: number
}

interface SideShiftCoin {
  coin: string
  networks: string[]
  name: string
  hasMemo: boolean // Added hasMemo field
}

interface SideShiftPair {
  min: string
  max: string
  rate: string
  depositAmount?: string
  settleAmount?: string
}

interface SideShiftQuoteResponse {
  id: string
  depositCoin: string
  depositNetwork: string
  settleCoin: string
  settleNetwork: string
  depositAmount: string
  settleAmount: string
  expiresAt: string
  depositAddress: string
  affiliateId: string
  settleCoinNetworkFee?: string
  networkFeeUsd?: string
}

interface SideShiftShiftResponse {
  id: string
  depositCoin: string
  depositNetwork: string
  settleCoin: string
  settleNetwork: string
  depositAddress: string
  settleAddress: string
  status: string
  depositAmount?: string
  settleAmount?: string
  refundAddress?: string
  refundMemo?: string
}

interface SideShiftCancelResponse {
  success: boolean
}

class SideShiftClient {
  private config: SideShiftConfig

  constructor(config: SideShiftConfig) {
    this.config = {
      maxRetries: 3,
      retryDelay: 2000,
      ...config,
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, userIp?: string, retryCount = 0): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "x-sideshift-secret": this.config.secret,
      ...options.headers,
    }

    if (userIp) {
      headers["x-user-ip"] = userIp
      // Only sending x-user-ip as required by SideShift docs.
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

      const response = await fetch(`${SIDESHIFT_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.status === 403) {
        const errorText = await response.text()
        console.error("[v0] SideShift 403 Access Denied:", errorText)
        console.error("[v0] User IP being sent:", userIp || "none")
        throw new Error(`SideShift access denied. This may be due to geo-restrictions. Error: ${errorText}`)
      }

      if (response.status === 500 && retryCount < (this.config.maxRetries || 3)) {
        const delay = (this.config.retryDelay || 2000) * Math.pow(2, retryCount)
        console.log(
          `[v0] SideShift 500 error, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.config.maxRetries})`,
        )

        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.request<T>(endpoint, options, userIp, retryCount + 1)
      }

      if (!response.ok) {
        const errorText = await response.text()
        let errorJson
        try {
          errorJson = JSON.parse(errorText)
        } catch (e) {
          // Not JSON
        }

        if (errorJson && errorJson.error) {
          // Throw a structured error if possible
          const err: any = new Error(errorJson.error.message || `SideShift API error: ${response.status}`)
          err.data = errorJson.error
          err.status = response.status
          throw err
        }

        throw new Error(`SideShift API error: ${response.status} - ${errorText}`)
      }

      return response.json()
    } catch (error) {
      if (retryCount < (this.config.maxRetries || 3)) {
        const delay = (this.config.retryDelay || 2000) * Math.pow(2, retryCount)
        console.log(`[v0] Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.config.maxRetries})`)

        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.request<T>(endpoint, options, userIp, retryCount + 1)
      }

      throw error
    }
  }

  async getCoins(): Promise<SideShiftCoin[]> {
    return this.request<SideShiftCoin[]>("/coins")
  }

  async getSettlementCoins(): Promise<SideShiftCoin[]> {
    // SideShift doesn't have a specific "settlement coins" endpoint,
    // but we can filter the main coins list or just return all coins as potential settlement options.
    // For now, we'll return all coins as they can technically be settled to if the merchant has a wallet.
    return this.getCoins()
  }

  async checkPermissions(userIp?: string): Promise<{ createShift: boolean }> {
    return this.request<{ createShift: boolean }>("/permissions", {}, userIp)
  }

  async requestQuote(
    depositCoin: string,
    depositNetwork: string,
    settleCoin: string,
    settleNetwork: string,
    depositAmount?: string,
    settleAmount?: string,
    userIp?: string,
  ): Promise<{
    id: string
    depositCoin: string
    depositNetwork: string
    settleCoin: string
    settleNetwork: string
    depositAmount: string
    settleAmount: string
    rate: string
    expiresAt: string
    affiliateId: string
    // Added fee fields to response
    settleCoinNetworkFee?: string
    networkFeeUsd?: string
  }> {
    const body: any = {
      depositCoin,
      depositNetwork,
      settleCoin,
      settleNetwork,
    }

    if (depositAmount) body.depositAmount = depositAmount
    if (settleAmount) body.settleAmount = settleAmount
    if (this.config.affiliateId) body.affiliateId = this.config.affiliateId

    return this.request(
      "/quotes",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      userIp,
    )
  }

  async createVariableShift(
    depositCoin: string,
    depositNetwork: string,
    settleCoin: string,
    settleNetwork: string,
    settleAddress: string,
    refundAddress?: string,
    refundMemo?: string,
    userIp?: string,
  ): Promise<SideShiftShiftResponse> {
    const body: any = {
      depositCoin,
      depositNetwork,
      settleCoin,
      settleNetwork,
      settleAddress,
    }

    if (this.config.affiliateId) body.affiliateId = this.config.affiliateId
    if (refundAddress) body.refundAddress = refundAddress
    if (refundMemo) body.refundMemo = refundMemo

    return this.request<SideShiftShiftResponse>(
      "/shifts/variable",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      userIp,
    )
  }

  async setRefundAddress(
    shiftId: string,
    address: string,
    memo?: string,
    userIp?: string,
  ): Promise<{ id: string; refundAddress: string; refundMemo?: string }> {
    const body: any = { address }
    if (memo) body.memo = memo

    return this.request(
      `/shifts/${shiftId}/set-refund-address`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      userIp,
    )
  }

  async getShiftStatus(shiftId: string): Promise<{
    id: string
    status: string
    depositAmount?: string
    settleAmount?: string
    depositTxHash?: string
    settleTxHash?: string
    confirmedAt?: string
    detectedAt?: string
    deposits?: any[]
    refundAddress?: string
    refundMemo?: string
  }> {
    return this.request(`/shifts/${shiftId}`)
  }

  async getPairInfo(
    depositCoin: string,
    depositNetwork: string,
    settleCoin: string,
    settleNetwork: string,
    amount?: number,
    userIp?: string,
  ): Promise<{ min: string; max: string; rate: string }> {
    const from = depositNetwork ? `${depositCoin}-${depositNetwork}` : depositCoin
    const to = settleNetwork ? `${settleCoin}-${settleNetwork}` : settleCoin

    let endpoint = `/pair/${from}/${to}`
    const params = new URLSearchParams()

    if (this.config.affiliateId) params.append("affiliateId", this.config.affiliateId)
    if (amount) params.append("amount", amount.toString())

    if (params.toString()) {
      endpoint += `?${params.toString()}`
    }

    return this.request(endpoint, {}, userIp)
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.request("/cancel-order", {
        method: "POST",
        body: JSON.stringify({ orderId }),
      })
      console.log("[v0] Successfully cancelled SideShift order:", orderId)
      return true
    } catch (error) {
      console.error("[v0] Failed to cancel order:", error)
      throw error
    }
  }
}

export function createSideShiftClient(): SideShiftClient {
  const secret = process.env.SIDESHIFT_SECRET
  const affiliateId = process.env.SIDESHIFT_AFFILIATE_ID

  if (!secret) {
    throw new Error("SIDESHIFT_SECRET environment variable is required")
  }

  return new SideShiftClient({ secret, affiliateId })
}

export { SideShiftClient }
export type { SideShiftCoin, SideShiftPair, SideShiftQuoteResponse, SideShiftShiftResponse, SideShiftCancelResponse }
