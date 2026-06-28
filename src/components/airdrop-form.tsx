"use client";

import { FormEvent, useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCompact } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AirdropForm() {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const { data, mutate } = useSWR<{ count: number; configured: boolean }>(
    "/api/airdrop",
    fetcher
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/airdrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", message: json.error ?? "Something went wrong." });
      } else {
        setStatus({ type: "success", message: "You're signed up for future $ANSEM airdrops." });
        setAddress("");
        mutate();
      }
    } catch {
      setStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Airdrop Signup</CardTitle>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-neutral-400">Signups</div>
          <div className="font-mono text-lg font-semibold text-neutral-900">
            {data ? formatCompact(data.count) : "—"}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Your Solana wallet address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            className="font-mono"
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Sign up"}
          </Button>
        </form>
        {status && (
          <p
            className={`mt-3 text-sm ${
              status.type === "success" ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {status.message}
          </p>
        )}
        <p className="mt-3 text-xs text-neutral-400">
          Submitting your address does not guarantee an airdrop. $ANSEM is a community coin with
          no official affiliation; this list is informational only.
        </p>
      </CardContent>
    </Card>
  );
}
