import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import App from "./App";
import Home from "@/pages/Home";
import GameBoard from "@/pages/Game";
import NotFound from "@/pages/not-found";
import { GameClient } from "@/game/GameClient";

export const rootRoute = createRootRoute({
  component: App,
});

export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/music-showdown/",
  component: Home,
});

export const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/music-showdown/game/$roomCode",
  component: () => {
    const { roomCode } = gameRoute.useParams();
    if (typeof window !== "undefined") {
      const pending = sessionStorage.getItem("musicshowdown.pendingRole");
      if (!pending) {
        sessionStorage.setItem("musicshowdown.pendingRole", "peer");
      }
    }
    return <GameClient roomCode={roomCode} defaultRole="peer" board={GameBoard} />;
  },
});

export const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "*",
  component: NotFound,
});

const routeTree = rootRoute.addChildren([homeRoute, gameRoute, notFoundRoute]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
