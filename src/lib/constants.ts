export const ANSEM_MINT = "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump";
export const ANSEM_WALLET = "AVAZvHLR2PcWpDf8BXY4rVxNHYRBytycHkcB5z5QNXYm";

// Prefer a server-only RPC URL (so a private key isn't shipped to the browser),
// then a public one, then the fallback below. The public mainnet-beta endpoint
// blocks datacenter IPs and disables getProgramAccounts, so a free provider key
// (Helius/QuickNode/Alchemy free tier) is used as the default.
//
// NOTE: this fallback key is committed to the repo and therefore public. For a
// production site, set SOLANA_RPC_URL in your host's env (it takes precedence)
// and/or restrict this key to your domain in the Helius dashboard, then rotate.
const FALLBACK_RPC_URL =
  "https://mainnet.helius-rpc.com/?api-key=c4a83397-a721-4816-8e74-cc17a8a43823";

export const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  FALLBACK_RPC_URL;

export const TOKEN_DECIMALS = 6;
