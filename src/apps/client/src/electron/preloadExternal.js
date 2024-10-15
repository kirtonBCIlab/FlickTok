const { ipcRenderer } = require("electron");

console.log("preload");

/**
 * Checks if a video is currently playing.
 *
 * @param {HTMLVideoElement} video - The video element to check.
 * @return {boolean} Returns true if the video is playing (i.e., not paused/ended,
 * has at least one frame [readyState >= 2] & seeked to a non-zero time [currentTime > 0]);
 * false otherwise.
 */
const isVideoPlaying = (video) =>
  !!(
    video.currentTime > 0 &&
    !video.paused &&
    !video.ended &&
    video.readyState >= 2
  );

/**
 * Retrieves the currently playing video element.
 *
 * @return {HTMLVideoElement|undefined} The currently playing video element, or
 * undefined if no video is playing.
 */
const getCurrentReel = () => {
  const videos = document.querySelectorAll("video");
  let currentVideo = Array.from(videos).find(isVideoPlaying);
  return currentVideo;
};

/**
 * Asynchronously retrieves the currently playing video element.
 * This is needed because the video element may not be available immediately.
 *
 * @return {Promise<HTMLVideoElement|undefined>} A promise that resolves with the
 * currently playing video element, or undefined if no video is playing.
 */
const getCurrentReelAsync = async () => {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const currentVideo = getCurrentReel();
      if (currentVideo) {
        clearInterval(interval);
        resolve(currentVideo);
      }
    }, 100);
  });
};

/**
 * Checks if a given node is scrollable.
 *
 * @param {HTMLElement|SVGElement} node - The node to check.
 * @return {boolean} Returns true if the node is scrollable, false otherwise.
 */
const isScrollable = (node) => {
  if (!(node instanceof HTMLElement || node instanceof SVGElement)) {
    return false;
  }
  const style = getComputedStyle(node);
  return ["overflow", "overflow-x", "overflow-y"].some((propertyName) => {
    const value = style.getPropertyValue(propertyName);
    return value === "auto" || value === "scroll";
  });
};

/**
 * Recursively finds the scrollable parent of a given node.
 *
 * @param {HTMLElement} node - The node to start searching from.
 * @return {HTMLElement|null} The scrollable parent node, or null if none is found.
 */
const getScrollParent = (node) => {
  let currentParent = node.parentElement;
  while (currentParent) {
    if (isScrollable(currentParent)) {
      return currentParent;
    }
    currentParent = currentParent.parentElement;
  }
  return document.scrollingElement || document.documentElement;
};

/**
 * Scrolls to the next reel on the reels page.
 *
 * @return {void}
 */
const scrollToNextReel = async () => {
  const currentVideo = await getCurrentReelAsync();
  getScrollParent(currentVideo).scrollBy({
    top: currentVideo.offsetHeight + 100,
    behavior: "smooth",
  });
};

window.onload = () => {
  getCurrentReelAsync().then(() => {
    window.scrollTo(0, 0);
    document.body.scrollIntoView();
    // ipcRenderer.send("toMain", {
    //   id: "info:video-playing",
    //   data: { value: true },
    // });
  });

  ipcRenderer.on("fromMain", async (event, payload) => {
    console.info(event, payload);
    const { id, data } = payload;
    switch (id) {
      case "py:action-detected":
        const currentVideo = await getCurrentReelAsync();
        if (!currentVideo) console.warn("No video playing...");
        scrollToNextReel();
        break;
      case "req:load-overlay":
        break;
    }
  });
};
