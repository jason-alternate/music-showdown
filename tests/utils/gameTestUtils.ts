import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export interface MatchHandles {
  hostContext: BrowserContext;
  peerContext: BrowserContext;
  hostPage: Page;
  peerPage: Page;
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
];

export async function createHostAndPeerMatch(
  browser: Browser,
  baseURL: string = DEFAULT_BASE_URL,
): Promise<MatchHandles> {
  const hostContext = await browser.newContext({ baseURL });
  const peerContext = await browser.newContext({ baseURL });

  const hostPage = await hostContext.newPage();
  await hostPage.goto("/");
  await hostPage.getByTestId("input-player-name").fill("Host Player");
  await hostPage.getByTestId("button-create-room").click();
  await hostPage.waitForURL("**/game/*", { timeout: 20000 });
  const roomCode = (await hostPage.getByTestId("text-room-code").textContent())?.trim() ?? "";
  if (!roomCode) {
    throw new Error("Failed to read generated room code");
  }

  const peerPage = await peerContext.newPage();
  await peerPage.goto("/");
  await peerPage.getByTestId("input-player-name").fill("Peer Player");
  await peerPage.getByTestId("input-room-code").fill(roomCode);
  await peerPage.getByTestId("button-join-room").click();
  await peerPage.waitForURL(`**/game/${roomCode}`, { timeout: 20000 });

  await expect(hostPage.getByText(/Players \(2\/\d+/)).toBeVisible({ timeout: 20000 });

  return {
    hostContext,
    peerContext,
    hostPage,
    peerPage,
    roomCode,
    cleanup: async () => {
      await Promise.allSettled([hostContext.close(), peerContext.close()]);
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
