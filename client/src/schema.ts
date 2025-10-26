import { z } from "zod";

// YouTube video result
export const youtubeVideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  thumbnail: z.string(),
  channelTitle: z.string(),
});

export type YouTubeVideo = z.infer<typeof youtubeVideoSchema>;

// Song selection for a player
export const songSelectionSchema = z.object({
  videoId: z.string(),
  originalTitle: z.string(),
  customTitle: z.string(),
  thumbnail: z.string(),
  startSeconds: z.number().min(0).max(3600).default(0),
});

export type SongSelection = z.infer<typeof songSelectionSchema>;

// Player in the game
export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  connected: boolean;
  currentGuess?: string;
  hasGuessed?: boolean;
  guessTime?: number;
}

// Game settings
export interface GameSettings {
  playbackDuration: number; // in seconds
  totalRounds: number;
}

// Game phase enum
export type GamePhase =
  | "lobby"
  | "theme_selection"
  | "song_picking"
  | "guessing"
  | "round_results"
  | "game_over";

// Guess info
export interface GuessInfo {
  guess: string;
  time: number;
  isCorrect: boolean;
}

export interface GuessLogEntry {
  id: string;
  playerId: string;
  playerName: string;
  guess: string;
  time: number;
  isCorrect: boolean;
  songOwnerId: string | null;
  songOwnerName: string | null;
  songIndex: number;
}

// Round state (serializable)
export interface RoundState {
  roundNumber: number;
  theme: string;
  songSelections: Record<string, SongSelection>; // playerId -> SongSelection
  currentSongIndex: number;
  currentPlayerId: string | null;
  guesses: Record<string, GuessInfo[]>; // playerId -> guesses for current song
  roundScores: Record<string, number>; // playerId -> points earned this round
  playOrder: string[];
  correctGuessers: Record<string, boolean>;
  guessLog: GuessLogEntry[];
}

// Main game state (serializable)
export interface GameState {
  phase: GamePhase;
  players: Record<string, Player>; // playerId -> Player
  settings: GameSettings;
  currentRound: RoundState | null;
  totalRounds: number;
  completedRounds: number;
  timer: number | null;
  maxPlayers: number;
  lobbyOrder: string[];
}

export interface LobbyPlayerSlot {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
}

// Room settings form
export const roomSettingsSchema = z.object({
  playbackDuration: z.number().min(15).max(60),
  totalRounds: z.number().min(1).max(10),
});

export type RoomSettings = z.infer<typeof roomSettingsSchema>;
