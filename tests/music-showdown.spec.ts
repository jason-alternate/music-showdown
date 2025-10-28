import { test, expect, type Page } from "@playwright/test";
import {
  createMatchWithPlayers,
  searchAndSelectSong,
  stubYouTubeSearch,
  TEST_YOUTUBE_RESULTS,
} from "./utils/gameTestUtils";

const accelerateTimers = async (page: Page, factor = 60) => {
  const patchInterval = ({ compression }: { compression: number }) => {
    const original = window.setInterval.bind(window);
    const accelerated = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      const adjusted = typeof timeout === "number" ? Math.max(1, timeout / compression) : timeout;
      return original(handler, adjusted as number, ...args);
    }) as typeof window.setInterval;
    window.setInterval = accelerated;
  };

  await page.addInitScript(patchInterval, { compression: factor });
  await page.evaluate(patchInterval, { compression: factor });
};

test.describe("Music Showdown end-to-end", () => {
  test("host and peers can complete a full game with four players", async ({ browser }) => {
    const { host, peers, allPlayers, roomCode, cleanup } = await createMatchWithPlayers(browser);

    const hostPage = host.page;
    const peerPages = peers.map((peer) => peer.page);
    const allPages = [hostPage, ...peerPages];

    for (const page of allPages) {
      await stubYouTubeSearch(page);
      await accelerateTimers(page);
    }

    await expect(hostPage.getByTestId("button-start-game")).toBeEnabled({ timeout: 20000 });

    const totalRounds = 3;
    const playerSongSelections = allPlayers.map((player, index) => ({
      handle: player,
      song: TEST_YOUTUBE_RESULTS[index % TEST_YOUTUBE_RESULTS.length],
    }));

    const setThemeForRound = async (roundNumber: number) => {
      await expect(hostPage.getByTestId("input-theme")).toBeVisible({ timeout: 20000 });
      await hostPage.getByTestId("input-theme").fill(`Synthwave Classics Round ${roundNumber}`);
      await hostPage.getByTestId("button-confirm-theme").click();

      for (const page of allPages) {
        await expect(page.getByText("Pick Your Song")).toBeVisible({ timeout: 20000 });
      }
    };

    const selectSongsForRound = async (roundNumber: number) => {
      for (const { handle, song } of playerSongSelections) {
        await expect(handle.page.getByTestId("input-youtube-search")).toBeVisible({
          timeout: 20000,
        });
        await searchAndSelectSong(handle.page, {
          query: `${song.title} round ${roundNumber}`,
          videoId: song.id,
          customTitle: `${song.title} (${handle.name}) - Round ${roundNumber}`,
        });
      }
    };

    const songsPerRound = playerSongSelections.length;

    const waitForGuessingScreen = async () => {
      for (const page of allPages) {
        await expect(page.getByText("Guess the Song!")).toBeVisible({ timeout: 20000 });
      }
    };

    const waitForSongRevealScreen = async () => {
      for (const page of allPages) {
        await expect(page.getByText("Song Revealed!")).toBeVisible({ timeout: 30000 });
      }
    };

    const advanceGuessingPhase = async () => {
      await waitForGuessingScreen();

      const continueRevealButton = hostPage.getByTestId("button-continue-reveal");

      for (let songIndex = 0; songIndex < songsPerRound; songIndex += 1) {
        await waitForSongRevealScreen();

        await expect(continueRevealButton).toBeVisible({ timeout: 20000 });
        await expect(continueRevealButton).toBeEnabled({ timeout: 20000 });
        await continueRevealButton.click();
        await expect(continueRevealButton).toBeHidden({ timeout: 20000 });

        if (songIndex < songsPerRound - 1) {
          await waitForGuessingScreen();
        }
      }

      for (const page of allPages) {
        await expect(page.getByText("Round Complete!")).toBeVisible({ timeout: 30000 });
      }
    };

    try {
      await hostPage.getByTestId("button-start-game").click();
      await hostPage.waitForURL(`**/game/${roomCode}`, { timeout: 20000 });

      for (const page of peerPages) {
        await page.waitForURL(`**/game/${roomCode}`, { timeout: 20000 });
      }

      for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber += 1) {
        await setThemeForRound(roundNumber);
        await selectSongsForRound(roundNumber);
        await advanceGuessingPhase();

        const nextRoundButton = hostPage.getByTestId("button-next-round");
        await expect(nextRoundButton).toBeEnabled({ timeout: 20000 });
        await nextRoundButton.click();

        if (roundNumber < totalRounds) {
          await expect(hostPage.getByTestId("input-theme")).toBeVisible({ timeout: 20000 });
        } else {
          for (const page of allPages) {
            await expect(page.getByText("Game Over!")).toBeVisible({ timeout: 20000 });
          }
        }
      }
    } finally {
      await cleanup();
    }
  });
});
