export class InputValidator {
  // Validate crypto addresses
  static isValidAddress(address: string, network: string): boolean {
    if (!address || typeof address !== "string") return false

    // EVM chains (Ethereum, BSC, Polygon, etc.)
    if (["ethereum", "bsc", "polygon", "arbitrum", "optimism", "base", "avalanche"].includes(network.toLowerCase())) {
      return /^0x[a-fA-F0-9]{40}$/.test(address)
    }

    // Solana
    if (network.toLowerCase() === "solana") {
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
    }

    // Bitcoin
    if (network.toLowerCase() === "bitcoin" || network.toLowerCase() === "mainnet") {
      return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address)
    }

    // Generic validation
    return address.length >= 20 && address.length <= 120
  }

  // Validate amount
  static isValidAmount(amount: any, min = 0.01, max = 1000000): boolean {
    if (typeof amount !== "number") return false
    if (isNaN(amount) || !isFinite(amount)) return false
    return amount >= min && amount <= max
  }

  // Validate session ID format
  static isValidSessionId(sessionId: string): boolean {
    if (!sessionId || typeof sessionId !== "string") return false
    return /^sess_[a-f0-9]{32,64}$/.test(sessionId)
  }

  // Validate API key format
  static isValidApiKey(key: string): boolean {
    if (!key || typeof key !== "string") return false
    return /^(pk|sk)_(test|live)_[a-f0-9]{64}$/.test(key)
  }

  // Validate email
  static isValidEmail(email: string): boolean {
    if (!email || typeof email !== "string") return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Validate URL
  static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return ["http:", "https:"].includes(parsed.protocol)
    } catch {
      return false
    }
  }

  // Sanitize string input
  static sanitizeString(input: string, maxLength = 1000): string {
    if (!input || typeof input !== "string") return ""
    return input.slice(0, maxLength).trim()
  }

  // Validate coin symbol
  static isValidCoinSymbol(coin: string): boolean {
    if (!coin || typeof coin !== "string") return false
    return /^[a-zA-Z]{2,10}$/.test(coin)
  }

  // Validate network name
  static isValidNetwork(network: string): boolean {
    if (!network || typeof network !== "string") return false
    return /^[a-z0-9-]{2,20}$/.test(network)
  }
}
