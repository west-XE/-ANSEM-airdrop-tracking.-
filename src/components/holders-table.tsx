"use client";

import useSWR from "swr";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/ui/badge";
import { formatCompact, formatNumber, shortAddress, solscanAddressUrl } from "@/lib/utils";
import { HolderEntry } from "@/lib/solana";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const COLORS = [
  "#171717",
  "#404040",
  "#737373",
  "#a3a3a3",
  "#d4d4d4",
  "#e5e5e5",
];

export function HoldersTable() {
  const { data, error, isLoading } = useSWR<{
    holders: HolderEntry[];
    totalSupply: number;
    holderCount: number;
  }>("/api/holders", fetcher, { refreshInterval: 120_000 });

  const holders = data?.holders ?? [];
  const top6 = holders.slice(0, 6);
  const restPercent = Math.max(
    0,
    100 - top6.reduce((sum, h) => sum + h.percentOfSupply, 0)
  );
  const pieData = [
    ...top6.map((h) => ({ name: shortAddress(h.address), value: h.percentOfSupply })),
    ...(restPercent > 0.01 ? [{ name: "Others", value: restPercent }] : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Holders</CardTitle>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-neutral-400">
            Total Holders (approx.)
          </div>
          <div className="font-mono text-lg font-semibold text-neutral-900">
            {isLoading ? "…" : data ? formatCompact(data.holderCount) : "—"}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-neutral-400">Failed to load holders.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-400">
                    <th className="py-2 pr-3 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium">Wallet</th>
                    <th className="py-2 pr-3 font-medium">Balance</th>
                    <th className="py-2 pr-3 font-medium">% Supply</th>
                  </tr>
                </thead>
                <tbody>
                  {holders.map((h) => (
                    <tr key={h.address} className="border-b border-neutral-50 last:border-0">
                      <td className="py-2 pr-3 text-neutral-400">{h.rank}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1.5 font-mono text-neutral-700">
                          <a
                            href={solscanAddressUrl(h.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {shortAddress(h.address)}
                          </a>
                          <CopyButton value={h.address} />
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-mono text-neutral-900">
                        {formatNumber(h.balance, 0)}
                      </td>
                      <td className="py-2 pr-3 font-mono text-neutral-900">
                        {h.percentOfSupply.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-neutral-400">
                Top holders via public RPC (getTokenLargestAccounts) — capped at 20 accounts; full
                list is heavy for popular tokens.
              </p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={1}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
