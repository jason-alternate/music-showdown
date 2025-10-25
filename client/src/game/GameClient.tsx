import { type JSX, useCallback, useEffect, useMemo, useState } from "react";
import { Client, type BoardProps } from "boardgame.io/react";
import { P2P } from "@boardgame.io/p2p";
import type { GameState } from "@/schema";
import { MusicShowdownGame, MAX_PLAYERS } from "./MusicShowdownGame";
import {
  getIdentity,
  promoteIdentityToHost,
  upsertIdentity,
  type PlayerIdentity,
  type PlayerRole,
} from "./identity";

export type LocalIdentity = PlayerIdentity;

export interface BoardIdentityHelpers {
  identity: LocalIdentity;
  isHost: boolean;
  updatePlayerName: (name: string) => void;
  promoteToHost: (preferredName?: string) => void;
}

export type BoardWithIdentity = (props: BoardProps<GameState> & BoardIdentityHelpers) => JSX.Element;

const readPlayerName = () => {
  if (typeof window === "undefined") return "Player";
  return localStorage.getItem("playerName") || "Player";
};

const resolveInitialRole = (fallback: PlayerRole): PlayerRole => {
  if (typeof window === "undefined") return fallback;
  const pending = sessionStorage.getItem("musicshowdown.pendingRole");
  if (pending === "host" || pending === "peer") {
    sessionStorage.removeItem("musicshowdown.pendingRole");
    return pending;
  }
  const lastRole = sessionStorage.getItem("musicshowdown.lastRole");
  if (lastRole === "host" || lastRole === "peer") {
    return lastRole;
  }
  return fallback;
};

export const getInitialIdentity = (roomCode: string, initialRole: PlayerRole): LocalIdentity => {
  const stored = getIdentity(roomCode);
  if (stored) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("musicshowdown.lastRole", stored.role);
    }
    return stored;
  }
  const role = resolveInitialRole(initialRole);
  const identity = upsertIdentity(roomCode, role, readPlayerName());
  if (typeof window !== "undefined") {
    sessionStorage.setItem("musicshowdown.lastRole", identity.role);
  }
  return identity;
};

interface GameClientProps {
  roomCode: string;
  defaultRole: PlayerRole;
  board: BoardWithIdentity;
}

export function GameClient({ roomCode, defaultRole, board }: GameClientProps) {
  const [identity, setIdentity] = useState<LocalIdentity>(() => getInitialIdentity(roomCode, defaultRole));

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("musicshowdown.lastRole", identity.role);
    }
  }, [identity.role]);

  const updatePlayerName = useCallback(
    (name: string) => {
      const trimmed = name.trim().slice(0, 24);
      if (!trimmed) {
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("playerName", trimmed);
      }
      const updated = upsertIdentity(roomCode, identity.role, trimmed);
      setIdentity(updated);
    },
    [identity.role, roomCode],
  );

  const promoteToHost = useCallback(
    (preferredName?: string) => {
      setIdentity((previous) => {
        const name = preferredName?.trim().slice(0, 24) || previous.playerName;
        return promoteIdentityToHost(roomCode, name);
      });
    },
    [roomCode],
  );

  const boardWithIdentity = useMemo(() => {
    const BoardComponent = board;
    return function BoardWithIdentityProps(props: BoardProps<GameState>) {
      return (
        <BoardComponent
          {...props}
          identity={identity}
          isHost={identity.role === "host"}
          updatePlayerName={updatePlayerName}
          promoteToHost={promoteToHost}
        />
      );
    };
  }, [board, identity, promoteToHost, updatePlayerName]);

  const GameClientComponent = useMemo(
    () =>
      Client({
        game: MusicShowdownGame,
        board: boardWithIdentity,
        multiplayer: P2P({ isHost: identity.role === "host" }),
        numPlayers: MAX_PLAYERS,
        debug: false,
      }),
    [boardWithIdentity, identity.role],
  );

  return (
    <GameClientComponent
      key={`${roomCode}:${identity.playerID}:${identity.credentials}:${identity.role}`}
      matchID={roomCode}
      playerID={identity.playerID}
      credentials={identity.credentials}
    />
  );
}
