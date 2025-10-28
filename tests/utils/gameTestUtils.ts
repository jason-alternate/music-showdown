import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export interface TestPlayerHandle {
  name: string;
  context: BrowserContext;
  page: Page;
}

export interface MatchHandles {
  host: TestPlayerHandle;
  peers: TestPlayerHandle[];
  allPlayers: TestPlayerHandle[];
  roomCode: string;
  cleanup: () => Promise<void>;
}

const DEFAULT_BASE_URL = "http://localhost:5173";

export const TEST_YOUTUBE_RESULTS = [
  {
    id: "dQw4w9WgXcQ",
    title: "Never Gonna Give You Up",
    channelTitle: "Rick Astley",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
  },
  {
    id: "yPYZpwSpKmA",
    title: "Together Forever",
    channelTitle: "Rick Astley",
    thumbnail: "https://i.ytimg.com/vi/yPYZpwSpKmA/default.jpg",
  },
  {
    id: "3JZ_D3ELwOQ",
    title: "Take On Me",
    channelTitle: "a-ha",
    thumbnail: "https://i.ytimg.com/vi/3JZ_D3ELwOQ/default.jpg",
  },
  {
    id: "fLexgOxsZu0",
    title: "Hungry Like the Wolf",
    channelTitle: "Duran Duran",
    thumbnail: "https://i.ytimg.com/vi/fLexgOxsZu0/default.jpg",
  },
];

export async function createMatchWithPlayers(
  browser: Browser,
  options?: { baseURL?: string; playerNames?: string[] },
): Promise<MatchHandles> {
  const baseURL = options?.baseURL ?? DEFAULT_BASE_URL;
  const playerNames = options?.playerNames ?? ["Host Player", "Peer One", "Peer Two", "Peer Three"];

  if (playerNames.length < 2) {
    throw new Error("Need at least two players in the lobby");
  }

  const contexts: BrowserContext[] = [];

  const hostContext = await browser.newContext({ baseURL });
  contexts.push(hostContext);
  const hostPage = await hostContext.newPage();
  await hostPage.goto("/");
  await hostPage.getByTestId("input-player-name").fill(playerNames[0]);
  await hostPage.getByTestId("button-create-room").click();
  await hostPage.waitForURL("**/game/*", { timeout: 20000 });
  const roomCode = (await hostPage.getByTestId("text-room-code").textContent())?.trim() ?? "";
  if (!roomCode) {
    throw new Error("Failed to read generated room code");
  }

  const players: TestPlayerHandle[] = [
    {
      name: playerNames[0],
      context: hostContext,
      page: hostPage,
    },
  ];

  for (let index = 1; index < playerNames.length; index += 1) {
    const context = await browser.newContext({ baseURL });
    contexts.push(context);
    await context.addInitScript(
      ({ playerName }) => {
        window.localStorage.setItem("playerName", playerName);
        window.sessionStorage.setItem("musicshowdown.pendingRole", "peer");
        window.sessionStorage.setItem("musicshowdown.lastRole", "peer");
      },
      {
        playerName: playerNames[index],
      },
    );
    const page = await context.newPage();
    await page.goto("/");
    await page.getByTestId("input-player-name").fill(playerNames[index]);
    await page.getByTestId("input-room-code").fill(roomCode);
    await page.getByTestId("button-join-room").click();

    await page.waitForURL(`**/game/${roomCode}`, { timeout: 20000 });

    const playersCounter = await expect(hostPage.getByText(`Players (${index + 1}/8)`)).toBeVisible(
      { timeout: 20000 },
    );

    players.push({
      name: playerNames[index],
      context,
      page,
    });
  }

  return {
    host: players[0],
    peers: players.slice(1),
    allPlayers: players,
    roomCode,
    cleanup: async () => {
      await Promise.allSettled(contexts.map((context) => context.close()));
    },
  };
}

export async function stubYouTubeSearch(page: Page, videos = TEST_YOUTUBE_RESULTS) {
  await page.route("https://www.googleapis.com/youtube/v3/search*", async (route) => {
    const items = videos.map((video) => ({
      id: { videoId: video.id },
      snippet: {
        title: video.title,
        channelTitle: video.channelTitle,
        thumbnails: {
          medium: { url: video.thumbnail },
        },
      },
    }));

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items }),
      status: 200,
    });
  });
}

interface SongSelectionOptions {
  query: string;
  videoId: string;
  customTitle: string;
}

export async function searchAndSelectSong(page: Page, options: SongSelectionOptions) {
  const { query, videoId, customTitle } = options;

  await page.getByTestId("input-youtube-search").fill(query);
  await page.getByTestId("button-search").click();

  const videoCard = page.getByTestId(`card-video-${videoId}`);
  await expect(videoCard).toBeVisible({ timeout: 10000 });
  await videoCard.click();

  const songTitleInput = page.getByTestId("input-song-title");
  await expect(songTitleInput).toBeVisible({ timeout: 10000 });
  await songTitleInput.fill(customTitle);

  await page.getByTestId("button-confirm-song").click();
}
