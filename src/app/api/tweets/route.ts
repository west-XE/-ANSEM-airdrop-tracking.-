import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import { searchAnsemTweets } from "@/lib/tweets";

export async function GET() {
  const tweets = await withCache("tweets", 5 * 60_000, searchAnsemTweets);
  return NextResponse.json({ tweets, configured: Boolean(process.env.X_BEARER_TOKEN) });
}
