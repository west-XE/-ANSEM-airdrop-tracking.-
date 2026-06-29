import { Tweet } from "react-tweet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Curated real $ANSEM posts. X rate-limits live timeline/search endpoints from
// hosted servers (429), but the single-tweet syndication API that react-tweet uses
// stays reliable. Paste tweet IDs here — the number at the end of a post's URL
// (e.g. x.com/<user>/status/<ID>).
const TWEET_IDS: string[] = [
  "2071608832728686966", // bubblemaps
  "2071595799583019192", // FabianoSolana
  "2071593848137023843", // 0xfavvee
  "2071584285216104629", // 0x_abu
];

const SEARCH_URL = `https://twitter.com/search?q=${encodeURIComponent(
  '$ANSEM OR "ansem coin" -from:blknoiz06'
)}&f=live`;

export function TweetFeed() {
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
          See more on X ↗
        </a>
      </CardHeader>
      <CardContent>
        {TWEET_IDS.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No featured posts yet.{" "}
            <a
              href={SEARCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-600 underline hover:text-neutral-900"
            >
              Browse $ANSEM on X
            </a>
            .
          </p>
        ) : (
          <div
            data-theme="light"
            className="grid gap-2 md:grid-cols-2 [&_.react-tweet-theme]:my-0"
          >
            {TWEET_IDS.map((id) => (
              <div key={id} className="flex justify-center">
                <Tweet id={id} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
