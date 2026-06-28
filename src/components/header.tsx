"use client";

import useSWR from "swr";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompact, formatUsd } from "@/lib/utils";
import { MarketData } from "@/lib/market";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function StatBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: "up" | "down";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </span>
      <span
        className={
          "font-mono text-lg font-semibold " +
          (accent === "up"
            ? "text-emerald-600"
            : accent === "down"
            ? "text-red-500"
            : "text-neutral-900")
        }
      >
        {value}
      </span>
    </div>
  );
}

export function Header() {
  const { data, error, isLoading } = useSWR<MarketData>(
    "/api/market",
    fetcher,
    { refreshInterval: 30_000 }
  );
  const { data: holdersData } = useSWR<{ holderCount: number }>(
    "/api/holders",
    fetcher,
    { refreshInterval: 120_000 }
  );
  const holderCount = holdersData?.holderCount;

  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 font-mono text-sm font-bold text-white">
            $A
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
              $ANSEM Dashboard
            </h1>
            <p className="text-xs text-neutral-400">Live on Solana</p>
          </div>
        </div>

        {isLoading && (
          <div className="flex gap-8">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-20" />
            ))}
          </div>
        )}

        {error || (data && !data.priceUsd) ? (
          <p className="text-sm text-neutral-400">Market data unavailable</p>
        ) : data ? (
          <div className="flex flex-wrap gap-8">
            <StatBlock label="Price (USD)" value={formatUsd(data.priceUsd, 6)} />
            <StatBlock
              label="Price (SOL)"
              value={data.priceSol ? data.priceSol.toFixed(8) : "—"}
            />
            <StatBlock
              label="24h Change"
              value={
                data.change24h !== null
                  ? `${data.change24h > 0 ? "+" : ""}${data.change24h.toFixed(2)}%`
                  : "—"
              }
              accent={
                data.change24h === null ? undefined : data.change24h >= 0 ? "up" : "down"
              }
            />
            <StatBlock
              label="Market Cap"
              value={data.marketCapUsd ? `$${formatCompact(data.marketCapUsd)}` : "—"}
            />
            <StatBlock
              label="Holders"
              value={holderCount !== undefined ? formatCompact(holderCount) : "—"}
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
