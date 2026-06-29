import { Header } from "@/components/header";
import { TransfersTable } from "@/components/transfers-table";
import { HoldersTable } from "@/components/holders-table";
import { TweetFeed } from "@/components/tweet-feed";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
        <TransfersTable />
        <HoldersTable />
        <TweetFeed />
      </main>
      <footer className="border-t border-neutral-100 px-6 py-6 text-center text-xs text-neutral-400">
        Data from public Solana RPC, Dexscreener, and X API. $ANSEM is a community token with no
        official affiliation. Not financial advice.
      </footer>
    </div>
  );
}
