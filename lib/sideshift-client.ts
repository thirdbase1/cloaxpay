// PHASE 2: Ultra-lightweight SideShift client with ONLY 5 essential endpoints
// Includes automatic retry logic for 500 errors (PHASE 7)

interface SideShiftConfig {
  affiliateId: string
  secret: string
  baseUrl?: string
  maxRetries?: number
  retryDelay?: number
}

interface Coin {
  coin: string
  name: string
  networks: string[]
  hasMemo: boolean
}

interface QuoteRequest {
  depositCoin: string
  depositNetwork: string | null
  settleCoin: string
  settleNetwork: string | null
  settleAmount: string
  affiliateId: string
  refundAddress: string
}

interface QuoteResponse {
  id: string
  depositCoin: string
  settleCoin: string
  depositNetwork: string
  settleNetwork: string
  depositAmount: string
  settleAmount: string
  rate: string
  expiresAt: string
}

interface VariableShiftRequest {
  depositCoin: string
  depositNetwork: string | null
  settleCoin: string
  settleNetwork: string | null
  settleAddress: string
  refundAddress: string
  affiliateId: string
}

interface ShiftResponse {
  id: string
  depositAddress: string
  depositMemo?: string
  depositMin: string
  depositMax: string
  expiresAt: string
  status: "waiting" | "pending-confirmation" | "settling" | "settled" | "failed" | "expired"
  depositAmount?: string
  settleAmount?: string
}

export class SideShiftClient {
  private config: SideShiftConfig

  constructor(config: SideShiftConfig) {
    this.config = {
      baseUrl: "https://sideshift.ai/api/v2",
      maxRetries: 3,
      retryDelay: 2000,
      ...config,
    }
  }

  // PHASE 7: Automatic retry logic for 500 errors
  private async fetchWithRetry(url: string, options: RequestInit, retries = 0): Promise<Response> {
    try {
      const response = await fetch(url, options)

      // If 500 error and retries left, retry with exponential backoff
      if (response.status === 500 && retries < (this.config.maxRetries || 3)) {
        const delay = (this.config.retryDelay || 2000) * Math.pow(2, retries)
        console.log(
          `[v0] SideShift 500 error, retrying in ${delay}ms... (attempt ${retries + 1}/${this.config.maxRetries})`,
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.fetchWithRetry(url, options, retries + 1)
      }

      return response
    } catch (error) {
      // Network error - retry if retries left
      if (retries < (this.config.maxRetries || 3)) {
        const delay = (this.config.retryDelay || 2000) * Math.pow(2, retries)
        console.log(`[v0] Network error, retrying in ${delay}ms... (attempt ${retries + 1}/${this.config.maxRetries})`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.fetchWithRetry(url, options, retries + 1)
      }
      throw error
    }
  }

  // 1️⃣ GET List of Coins
  async getCoins(): Promise<Coin[]> {
    const response = await this.fetchWithRetry(`${this.config.baseUrl}/coins`, {
      method: "GET",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch coins: ${response.status}`)
    }

    return response.json()
  }

  // 2️⃣ POST Create a Quote (Variable Shift)
  async createQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const response = await this.fetchWithRetry(`${this.config.baseUrl}/quotes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sideshift-secret": this.config.secret,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create quote: ${response.status} - ${error}`)
    }

    return response.json()
  }

  // 3️⃣ POST Create Shift (Variable)
  async createVariableShift(request: VariableShiftRequest): Promise<ShiftResponse> {
    const response = await this.fetchWithRetry(`${this.config.baseUrl}/shifts/variable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sideshift-secret": this.config.secret,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create shift: ${response.status} - ${error}`)
    }

    return response.json()
  }

  async setRefundAddress(shiftId: string, address: string, memo?: string): Promise<any> {
    const body: any = { address }
    if (memo) body.memo = memo

    const response = await this.fetchWithRetry(`${this.config.baseUrl}/shifts/${shiftId}/set-refund-address`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sideshift-secret": this.config.secret,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to set refund address: ${response.status} - ${error}`)
    }

    return response.json()
  }

  // 4️⃣ GET Shift Status (for polling)
  async getShiftStatus(shiftId: string): Promise<ShiftResponse> {
    const response = await this.fetchWithRetry(`${this.config.baseUrl}/shifts/${shiftId}`, {
      method: "GET",
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get shift status: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data
  }
}

export const createSideShiftClient = () => {
  return new SideShiftClient({
    affiliateId: process.env.SIDESHIFT_AFFILIATE_ID!,
    secret: process.env.SIDESHIFT_SECRET!,
  })
}
