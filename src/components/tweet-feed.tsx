"use client";

import useSWR from "swr";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";
import { Tweet } from "@/lib/tweets";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SEARCH_URL = `https://twitter.com/search?q=${encodeURIComponent(
  '$ANSEM OR "ansem coin" -from:blknoiz06'
)}&f=live`;

export function TweetFeed() {
  const { data, error, isLoading, mutate, isValidating } = useSWR<{
    tweets: Tweet[];
    handle: string;
  }>("/api/tweets", fetcher, { refreshInterval: 10 * 60_000 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Supporters / X Buzz</CardTitle>
        <div className="flex items-center gap-3">
          <a
            href={SEARCH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
          >
            Search $ANSEM ↗
          </a>
          <Button variant="secondary" onClick={() => mutate()} disabled={isValidating}>
            {isValidating ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : error || !data || data.tweets.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No posts to show right now.{" "}
            <a
              href={SEARCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-600 underline hover:text-neutral-900"
            >
              See $ANSEM on X
            </a>
            .
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.tweets.map((tweet) => (
              <a
                key={tweet.id}
                href={tweet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-2 rounded-xl border border-neutral-100 p-4 transition-colors hover:border-neutral-300"
              >
                <div className="flex items-center gap-2">
                  {tweet.authorImage ? (
                    <Image
                      src={tweet.authorImage}
                      alt={tweet.authorUsername}
                      width={28}
                      height={28}
                      className="rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-neutral-100" />
                  )}
                  <div className="text-sm leading-tight">
                    <div className="font-medium text-neutral-900">{tweet.authorName}</div>
                    <div className="text-neutral-400">@{tweet.authorUsername}</div>
                  </div>
                </div>
                <p className="line-clamp-5 text-sm text-neutral-700">{tweet.text}</p>
                <div className="mt-auto flex items-center gap-4 text-xs text-neutral-400">
                  <span>♥ {tweet.likes.toLocaleString()}</span>
                  <span>↻ {tweet.reposts.toLocaleString()}</span>
                  {tweet.createdAt && (
                    <span>{formatRelativeTime(new Date(tweet.createdAt))}</span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
