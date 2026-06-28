import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import { getAnsemTransfers } from "@/lib/solana";

export async function GET() {
  try {
    const transfers = await withCache("transfers", 60_000, () =>
      getAnsemTransfers(50)
    );
    return NextResponse.json({ transfers });
  } catch (error) {
    console.error("Failed to fetch transfers", error);
    return NextResponse.json(
      { error: "Failed to fetch transfers from Solana RPC" },
      { status: 502 }
    );
  }
}
