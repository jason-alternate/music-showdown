import { type JSX, useCallback, useMemo, useState } from "react";
import { Client, type BoardProps } from "boardgame.io/react";
import { P2P } from "@boardgame.io/p2p";
import type { GameState } from "@/schema";
import { MusicShowdownGame, MAX_PLAYERS } from "./MusicShowdownGame";
import { ConnectionScreen } from "@/components/ConnectionScreen";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  SPECTATOR_PLAYER_ID,
  claimPeerIdentity,
  clearIdentity,
  createSpectatorIdentity,
  getIdentity,
  promoteIdentityToHost,
  releasePeerId,
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
  claimSeat: (preferredId?: string) => void;
  releaseSeat: () => void;
}

export type BoardWithIdentity = (
  props: BoardProps<GameState> & BoardIdentityHelpers,
) => JSX.Element;

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

const persistLastRole = (role: PlayerRole) => {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("musicshowdown.lastRole", role);
  }
};

export const getInitialIdentity = (roomCode: string, initialRole: PlayerRole): LocalIdentity => {
  const pendingRole =
    typeof window !== "undefined" ? sessionStorage.getItem("musicshowdown.pendingRole") : null;
  const stored = getIdentity(roomCode);
  if (stored && !pendingRole) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("musicshowdown.lastRole", stored.role);
    }
    return stored;
  }

  if (stored && pendingRole) {
    clearIdentity(roomCode);
  }

  const resolvedRole = resolveInitialRole(initialRole);
  if (resolvedRole === "peer") {
    return createSpectatorIdentity(readPlayerName());
  }

  const identity = upsertIdentity(roomCode, resolvedRole, readPlayerName());
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
  const [identity, setIdentity] = useState<LocalIdentity>(() =>
    getInitialIdentity(roomCode, defaultRole),
  );

  const setIdentityAndPersist = useCallback(
    (updater: LocalIdentity | ((previous: LocalIdentity) => LocalIdentity)) => {
      setIdentity((previous) => {
        const next =
          typeof updater === "function"
            ? (updater as (value: LocalIdentity) => LocalIdentity)(previous)
            : updater;
        persistLastRole(next.role);
        return next;
      });
    },
    [],
  );

  const updatePlayerName = useCallback(
    (name: string) => {
      const trimmed = name.trim().slice(0, 24);
      if (!trimmed) {
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("playerName", trimmed);
      }

      setIdentityAndPersist((previous) => {
        if (previous.role === "spectator") {
          return {
            ...previous,
            playerName: trimmed,
          };
        }

        return upsertIdentity(roomCode, previous.role, trimmed);
      });
    },
    [roomCode, setIdentityAndPersist],
  );

  const promoteToHost = useCallback(
    (preferredName?: string) => {
      setIdentityAndPersist((previous) => {
        const name = preferredName?.trim().slice(0, 24) || previous.playerName;
        return promoteIdentityToHost(roomCode, name);
      });
    },
    [roomCode, setIdentityAndPersist],
  );

  const claimSeat = useCallback(
    (preferredId?: string) => {
      setIdentityAndPersist((previous) => {
        if (previous.role === "host") return previous;

        const trimmedName = previous.playerName.trim() || readPlayerName();
        const claimed = claimPeerIdentity(roomCode, trimmedName, preferredId);
        return {
          ...claimed,
          role: "peer",
        };
      });
    },
    [roomCode, setIdentityAndPersist],
  );

  const releaseSeat = useCallback(() => {
    setIdentityAndPersist((previous) => {
      if (previous.role !== "peer" || previous.playerID === SPECTATOR_PLAYER_ID) {
        return previous;
      }
      releasePeerId(roomCode, previous.playerID);
      return createSpectatorIdentity(previous.playerName);
    });
  }, [roomCode, setIdentityAndPersist]);

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
          claimSeat={claimSeat}
          releaseSeat={releaseSeat}
        />
      );
    };
  }, [board, identity, promoteToHost, updatePlayerName, claimSeat, releaseSeat]);

  const GameClientComponent = useMemo(
    () =>
      Client({
        game: MusicShowdownGame,
        board: boardWithIdentity,
        multiplayer: P2P({ isHost: identity.role === "host" }),
        numPlayers: MAX_PLAYERS,
        debug: false,
        loading: () => (
          <ConnectionScreen
            title="Connecting to your room"
            description="Setting the stage and syncing players. Hang tight—this should only take a moment."
            roomCode={roomCode}
            topRightSlot={
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <ThemeToggle />
              </div>
            }
          />
        ),
      }),
    [boardWithIdentity, identity.role],
  );

  return (
    <GameClientComponent
      key={`${roomCode}:${identity.playerID}:${identity.credentials}:${identity.role}`}
      matchID={roomCode}
      playerID={identity.role === "spectator" ? undefined : identity.playerID}
      credentials={identity.role === "spectator" ? undefined : identity.credentials}
    />
  );
}
