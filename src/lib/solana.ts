import {
  Connection,
  ParsedTransactionWithMeta,
  PublicKey,
} from "@solana/web3.js";
import { ANSEM_MINT, ANSEM_WALLET, SOLANA_RPC_URL, TOKEN_DECIMALS } from "./constants";

export function getConnection() {
  return new Connection(SOLANA_RPC_URL, "confirmed");
}

export type TransferEvent = {
  signature: string;
  timestamp: number | null;
  type: "SOL" | "TOKEN";
  amount: number;
  to: string;
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetches parsed transactions in small batches with a delay to respect the public RPC's ~100 req/10s limit. */
async function fetchParsedTransactionsBatched(
  connection: Connection,
  signatures: string[],
  batchSize = 25,
  delayMs = 150
): Promise<(ParsedTransactionWithMeta | null)[]> {
  const results: (ParsedTransactionWithMeta | null)[] = [];
  for (let i = 0; i < signatures.length; i += batchSize) {
    const batch = signatures.slice(i, i + batchSize);
    const txs = await connection.getParsedTransactions(batch, {
      maxSupportedTransactionVersion: 0,
    });
    results.push(...txs);
    if (i + batchSize < signatures.length) await sleep(delayMs);
  }
  return results;
}

/**
 * Finds outgoing SOL and $ANSEM token transfers from Ansem's wallet by scanning
 * his recent transaction history via getSignaturesForAddress + getParsedTransactions.
 */
export async function getAnsemTransfers(limit = 50): Promise<TransferEvent[]> {
  const connection = getConnection();
  const walletPubkey = new PublicKey(ANSEM_WALLET);

  // Scan deeper than the display limit so older giveaways still surface; most of
  // his recent activity may be incoming/swaps with no outgoing transfers.
  const signatureInfos = await connection.getSignaturesForAddress(
    walletPubkey,
    { limit: 250 }
  );
  const signatures = signatureInfos
    .filter((s) => !s.err)
    .map((s) => s.signature);

  const transactions = await fetchParsedTransactionsBatched(
    connection,
    signatures
  );

  const events: TransferEvent[] = [];

  for (const tx of transactions) {
    if (!tx || !tx.meta) continue;
    const blockTime = tx.blockTime ?? null;
    const signature = tx.transaction.signatures[0];

    // Giveaways are frequently sent through batching tools or alongside swaps,
    // so the real transfer lands in inner instructions rather than top-level.
    // Scan both.
    const topLevel = tx.transaction.message.instructions;
    const inner = (tx.meta.innerInstructions ?? []).flatMap((i) => i.instructions);

    for (const ix of [...topLevel, ...inner]) {
      if (!("parsed" in ix)) continue;
      const parsed = ix.parsed as
        | { type: string; info?: Record<string, unknown> }
        | undefined;
      if (!parsed?.info) continue;

      // Native SOL transfer out of Ansem's wallet
      if (
        ix.program === "system" &&
        parsed.type === "transfer" &&
        parsed.info.source === ANSEM_WALLET
      ) {
        events.push({
          signature,
          timestamp: blockTime,
          type: "SOL",
          amount: Number(parsed.info.lamports ?? 0) / 1e9,
          to: String(parsed.info.destination),
        });
      }

      // SPL token transfer authorized by Ansem's wallet (any token he sends out).
      if (
        ix.program === "spl-token" &&
        (parsed.type === "transfer" || parsed.type === "transferChecked")
      ) {
        const authority =
          (parsed.info.authority as string | undefined) ??
          (parsed.info.multisigAuthority as string | undefined);
        if (authority === ANSEM_WALLET) {
          const tokenAmount = parsed.info.tokenAmount as
            | { uiAmount?: number; decimals?: number }
            | undefined;
          const rawAmount = parsed.info.amount as string | undefined;
          const decimals = tokenAmount?.decimals ?? TOKEN_DECIMALS;
          const amount =
            tokenAmount?.uiAmount ??
            (rawAmount ? Number(rawAmount) / 10 ** decimals : 0);
          events.push({
            signature,
            timestamp: blockTime,
            type: "TOKEN",
            amount,
            to: String(parsed.info.destination),
          });
        }
      }
    }
  }

  // A single tx can contain repeated transfers; de-duplicate by sig + to + amount.
  const seen = new Set<string>();
  return events
    .filter((e) => {
      const key = `${e.signature}:${e.type}:${e.to}:${e.amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .filter((e) => e.amount > 0)
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    .slice(0, limit);
}

export type HolderEntry = {
  rank: number;
  address: string;
  balance: number;
  percentOfSupply: number;
};

/** Top holders via getTokenLargestAccounts (RPC caps this at 20 accounts). */
export async function getTopHolders(): Promise<{
  holders: HolderEntry[];
  totalSupply: number;
}> {
  const connection = getConnection();
  const mintPubkey = new PublicKey(ANSEM_MINT);

  const [largestAccounts, supplyInfo] = await Promise.all([
    connection.getTokenLargestAccounts(mintPubkey),
    connection.getTokenSupply(mintPubkey),
  ]);

  const totalSupply = supplyInfo.value.uiAmount ?? 0;

  // Resolve owner addresses for each token account in small batches.
  const accounts = largestAccounts.value;
  const owners = await Promise.all(
    accounts.map(async (acc) => {
      try {
        const info = await connection.getParsedAccountInfo(acc.address);
        const parsed = info.value?.data;
        if (parsed && "parsed" in parsed) {
          return (parsed.parsed.info.owner as string) ?? acc.address.toBase58();
        }
        return acc.address.toBase58();
      } catch {
        return acc.address.toBase58();
      }
    })
  );

  const holders: HolderEntry[] = accounts.map((acc, i) => {
    const balance = acc.uiAmount ?? 0;
    return {
      rank: i + 1,
      address: owners[i],
      balance,
      percentOfSupply: totalSupply > 0 ? (balance / totalSupply) * 100 : 0,
    };
  });

  return { holders, totalSupply };
}

/**
 * Approximate holder count = number of token accounts holding the mint
 * (getProgramAccounts on the Token program, filtered by mint). Returns null when
 * the RPC returns nothing so the UI can show "—" instead of a misleading 0.
 * Heavy call — cached upstream.
 */
export async function getApproxHolderCount(): Promise<number | null> {
  const connection = getConnection();
  const TOKEN_PROGRAM_ID = new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
  );

  const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      { dataSize: 165 },
      { memcmp: { offset: 0, bytes: ANSEM_MINT } },
    ],
    dataSlice: { offset: 64, length: 8 },
  });

  if (accounts.length === 0) return null;

  // Count accounts with a non-zero balance (the 8-byte slice = amount, u64 LE).
  // If the data can't be read as expected, fall back to counting all accounts.
  let nonZero = 0;
  let readable = false;
  for (const acc of accounts) {
    const buf = acc.account.data as Buffer;
    if (Buffer.isBuffer(buf) && buf.length >= 8) {
      readable = true;
      if (buf.readBigUInt64LE(0) > BigInt(0)) nonZero++;
    }
  }
  return readable ? nonZero : accounts.length;
}
