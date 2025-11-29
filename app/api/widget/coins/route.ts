// PHASE 2: Endpoint 1️⃣ - GET List of Coins

import { NextResponse } from 'next/server'
import { createSideShiftClient } from '@/lib/sideshift-client'

export async function GET() {
  try {
    const sideshift = createSideShiftClient()
    const coins = await sideshift.getCoins()

    return NextResponse.json({ coins })
  } catch (error) {
    console.error('[v0] Failed to fetch coins:', error)
    
    // PHASE 7: Fallback coins if SideShift API is down
    return NextResponse.json({
      coins: [
        { coin: 'btc', name: 'Bitcoin', networks: ['mainnet'], hasMemo: false },
        { coin: 'eth', name: 'Ethereum', networks: ['mainnet'], hasMemo: false },
        { coin: 'sol', name: 'Solana', networks: ['mainnet'], hasMemo: false },
        { coin: 'usdc', name: 'USD Coin', networks: ['ethereum', 'solana', 'polygon'], hasMemo: false },
        { coin: 'usdt', name: 'Tether', networks: ['ethereum', 'bsc', 'polygon'], hasMemo: false },
      ],
    })
  }
}
