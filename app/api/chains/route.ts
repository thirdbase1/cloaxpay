import { NextResponse } from "next/server";
import { createSideShiftClient } from "@/lib/sideshift";

export async function GET() {
  try {
    const sideshift = createSideShiftClient();
    const coins = await sideshift.getCoins();
    
    const chains = coins.map(coin => ({
      id: `${coin.coin}/${coin.networks[0] || 'mainnet'}`,
      coin: coin.coin.toUpperCase(),
      name: coin.name,
      networks: coin.networks,
      label: coin.name,
      token: coin.coin.toUpperCase(),
    }));

    return NextResponse.json({ chains });
  } catch (error) {
    console.error("[v0] Failed to fetch chains from SideShift:", error);
    return NextResponse.json(
      { error: "Failed to fetch supported chains" },
      { status: 500 }
    );
  }
}
