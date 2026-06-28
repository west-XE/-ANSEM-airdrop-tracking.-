import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import { getMarketData } from "@/lib/market";

export async function GET() {
  const data = await withCache("market", 30_000, getMarketData);
  if (!data) {
    return NextResponse.json({ error: "Market data unavailable" }, { status: 502 });
  }
  return NextResponse.json(data);
}
