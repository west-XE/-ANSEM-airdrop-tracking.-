import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import { getApproxHolderCount, getTopHolders } from "@/lib/solana";

export async function GET() {
  // The approximate holder count uses getProgramAccounts, which many RPCs
  // (including the public endpoint) disable or rate-limit. Keep it independent
  // so a failure there never blocks the top-holders table.
  const holderCountResult = withCache("holder-count", 300_000, getApproxHolderCount)
    .then((count) => count as number | null)
    .catch((error) => {
      console.error("Failed to fetch holder count", error);
      return null;
    });

  try {
    const { holders, totalSupply } = await withCache(
      "top-holders",
      120_000,
      getTopHolders
    );
    const holderCount = await holderCountResult;
    return NextResponse.json({ holders, totalSupply, holderCount });
  } catch (error) {
    console.error("Failed to fetch holders", error);
    return NextResponse.json(
      { error: "Failed to fetch holders from Solana RPC" },
      { status: 502 }
    );
  }
}
