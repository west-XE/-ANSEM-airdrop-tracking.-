# $ANSEM Dashboard

A clean, white, Apple-style trading dashboard for **$ANSEM** on Solana — built entirely on
free APIs and services (no paid tiers, no paid API keys).

- Mint: `9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump`
- Ansem's wallet: `AVAZvHLR2PcWpDf8BXY4rVxNHYRBytycHkcB5z5QNXYm`

## Features

- **Header**: live price (USD/SOL), 24h change, market cap, approx. holder count.
- **Ansem Transfers & Giveaways**: outgoing SOL/$ANSEM transfers from his wallet, searchable.
- **Token Holders**: top holders table + concentration pie chart + approx total holder count.
- **Airdrop Signup**: paste a Solana address to register interest in future airdrops.
- **Top Supporters / X Buzz**: recent tweets mentioning $ANSEM (requires free X API bearer token).

## Tech stack

Next.js 15 (App Router) + TypeScript + Tailwind CSS, Recharts, `@solana/web3.js`,
`@supabase/supabase-js`, SWR for client-side data fetching/polling.

## Data sources (all free)

| Data | Source | Notes |
|---|---|---|
| Price / market cap / 24h change | [Dexscreener](https://api.dexscreener.com/latest/dex/tokens/{mint}) | No key required |
| Ansem's transfers | Solana public RPC (`getSignaturesForAddress` + `getParsedTransactions`) | `https://api.mainnet-beta.solana.com` |
| Top holders | Solana public RPC (`getTokenLargestAccounts`) | Capped at 20 accounts by the RPC itself |
| Approx. holder count | Solana public RPC (`getProgramAccounts` on the Token program, filtered by mint) | Heavy call — cached 5 min |
| Tweets | X API v2 `tweets/search/recent` | Free tier; requires a bearer token |
| Airdrop signups | Supabase (Postgres) | Free tier |

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + (optionally) X bearer token
npm run dev
```

The app works without any env vars — price/holders/transfers come from free public RPC and
Dexscreener with no keys needed. Airdrop signups and the X buzz feed degrade gracefully
("not configured") until you add the relevant env vars.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
X_BEARER_TOKEN=
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### Supabase setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Run this SQL in the SQL editor to create the signups table:

```sql
create table airdrop_signups (
  id uuid primary key default gen_random_uuid(),
  address text not null unique,
  created_at timestamptz not null default now()
);

alter table airdrop_signups enable row level security;

-- Allow anonymous inserts and count-only reads via the anon key.
create policy "Anyone can sign up" on airdrop_signups
  for insert to anon with check (true);

create policy "Anyone can count signups" on airdrop_signups
  for select to anon using (true);
```

3. Copy the project URL and anon key into `.env.local`.

### X (Twitter) API setup

1. Apply for a free developer account at [developer.x.com](https://developer.x.com).
2. Generate a Bearer Token for a free-tier app.
3. Set `X_BEARER_TOKEN` in `.env.local`. The free tier has tight rate limits, so the
   `/api/tweets` route caches results for 5 minutes server-side.

## Rate limits & caching strategy

- **Solana public RPC**: roughly 100 requests / 10s per IP. Transfer/holder lookups batch
  `getParsedTransactions` calls (5 at a time with a 400ms delay) and are cached in-memory for
  60–120s via `src/lib/cache.ts`.
- **Dexscreener**: cached 30s (`next: { revalidate: 30 }` + in-memory cache).
- **X API free tier**: very limited monthly request budget — cached 5 minutes; the manual
  refresh button on the client only re-validates the cached server route, it does not bypass it.
- **Approx. holder count** (`getProgramAccounts`) is the heaviest RPC call used here; it's cached
  5 minutes and only ever computed server-side.

All caching lives in `src/lib/cache.ts`, an in-memory TTL cache scoped to the server process —
sufficient for a single-instance deployment (e.g. Vercel free tier, one serverless region) but
resets per cold start.

## Known free-tier limitations

- `getTokenLargestAccounts` is capped at 20 accounts by Solana's RPC itself — there's no way to
  page beyond that without a paid indexer (Helius, Birdeye, etc.), which is intentionally out of
  scope here. The "Top holders" note in the UI calls this out.
- The approx. holder count via `getProgramAccounts` scans every token account for the mint,
  which can be slow/heavy for popular tokens on the shared public RPC — hence the 5 minute cache.
- The X API free tier has a small monthly post cap; the tweets section is designed to fail
  gracefully (shows "not configured" or "no recent tweets") rather than error out.

## Project structure

```
src/
  app/
    api/
      market/route.ts      Dexscreener price/market data
      transfers/route.ts   Ansem's outgoing transfers via Solana RPC
      holders/route.ts     Top holders + approx holder count via Solana RPC
      tweets/route.ts      X API v2 recent search
      airdrop/route.ts     Supabase signups (GET count / POST signup)
    page.tsx                Dashboard layout
    layout.tsx, globals.css White/clean theme, system font stack
  components/
    header.tsx, transfers-table.tsx, holders-table.tsx,
    airdrop-form.tsx, tweet-feed.tsx
    ui/                     Card, Button, Input, Skeleton, Badge primitives
  lib/
    solana.ts               RPC helpers (transfers, holders, holder count)
    market.ts                Dexscreener client
    tweets.ts                 X API client
    supabase.ts               Supabase client factory
    cache.ts                  In-memory TTL cache
    constants.ts, utils.ts
```
