"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SEARCH_QUERY = '$ANSEM OR "ansem coin" OR "black bull" -from:blknoiz06';
const SEARCH_URL = `https://twitter.com/search?q=${encodeURIComponent(
  SEARCH_QUERY
)}&f=live`;

declare global {
  interface Window {
    twttr?: { widgets?: { load: (el?: HTMLElement | null) => void } };
  }
}

/**
 * Live X buzz via the official embeddable search timeline (free, no API token).
 * Loads platform.twitter.com/widgets.js and renders the latest posts matching
 * the $ANSEM search inside the card.
 */
export function TweetFeed() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SCRIPT_ID = "twitter-widgets-js";

    function render() {
      window.twttr?.widgets?.load(containerRef.current);
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      render();
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.onload = render;
    document.body.appendChild(script);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Supporters / X Buzz</CardTitle>
        <a
          href={SEARCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
        >
          Open on X ↗
        </a>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="min-h-[400px]">
          <a
            className="twitter-timeline"
            data-height="600"
            data-theme="light"
            data-chrome="noheader nofooter transparent"
            href={SEARCH_URL}
          >
            $ANSEM on X
          </a>
        </div>
        <p className="mt-3 text-xs text-neutral-400">
          Live posts mentioning $ANSEM, embedded from X. If nothing loads, X may be
          rate-limiting embeds — use “Open on X” above.
        </p>
      </CardContent>
    </Card>
  );
}
