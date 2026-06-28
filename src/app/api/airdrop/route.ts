import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getSupabaseClient } from "@/lib/supabase";

function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ count: 0, configured: false });
  }
  const { count, error } = await supabase
    .from("airdrop_signups")
    .select("*", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ count: 0, configured: true, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ count: count ?? 0, configured: true });
}

export async function POST(request: Request) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Airdrop signups are not configured. Set Supabase env vars." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const address = typeof body?.address === "string" ? body.address.trim() : "";

  if (!address || !isValidSolanaAddress(address)) {
    return NextResponse.json({ error: "Invalid Solana address." }, { status: 400 });
  }

  const { error } = await supabase
    .from("airdrop_signups")
    .insert({ address })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This address is already signed up." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
