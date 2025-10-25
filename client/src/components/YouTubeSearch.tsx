import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";
import { searchYouTube } from "@/lib/youtube";
import type { YouTubeVideo } from "@/schema";
import { ScrollArea } from "@/components/ui/scroll-area";

interface YouTubeSearchProps {
  onSelect: (video: YouTubeVideo) => void;
  selectedVideoId?: string;
}

export function YouTubeSearch({ onSelect, selectedVideoId }: YouTubeSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const videos = await searchYouTube(query);
      setResults(videos);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search for a song..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
            data-testid="input-youtube-search"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          data-testid="button-search"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {results.length > 0 && (
        <ScrollArea className="h-[400px] rounded-lg border p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((video) => (
              <Card
                key={video.id}
                className={`cursor-pointer hover-elevate transition-all ${
                  selectedVideoId === video.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => onSelect(video)}
                data-testid={`card-video-${video.id}`}
              >
                <CardContent className="p-3">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full aspect-video object-cover rounded-md mb-2"
                  />
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1">{video.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{video.channelTitle}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
