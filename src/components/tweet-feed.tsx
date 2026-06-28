"use client";

import useSWR from "swr";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";
import { Tweet } from "@/lib/tweets";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TweetFeed() {
  const { data, error, isLoading, mutate, isValidating } = useSWR<{
    tweets: Tweet[];
    configured: boolean;
  }>("/api/tweets", fetcher, { refreshInterval: 5 * 60_000 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Supporters / X Buzz</CardTitle>
        <Button variant="secondary" onClick={() => mutate()} disabled={isValidating}>
          {isValidating ? "Refreshing…" : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : error || !data ? (
          <p className="text-sm text-neutral-400">Failed to load tweets.</p>
        ) : !data.configured ? (
          <p className="text-sm text-neutral-400">
            X API not configured. Set <code className="font-mono">X_BEARER_TOKEN</code> to enable
            this section.
          </p>
        ) : data.tweets.length === 0 ? (
          <p className="text-sm text-neutral-400">No recent tweets found.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.tweets.map((tweet) => (
              <a
                key={tweet.id}
                href={tweet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-2 rounded-xl border border-neutral-100 p-4 hover:border-neutral-300"
              >
                <div className="flex items-center gap-2">
                  {tweet.authorImage ? (
                    <Image
                      src={tweet.authorImage}
                      alt={tweet.authorUsername}
                      width={28}
                      height={28}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-neutral-100" />
                  )}
                  <div className="text-sm">
                    <div className="font-medium text-neutral-900">{tweet.authorName}</div>
                    <div className="text-neutral-400">@{tweet.authorUsername}</div>
                  </div>
                </div>
                <p className="text-sm text-neutral-700">{tweet.text}</p>
                <div className="flex items-center gap-4 text-xs text-neutral-400">
                  <span>♥ {tweet.likes}</span>
                  <span>↻ {tweet.reposts}</span>
                  <span>{formatRelativeTime(new Date(tweet.createdAt))}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
