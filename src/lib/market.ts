import { ANSEM_MINT } from "./constants";

export type MarketData = {
  priceUsd: number;
  priceSol: number | null;
  change24h: number | null;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  pairUrl: string | null;
};

type DexscreenerPair = {
  priceUsd?: string;
  priceNative?: string;
  priceChange?: { h24?: number };
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  url?: string;
};

/** Free, no-key Dexscreener endpoint for live price/market data. */
export async function getMarketData(): Promise<MarketData | null> {
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${ANSEM_MINT}`,
    { next: { revalidate: 30 } }
  );
  if (!res.ok) return null;

  const data: { pairs?: DexscreenerPair[] } = await res.json();
  const pairs = data.pairs ?? [];
  if (pairs.length === 0) return null;

  // Use the pair with the highest liquidity as the primary price source.
  const best = pairs.reduce((a, b) =>
    (b.liquidity?.usd ?? 0) > (a.liquidity?.usd ?? 0) ? b : a
  );

  return {
    priceUsd: Number(best.priceUsd ?? 0),
    priceSol: best.priceNative ? Number(best.priceNative) : null,
    change24h: best.priceChange?.h24 ?? null,
    marketCapUsd: best.marketCap ?? best.fdv ?? null,
    liquidityUsd: best.liquidity?.usd ?? null,
    volume24hUsd: best.volume?.h24 ?? null,
    pairUrl: best.url ?? null,
  };
}
