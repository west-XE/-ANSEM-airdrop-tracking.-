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

type XApiUser = {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
};

type XApiTweet = {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: { like_count: number; retweet_count: number };
};

const QUERY =
  '("$ANSEM" OR "ansem coin" OR "black bull") -from:blknoiz06 -is:retweet';

/** Searches recent tweets via X API v2. Requires a free-tier bearer token (X_BEARER_TOKEN). */
export async function searchAnsemTweets(): Promise<Tweet[]> {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) return [];

  const url = new URL("https://api.twitter.com/2/tweets/search/recent");
  url.searchParams.set("query", QUERY);
  url.searchParams.set("max_results", "25");
  url.searchParams.set("tweet.fields", "created_at,public_metrics,author_id");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "profile_image_url,name,username");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${bearerToken}` },
    next: { revalidate: 300 },
  });

  if (!res.ok) return [];

  const data: { data?: XApiTweet[]; includes?: { users?: XApiUser[] } } =
    await res.json();

  const usersById = new Map(
    (data.includes?.users ?? []).map((u) => [u.id, u])
  );

  return (data.data ?? []).map((t) => {
    const user = usersById.get(t.author_id);
    return {
      id: t.id,
      text: t.text,
      authorUsername: user?.username ?? "unknown",
      authorName: user?.name ?? "Unknown",
      authorImage: user?.profile_image_url ?? null,
      likes: t.public_metrics?.like_count ?? 0,
      reposts: t.public_metrics?.retweet_count ?? 0,
      createdAt: t.created_at,
      url: `https://x.com/${user?.username ?? "i"}/status/${t.id}`,
    };
  });
}
