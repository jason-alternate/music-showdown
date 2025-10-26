import type { Game } from "boardgame.io";
import type {
  GameState,
  Player,
  RoundState,
  SongSelection,
  GameSettings,
  GamePhase,
} from "@/schema";
import { calculatePoints, isGuessCorrect } from "@/lib/gameLogic";

interface MusicShowdownState extends GameState {
  // boardgame.io specific fields
}

type CtxWithRandom = {
  random?: {
    Shuffle<T>(array: T[]): T[];
    UUID(): string;
  };
};

type EventsAPI = {
  setPhase?: (phase: GamePhase) => void;
};

const advanceToNextSongOrRound = (G: MusicShowdownState, events?: EventsAPI) => {
  const round = G.currentRound;
  if (!round) return;

  const nextIndex = round.currentSongIndex + 1;

  if (nextIndex < round.playOrder.length) {
    round.currentSongIndex = nextIndex;
    const nextPlayerId = round.playOrder[nextIndex];
    round.currentPlayerId = nextPlayerId ?? null;
    round.guesses = {};
    round.correctGuessers = {};
    G.timer = G.settings.playbackDuration;
    return;
  }

  round.currentSongIndex = nextIndex;
  round.currentPlayerId = null;
  round.guesses = {};
  round.correctGuessers = {};
  G.timer = null;
  G.phase = "round_results";
  events?.setPhase?.("round_results");
};

export interface MusicShowdownMoves {
  // Lobby phase
  updateSettings: (settings: Partial<GameSettings>) => void;
  startGame: () => void;
  setPlayerName: (name: string) => void;
  restoreState: (state: GameState) => void;

  // Theme selection phase
  setTheme: (theme: string) => void;
  confirmTheme: () => void;

  // Song picking phase
  selectSong: (selection: SongSelection) => void;

  // Guessing phase
  submitGuess: (guess: string) => void;
  tickTimer: () => void;

  // Round transitions
  nextRound: () => void;
  restartLobby: () => void;
  endGame: () => void;
}

export const MAX_PLAYERS = 8;


export const MusicShowdownGame: Game<MusicShowdownState> = {
  name: "music-showdown",
  minPlayers: 2,
  maxPlayers: MAX_PLAYERS,

  moves: {
    restoreState: ({ G, playerID, events }, state: GameState) => {
      if (playerID !== "0") return;
      let clonedState: GameState;
      try {
        clonedState = JSON.parse(JSON.stringify(state)) as GameState;
      } catch {
        return;
      }

      if (clonedState.players[playerID]) {
        clonedState.players[playerID].connected = true;
        clonedState.players[playerID].isHost = true;
      }

      G.phase = clonedState.phase;
      G.players = { ...clonedState.players };
      G.settings = { ...clonedState.settings };
      G.currentRound = clonedState.currentRound
        ? {
          ...clonedState.currentRound,
          songSelections: { ...clonedState.currentRound.songSelections },
          guesses: Object.fromEntries(
            Object.entries(clonedState.currentRound.guesses).map(([key, value]) => [
              key,
              value.map((entry) => ({ ...entry })),
            ]),
          ),
          roundScores: { ...clonedState.currentRound.roundScores },
          playOrder: [...clonedState.currentRound.playOrder],
          correctGuessers: { ...clonedState.currentRound.correctGuessers },
          guessLog: clonedState.currentRound.guessLog.map((entry) => ({ ...entry })),
        }
        : null;
      G.totalRounds = clonedState.totalRounds;
      G.completedRounds = clonedState.completedRounds;
      G.timer = clonedState.timer;
      G.maxPlayers = clonedState.maxPlayers;
      G.lobbyOrder = [...clonedState.lobbyOrder];

      events?.setPhase?.(clonedState.phase);
    },
  },

  setup: ({ ctx }): MusicShowdownState => {
    // Initialize players
    return {
      phase: "lobby",
      players: {},
      settings: {
        playbackDuration: 30,
        totalRounds: 3,
      },
      currentRound: null,
      totalRounds: 3,
      completedRounds: 0,
      timer: null,
      maxPlayers: MAX_PLAYERS,
      lobbyOrder: [],
    };
  },

  phases: {
    lobby: {
      start: true,
      moves: {
        updateSettings: ({ G, playerID }, settings: Partial<GameSettings>) => {
          const player = G.players[playerID];
          if (!player?.isHost) return;

          G.settings = { ...G.settings, ...settings };
          G.totalRounds = settings.totalRounds || G.totalRounds;
        },

        startGame: ({ G, playerID, events }) => {
          const player = G.players[playerID];
          if (!player?.isHost) return;

          G.phase = "theme_selection";
          events?.setPhase?.("theme_selection");
        },

        setPlayerName: ({ G, playerID }, name: string) => {
          if (!playerID) return;
          const trimmed = name.trim().slice(0, 24);
          if (!trimmed) return;

          const existing = G.players[playerID];

          if (!existing && Object.keys(G.players).length >= G.maxPlayers) {
            return;
          }

          if (existing) {
            existing.name = trimmed;
            existing.connected = true;
            G.lobbyOrder = G.lobbyOrder.filter((id) => id !== playerID);
            if (!G.lobbyOrder.includes(playerID)) {
              G.lobbyOrder.push(playerID);
            }
            return;
          }

          G.players[playerID] = {
            id: playerID,
            name: trimmed,
            score: 0,
            isHost: playerID === "0",
            connected: true,
          };

          G.lobbyOrder = G.lobbyOrder.filter((id) => id !== playerID);
          if (!G.lobbyOrder.includes(playerID)) {
            G.lobbyOrder.push(playerID);
          }
        },
      },
      next: "theme_selection",
    },

    theme_selection: {
      moves: {
        setTheme: ({ G, playerID }, theme: string) => {
          const player = G.players[playerID];
          if (!player?.isHost) return;

          if (!G.currentRound) {
            G.currentRound = {
              roundNumber: G.completedRounds + 1,
              theme: theme,
              songSelections: {},
              currentSongIndex: 0,
              currentPlayerId: null,
              guesses: {},
              roundScores: {},
              playOrder: [],
              correctGuessers: {},
              guessLog: [],
            };
          } else {
            G.currentRound.theme = theme;
          }
        },

        confirmTheme: ({ G, playerID, events }) => {
          const player = G.players[playerID];
          if (!player?.isHost || !G.currentRound?.theme) return;

          G.timer = null;
          G.phase = "song_picking";
          events?.setPhase?.("song_picking");
        },
      },
      next: "song_picking",
    },

    song_picking: {
      moves: {
        selectSong: ({ G, playerID }, selection: SongSelection) => {
          const round = G.currentRound;
          if (!round) return;

          const conflictingEntry = Object.entries(round.songSelections).find(
            ([id, song]) => id !== playerID && song.videoId === selection.videoId,
          );

          if (conflictingEntry) {
            return;
          }

          round.songSelections[playerID] = selection;
        },
      },

      endIf: ({ G }) => {
        if (!G.currentRound) return false;

        // Move to guessing when all connected players have selected
        const connectedPlayers = Object.values(G.players).filter((player) => player.connected);
        const requiredSelections = connectedPlayers.length;
        if (requiredSelections === 0) return false;
        return Object.keys(G.currentRound.songSelections).length >= requiredSelections;
      },

      next: "guessing",

      onEnd: ({ G, ctx, events }) => {
        if (!G.currentRound) return;

        // Initialize guessing phase
        const playerIds = Object.keys(G.currentRound.songSelections);
        const randomApi = (ctx as CtxWithRandom).random;
        const shuffledOrder = randomApi?.Shuffle
          ? randomApi.Shuffle(playerIds)
          : [...playerIds].sort(() => Math.random() - 0.5);

        G.currentRound.playOrder = shuffledOrder;
        G.currentRound.currentSongIndex = 0;
        G.currentRound.guesses = {};
        G.currentRound.correctGuessers = {};

        if (shuffledOrder.length === 0) {
          G.currentRound.currentPlayerId = null;
          G.timer = null;
          G.phase = "round_results";
          events?.setPhase?.("round_results");
          return;
        }

        // Set first player's song
        G.currentRound.currentPlayerId = shuffledOrder[0];
        G.timer = G.settings.playbackDuration;
        G.phase = "guessing";
      },
    },

    guessing: {
      moves: {
        submitGuess: ({ G, ctx, playerID, events }, guess: string) => {
          if (!G.currentRound || !G.currentRound.currentPlayerId) return;

          // Don't allow the song owner to guess their own song
          if (playerID === G.currentRound.currentPlayerId) return;

          const guessesForPlayer = G.currentRound.guesses[playerID] ?? [];
          const alreadyCorrect = guessesForPlayer.some((entry) => entry.isCorrect);
          if (alreadyCorrect) return;

          const guessTime = G.settings.playbackDuration - (G.timer || 0);
          const currentSong = G.currentRound.songSelections[G.currentRound.currentPlayerId];
          const isCorrect = Boolean(currentSong && isGuessCorrect(guess, currentSong.customTitle));

          const entry = { guess, time: guessTime, isCorrect };
          G.currentRound.guesses[playerID] = [...guessesForPlayer, entry];

          const randomApi = (ctx as CtxWithRandom).random;
          const logEntry = {
            id: randomApi?.UUID
              ? randomApi.UUID()
              : `${G.currentRound.roundNumber}-${playerID}-${Date.now()}`,
            playerId: playerID,
            playerName: G.players[playerID]?.name ?? `Player ${playerID}`,
            guess,
            time: guessTime,
            isCorrect,
            songOwnerId: G.currentRound.currentPlayerId,
            songOwnerName:
              G.currentRound.currentPlayerId && G.players[G.currentRound.currentPlayerId]
                ? G.players[G.currentRound.currentPlayerId].name
                : null,
            songIndex: G.currentRound.currentSongIndex,
          };
          G.currentRound.guessLog = [...G.currentRound.guessLog, logEntry];

          if (isCorrect) {
            G.currentRound.correctGuessers[playerID] = true;
            // Find if this is the first correct guess
            let isFirstCorrect = true;
            for (const [otherId, guessList] of Object.entries(G.currentRound.guesses)) {
              if (otherId === playerID) continue;
              for (const otherGuess of guessList) {
                if (otherGuess.isCorrect) {
                  if (otherGuess.time < guessTime) {
                    isFirstCorrect = false;
                  }
                  break;
                }
              }
              if (!isFirstCorrect) break;
            }

            // Calculate and award points
            const points = calculatePoints(
              true,
              guessTime,
              G.settings.playbackDuration,
              isFirstCorrect,
            );
            const player = G.players[playerID];
            if (player) {
              player.score += points;
              G.currentRound.roundScores[playerID] =
                (G.currentRound.roundScores[playerID] || 0) + points;
            }
          }

          const connectedPlayers = Object.values(G.players).filter((player) => player.connected);
          const songOwnerId = G.currentRound.currentPlayerId;
          const eligiblePlayers = connectedPlayers.filter((player) => player.id !== songOwnerId).length;
          const correctCount = Object.values(G.currentRound.correctGuessers).filter(Boolean).length;

          if (eligiblePlayers === 0 || (eligiblePlayers > 0 && correctCount >= eligiblePlayers)) {
            advanceToNextSongOrRound(G, events);
          }
        },
        tickTimer: ({ G, playerID, events }) => {
          const player = G.players[playerID];
          if (!player?.isHost) return;
          if (G.timer === null) return;

          if (G.timer <= 0) {
            G.timer = 0;
            advanceToNextSongOrRound(G, events);
            return;
          }

          G.timer -= 1;

          if (G.timer <= 0) {
            G.timer = 0;
            advanceToNextSongOrRound(G, events);
          }
        },
      },
    },

    round_results: {
      moves: {
        nextRound: ({ G, playerID, events }) => {
          const player = G.players[playerID];
          if (!player?.isHost) return;

          G.completedRounds++;

          if (G.completedRounds < G.totalRounds) {
            // Start next round
            G.currentRound = null;
            G.timer = null;
            G.phase = "theme_selection";
            events?.setPhase?.("theme_selection");
          } else {
            // Game over
            G.timer = null;
            G.phase = "game_over";
            events?.setPhase?.("game_over");
          }
        },
      },
      next: "theme_selection",
    },

    game_over: {
      moves: {
        restartLobby: ({ G, playerID, events }) => {
          const player = G.players[playerID];
          if (!player?.isHost) return;

          for (const participant of Object.values(G.players)) {
            participant.score = 0;
          }

          G.currentRound = null;
          G.completedRounds = 0;
          G.timer = null;
          G.totalRounds = G.settings.totalRounds;
          G.phase = "lobby";
          events?.setPhase?.("lobby");
        },
        endGame: ({ G, events }) => {
          G.phase = "lobby";
          // Could reset to lobby or end game
          events?.endGame?.();
        },
      },
    },
  },

  turn: {
    // No turn-based logic, all moves are concurrent
    activePlayers: { all: "default" },
  },
};
