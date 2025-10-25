import { test, expect, type Page } from "@playwright/test";
import {
  createHostAndPeerMatch,
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
  test("host and peer can complete a full game", async ({ browser }) => {
    const match = await createHostAndPeerMatch(browser);
    const { hostPage, peerPage, roomCode, cleanup } = match;

    await stubYouTubeSearch(hostPage);
    await stubYouTubeSearch(peerPage);
    await accelerateTimers(hostPage);
    await accelerateTimers(peerPage);

    const totalRounds = 3;
    const hostSong = TEST_YOUTUBE_RESULTS[0];
    const peerSong = TEST_YOUTUBE_RESULTS[1];

    const setThemeForRound = async (roundNumber: number) => {
      await expect(hostPage.getByTestId("input-theme")).toBeVisible({ timeout: 20000 });
      await hostPage.getByTestId("input-theme").fill(`Synthwave Classics Round ${roundNumber}`);
      await hostPage.getByTestId("button-confirm-theme").click();

      await expect(hostPage.getByText("Pick Your Song")).toBeVisible({ timeout: 20000 });
      await expect(peerPage.getByText("Pick Your Song")).toBeVisible({ timeout: 20000 });
    };

    const selectSongsForRound = async () => {
      await searchAndSelectSong(hostPage, {
        query: "retro anthem",
        videoId: hostSong.id,
        customTitle: hostSong.title,
      });

      await searchAndSelectSong(peerPage, {
        query: "midnight groove",
        videoId: peerSong.id,
        customTitle: peerSong.title,
      });
    };

    const playGuessingPhaseToResults = async () => {
      const hostGuessInput = hostPage.getByTestId("input-guess");
      const hostSubmitButton = hostPage.getByTestId("button-submit-guess");
      const peerGuessInput = peerPage.getByTestId("input-guess");
      const peerSubmitButton = peerPage.getByTestId("button-submit-guess");

      const songsPerRound = 2;
      for (let songIndex = 0; songIndex < songsPerRound; songIndex += 1) {
        await expect(hostPage.getByText("Guess the Song!")).toBeVisible({ timeout: 20000 });
        await expect(peerPage.getByText("Guess the Song!")).toBeVisible({ timeout: 20000 });

        await expect(hostGuessInput).toBeVisible({ timeout: 20000 });
        await expect(peerGuessInput).toBeVisible({ timeout: 20000 });

        // Allow client state to settle before reading disabled state
        await hostPage.waitForTimeout(100);

        const peerDisabled = await peerGuessInput.isDisabled();
        const hostDisabled = await hostGuessInput.isDisabled();

        if (!peerDisabled && hostDisabled) {
          // Peer guesses the host's song
          await peerGuessInput.fill(hostSong.title);
          await peerSubmitButton.click();
          await expect(peerGuessInput).toBeDisabled({ timeout: 10000 });

          if (songIndex < songsPerRound - 1) {
            await expect(hostGuessInput).toBeEnabled({ timeout: 20000 });
          }
        } else if (!hostDisabled && peerDisabled) {
          // Host guesses the peer's song
          await hostGuessInput.fill(peerSong.title);
          await hostSubmitButton.click();
          await expect(hostGuessInput).toBeDisabled({ timeout: 10000 });

          if (songIndex < songsPerRound - 1) {
            await expect(peerGuessInput).toBeEnabled({ timeout: 20000 });
          }
        } else {
          throw new Error(
            `Unable to determine active guesser (hostDisabled=${hostDisabled}, peerDisabled=${peerDisabled}).`,
          );
        }
      }

      await expect(hostPage.getByText("Round Complete!")).toBeVisible({ timeout: 20000 });
      await expect(peerPage.getByText("Round Complete!")).toBeVisible({ timeout: 20000 });
      await expect(hostPage.getByTestId("button-next-round")).toBeVisible({ timeout: 20000 });
    };

    try {
      await hostPage.getByTestId("button-start-game").click();
      await hostPage.waitForURL(`**/game/${roomCode}`, { timeout: 20000 });
      await peerPage.waitForURL(`**/game/${roomCode}`, { timeout: 20000 });

      for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber += 1) {
        await setThemeForRound(roundNumber);
        await selectSongsForRound();
        await playGuessingPhaseToResults();

        await expect(hostPage.getByTestId("button-next-round")).toBeEnabled({ timeout: 20000 });
        await hostPage.getByTestId("button-next-round").click();

        if (roundNumber < totalRounds) {
          await expect(hostPage.getByTestId("input-theme")).toBeVisible({ timeout: 20000 });
        } else {
          await expect(hostPage.getByText("Game Over!")).toBeVisible({ timeout: 20000 });
          await expect(peerPage.getByText("Game Over!")).toBeVisible({ timeout: 20000 });
        }
      }
    } finally {
      await cleanup();
    }
  });

  test("song picking timer automatically starts guessing when it expires", async ({ browser }) => {
    const match = await createHostAndPeerMatch(browser);
    const { hostPage, peerPage, roomCode, cleanup } = match;

    await stubYouTubeSearch(hostPage);
    await stubYouTubeSearch(peerPage);
    await accelerateTimers(hostPage);
    await accelerateTimers(peerPage);

    try {
      await hostPage.getByTestId("button-start-game").click();
      await hostPage.waitForURL(`**/game/${roomCode}`, { timeout: 20000 });
      await peerPage.waitForURL(`**/game/${roomCode}`, { timeout: 20000 });

      await expect(hostPage.getByTestId("input-theme")).toBeVisible({ timeout: 20000 });
      await hostPage.getByTestId("input-theme").fill("Timer Expiry Theme");
      await hostPage.getByTestId("button-confirm-theme").click();

      // Wait for song picking phase to begin
      await expect(hostPage.getByText("Pick Your Song")).toBeVisible({ timeout: 20000 });

      await expect(hostPage.getByText("Guess the Song!")).toBeVisible({ timeout: 5000 });
      await expect(peerPage.getByText("Guess the Song!")).toBeVisible({ timeout: 5000 });
      await expect(hostPage.getByTestId("player-status-0")).toBeVisible();
      await expect(peerPage.getByTestId("player-status-1")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("guessing timer ends the song when no one guesses correctly", async ({ browser }) => {
    const match = await createHostAndPeerMatch(browser);
    const { hostPage, peerPage, roomCode, cleanup } = match;

    await stubYouTubeSearch(hostPage);
    await stubYouTubeSearch(peerPage);
    await accelerateTimers(hostPage);
    await accelerateTimers(peerPage);

    try {
      await hostPage.getByTestId("button-start-game").click();
      await hostPage.waitForURL(`**/game/${roomCode}`, { timeout: 20000 });
      await peerPage.waitForURL(`**/game/${roomCode}`, { timeout: 20000 });

      await expect(hostPage.getByTestId("input-theme")).toBeVisible({ timeout: 20000 });
      await hostPage.getByTestId("input-theme").fill("Timeout Theme");
      await hostPage.getByTestId("button-confirm-theme").click();

      await expect(hostPage.getByText("Pick Your Song")).toBeVisible({ timeout: 20000 });
      await expect(peerPage.getByText("Pick Your Song")).toBeVisible({ timeout: 20000 });

      await searchAndSelectSong(hostPage, {
        query: "retro anthem",
        videoId: TEST_YOUTUBE_RESULTS[0].id,
        customTitle: TEST_YOUTUBE_RESULTS[0].title,
      });

      await searchAndSelectSong(peerPage, {
        query: "midnight groove",
        videoId: TEST_YOUTUBE_RESULTS[1].id,
        customTitle: TEST_YOUTUBE_RESULTS[1].title,
      });

      for (let songIndex = 0; songIndex < 2; songIndex += 1) {
        await expect(hostPage.getByText("Guess the Song!")).toBeVisible({ timeout: 20000 });
        await expect(peerPage.getByText("Guess the Song!")).toBeVisible({ timeout: 20000 });

        await expect(hostPage.getByTestId("input-guess")).toBeVisible({ timeout: 20000 });
        await expect(peerPage.getByTestId("input-guess")).toBeVisible({ timeout: 20000 });

        await expect(hostPage.getByTestId("input-guess")).toBeDisabled({ timeout: 5000 });
        await expect(peerPage.getByTestId("input-guess")).toBeDisabled({ timeout: 5000 });

        if (songIndex < 1) {
          await expect(hostPage.getByTestId("input-guess")).toBeEnabled({ timeout: 5000 });
          await expect(peerPage.getByTestId("input-guess")).toBeEnabled({ timeout: 5000 });
        }
      }

      await expect(hostPage.getByText("Round Complete!")).toBeVisible({ timeout: 20000 });
      await expect(peerPage.getByText("Round Complete!")).toBeVisible({ timeout: 20000 });
    } finally {
      await cleanup();
    }
  });

  test("guess log captures multiple incorrect guesses", async ({ browser }) => {
    const match = await createHostAndPeerMatch(browser);
    const { hostPage, peerPage, roomCode, cleanup } = match;

    await stubYouTubeSearch(hostPage);
    await stubYouTubeSearch(peerPage);

    try {
      await hostPage.getByTestId("button-start-game").click();
      await hostPage.waitForURL(`**/game/${roomCode}`, { timeout: 20000 });
      await peerPage.waitForURL(`**/game/${roomCode}`, { timeout: 20000 });

      await expect(hostPage.getByTestId("input-theme")).toBeVisible({ timeout: 20000 });
      await hostPage.getByTestId("input-theme").fill("Guess Log Theme");
      await hostPage.getByTestId("button-confirm-theme").click();

      await expect(hostPage.getByText("Pick Your Song")).toBeVisible({ timeout: 20000 });
      await expect(peerPage.getByText("Pick Your Song")).toBeVisible({ timeout: 20000 });

      await searchAndSelectSong(hostPage, {
        query: "retro anthem",
        videoId: TEST_YOUTUBE_RESULTS[0].id,
        customTitle: TEST_YOUTUBE_RESULTS[0].title,
      });

      await searchAndSelectSong(peerPage, {
        query: "midnight groove",
        videoId: TEST_YOUTUBE_RESULTS[1].id,
        customTitle: TEST_YOUTUBE_RESULTS[1].title,
      });

      await expect(hostPage.getByText("Guess the Song!")).toBeVisible({ timeout: 20000 });
      await expect(peerPage.getByText("Guess the Song!")).toBeVisible({ timeout: 20000 });

      await expect(peerPage.getByTestId("input-guess")).toBeVisible({ timeout: 20000 });
      await peerPage.getByTestId("input-guess").fill("Wrong Guess One");
      await peerPage.getByTestId("button-submit-guess").click();

      await expect(peerPage.getByTestId("input-guess")).toBeEnabled({ timeout: 10000 });
      await peerPage.getByTestId("input-guess").fill("Wrong Guess Two");
      await peerPage.getByTestId("button-submit-guess").click();

      await peerPage.getByTestId("input-guess").fill(TEST_YOUTUBE_RESULTS[0].title);
      await peerPage.getByTestId("button-submit-guess").click();

      await expect(hostPage.getByText("Round Complete!")).toBeVisible();
      await expect(peerPage.getByText("Round Complete!")).toBeVisible();

      await hostPage.getByTestId("button-next-round").click();
      await expect(hostPage.getByTestId("input-theme")).toBeVisible();

      await expect(hostPage.getByText("Wrong Guess One")).toBeVisible();
      await expect(hostPage.getByText("Wrong Guess Two")).toBeVisible();
    } finally {
      await cleanup();
    }
  });
});
