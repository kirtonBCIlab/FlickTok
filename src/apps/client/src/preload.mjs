/**
 * @file preload.mjs - Script that is loaded in the browser window before other scripts on the page.
 * @description Used to read & modify the page's behavior (once it has loaded).
 */
import { ipcRenderer } from "electron";
import {
  getCurrentReelAsync,
  scrollToNextReel,
  createUIInfoBox,
} from "./utils/helpers.js";

window.onload = () => {
  console.info("Preload script loaded..."); // these will be logged in the console of the browser window

  // region - listen for 'login success' event
  ipcRenderer.on("login-success", (event) => {
    // user is logged in, navigate to reels
    console.info("Login successful. Navigating to reels...");
    if (!window.location.href.includes("reels")) {
      window.location.href = "https://www.instagram.com/reels/"; // go to reels page
      event.sender.send("reels-loaded"); // handled in main.js
    }
  });
  // endregion

  // region - listen for 'reel info' request
  ipcRenderer.on("get-current-reel-info", async (event) => {
    console.info("Getting current reel info...");

    // get currently playing reel
    let currentVideo = await getCurrentReelAsync();
    if (!currentVideo) console.warn("No video playing...");

    const reelInfo = {
      id: window.location.href.split("/").at(-2),
      duration: currentVideo?.duration,
      currentTime: currentVideo?.currentTime,
    };

    console.info(reelInfo);
    event.sender.send("set-current-reel-info", reelInfo); // handled in main.js
  });
  // endregion

  // region - listen for 'scroll to next reel' request
  ipcRenderer.on("scroll-to-next-reel", () => scrollToNextReel());
  // endregion

  // region - listen for 'switch to new reel' request
  ipcRenderer.on(
    "switch-to-new-reel-at-time",
    async (event, { reelId, time }) => {
      console.info(
        `Waiting to swipe away from reel ${reelId} to a new one at time: ${time}...`
      );

      // Create an example info box showing time until next reel
      const infoBox = createUIInfoBox({ time });

      const currentVideo = await getCurrentReelAsync();
      const scrollToNextReelAtTime = (e) => {
        const currentTime = e.target.currentTime;
        // update UI info box
        infoBox.children[0].innerText = `⌛ Time until next reel: ${Math.round(time - currentTime, 2)} seconds`;
        if (currentTime >= time) {
          console.info(`Switching to new reel at time: ${time}...`);
          scrollToNextReel();
          currentVideo.removeEventListener(
            "timeupdate",
            scrollToNextReelAtTime,
            false
          );
          // remove info box
          infoBox.remove();
        }
      };

      currentVideo.addEventListener(
        "timeupdate",
        scrollToNextReelAtTime,
        false
      );
    }
  );
  // endregion
};
