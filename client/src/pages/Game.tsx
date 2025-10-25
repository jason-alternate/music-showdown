import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import {
  Trophy,
  CheckCircle,
  Circle,
  Music,
  Copy,
  Check,
  Crown,
  Clock,
  Home,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { GameState, Player, YouTubeVideo, GuessInfo, GuessLogEntry } from "@/schema";
import { MAX_PLAYERS } from "@/game/MusicShowdownGame";
import type { BoardIdentityHelpers } from "@/game/GameClient";

interface GameBoardProps extends BoardProps<GameState>, BoardIdentityHelpers { }

type Settings = GameState["settings"];

type SliderHandler = (values: number[]) => void;

function toSliderValue(value: number) {
  return [value];
}

const GAME_STATE_STORAGE_PREFIX = "musicshowdown.state";

const getStateStorageKey = (roomCode: string) => `${GAME_STATE_STORAGE_PREFIX}.${roomCode}`;

const readPersistedState = (roomCode: string): GameState | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(getStateStorageKey(roomCode));
  if (!stored) return null;
  try {
    return JSON.parse(stored) as GameState;
  } catch {
    return null;
  }
};

const writePersistedState = (roomCode: string, state: GameState) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStateStorageKey(roomCode), JSON.stringify(state));
};

export default function GameBoard({
  G,
  ctx,
  moves,
  playerID,
  matchID,
  identity,
  isHost,
  updatePlayerName,
  promoteToHost,
}: GameBoardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const phase = ctx.phase ?? G.phase;
  const currentRound = G.currentRound ?? null;
  const settings = G.settings;
  const rawTimer = G.timer;
  const timeRemaining = rawTimer ?? 0;

  const [playerNameInput, setPlayerNameInput] = useState(identity.playerName);
  const [themeDraft, setThemeDraft] = useState(currentRound?.theme ?? "");
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [guess, setGuess] = useState("");
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [copied, setCopied] = useState(false);
  const [displayTimer, setDisplayTimer] = useState(timeRemaining);
  const persistedStateRef = useRef<string | null>(null);
  const restoreAttemptedRef = useRef(false);

  useEffect(() => {
    setPlayerNameInput(identity.playerName);
  }, [identity.playerName]);

  useEffect(() => {
    setThemeDraft(currentRound?.theme ?? "");
  }, [currentRound?.theme]);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const effectivePlayerId = playerID ?? identity.playerID;

  const handleGoHome = () => {
    navigate({ to: "/music-showdown" });
  };

  const headerControls = (
    <div className="absolute top-4 right-4 flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleGoHome} data-testid="button-home">
        <Home className="h-4 w-4" />
        <span className="ml-2">Home</span>
      </Button>
      <ThemeToggle />
    </div>
  );

  useEffect(() => {
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
    if (phase !== "song_picking") {
      setSelectedVideo(null);
      setCustomTitle("");
    }
    if (phase !== "guessing") {
      setGuess("");
    }
  }, [phase]);

  useEffect(() => {
    if (!isHost) return;
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;
    const stored = readPersistedState(matchID);
    if (!stored) return;
    moves.restoreState?.(stored);
  }, [isHost, matchID, moves]);

  useEffect(() => {
    if (!isHost) return;
    if (!restoreAttemptedRef.current) return;
    if (!G.players || Object.keys(G.players).length === 0) return;
    const snapshot = JSON.stringify(G);
    if (persistedStateRef.current === snapshot) return;
    persistedStateRef.current = snapshot;
    writePersistedState(matchID, G);
  }, [G, isHost, matchID]);

  const players = Object.values(G.players ?? {})
    .map((player) => player as Player)
    .sort((a, b) => a.id.localeCompare(b.id));
  const themeValue = currentRound?.theme ?? themeDraft;
  const roundScores = currentRound?.roundScores ?? {};
  const guesses = currentRound?.guesses ?? {};
  const correctGuessers = currentRound?.correctGuessers ?? {};
  const guessLog = currentRound?.guessLog ?? [];
  const currentSongOwnerId = currentRound?.currentPlayerId ?? null;
  const currentSong = currentSongOwnerId
    ? (currentRound?.songSelections?.[currentSongOwnerId] ?? null)
    : null;
  const mySelection = effectivePlayerId
    ? (currentRound?.songSelections?.[effectivePlayerId] ?? null)
    : null;
  const myGuessEntries: GuessInfo[] = effectivePlayerId ? (guesses[effectivePlayerId] ?? []) : [];
  const lastMyGuess = myGuessEntries[myGuessEntries.length - 1] ?? null;
  const hasCorrectGuess = Boolean(effectivePlayerId && correctGuessers[effectivePlayerId]);

  useEffect(() => {
    setDisplayTimer(timeRemaining);
  }, [timeRemaining, phase, currentSongOwnerId]);
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

  useEffect(() => {
    if (identity.role === "host") return;
    if (!effectivePlayerId) return;
    const activeHost = players.find((player) => player.isHost && player.connected);
    if (activeHost) return;

    const me = players.find((player) => player.id === effectivePlayerId);
    if (!me?.connected) return;

    const nextCandidate = connectedPlayers[0];
    if (!nextCandidate || nextCandidate.id !== effectivePlayerId) return;

    promoteToHost(identity.playerName);
    toast({ title: "Host reassigned", description: "You are now the host for this room." });
  }, [
    connectedPlayers,
    effectivePlayerId,
    identity.playerName,
    identity.role,
    players,
    promoteToHost,
    toast,
  ]);

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

  const sortedGuessLog = useMemo(() => {
    return [...guessLog].sort((a, b) => {
      if (a.songIndex !== b.songIndex) return a.songIndex - b.songIndex;
      return a.time - b.time;
    });
  }, [guessLog]);

  const currentSongGuessLog = useMemo(() => {
    if (!currentRound) return [] as GuessLogEntry[];
    const songIndex = currentRound.currentSongIndex;
    if (songIndex === undefined || songIndex === null) return [] as GuessLogEntry[];
    return guessLog
      .filter((entry) => entry.songIndex === songIndex)
      .sort((a, b) => a.time - b.time);
  }, [guessLog, currentRound?.currentSongIndex]);

  const formatGuessTime = (time: number) => {
    if (Number.isNaN(time) || !Number.isFinite(time)) return "0s";
    const seconds = Math.max(0, Math.round(time));
    return `${seconds}s`;
  };

  useEffect(() => {
    if (phase !== "guessing") return;
    setGuess("");
  }, [phase, currentSongOwnerId]);

  useEffect(() => {
    if (!isHost) return;
    if (phase !== "song_picking" && phase !== "guessing") return;
    if (rawTimer === null || rawTimer <= 0) return;

    const interval = window.setInterval(() => {
      moves.tickTimer?.();
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isHost, phase, rawTimer, moves]);

  const appliedSettings = isHost ? localSettings : settings;

  const handlePlayerNameCommit = () => {
    const trimmed = playerNameInput.trim().slice(0, 24);
    if (!trimmed) return;
    updatePlayerName(trimmed);
    if (phase === "lobby") {
      moves.setPlayerName?.(trimmed);
    }
  };

  const handleThemeChange = (value: string) => {
    setThemeDraft(value);
    if (isHost) {
      moves.setTheme?.(value);
    }
  };

  const handleVideoSelect = (video: YouTubeVideo) => {
    setSelectedVideo(video);
    setCustomTitle(video.title);
  };

  const handleConfirmSong = () => {
    const trimmed = customTitle.trim();
    if (!selectedVideo || !trimmed) return;
    moves.selectSong?.({
      videoId: selectedVideo.id,
      originalTitle: selectedVideo.title,
      customTitle: trimmed,
      thumbnail: selectedVideo.thumbnail,
    });
    toast({ title: "Song selected", description: "Waiting for other players..." });
    setSelectedVideo(null);
    setCustomTitle("");
  };

  const handleSubmitGuess = () => {
    const trimmed = guess.trim();
    if (!canSubmitGuess || !trimmed) return;
    moves.submitGuess?.(trimmed);
    setGuess("");
  };

  const handleNextRound = () => {
    moves.nextRound?.();
    setThemeDraft("");
    setSelectedVideo(null);
    setCustomTitle("");
    setGuess("");
  };

  const handleEndGame = () => {
    moves.endGame?.();
  };

  const previewSettings = (patch: Partial<Settings>) => {
    if (!isHost) return;
    setLocalSettings((previous) => ({ ...previous, ...patch }));
  };

  const commitSettings = (patch: Partial<Settings>) => {
    if (!isHost) return;
    setLocalSettings((previous) => ({ ...previous, ...patch }));

    const diffEntries = Object.entries(patch).filter(([key, value]) => {
      const typedKey = key as keyof Settings;
      return value !== undefined && settings[typedKey] !== value;
    });

    if (!diffEntries.length) return;
    moves.updateSettings?.(Object.fromEntries(diffEntries) as Partial<Settings>);
  };

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
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-heading font-bold">Music Showdown</h1>
              <p className="text-sm text-muted-foreground">Room: {matchID}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="uppercase">
                  {identity.role}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  You are connected as {identity.playerName}.
                </span>
              </div>
            </div>
          </div>

          <Card className="mb-8 border-2">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-heading mb-2">Room Code</CardTitle>
              <div className="flex items-center justify-center gap-4">
                <code
                  className="text-5xl font-mono font-bold tracking-wider text-primary"
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
                    <Check className="w-5 h-5 text-secondary" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <CardDescription>Share this code with friends to join</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="player-name">Display name</Label>
                <Input
                  id="player-name"
                  placeholder="Your name"
                  value={playerNameInput}
                  onChange={(event) => setPlayerNameInput(event.target.value)}
                  onBlur={handlePlayerNameCommit}
                  onKeyDown={(event) => event.key === "Enter" && handlePlayerNameCommit()}
                  data-testid="input-player-name"
                />
                <p className="text-xs text-muted-foreground">
                  Shared with other players in the lobby.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Badge variant="secondary" className="uppercase">
                  {identity.role}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
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
                <div className="space-y-3">
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

            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Game Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Number of rounds</Label>
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
                    <Label>Pick timer duration (seconds)</Label>
                    <Slider
                      min={30}
                      max={300}
                      step={30}
                      value={toSliderValue(appliedSettings.pickTimerDuration)}
                      onValueChange={sliderPreviewHandler("pickTimerDuration")}
                      onValueCommit={sliderCommitHandler("pickTimerDuration")}
                      disabled={!isHost}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Playback duration (seconds)</Label>
                    <Slider
                      min={30}
                      max={300}
                      step={30}
                      value={toSliderValue(appliedSettings.playbackDuration)}
                      onValueChange={sliderPreviewHandler("playbackDuration")}
                      onValueCommit={sliderCommitHandler("playbackDuration")}
                      disabled={!isHost}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
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
                  onChange={(event) => handleThemeChange(event.target.value)}
                  className="text-lg mt-2"
                  data-testid="input-theme"
                  disabled={!isHost}
                />
              </div>
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
      <div className="min-h-screen bg-background">
        {headerControls}
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-6">
            <Card className="bg-primary/10 border-primary">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="font-heading text-2xl mb-1">Pick Your Song</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Theme:{" "}
                      <span className="font-semibold text-foreground">
                        {currentRound?.theme ?? "Pending"}
                      </span>
                    </p>
                  </div>
                  <Timer timeRemaining={timeRemaining} totalTime={settings.pickTimerDuration} />
                </div>
              </CardHeader>
            </Card>

            {!mySelection && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">Search YouTube</CardTitle>
                </CardHeader>
                <CardContent>
                  <YouTubeSearch onSelect={handleVideoSelect} selectedVideoId={selectedVideo?.id} />
                </CardContent>
              </Card>
            )}

            {selectedVideo && !mySelection && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">Your Selection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <img
                      src={selectedVideo.thumbnail}
                      alt={selectedVideo.title}
                      className="w-full aspect-video object-cover rounded-lg"
                    />
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
                        <p className="text-xs text-muted-foreground mt-1">
                          This is what other players will try to guess
                        </p>
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
                </CardContent>
              </Card>
            )}

            {mySelection && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">You are all set!</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground" data-testid="text-waiting-selection">
                    Waiting for other players to finish picking.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isCurrentSongOwner = Boolean(effectivePlayerId && currentSongOwnerId === effectivePlayerId);
  const guessPlaceholder = isCurrentSongOwner
    ? "You selected this song."
    : hasCorrectGuess
      ? "Correct! Waiting for next song..."
      : "Type your guess...";

  if (phase === "guessing" && currentSong) {
    return (
      <div className="min-h-screen bg-background">
        {headerControls}
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
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

          <Card>
            <CardContent className="pt-6">
              <YouTubePlayer videoId={currentSong.videoId} autoplay preventPause />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Your Guess</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder={guessPlaceholder}
                  value={guess}
                  onChange={(event) => setGuess(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSubmitGuess()}
                  className="text-lg"
                  data-testid="input-guess"
                  disabled={!canSubmitGuess}
                />
                <Button
                  onClick={handleSubmitGuess}
                  disabled={!canSubmitGuess || !guess.trim()}
                  data-testid="button-submit-guess"
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
                  Last guess: "{lastMyGuess.guess}" ({Math.max(0, Math.ceil(lastMyGuess.time))}s)
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Player Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {players.map((player) => {
                  const guessList = guesses[player.id] ?? [];
                  const hasGuessed = guessList.length > 0;
                  const isOwner = player.id === currentSongOwnerId;
                  const isCorrect = Boolean(correctGuessers[player.id]);
                  const lastGuess = guessList[guessList.length - 1];
                  return (
                    <div
                      key={player.id}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50"
                      data-testid={`player-status-${player.id}`}
                    >
                      <PlayerAvatar playerId={player.id} playerName={player.name} size="sm" />
                      <div className="text-xs font-medium text-center">{player.name}</div>
                      {isOwner ? (
                        <Music className="w-4 h-4 text-primary" />
                      ) : isCorrect ? (
                        <CheckCircle className="w-4 h-4 text-secondary" />
                      ) : hasGuessed ? (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      )}
                      {!isOwner && (
                        <div className="text-[10px] text-muted-foreground text-center">
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

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Guess Log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentSongGuessLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No guesses yet for this song.</p>
              ) : (
                currentSongGuessLog.map((entry) => (
                  <div key={entry.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">
                        {entry.playerName}
                        {entry.isCorrect && <Badge className="ml-2">Correct</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatGuessTime(entry.time)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">"{entry.guess}"</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
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
                    className={`flex items-center gap-4 p-6 rounded-lg ${index === 0
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
                  onClick={handleNextRound}
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
    <div className="min-h-screen bg-background flex items-center justify-center">
      <ThemeToggle />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );
}
