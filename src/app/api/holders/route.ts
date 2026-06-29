import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import { getTopHolders } from "@/lib/solana";

export async function GET() {
  // Note: an exact holder count requires scanning every token account
  // (getProgramAccounts), which is huge and disabled/too slow on the free tier,
  // so it's intentionally omitted here to keep this endpoint fast. The UI shows
  // "—" for the total. Top holders come from getTokenLargestAccounts (fast).
  try {
    const { holders, totalSupply } = await withCache(
      "top-holders",
      120_000,
      getTopHolders
    );
    return NextResponse.json({ holders, totalSupply, holderCount: null });
  } catch (error) {
    console.error("Failed to fetch holders", error);
    return NextResponse.json(
      { error: "Failed to fetch holders from Solana RPC" },
      { status: 502 }
    );
  }
}
