import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, CheckCircle2 } from "lucide-react";
import { searchYouTube } from "@/lib/youtube";
import type { YouTubeVideo } from "@/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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
        <ScrollArea className="h-[420px] rounded-lg border p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {results.map((video) => (
              <Card
                key={video.id}
                className={cn(
                  "group cursor-pointer border transition-all hover:border-primary/40 hover:shadow-md",
                  selectedVideoId === video.id
                    ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary"
                    : "border-border"
                )}
                onClick={() => onSelect(video)}
                data-testid={`card-video-${video.id}`}
              >
                <CardContent className="relative space-y-3 p-3">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full aspect-video object-cover rounded-md mb-2"
                  />
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1">{video.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{video.channelTitle}</p>
                  {selectedVideoId === video.id && (
                    <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-1 text-xs font-semibold text-primary-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      Selected
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
