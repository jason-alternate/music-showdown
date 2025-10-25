import { generateCredentials } from "@boardgame.io/p2p";
import { MAX_PLAYERS } from "./MusicShowdownGame";

export type PlayerRole = "host" | "peer";

export interface PlayerIdentity {
  playerID: string;
  credentials: string;
  role: PlayerRole;
  playerName: string;
}

const KEY_PREFIX = "musicshowdown.identity";
const HOST_PLAYER_ID = "0";
const MIN_PEER_ID = 1;
const MAX_PEER_ID = Math.max(MIN_PEER_ID, MAX_PLAYERS - 1);

const createStorageKey = (roomCode: string) => `${KEY_PREFIX}.${roomCode}`;
const createUsedIdsKey = (roomCode: string) => `${KEY_PREFIX}.${roomCode}.used`;

const isValidPlayerId = (role: PlayerRole, playerID: string) => {
  if (role === "host") {
    return playerID === HOST_PLAYER_ID;
  }
  const numeric = Number(playerID);
  return Number.isInteger(numeric) && numeric >= MIN_PEER_ID && numeric <= MAX_PEER_ID;
};

const readUsedIds = (roomCode: string) => {
  if (typeof window === "undefined") return new Set<string>();
  const stored = localStorage.getItem(createUsedIdsKey(roomCode));
  if (!stored) return new Set<string>();
  try {
    const parsed = JSON.parse(stored) as string[];
    return new Set(parsed);
  } catch {
    return new Set<string>();
  }
};

const writeUsedIds = (roomCode: string, used: Set<string>) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(createUsedIdsKey(roomCode), JSON.stringify(Array.from(used)));
};

const allocatePeerId = (roomCode: string, used: Set<string>) => {
  for (let id = MIN_PEER_ID; id <= MAX_PEER_ID; id++) {
    const candidate = String(id);
    if (!used.has(candidate)) {
      used.add(candidate);
      writeUsedIds(roomCode, used);
      return candidate;
    }
  }
  // Fallback: reuse last available
  const fallback = String(Math.min(MAX_PEER_ID, Math.max(MIN_PEER_ID, used.size + MIN_PEER_ID)));
  used.add(fallback);
  writeUsedIds(roomCode, used);
  return fallback;
};

const createIdentity = (roomCode: string, role: PlayerRole, playerName: string): PlayerIdentity => {
  if (role === "host") {
    return {
      playerID: HOST_PLAYER_ID,
      credentials: generateCredentials(),
      role,
      playerName,
    };
  }

  const used = readUsedIds(roomCode);
  const playerID = allocatePeerId(roomCode, used);
  return {
    playerID,
    credentials: generateCredentials(),
    role,
    playerName,
  };
};

export function getIdentity(roomCode: string): PlayerIdentity | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(createStorageKey(roomCode));
  if (!stored) return null;
  try {
    return JSON.parse(stored) as PlayerIdentity;
  } catch {
    return null;
  }
}

export function upsertIdentity(
  roomCode: string,
  role: PlayerRole,
  playerName: string,
): PlayerIdentity {
  if (typeof window === "undefined") {
    return {
      playerID: role === "host" ? HOST_PLAYER_ID : String(MIN_PEER_ID),
      credentials: generateCredentials(),
      role,
      playerName,
    };
  }

  const key = createStorageKey(roomCode);
  const existing = getIdentity(roomCode);
  const usedIds = readUsedIds(roomCode);

  if (existing) {
    let nextPlayerId = existing.playerID;
    let nextCredentials = existing.credentials;

    if (!isValidPlayerId(existing.role, existing.playerID)) {
      usedIds.delete(existing.playerID);
      nextPlayerId = existing.role === "host" ? HOST_PLAYER_ID : allocatePeerId(roomCode, usedIds);
      nextCredentials = generateCredentials();
    }

    if (existing.role === "host" && role !== "host") {
      role = "host";
    }

    const updated: PlayerIdentity = {
      ...existing,
      role: existing.role === "host" ? existing.role : role,
      playerName: playerName || existing.playerName,
      playerID: role === "host" ? HOST_PLAYER_ID : nextPlayerId,
      credentials: nextCredentials,
    };

    if (!isValidPlayerId(updated.role, updated.playerID)) {
      usedIds.delete(updated.playerID);
      updated.playerID = updated.role === "host" ? HOST_PLAYER_ID : allocatePeerId(roomCode, usedIds);
      updated.credentials = generateCredentials();
    }

    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  }

  const identity: PlayerIdentity = createIdentity(roomCode, role, playerName);
  if (role === "peer") {
    const used = readUsedIds(roomCode);
    used.add(identity.playerID);
    writeUsedIds(roomCode, used);
  }
  localStorage.setItem(key, JSON.stringify(identity));
  return identity;
}

export function promoteIdentityToHost(roomCode: string, playerName: string): PlayerIdentity {
  const trimmedName = playerName.trim().slice(0, 24);
  if (typeof window === "undefined") {
    return {
      playerID: HOST_PLAYER_ID,
      credentials: generateCredentials(),
      role: "host",
      playerName: trimmedName || playerName || "Player",
    };
  }

  const key = createStorageKey(roomCode);
  const usedIds = readUsedIds(roomCode);
  const existing = getIdentity(roomCode);

  if (existing && existing.playerID !== HOST_PLAYER_ID) {
    usedIds.delete(existing.playerID);
    writeUsedIds(roomCode, usedIds);
  }

  const name = trimmedName || existing?.playerName || "Player";

  const identity: PlayerIdentity = {
    playerID: HOST_PLAYER_ID,
    credentials: generateCredentials(),
    role: "host",
    playerName: name,
  };

  localStorage.setItem(key, JSON.stringify(identity));
  try {
    sessionStorage.setItem("musicshowdown.lastRole", "host");
  } catch {
    // Ignore sessionStorage write failures (e.g., disabled storage).
  }

  return identity;
}

export function clearIdentity(roomCode: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(createStorageKey(roomCode));
  localStorage.removeItem(createUsedIdsKey(roomCode));
}
