import { useEffect, useRef } from "react";

interface YouTubePlayerProps {
  videoId: string;
  onReady?: (player: any) => void;
  onEnd?: () => void;
  autoplay?: boolean;
  startSeconds?: number;
  endSeconds?: number;
  preventPause?: boolean;
  timerProgress?: number;
  interactive?: boolean;
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
  timerProgress,
  interactive = false,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  let overlayOpacity = 1;
  if (timerProgress !== undefined) {
    const clampedProgress = Math.min(Math.max(timerProgress, 0), 1);
    if (clampedProgress >= 0.5) {
      const secondHalfProgress = (clampedProgress - 0.5) / 0.5;
      overlayOpacity = 1 - 0.15 * secondHalfProgress;
    }
    overlayOpacity = Math.max(0.85, overlayOpacity);
  }

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
            controls: interactive ? 1 : 0,
            disablekb: interactive ? 0 : 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
          },
          events: {
            onReady: (event: any) => {
              if (autoplay) {
                event.target.playVideo();
              }
              onReady?.(event.target);
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
  }, [videoId, autoplay, startSeconds, endSeconds, onReady, onEnd, preventPause, interactive]);

  return (
    <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden">
      <div
        ref={containerRef}
        className={interactive ? "w-full h-full" : "pointer-events-none w-full h-full"}
        data-testid="youtube-player"
      />
      {!interactive && (
        <div
          className="pointer-events-none absolute left-0 right-0 top-0"
          style={{ height: "60px", backgroundColor: "black" }}
        />
      )}
      {timerProgress !== undefined && !interactive && (
        <div
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
        />
      )}
    </div>
  );
}
