export type Tweet = {
  id: string;
  text: string;
  authorUsername: string;
  authorName: string;
  authorImage: string | null;
  likes: number;
  reposts: number;
  createdAt: string;
  url: string;
};

// The account whose timeline powers the X Buzz feed. @blknoiz06 is Ansem himself
// (guaranteed active); swap to a community handle if preferred.
export const X_HANDLE = "blknoiz06";

type SyndicationTweet = {
  id_str?: string;
  text?: string;
  full_text?: string;
  created_at?: string;
  favorite_count?: number;
  retweet_count?: number;
  user?: {
    screen_name?: string;
    name?: string;
    profile_image_url_https?: string;
  };
};

/**
 * Fetches a public profile timeline via X's syndication endpoint (the same one
 * powering embedded timelines), server-side and without an API key. Reliable and
 * free, unlike the client widget which tracking-prevention and ad-blockers break.
 */
export async function fetchTimeline(handle = X_HANDLE): Promise<Tweet[]> {
  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}?showReplies=false`;

  const res = await fetch(url, {
    headers: {
      // A browser-like UA avoids the endpoint returning an empty shell.
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      Accept: "text/html",
    },
    next: { revalidate: 600 },
  });
  if (!res.ok) return [];

  const html = await res.text();
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!match) return [];

  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return [];
  }

  // Walk to the timeline entries defensively across possible shapes.
  const entries =
    (data as {
      props?: { pageProps?: { timeline?: { entries?: unknown[] } } };
    })?.props?.pageProps?.timeline?.entries ?? [];

  return parseEntries(entries, handle);
}

/** Diagnostic: shows what the syndication endpoint returns so the parser can be fixed. */
export async function fetchTimelineDebug(handle = X_HANDLE) {
  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}?showReplies=false`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      Accept: "text/html",
    },
    cache: "no-store",
  });
  const html = await res.text();
  const hasNextData = /id="__NEXT_DATA__"/.test(html);
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  let topLevelKeys: string[] = [];
  let pagePropsKeys: string[] = [];
  let entriesCount = -1;
  if (match) {
    try {
      const data = JSON.parse(match[1]) as Record<string, unknown>;
      topLevelKeys = Object.keys(data);
      const pp = (data as { props?: { pageProps?: Record<string, unknown> } })
        ?.props?.pageProps;
      if (pp) pagePropsKeys = Object.keys(pp);
      const entries = (pp as { timeline?: { entries?: unknown[] } })?.timeline
        ?.entries;
      if (Array.isArray(entries)) entriesCount = entries.length;
    } catch {
      topLevelKeys = ["<json parse failed>"];
    }
  }
  return {
    handle,
    status: res.status,
    ok: res.ok,
    htmlLength: html.length,
    hasNextData,
    topLevelKeys,
    pagePropsKeys,
    entriesCount,
    htmlSnippet: html.slice(0, 600),
  };
}

function parseEntries(entries: unknown[], handle: string): Tweet[] {
  const tweets: Tweet[] = [];
  for (const entry of entries) {
    const t = (entry as { content?: { tweet?: SyndicationTweet } })?.content
      ?.tweet;
    if (!t?.id_str) continue;
    const username = t.user?.screen_name ?? handle;
    tweets.push({
      id: t.id_str,
      text: t.full_text ?? t.text ?? "",
      authorUsername: username,
      authorName: t.user?.name ?? username,
      authorImage: t.user?.profile_image_url_https ?? null,
      likes: t.favorite_count ?? 0,
      reposts: t.retweet_count ?? 0,
      createdAt: t.created_at ?? "",
      url: `https://x.com/${username}/status/${t.id_str}`,
    });
  }
  return tweets;
}
