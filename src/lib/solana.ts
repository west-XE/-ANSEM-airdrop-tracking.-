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

/**
 * Fetches parsed transactions ONE AT A TIME. The free Helius plan forbids batch
 * JSON-RPC requests (-32403), which is what getParsedTransactions(array) sends,
 * so we use the singular getParsedTransaction in a paced sequential loop to stay
 * under the ~10 req/s rate limit, retrying individual calls on rate-limit errors.
 */
async function fetchParsedTransactionsBatched(
  connection: Connection,
  signatures: string[],
  delayMs = 120
): Promise<(ParsedTransactionWithMeta | null)[]> {
  const results: (ParsedTransactionWithMeta | null)[] = [];
  for (let i = 0; i < signatures.length; i++) {
    let tx: ParsedTransactionWithMeta | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        tx = await connection.getParsedTransaction(signatures[i], {
          maxSupportedTransactionVersion: 0,
        });
        break;
      } catch (err) {
        const msg = String(err);
        const rateLimited = /4\d9|413|429|Too many requests|-3241[39]/.test(msg);
        if (!rateLimited || attempt === 3) throw err;
        await sleep(delayMs * (attempt + 2) * 4);
      }
    }
    results.push(tx);
    if (i + 1 < signatures.length) await sleep(delayMs);
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

  // Scan deeper than the display limit so older giveaways still surface, but keep
  // it modest to stay within the free RPC's rate limit while parsing each tx.
  const signatureInfos = await connection.getSignaturesForAddress(
    walletPubkey,
    { limit: 120 }
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

/**
 * Diagnostic: summarizes what's actually in the tracked wallet's recent history
 * so we can tell whether it's a personal wallet (transfers) or a pool (swaps),
 * and whether any outgoing transfers exist at all.
 */
export async function getTransfersDebug() {
  const connection = getConnection();
  const walletPubkey = new PublicKey(ANSEM_WALLET);

  const signatureInfos = await connection.getSignaturesForAddress(walletPubkey, {
    limit: 120,
  });
  const signatures = signatureInfos.filter((s) => !s.err).map((s) => s.signature);
  const transactions = await fetchParsedTransactionsBatched(connection, signatures);

  const programCounts: Record<string, number> = {};
  const parsedTypeCounts: Record<string, number> = {};
  let parsedTxCount = 0;
  let sysTransfersFromWallet = 0;
  let splTransfersByWallet = 0;
  let ansemBalanceDecreases = 0; // txs where this owner's $ANSEM balance dropped
  const sampleInstructions: { program: string; type: string; info: unknown }[] = [];

  for (const tx of transactions) {
    if (!tx || !tx.meta) continue;
    parsedTxCount++;

    const all = [
      ...tx.transaction.message.instructions,
      ...(tx.meta.innerInstructions ?? []).flatMap((i) => i.instructions),
    ];
    for (const ix of all) {
      const program = "program" in ix ? ix.program : (ix as { programId: { toString(): string } }).programId.toString();
      programCounts[program] = (programCounts[program] ?? 0) + 1;
      if ("parsed" in ix) {
        const p = ix.parsed as { type?: string; info?: Record<string, unknown> };
        if (p?.type) parsedTypeCounts[p.type] = (parsedTypeCounts[p.type] ?? 0) + 1;
        if (ix.program === "system" && p?.type === "transfer" && p.info?.source === ANSEM_WALLET)
          sysTransfersFromWallet++;
        if (
          ix.program === "spl-token" &&
          (p?.type === "transfer" || p?.type === "transferChecked") &&
          (p.info?.authority === ANSEM_WALLET || p.info?.multisigAuthority === ANSEM_WALLET)
        )
          splTransfersByWallet++;
        if (sampleInstructions.length < 8 && (ix.program === "system" || ix.program === "spl-token") && p?.type)
          sampleInstructions.push({ program: ix.program, type: p.type, info: p.info });
      }
    }

    // Did this owner's $ANSEM balance decrease in this tx? (robust outgoing signal)
    const pre = (tx.meta.preTokenBalances ?? []).find(
      (b) => b.owner === ANSEM_WALLET && b.mint === ANSEM_MINT
    );
    const post = (tx.meta.postTokenBalances ?? []).find(
      (b) => b.owner === ANSEM_WALLET && b.mint === ANSEM_MINT
    );
    if (pre && post) {
      const before = Number(pre.uiTokenAmount.uiAmount ?? 0);
      const after = Number(post.uiTokenAmount.uiAmount ?? 0);
      if (after < before) ansemBalanceDecreases++;
    }
  }

  return {
    wallet: ANSEM_WALLET,
    signaturesFetched: signatures.length,
    parsedTxCount,
    sysTransfersFromWallet,
    splTransfersByWallet,
    ansemBalanceDecreases,
    topPrograms: Object.entries(programCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12),
    parsedTypeCounts,
    sampleInstructions,
  };
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
