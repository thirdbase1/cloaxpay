export interface ExplorerLink {
  name: string;
  url: string;
  icon: string;
}

export function getBlockchainExplorer(
  network: string,
  txHash?: string,
  address?: string
): ExplorerLink | null {
  const explorers: Record<string, { name: string; baseUrl: string; icon: string }> = {
    // Bitcoin
    bitcoin: { name: "Blockchain.com", baseUrl: "https://www.blockchain.com/btc", icon: "₿" },
    
    // Ethereum
    ethereum: { name: "Etherscan", baseUrl: "https://etherscan.io", icon: "Ξ" },
    arbitrum: { name: "Arbiscan", baseUrl: "https://arbiscan.io", icon: "Ξ" },
    optimism: { name: "Optimistic Etherscan", baseUrl: "https://optimistic.etherscan.io", icon: "Ξ" },
    polygon: { name: "PolygonScan", baseUrl: "https://polygonscan.com", icon: "⬡" },
    base: { name: "BaseScan", baseUrl: "https://basescan.org", icon: "Ξ" },
    
    // Solana
    solana: { name: "Solscan", baseUrl: "https://solscan.io", icon: "◎" },
    
    // BSC
    bsc: { name: "BscScan", baseUrl: "https://bscscan.com", icon: "⬢" },
    
    // Avalanche
    avalanche: { name: "SnowTrace", baseUrl: "https://snowtrace.io", icon: "▲" },
    
    // Tron
    tron: { name: "Tronscan", baseUrl: "https://tronscan.org", icon: "T" },
  };

  const explorer = explorers[network.toLowerCase()];
  if (!explorer) return null;

  let url = explorer.baseUrl;
  
  if (txHash) {
    url += `/tx/${txHash}`;
  } else if (address) {
    url += `/address/${address}`;
  }

  return {
    name: explorer.name,
    url,
    icon: explorer.icon,
  };
}

export function getNetworkDisplayName(network: string): string {
  const names: Record<string, string> = {
    ethereum: "Ethereum",
    arbitrum: "Arbitrum",
    optimism: "Optimism",
    polygon: "Polygon",
    base: "Base",
    solana: "Solana",
    bitcoin: "Bitcoin",
    bsc: "BSC",
    avalanche: "Avalanche",
    tron: "Tron",
  };
  
  return names[network.toLowerCase()] || network;
}
