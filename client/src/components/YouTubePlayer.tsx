import { useEffect, useRef } from "react";

interface YouTubePlayerProps {
  videoId: string;
  onReady?: () => void;
  onEnd?: () => void;
  autoplay?: boolean;
  startSeconds?: number;
  endSeconds?: number;
  preventPause?: boolean;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function YouTubePlayer({
  videoId,
  onReady,
  onEnd,
  autoplay = true,
  startSeconds = 0,
  endSeconds,
  preventPause = false,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (containerRef.current && window.YT && window.YT.Player) {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            start: startSeconds,
            end: endSeconds,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: (event: any) => {
              if (autoplay) {
                event.target.playVideo();
              }
              onReady?.();
            },
            onStateChange: (event: any) => {
              if (preventPause && event.data === window.YT.PlayerState.PAUSED) {
                event.target.playVideo();
                return;
              }

              if (event.data === window.YT.PlayerState.ENDED) {
                onEnd?.();
              }
            },
          },
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId, autoplay, startSeconds, endSeconds, onReady, onEnd, preventPause]);

  return (
    <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden">
      <div
        ref={containerRef}
        className="pointer-events-none w-full h-full"
        data-testid="youtube-player"
      />
      <div className="pointer-events-none absolute inset-0 rounded-lg bg-linear-to-b from-black/95 via-black/80 to-black/50" />
    </div>
  );
}
