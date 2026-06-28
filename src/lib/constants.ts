export const ANSEM_MINT = "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump";
export const ANSEM_WALLET = "AVAZvHLR2PcWpDf8BXY4rVxNHYRBytycHkcB5z5QNXYm";

// Prefer a server-only RPC URL (so a private key isn't shipped to the browser),
// then a public one, then the rate-limited default. The public mainnet-beta
// endpoint blocks datacenter IPs and disables getProgramAccounts, so a free
// provider key (Helius/QuickNode/Alchemy free tier) is recommended in production.
export const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

export const TOKEN_DECIMALS = 6;
