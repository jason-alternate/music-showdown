import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type JSX,
} from "react";
import { Link } from "@tanstack/react-router";
import type { BoardProps } from "boardgame.io/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Timer } from "@/components/Timer";
import { YouTubeSearch } from "@/components/YouTubeSearch";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, decodeHtmlEntities } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { playCorrectGuessSound } from "@/lib/audio";
import type {
  GameState,
  Player,
  YouTubeVideo,
  GuessInfo,
  GuessLogEntry,
  SongSelection,
} from "@/schema";
import {
  Trophy,
  CheckCircle,
  Circle,
  Music,
  Copy,
  Check,
  Crown,
  MessageSquare,
  Clock,
  Loader2,
  Play,
  Pause,
  Eye,
  EyeOff,
  Image,
  ImageOff,
} from "lucide-react";
import type { BoardIdentityHelpers } from "@/game/GameClient";
import { SPECTATOR_PLAYER_ID } from "@/game/identity";
import { MAX_PLAYERS } from "@/game/MusicShowdownGame";

interface GameBoardProps extends BoardProps<GameState>, BoardIdentityHelpers {}

type Settings = GameState["settings"];

type SliderHandler = (values: number[]) => void;

function toSliderValue(value: number) {
  return [value];
}

function computeMaxStartSeconds(
  durationSeconds: number | null | undefined,
  playbackDuration: number,
) {
  const baseline =
    durationSeconds && Number.isFinite(durationSeconds) && durationSeconds > 0
      ? Math.floor(durationSeconds)
      : DEFAULT_MAX_START_SECONDS;
  return Math.max(0, baseline - playbackDuration);
}

function clampStartSeconds(value: number, maxSeconds = DEFAULT_MAX_START_SECONDS) {
  if (Number.isNaN(value) || value < 0) return 0;
  return Math.min(Math.floor(value), maxSeconds);
}

function formatSeconds(value: number) {
  const seconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

const THEME_SUGGESTIONS = [
  "1960s",
  "1970s",
  "1980s",
  "1990s",
  "2000s",
  "2010s",
  "2020s",
  "Game Soundtracks",
  "Movie Soundtracks",
  "Alternative Rock",
  "FIFA Soundtracks",
  "R&B Grooves",
  "Classic Hip-Hop",
  "Indie Favorites",
  "Top 40 Hits",
  "Chill Electronic",
  "Country Classics",
  "Classic Rock",
  "Modern Country",
  "Reggae Classics",
  "Funk Essentials",
];

const DEFAULT_MAX_START_SECONDS = 600;

interface SongPickingSectionProps {
  headerControls: JSX.Element;
  currentRound: GameState["currentRound"];
  settings: Settings;
  themeValue: string;
  isHost: boolean;
  handleThemeChange: (value: string) => void;
  handleRandomTheme: () => void;
  mySelection: SongSelection | null;
  moves: GameBoardProps["moves"];
  effectivePlayerId: string | null;
  playerLookup: Map<string, Player>;
  toast: ReturnType<typeof useToast>["toast"];
}

function SongPickingSection({
  headerControls,
  currentRound,
  settings,
  themeValue,
  isHost,
  handleThemeChange,
  handleRandomTheme,
  mySelection,
  moves,
  effectivePlayerId,
  playerLookup,
  toast,
}: SongPickingSectionProps) {
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [startSeconds, setStartSeconds] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const previewPlayerRef = useRef<any>(null);
  const [maxStartSeconds, setMaxStartSeconds] = useState(() =>
    computeMaxStartSeconds(null, settings.playbackDuration),
  );
  const themeSelected = themeValue.trim().length > 0;
  const songSelections = currentRound?.songSelections ?? {};
  const connectedPlayers = useMemo(() => {
    return Array.from(playerLookup.values()).filter((player) => player.connected);
  }, [playerLookup]);

  const updatePlaybackBounds = useCallback(() => {
    const duration = previewPlayerRef.current?.getDuration?.();
    const recalculated = computeMaxStartSeconds(duration, settings.playbackDuration);
    setMaxStartSeconds((previousMax) =>
      previousMax === recalculated ? previousMax : recalculated,
    );
    setStartSeconds((previousStart) => {
      const clamped = clampStartSeconds(previousStart, recalculated);
      if (clamped !== previousStart) {
        previewPlayerRef.current?.seekTo?.(clamped, true);
        return clamped;
      }
      return previousStart;
    });
  }, [settings.playbackDuration]);

  useEffect(() => {
    updatePlaybackBounds();
  }, [updatePlaybackBounds]);

  const handleVideoSelect = useCallback(
    (video: YouTubeVideo) => {
      setSelectedVideo(video);
      setCustomTitle(decodeHtmlEntities(video.title));
      setStartSeconds(0);
      setPreviewing(false);
      previewPlayerRef.current = null;
      setMaxStartSeconds(computeMaxStartSeconds(null, settings.playbackDuration));
    },
    [settings.playbackDuration],
  );

  const handleConfirmSong = useCallback(() => {
    const trimmed = customTitle.trim();
    if (!selectedVideo || !trimmed || !currentRound) return;

    const conflictingEntry = Object.entries(currentRound.songSelections ?? {}).find(
      ([playerId, selection]) =>
        playerId !== effectivePlayerId && selection.videoId === selectedVideo.id,
    );

    if (conflictingEntry) {
      const [conflictingPlayerId] = conflictingEntry;
      const conflictingPlayer = playerLookup.get(conflictingPlayerId);
      const conflictingPlayerName = conflictingPlayer?.name ?? "Another player";

      toast({
        title: "Song already taken",
        description: `${conflictingPlayerName} has already locked this song. Pick a different one.`,
        variant: "destructive",
      });
      return;
    }

    previewPlayerRef.current?.stopVideo?.();
    moves.selectSong?.({
      videoId: selectedVideo.id,
      originalTitle: selectedVideo.title,
      customTitle: decodeHtmlEntities(customTitle),
      thumbnail: selectedVideo.thumbnail,
      startSeconds,
    });
    toast({ title: "Song selected", description: "Waiting for other players..." });
    setSelectedVideo(null);
    setCustomTitle("");
    setStartSeconds(0);
    setPreviewing(false);
    previewPlayerRef.current = null;
    setMaxStartSeconds(computeMaxStartSeconds(null, settings.playbackDuration));
  }, [
    customTitle,
    currentRound,
    effectivePlayerId,
    moves,
    playerLookup,
    selectedVideo,
    settings.playbackDuration,
    startSeconds,
    toast,
  ]);

  const togglePreview = useCallback(() => {
    const player = previewPlayerRef.current;
    if (!player) return;
    const state = player.getPlayerState?.();
    if (state === window.YT?.PlayerState?.PLAYING) {
      player.pauseVideo?.();
      setPreviewing(false);
    } else {
      player.seekTo?.(startSeconds, true);
      player.playVideo?.();
      setPreviewing(true);
    }
  }, [startSeconds, previewing]);

  const handlePreviewReady = useCallback(
    (player: any) => {
      previewPlayerRef.current = player;
      const duration = player.getDuration?.();
      const computedMax = computeMaxStartSeconds(duration, settings.playbackDuration);
      setMaxStartSeconds(computedMax);
      setStartSeconds((prev) => {
        const clamped = clampStartSeconds(prev, computedMax);
        if (clamped !== prev) {
          player.seekTo?.(clamped, true);
          return clamped;
        }
        return prev;
      });
      player.seekTo?.(startSeconds, true);
      if (previewing) {
        player.playVideo?.();
      } else {
        player.pauseVideo?.();
      }
    },
    [previewing, settings.playbackDuration, startSeconds],
  );

  const handlePreviewEnd = useCallback(() => {
    setPreviewing(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {headerControls}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Card className="bg-primary/10 border-primary">
            <CardHeader>
              <CardTitle className="font-heading text-2xl mb-1">Pick Your Song</CardTitle>
              <p className="text-sm text-muted-foreground">
                Theme:{" "}
                <span className="font-semibold text-foreground">
                  {currentRound?.theme ?? "Pending"}
                </span>
              </p>
            </CardHeader>
          </Card>

          {!themeSelected && !mySelection && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {isHost
                  ? "Set a theme to unlock song selection."
                  : "Waiting for the host to choose a theme."}
              </CardContent>
            </Card>
          )}

          {themeSelected && !mySelection && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="font-heading">Search YouTube</CardTitle>
                </CardHeader>
                <CardContent>
                  <YouTubeSearch onSelect={handleVideoSelect} selectedVideoId={selectedVideo?.id} />
                </CardContent>
              </Card>

              <Card className="self-start">
                <CardHeader>
                  <CardTitle className="font-heading">Selected Song</CardTitle>
                  <CardDescription>Fine-tune the title before locking it in.</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedVideo ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-muted-foreground">Preview</span>
                        </div>
                        <div className="relative overflow-hidden rounded-lg border">
                          <YouTubePlayer
                            videoId={selectedVideo.id}
                            autoplay={false}
                            startSeconds={startSeconds}
                            interactive
                            onReady={handlePreviewReady}
                            onEnd={handlePreviewEnd}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="song-title">Song title to guess</Label>
                          <Input
                            id="song-title"
                            value={customTitle}
                            onChange={(event) => setCustomTitle(event.target.value)}
                            className="mt-2"
                            placeholder="Edit the title if needed..."
                            data-testid="input-song-title"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            This is what other players will try to guess.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="start-seconds">Start playback at</Label>
                            <span className="text-xs text-muted-foreground">
                              {formatSeconds(startSeconds)}
                            </span>
                          </div>
                          <Slider
                            id="start-seconds"
                            min={0}
                            max={maxStartSeconds}
                            step={1}
                            value={toSliderValue(startSeconds)}
                            onValueChange={(values) => {
                              const value = clampStartSeconds(values[0] ?? 0, maxStartSeconds);
                              setStartSeconds(value);
                              previewPlayerRef.current?.seekTo?.(value, true);
                            }}
                            data-testid="slider-start-seconds"
                          />
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={maxStartSeconds}
                              value={startSeconds}
                              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                const next = clampStartSeconds(
                                  Number(event.target.value),
                                  maxStartSeconds,
                                );
                                setStartSeconds(next);
                                previewPlayerRef.current?.seekTo?.(next, true);
                              }}
                              className="w-24"
                              data-testid="input-start-seconds"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={togglePreview}
                              disabled={!previewPlayerRef.current}
                              data-testid="button-preview"
                            >
                              {previewing ? (
                                <>
                                  <Pause className="mr-2 h-4 w-4" /> Pause Preview
                                </>
                              ) : (
                                <>
                                  <Play className="mr-2 h-4 w-4" /> Play Preview
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        <Button
                          onClick={handleConfirmSong}
                          className="w-full"
                          disabled={!customTitle.trim()}
                          data-testid="button-confirm-song"
                        >
                          Confirm Selection
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[220px] items-center justify-center text-center text-sm text-muted-foreground">
                      Choose a song from the search results to review its details here.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {mySelection && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">You are all set!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {mySelection.thumbnail ? (
                    <div className="relative w-full max-w-[200px] overflow-hidden rounded-lg border bg-muted sm:w-48">
                      <img
                        src={mySelection.thumbnail}
                        alt={mySelection.customTitle || mySelection.originalTitle}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="space-y-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Selected song
                    </span>
                    <div className="text-lg font-semibold leading-snug">
                      {mySelection.customTitle || mySelection.originalTitle}
                    </div>
                    {(mySelection.startSeconds ?? 0) > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Starts at {formatSeconds(mySelection.startSeconds ?? 0)}
                      </div>
                    )}
                    {mySelection.customTitle &&
                      mySelection.originalTitle &&
                      mySelection.customTitle.trim() !== mySelection.originalTitle.trim() && (
                        <div className="text-sm text-muted-foreground">
                          Original title: {mySelection.originalTitle}
                        </div>
                      )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-waiting-selection">
                  Waiting for other players to finish picking.
                </p>
                {connectedPlayers.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Player lock-in status</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {connectedPlayers.map((player) => {
                        const isLockedIn = Boolean(songSelections[player.id]);
                        const displayName = player.name?.trim() || `Player ${player.id}`;
                        return (
                          <div
                            key={player.id}
                            className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                            data-testid={`player-lock-status-${player.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <PlayerAvatar
                                playerId={player.id}
                                playerName={player.name}
                                size="sm"
                              />
                              <span className="text-sm font-medium text-foreground">
                                {displayName}
                              </span>
                            </div>
                            {isLockedIn ? (
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1 text-xs"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Locked In
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                <Circle className="h-3 w-3" />
                                Waiting
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {!themeSelected && !mySelection && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Need inspiration? Pick a suggestion.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRandomTheme}
                  disabled={!isHost}
                  data-testid="button-random-theme"
                >
                  Surprise Me
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {THEME_SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleThemeChange(suggestion)}
                    disabled={!isHost}
                    className="whitespace-nowrap"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GameBoard({
  G,
  ctx,
  moves,
  playerID,
  matchID,
  identity,
  isHost,
  isActive,
  isConnected,
  updatePlayerName,
  promoteToHost,
  claimSeat,
  releaseSeat,
}: GameBoardProps) {
  const { toast } = useToast();

  const phase = ctx.phase ?? G.phase;
  const currentRound = G.currentRound ?? null;
  const settings = G.settings;
  const rawTimer = G.timer;
  const timeRemaining = rawTimer ?? 0;

  const [playerNameDraft, setPlayerNameDraft] = useState<string | null>(null);
  const [guessMap, setGuessMap] = useState<Record<string, string>>({});
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [copied, setCopied] = useState(false);
  const correctGuessCountRef = useRef(0);

  const syncLocalSettingsFromGame = useCallback(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    syncLocalSettingsFromGame();
  }, [syncLocalSettingsFromGame]);

  const effectivePlayerId = useMemo(() => {
    const candidate = playerID ?? identity.playerID;
    if (!candidate || identity.role === "spectator" || candidate === SPECTATOR_PLAYER_ID) {
      return null;
    }
    return candidate;
  }, [playerID, identity.playerID, identity.role]);

  const headerControls = (
    <div className="absolute top-4 right-4 flex items-center gap-2">
      <ThemeToggle />
    </div>
  );

  const ensureLobbyPlayerNameIsRegistered = useCallback(() => {
    if (phase !== "lobby") return;

    const id = effectivePlayerId;
    if (!id) return;

    const name = identity.playerName.trim();
    if (!name) return;

    const existing = G.players?.[id] as Player | undefined;
    if (!existing || existing.name !== name || !existing.connected) {
      moves.setPlayerName?.(name);
    }
  }, [G.players, identity.playerName, moves, phase, effectivePlayerId]);

  useEffect(() => {
    ensureLobbyPlayerNameIsRegistered();
  }, [ensureLobbyPlayerNameIsRegistered]);

  const players = Object.values(G.players ?? {})
    .map((player) => player as Player)
    .sort((a, b) => a.id.localeCompare(b.id));
  const themeValue = currentRound?.theme ?? "";
  const themeSelected = themeValue.trim().length > 0;

  const roundScores = currentRound?.roundScores ?? {};
  const guesses = currentRound?.guesses ?? {};
  const correctGuessers = currentRound?.correctGuessers ?? {};
  const guessLog = currentRound?.guessLog ?? [];
  const currentSongOwnerId = currentRound?.currentPlayerId ?? null;
  const revealSongOwnerId = currentRound?.revealSongOwnerId ?? null;
  const revealSongIndex = currentRound?.revealSongIndex ?? null;
  const activeSongIndex =
    phase === "song_reveal" && revealSongIndex !== null && revealSongIndex !== undefined
      ? revealSongIndex
      : (currentRound?.currentSongIndex ?? null);
  const currentSong = currentSongOwnerId
    ? (currentRound?.songSelections?.[currentSongOwnerId] ?? null)
    : null;
  const revealSong = revealSongOwnerId
    ? (currentRound?.songSelections?.[revealSongOwnerId] ?? null)
    : null;
  const mySelection = effectivePlayerId
    ? (currentRound?.songSelections?.[effectivePlayerId] ?? null)
    : null;
  const myGuessEntries: GuessInfo[] = effectivePlayerId ? (guesses[effectivePlayerId] ?? []) : [];
  const lastMyGuess = myGuessEntries[myGuessEntries.length - 1] ?? null;
  const hasCorrectGuess = Boolean(effectivePlayerId && correctGuessers[effectivePlayerId]);

  const canSubmitGuess = Boolean(
    phase === "guessing" &&
      currentSongOwnerId &&
      effectivePlayerId &&
      currentSongOwnerId !== effectivePlayerId &&
      !hasCorrectGuess &&
      (rawTimer === null || rawTimer > 0),
  );

  const lobbyOrder = G.lobbyOrder ?? [];
  const maxPlayers = G.maxPlayers ?? MAX_PLAYERS;

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    players.forEach((player) => map.set(player.id, player));
    return map;
  }, [players]);

  const connectedPlayers = useMemo(() => {
    const list = players.filter((player) => player.connected);
    list.sort((a, b) => {
      const indexA = lobbyOrder.indexOf(a.id);
      const indexB = lobbyOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) {
        return a.id.localeCompare(b.id);
      }
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    return list;
  }, [lobbyOrder, players]);

  const attemptedSeatsRef = useRef<Set<string>>(new Set());
  const seatRetryRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (identity.role === "host") {
      attemptedSeatsRef.current.clear();
      seatRetryRef.current.clear();
      return;
    }

    if (identity.role === "spectator") {
      const attempted = attemptedSeatsRef.current;
      const occupied = new Set(
        players.filter((player) => player.connected).map((player) => player.id),
      );

      const findSeat = () => {
        for (let seat = 1; seat < maxPlayers; seat += 1) {
          const id = String(seat);
          if (occupied.has(id)) continue;
          if (attempted.has(id)) continue;
          return id;
        }
        return null;
      };

      let candidate = findSeat();

      if (!candidate && attempted.size > 0) {
        attempted.clear();
        candidate = findSeat();
      }

      if (candidate) {
        attempted.add(candidate);
        claimSeat(candidate);
      }
      return;
    }

    if (identity.role === "peer") {
      attemptedSeatsRef.current.clear();
      seatRetryRef.current.clear();
    }
  }, [identity.role, players, maxPlayers, claimSeat]);

  useEffect(() => {
    if (identity.role !== "peer") return;
    const seatId = identity.playerID;
    if (!seatId || seatId === SPECTATOR_PLAYER_ID) return;

    const occupant = playersById.get(seatId);
    if (occupant?.connected) {
      seatRetryRef.current.delete(seatId);
      return;
    }

    const attemptCount = seatRetryRef.current.get(seatId) ?? 0;
    if (attemptCount >= maxPlayers) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const latest = playersById.get(seatId);
      if (latest?.connected) {
        seatRetryRef.current.delete(seatId);
        return;
      }

      seatRetryRef.current.set(seatId, attemptCount + 1);
      attemptedSeatsRef.current.delete(seatId);
      releaseSeat();
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [identity.role, identity.playerID, playersById, releaseSeat, maxPlayers]);

  useEffect(() => {
    if (identity.role !== "peer") return;
    if (isConnected) return;

    const seatId = identity.playerID;
    if (!seatId || seatId === SPECTATOR_PLAYER_ID) return;

    const timeout = window.setTimeout(() => {
      attemptedSeatsRef.current.delete(seatId);
      seatRetryRef.current.delete(seatId);
      releaseSeat();
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [identity.role, identity.playerID, isConnected, releaseSeat]);

  useEffect(() => {
    if (phase !== "lobby") return;
    if (identity.role !== "peer") return;
    if (!effectivePlayerId) return;

    const name = identity.playerName.trim();
    if (!name) return;

    const attemptRegistration = () => {
      try {
        moves.setPlayerName?.(name);
      } catch (error) {
        console.warn("Failed to register player name", error);
      }
    };

    const occupant = playersById.get(effectivePlayerId);
    if (occupant?.connected) {
      if (!occupant.name || occupant.name.trim() !== name) {
        attemptRegistration();
      }
      return;
    }

    attemptRegistration();
    const interval = window.setInterval(() => {
      const latest = playersById.get(effectivePlayerId);
      if (latest?.connected) {
        if (!latest.name || latest.name.trim() !== name) {
          attemptRegistration();
        }
        window.clearInterval(interval);
        return;
      }
      attemptRegistration();
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase, identity.role, identity.playerName, effectivePlayerId, playersById, moves]);

  const lobbySlots = useMemo<(Player | null)[]>(() => {
    const ordered = lobbyOrder
      .map((id) => G.players[id] as Player | undefined)
      .filter((player): player is Player => Boolean(player));
    const seen = new Set(ordered.map((player) => player.id));
    const remaining = players.filter((player) => !seen.has(player.id));
    const combined = [...ordered, ...remaining];
    return Array.from({ length: maxPlayers }, (_, index) => combined[index] ?? null);
  }, [G.players, lobbyOrder, maxPlayers, players]);

  const roundLeaderboard = useMemo(() => {
    return players
      .map((player) => ({ player, roundScore: roundScores[player.id] ?? 0 }))
      .sort((a, b) => b.roundScore - a.roundScore);
  }, [players, roundScores]);

  const totalLeaderboard = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);

  const connectedCount = connectedPlayers.length;
  const openSlots = Math.max(maxPlayers - connectedCount, 0);

  const handleThemeChange = useCallback(
    (value: string) => {
      if (!isHost) return;
      moves.setTheme?.(value);
    },
    [isHost, moves],
  );

  const handleRandomTheme = useCallback(() => {
    if (!isHost) return;
    const trimmedCurrent = (currentRound?.theme ?? "").trim();
    const pool =
      THEME_SUGGESTIONS.length > 1
        ? THEME_SUGGESTIONS.filter((option) => option !== trimmedCurrent)
        : THEME_SUGGESTIONS;
    const selection = pool[Math.floor(Math.random() * pool.length)] ?? THEME_SUGGESTIONS[0];
    if (selection) {
      handleThemeChange(selection);
    }
  }, [currentRound?.theme, handleThemeChange, isHost]);

  const activeSongGuessLog = useMemo(() => {
    if (!currentRound) return [] as GuessLogEntry[];
    if (activeSongIndex === null || activeSongIndex === undefined) {
      return [] as GuessLogEntry[];
    }
    return guessLog
      .filter((entry) => entry.songIndex === activeSongIndex)
      .sort((a, b) => a.time - b.time);
  }, [activeSongIndex, currentRound, guessLog]);

  const formatGuessTime = (time: number) => {
    if (Number.isNaN(time) || !Number.isFinite(time)) return "0s";
    const seconds = Math.max(0, Math.round(time));
    return `${seconds}s`;
  };

  const renderGuessLogBody = (entries: GuessLogEntry[]): JSX.Element => {
    if (entries.length === 0) {
      return (
        <div className="flex h-full items-center justify-center px-6 py-12">
          <p className="text-center text-sm text-muted-foreground">No guesses yet for this song.</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[360px] px-6 pb-6">
        <div className="space-y-4">
          {entries.map((entry) => {
            const isSelf = effectivePlayerId && entry.playerId === effectivePlayerId;
            const shouldHideGuess = entry.isCorrect && !isSelf;
            return (
              <div
                key={entry.id}
                className={cn("flex flex-col gap-2", isSelf ? "items-end" : "items-start")}
              >
                <div
                  className={cn("flex items-start gap-3", isSelf ? "flex-row-reverse" : "flex-row")}
                >
                  <PlayerAvatar playerId={entry.playerId} playerName={entry.playerName} size="sm" />
                  <div className={cn("space-y-1", isSelf ? "text-right" : "text-left")}>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span>{isSelf ? "You" : entry.playerName}</span>
                      {entry.isCorrect && <Badge>Correct</Badge>}
                    </div>
                    <div
                      className={cn(
                        "max-w-xs rounded-md px-3 py-2 text-sm",
                        isSelf
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-muted-foreground",
                      )}
                    >
                      {shouldHideGuess ? (
                        <span className="italic">Correct guess locked in</span>
                      ) : (
                        <>&quot;{entry.guess}&quot;</>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{formatGuessTime(entry.time)}</span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  const startHostTimerTick = useCallback(() => {
    if (!isHost) return undefined;
    if (phase !== "song_picking" && phase !== "guessing") return undefined;
    if (rawTimer === null || rawTimer <= 0) return undefined;

    const interval = window.setInterval(() => {
      moves.tickTimer?.();
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isHost, moves, phase, rawTimer]);

  useEffect(() => {
    const cleanup = startHostTimerTick();
    return cleanup;
  }, [startHostTimerTick]);

  const appliedSettings = isHost ? localSettings : settings;

  const activeGuessKey = useMemo(() => {
    if (phase !== "guessing" || !currentRound) return "inactive";
    const index = currentRound.currentSongIndex ?? currentRound.revealSongIndex ?? 0;
    return `${currentRound.roundNumber}:${index}`;
  }, [currentRound, phase]);

  const guess = guessMap[activeGuessKey] ?? "";

  const updateGuess = useCallback(
    (value: string) => {
      setGuessMap((previous) => ({ ...previous, [activeGuessKey]: value }));
    },
    [activeGuessKey],
  );

  const resetGuess = useCallback(() => {
    setGuessMap((previous) => {
      if (previous[activeGuessKey] === undefined) return previous;
      const next = { ...previous };
      delete next[activeGuessKey];
      return next;
    });
  }, [activeGuessKey]);

  const handlePlayerNameCommit = useCallback(() => {
    const value = playerNameDraft ?? identity.playerName;
    const trimmed = value.trim().slice(0, 24);
    if (!trimmed) return;
    updatePlayerName(trimmed);
    if (phase === "lobby") {
      moves.setPlayerName?.(trimmed);
    }
    setPlayerNameDraft(null);
  }, [identity.playerName, moves, phase, playerNameDraft, updatePlayerName]);

  const handleSubmitGuess = useCallback(() => {
    const trimmed = guess.trim();
    if (!canSubmitGuess || !trimmed) return;
    moves.submitGuess?.(trimmed);
    resetGuess();
  }, [canSubmitGuess, guess, moves, resetGuess]);

  useEffect(() => {
    correctGuessCountRef.current = 0;
  }, [activeGuessKey]);

  useEffect(() => {
    if (!effectivePlayerId) return;
    const guessList = guesses[effectivePlayerId] ?? [];
    const correctCount = guessList.filter((entry) => entry.isCorrect).length;
    if (correctCount > correctGuessCountRef.current) {
      playCorrectGuessSound();
    }
    correctGuessCountRef.current = correctCount;
  }, [effectivePlayerId, guesses]);

  const handleContinueReveal = useCallback(() => {
    if (!isHost) return;
    moves.continueReveal?.();
  }, [isHost, moves]);

  const handleNextRound = useCallback(() => {
    moves.nextRound?.();
    setGuessMap({});
  }, [moves]);

  const handleRestartLobby = useCallback(() => {
    moves.restartLobby?.();
    setGuessMap({});
  }, [moves]);

  const handleEndGame = useCallback(() => {
    moves.endGame?.();
  }, [moves]);

  const previewSettings = useCallback(
    (patch: Partial<Settings>) => {
      if (!isHost) return;
      setLocalSettings((previous) => ({ ...previous, ...patch }));
    },
    [isHost],
  );

  const commitSettings = useCallback(
    (patch: Partial<Settings>) => {
      if (!isHost) return;
      setLocalSettings((previous) => ({ ...previous, ...patch }));

      const diffEntries = Object.entries(patch).filter(([key, value]) => {
        const typedKey = key as keyof Settings;
        return value !== undefined && settings[typedKey] !== value;
      });

      if (!diffEntries.length) return;
      moves.updateSettings?.(Object.fromEntries(diffEntries) as Partial<Settings>);
    },
    [isHost, moves, settings],
  );

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(matchID);
      setCopied(true);
      toast({
        title: "Room code copied!",
        description: "Share it with your friends to join the game",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Unable to copy room code", variant: "destructive" });
    }
  };

  const handleStartGame = () => {
    if (!isHost) {
      toast({ title: "Waiting for host", description: "Only the host can start the game" });
      return;
    }
    if (connectedCount < 2) {
      toast({
        title: "Need more players",
        description: "At least 2 players required to start",
        variant: "destructive",
      });
      return;
    }
    moves.startGame?.();
  };

  const sliderPreviewHandler = (key: keyof Settings): SliderHandler => {
    return (values) => previewSettings({ [key]: values[0] } as Partial<Settings>);
  };

  const sliderCommitHandler = (key: keyof Settings): SliderHandler => {
    return (values) => commitSettings({ [key]: values[0] } as Partial<Settings>);
  };

  if (phase === "lobby") {
    return (
      <div className="min-h-screen bg-background">
        {headerControls}
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-heading font-bold">
                <Link
                  to="/music-showdown"
                  className="inline-flex items-center text-left text-inherit transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Music Showdown
                </Link>
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="uppercase">
                  {identity.role}
                </Badge>
                <span>Signed in as {identity.playerName}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                Room
              </div>
              <code
                className="text-2xl font-mono font-semibold tracking-wider text-primary"
                data-testid="text-room-code"
              >
                {matchID}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyCode}
                data-testid="button-copy-code"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-secondary" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1.1fr]">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="font-heading">
                  Players ({connectedCount}/{maxPlayers})
                </CardTitle>
                <CardDescription>
                  {connectedCount === 0
                    ? "Waiting for players to join..."
                    : `${connectedCount} connected, ${openSlots} open slot${openSlots === 1 ? "" : "s"}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lobbySlots.map((slot, index) => (
                    <div
                      key={slot ? slot.id : `empty-${index}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      data-testid={slot ? `player-card-${slot.id}` : `player-card-empty-${index}`}
                    >
                      {slot ? (
                        <>
                          <PlayerAvatar playerId={slot.id} playerName={slot.name} />
                          <div className="flex-1">
                            <div className="font-semibold">{slot.name}</div>
                            {!slot.connected && (
                              <div className="text-xs text-muted-foreground">Not connected</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {slot.isHost && (
                              <Badge variant="default" className="gap-1" data-testid="badge-host">
                                <Crown className="w-3 h-3" />
                                Host
                              </Badge>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3 w-full justify-between">
                          <div className="flex gap-3 items-center">
                            <div className="w-8 h-8 rounded-full bg-muted" />
                            <span className="text-sm text-muted-foreground">
                              Waiting for player {index + 1}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Your Lobby Controls</CardTitle>
                  <CardDescription>
                    {isHost
                      ? "Update your name and start the game once everyone is ready."
                      : "Update your name while the host prepares the game."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="player-name">Display name</Label>
                    <Input
                      id="player-name"
                      placeholder="Your name"
                      value={playerNameDraft ?? identity.playerName}
                      onChange={(event) => setPlayerNameDraft(event.target.value)}
                      onBlur={handlePlayerNameCommit}
                      onKeyDown={(event) => event.key === "Enter" && handlePlayerNameCommit()}
                      data-testid="input-player-name"
                    />
                    <p className="text-xs text-muted-foreground">
                      Shared with other players in the lobby.
                    </p>
                  </div>
                  <Button
                    onClick={handleStartGame}
                    className="w-full"
                    size="lg"
                    data-testid="button-start-game"
                    disabled={!isHost || connectedCount < 2}
                  >
                    Start Game
                  </Button>
                  {identity.role === "spectator" && (
                    <p className="text-center text-xs text-muted-foreground">
                      Lobby is full. We&apos;ll seat you automatically when a spot opens.
                    </p>
                  )}
                  {(!isHost || connectedCount < 2) && (
                    <p className="text-center text-xs text-muted-foreground">
                      {isHost
                        ? "Need at least 2 players to start."
                        : "Only the host can start the game."}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-heading text-lg">Game Settings</CardTitle>
                  <CardDescription>
                    Hosts can tweak settings before the game begins.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Number of rounds</Label>
                      <span className="text-xs text-muted-foreground">
                        {appliedSettings.totalRounds}
                      </span>
                    </div>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={toSliderValue(appliedSettings.totalRounds)}
                      onValueChange={sliderPreviewHandler("totalRounds")}
                      onValueCommit={sliderCommitHandler("totalRounds")}
                      disabled={!isHost}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="playback-duration">Playback duration</Label>
                      <span className="text-xs text-muted-foreground">
                        {appliedSettings.playbackDuration}s
                      </span>
                    </div>
                    <Slider
                      id="playback-duration"
                      min={30}
                      max={300}
                      step={5}
                      value={toSliderValue(appliedSettings.playbackDuration)}
                      onValueChange={sliderPreviewHandler("playbackDuration")}
                      onValueCommit={sliderCommitHandler("playbackDuration")}
                      disabled={!isHost}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "theme_selection") {
    return (
      <div className="min-h-screen bg-background">
        {headerControls}
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Set the Theme</CardTitle>
              <CardDescription>
                Waiting on the host to set the theme for this round.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="theme">Theme for this round</Label>
                <Input
                  id="theme"
                  placeholder="e.g., 80s Rock, Movie Soundtracks, Summer Vibes..."
                  value={themeValue}
                  onChange={(event) => isHost && moves.setTheme?.(event.target.value)}
                  className="text-lg mt-2"
                  data-testid="input-theme"
                  disabled={!isHost}
                />
              </div>
              {!themeSelected && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      Need inspiration? Pick a suggestion.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleRandomTheme}
                      disabled={!isHost}
                      data-testid="button-random-theme"
                    >
                      Surprise Me
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {THEME_SUGGESTIONS.map((suggestion) => (
                      <Button
                        key={suggestion}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleThemeChange(suggestion)}
                        disabled={!isHost}
                        className="whitespace-nowrap"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {isHost ? (
                <Button
                  onClick={() => moves.confirmTheme?.()}
                  disabled={!themeValue.trim()}
                  className="w-full"
                  data-testid="button-confirm-theme"
                >
                  Confirm Theme
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="text-waiting-theme">
                  Waiting for the host to confirm the theme...
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "song_picking") {
    return (
      <SongPickingSection
        headerControls={headerControls}
        currentRound={currentRound}
        settings={settings}
        themeValue={themeValue}
        isHost={isHost}
        handleThemeChange={handleThemeChange}
        handleRandomTheme={handleRandomTheme}
        mySelection={mySelection}
        moves={moves}
        effectivePlayerId={effectivePlayerId}
        playerLookup={playersById}
        toast={toast}
      />
    );
  }

  const isCurrentSongOwner = Boolean(effectivePlayerId && currentSongOwnerId === effectivePlayerId);
  const guessPlaceholder = isCurrentSongOwner
    ? "You selected this song."
    : hasCorrectGuess
      ? "Correct! Waiting for next song..."
      : "Type your guess...";

  if (phase === "guessing" && currentSong) {
    const activeSongTitle = (currentSong.customTitle || currentSong.originalTitle || "").trim();
    const hangmanHint = activeSongTitle
      ? Array.from(activeSongTitle)
          .map((char) => (/\s/.test(char) ? " " : "_"))
          .join("")
      : "";

    const timerProgress =
      settings.playbackDuration > 0 ? 1 - timeRemaining / settings.playbackDuration : 0;

    return (
      <div className="min-h-screen bg-background">
        {headerControls}
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
          <Card className="bg-accent/10 border-accent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-2xl">Guess the Song!</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {players.find((player) => player.id === currentSongOwnerId)?.name ??
                      "Mystery player"}
                    's selection
                  </p>
                </div>
                <Timer
                  timeRemaining={timeRemaining}
                  totalTime={settings.playbackDuration}
                  variant="accent"
                />
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="font-heading text-lg">Now Playing</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="rounded-lg border bg-muted/30 p-2">
                    <YouTubePlayer
                      videoId={currentSong.videoId}
                      autoplay
                      preventPause
                      startSeconds={currentSong.startSeconds ?? 0}
                      timerProgress={timerProgress}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Player Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                    {players.map((player) => {
                      const guessList = guesses[player.id] ?? [];
                      const hasGuessed = guessList.length > 0;
                      const isOwner = player.id === currentSongOwnerId;
                      const isCorrect = Boolean(correctGuessers[player.id]);
                      const lastGuess = guessList[guessList.length - 1];
                      return (
                        <div
                          key={player.id}
                          className="flex flex-col items-center gap-2 rounded-lg bg-muted/50 p-3"
                          data-testid={`player-status-${player.id}`}
                        >
                          <PlayerAvatar playerId={player.id} playerName={player.name} size="sm" />
                          <div className="text-xs font-medium text-center">{player.name}</div>
                          {isOwner ? (
                            <Music className="h-4 w-4 text-primary" />
                          ) : isCorrect ? (
                            <CheckCircle className="h-4 w-4 text-secondary" />
                          ) : hasGuessed ? (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          {!isOwner && (
                            <div className="text-center text-[10px] text-muted-foreground">
                              {isCorrect ? "Correct" : hasGuessed ? "Guessing" : "Waiting"}
                              {lastGuess && !isCorrect ? ` (${lastGuess.guess})` : ""}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="flex min-h-[520px] flex-col">
              <CardHeader className="space-y-4">
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <MessageSquare className="h-4 w-4" /> Guess Log
                </CardTitle>
                {hangmanHint && (
                  <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 px-4 py-3 text-center">
                    <div className="font-mono text-lg uppercase tracking-[0.35em] text-muted-foreground">
                      {hangmanHint}
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden px-0 pb-0">
                {renderGuessLogBody(activeSongGuessLog)}
              </CardContent>
              <div className="border-t bg-muted/20 p-6">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      placeholder={guessPlaceholder}
                      value={guess}
                      onChange={(event) => updateGuess(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                        event.preventDefault();
                        handleSubmitGuess();
                      }}
                      className="text-lg"
                      data-testid="input-guess"
                      disabled={!canSubmitGuess}
                    />
                    <Button
                      onClick={handleSubmitGuess}
                      disabled={!canSubmitGuess || !guess.trim()}
                      data-testid="button-submit-guess"
                      className="sm:w-auto"
                    >
                      Submit
                    </Button>
                  </div>
                  {!canSubmitGuess && isCurrentSongOwner && (
                    <p className="text-sm text-muted-foreground">You can't guess your own song.</p>
                  )}
                  {!canSubmitGuess && hasCorrectGuess && (
                    <p className="text-sm text-muted-foreground">
                      Great job! You'll rejoin next round.
                    </p>
                  )}
                  {lastMyGuess && !hasCorrectGuess && (
                    <p className="text-xs text-muted-foreground">
                      Last guess: "{lastMyGuess.guess}" ({Math.max(0, Math.ceil(lastMyGuess.time))}
                      s)
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "song_reveal" && revealSong && revealSongOwnerId !== null) {
    const owner = players.find((player) => player.id === revealSongOwnerId);
    const timerProgress =
      activeSongIndex !== null && activeSongIndex !== undefined && revealSong ? 1 : undefined;

    return (
      <div className="min-h-screen bg-background">
        {headerControls}
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <Card className="bg-secondary/10 border-secondary">
            <CardHeader>
              <div className="flex flex-col gap-2 text-center">
                <CardTitle className="font-heading text-3xl">Song Revealed!</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {owner?.name ?? "Mystery player"}'s selection has been uncovered.
                </p>
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card className="overflow-hidden">
              <CardHeader className="pb-0">
                <CardTitle className="font-heading text-lg">Now Revealed</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="rounded-lg border bg-muted/30 p-2">
                  <YouTubePlayer
                    videoId={revealSong.videoId}
                    autoplay={false}
                    startSeconds={revealSong.startSeconds ?? 0}
                    timerProgress={timerProgress}
                    interactive
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Song Title
                    </span>
                    <h2 className="text-xl font-bold leading-tight">
                      {revealSong.customTitle || revealSong.originalTitle}
                    </h2>
                  </div>
                  {revealSong.thumbnail && (
                    <div className="relative w-full overflow-hidden rounded-lg border bg-muted">
                      <img
                        src={revealSong.thumbnail}
                        alt={revealSong.customTitle || revealSong.originalTitle}
                        className="w-full object-cover"
                      />
                    </div>
                  )}
                  {(revealSong.startSeconds ?? 0) > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Playback started at {formatSeconds(revealSong.startSeconds ?? 0)}.
                    </p>
                  )}
                  {revealSong.customTitle &&
                    revealSong.originalTitle &&
                    revealSong.customTitle.trim() !== revealSong.originalTitle.trim() && (
                      <p className="text-sm text-muted-foreground">
                        Original title: {revealSong.originalTitle}
                      </p>
                    )}
                </div>
              </CardContent>
            </Card>

            <Card className="flex min-h-[520px] flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <MessageSquare className="h-4 w-4" /> Guess Log
                </CardTitle>
                <CardDescription>How everyone fared on this song.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden px-0 pb-0">
                {renderGuessLogBody(activeSongGuessLog)}
              </CardContent>
              <div className="border-t bg-muted/20 p-6">
                <div className="space-y-2 text-sm text-muted-foreground">
                  {owner ? (
                    <p>
                      This song was selected by <span className="font-semibold">{owner.name}</span>.
                    </p>
                  ) : (
                    <p>The song owner's identity could not be determined.</p>
                  )}
                  <p>
                    {activeSongGuessLog.filter((entry) => entry.isCorrect).length} player
                    {activeSongGuessLog.filter((entry) => entry.isCorrect).length === 1 ? "" : "s"}{" "}
                    guessed correctly.
                  </p>
                </div>
              </div>
              {isHost && (
                <div className="border-t bg-muted/30 p-6">
                  <Button
                    onClick={handleContinueReveal}
                    className="w-full"
                    size="lg"
                    data-testid="button-continue-reveal"
                  >
                    Continue
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "round_results" && currentRound) {
    return (
      <div className="min-h-screen bg-background">
        {headerControls}
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-2xl text-center">Round Complete!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <Trophy className="w-16 h-16 text-primary mx-auto" />
                <h2 className="text-xl font-semibold">
                  {roundLeaderboard[0]?.player
                    ? `${roundLeaderboard[0]?.player.name} won this round!`
                    : "Round complete"}
                </h2>
                {roundLeaderboard[0] && (
                  <p className="text-sm text-muted-foreground">
                    Earned {roundLeaderboard[0].roundScore} points this round
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {roundLeaderboard.map(({ player, roundScore }, index) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                    data-testid={`result-player-${player.id}`}
                  >
                    <div className="text-2xl font-bold text-muted-foreground w-8">#{index + 1}</div>
                    <PlayerAvatar playerId={player.id} playerName={player.name} />
                    <div className="flex-1">
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {roundScore} points this round
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-primary">{player.score}</div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleNextRound}
                className="w-full"
                size="lg"
                data-testid="button-next-round"
                disabled={!isHost}
              >
                {G.completedRounds + 1 < settings.totalRounds ? "Next Round" : "View Final Scores"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "game_over") {
    return (
      <div className="min-h-screen bg-background">
        {headerControls}
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-3xl text-center">Game Over!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="text-center space-y-4">
                <Trophy className="w-24 h-24 text-primary mx-auto" />
                <h2 className="text-2xl font-bold">
                  {totalLeaderboard[0]
                    ? `${totalLeaderboard[0].name} Wins!`
                    : "Thanks for playing!"}
                </h2>
                <p className="text-muted-foreground">Final standings</p>
              </div>

              <div className="space-y-3">
                {totalLeaderboard.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-4 p-6 rounded-lg ${
                      index === 0
                        ? "bg-primary/20 border-2 border-primary"
                        : index === 1
                          ? "bg-secondary/20 border-2 border-secondary"
                          : "bg-muted/50"
                    }`}
                    data-testid={`final-player-${player.id}`}
                  >
                    <div className="text-3xl font-bold w-12">
                      {index === 0
                        ? "🥇"
                        : index === 1
                          ? "🥈"
                          : index === 2
                            ? "🥉"
                            : `#${index + 1}`}
                    </div>
                    <PlayerAvatar playerId={player.id} playerName={player.name} size="lg" />
                    <div className="flex-1">
                      <div className="text-xl font-bold">{player.name}</div>
                    </div>
                    <div className="text-3xl font-bold text-primary">{player.score}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  data-testid="button-new-game"
                  onClick={handleRestartLobby}
                  disabled={!isHost}
                >
                  Restart Lobby
                </Button>
                <Button
                  className="flex-1"
                  data-testid="button-back-home"
                  onClick={handleEndGame}
                  disabled={!isHost}
                >
                  End Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {headerControls}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_theme(colors.primary/15),transparent_60%)]" />
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-border/50 bg-background/90 p-10 text-center shadow-xl backdrop-blur">
          <div className="flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-heading">Connecting to your room</h2>
            <p className="text-sm text-muted-foreground">
              Setting the stage and syncing players. Hang tight—this should only take a moment.
            </p>
          </div>
          {matchID ? (
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-4 py-2 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Room
                <span className="text-foreground">{matchID}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
