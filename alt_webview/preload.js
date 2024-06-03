const getCurrentReelInfoRequest = async () => {
  let currentVideo = await getCurrentReelAsync();
  if (!currentVideo) console.warn("No video playing...");

  const reelInfo = {
    id: window.location.href.split("/").at(-2),
    duration: currentVideo?.duration,
    currentTime: currentVideo?.currentTime,
  };

  console.info(reelInfo);
  pywebview.api.dispatch("set-current-reel-info", reelInfo);
};

const switchToNewReelAtTimeRequest = async ({ reelId, time }) => {
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

  currentVideo.addEventListener("timeupdate", scrollToNextReelAtTime, false);
};

window.onload = () => {
  console.info("Preload script loaded..."); // these will be logged in the console of the browser window

  if (!window.location.href.includes("reels")) {
    window.location.href = "https://www.instagram.com/reels/"; // go to reels page
    pywebview.api.inform("reels-loaded"); // inform main.py that reels page is loaded
  }
};
