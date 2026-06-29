import { Tweet } from "react-tweet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Curated real $ANSEM-related posts. X rate-limits live timeline/search endpoints
// from hosted servers (429), but the single-tweet syndication API that react-tweet
// uses stays reliable. Add/replace IDs here to update the feed.
const TWEET_IDS = ["2071349876256887063", "2071081835585470538"];

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
      </CardContent>
    </Card>
  );
}
