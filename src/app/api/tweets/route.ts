import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import { fetchTimeline, X_HANDLE } from "@/lib/tweets";

export const maxDuration = 30;

export async function GET() {
  try {
    const tweets = await withCache("tweets", 10 * 60_000, () => fetchTimeline());
    return NextResponse.json({ tweets, handle: X_HANDLE });
  } catch (error) {
    console.error("Failed to fetch timeline", error);
    return NextResponse.json({ tweets: [], handle: X_HANDLE });
  }
}
