import type { YouTubeVideo } from "@/schema";
import { getYouTubeApiKey } from "./getYouTubeApiKey";
import { decodeHtmlEntities } from "./utils";

// Client-side YouTube Data API v3 integration
let cachedApiKey: string | null = null;

export async function searchYouTube(query: string): Promise<YouTubeVideo[]> {
  // Get API key (cached after first call)
  if (cachedApiKey === null) {
    cachedApiKey = await getYouTubeApiKey();
  }

  if (!cachedApiKey) {
    console.error("YouTube API key not configured");
    throw new Error(
      "YouTube API key not configured. Please add VITE_YOUTUBE_API_KEY to your environment.",
    );
  }

  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "12",
    videoEmbeddable: "true",
    videoCategoryId: "10", // Music category
    key: cachedApiKey,
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to search YouTube");
  }

  const data = await response.json();

  return (
    data.items?.map((item: any) => ({
      id: item.id?.videoId || "",
      title: decodeHtmlEntities(item.snippet?.title || ""),
      thumbnail: item.snippet?.thumbnails?.medium?.url || "",
      channelTitle: decodeHtmlEntities(item.snippet?.channelTitle || ""),
    })) || []
  );
}
