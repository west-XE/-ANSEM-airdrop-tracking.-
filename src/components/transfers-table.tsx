"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge, CopyButton } from "@/components/ui/badge";
import {
  formatNumber,
  formatRelativeTime,
  shortAddress,
  solscanAddressUrl,
  solscanTxUrl,
} from "@/lib/utils";
import { TransferEvent } from "@/lib/solana";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TransfersTable() {
  const [search, setSearch] = useState("");
  const { data, error, isLoading } = useSWR<{ transfers: TransferEvent[] }>(
    "/api/transfers",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const filtered = useMemo(() => {
    const transfers = data?.transfers ?? [];
    if (!search.trim()) return transfers;
    const q = search.toLowerCase();
    return transfers.filter(
      (t) =>
        t.to.toLowerCase().includes(q) ||
        t.signature.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ansem Transfers & Giveaways</CardTitle>
        <Input
          placeholder="Search address or tx…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
        />
      </CardHeader>
      <CardContent className="max-h-[480px] overflow-y-auto overflow-x-auto p-0">
        {isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="p-5 text-sm text-neutral-400">Failed to load transfers.</p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-sm text-neutral-400">No transfers found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-5 py-3 font-medium">Timestamp</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">To</th>
                <th className="px-5 py-3 font-medium">Tx</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.signature}
                  className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50"
                >
                  <td className="whitespace-nowrap px-5 py-3 text-neutral-500">
                    {t.timestamp ? formatRelativeTime(new Date(t.timestamp * 1000)) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge>{t.type}</Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-neutral-900">
                    {formatNumber(t.amount, 4)} {t.type === "SOL" ? "SOL" : "$ANSEM"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 font-mono text-neutral-700">
                      <a
                        href={solscanAddressUrl(t.to)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {shortAddress(t.to)}
                      </a>
                      <CopyButton value={t.to} />
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <a
                      href={solscanTxUrl(t.signature)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-neutral-500 hover:underline"
                    >
                      {shortAddress(t.signature)} ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
