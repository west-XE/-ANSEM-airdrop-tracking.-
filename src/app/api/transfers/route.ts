import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import { getAnsemTransfers, getTransfersDebug } from "@/lib/solana";

// Parsing many transactions within the free RPC's rate limit takes a while;
// allow more time than the default. (Hobby supports up to 60s.)
export const maxDuration = 60;

export async function GET(request: Request) {
  const debug = new URL(request.url).searchParams.get("debug");
  try {
    if (debug) {
      const info = await getTransfersDebug();
      return NextResponse.json(info);
    }
    const transfers = await withCache("transfers", 60_000, () =>
      getAnsemTransfers(50)
    );
    return NextResponse.json({ transfers });
  } catch (error) {
    console.error("Failed to fetch transfers", error);
    return NextResponse.json(
      { error: "Failed to fetch transfers from Solana RPC", detail: String(error) },
      { status: 502 }
    );
  }
}
