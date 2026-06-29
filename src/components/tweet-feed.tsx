"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// X deprecated embeddable *search* timelines (they render blank), so we embed a
// profile timeline, which renders reliably. @AnsemCoinSol is the $ANSEM community
// account. Change this handle to feature a different account.
const X_HANDLE = "AnsemCoinSol";
const PROFILE_URL = `https://twitter.com/${X_HANDLE}`;

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
          href={`https://twitter.com/search?q=${encodeURIComponent(
            '$ANSEM OR "ansem coin" -from:blknoiz06'
          )}&f=live`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
        >
          Search $ANSEM on X ↗
        </a>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="min-h-[400px]">
          <a
            className="twitter-timeline"
            data-height="600"
            data-theme="light"
            data-chrome="noheader nofooter transparent"
            href={PROFILE_URL}
          >
            Tweets by @{X_HANDLE}
          </a>
        </div>
        <p className="mt-3 text-xs text-neutral-400">
          Live from the @{X_HANDLE} community on X. Use “Search $ANSEM on X” above
          for the full mentions feed.
        </p>
      </CardContent>
    </Card>
  );
}
