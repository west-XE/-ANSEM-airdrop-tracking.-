import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import { getApproxHolderCount, getTopHolders } from "@/lib/solana";

export async function GET() {
  try {
    const [{ holders, totalSupply }, holderCount] = await Promise.all([
      withCache("top-holders", 120_000, getTopHolders),
      withCache("holder-count", 300_000, getApproxHolderCount),
    ]);
    return NextResponse.json({ holders, totalSupply, holderCount });
  } catch (error) {
    console.error("Failed to fetch holders", error);
    return NextResponse.json(
      { error: "Failed to fetch holders from Solana RPC" },
      { status: 502 }
    );
  }
}
