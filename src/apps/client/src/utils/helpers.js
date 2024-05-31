/**
 * @file helpers.js - Utility functions for working with the Instagram reels page.
 * @description Utility functions for working with the Instagram reels page.
 */

/**
 * Checks if a video is currently playing.
 *
 * @param {HTMLVideoElement} video - The video element to check.
 * @return {boolean} Returns true if the video is playing (i.e., not paused/ended,
 * has at least one frame [readyState >= 2] & seeked to a non-zero time [currentTime > 0]);
 * false otherwise.
 */
export const isVideoPlaying = (video) =>
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
export const getCurrentReel = () => {
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
export const getCurrentReelAsync = async () => {
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
 * Recursively finds the scrollable parent of a given node.
 *
 * @param {HTMLElement} node - The node to start searching from.
 * @return {HTMLElement|null} The scrollable parent node, or null if none is found.
 */
export const getScrollParent = (node) => {
  if (node == null) return null;
  if (node.scrollHeight > node.clientHeight) return node;
  else return getScrollParent(node.parentNode);
};

/**
 * Scrolls to the next reel on the reels page.
 *
 * @return {void}
 */
export const scrollToNextReel = async () => {
  const currentVideo = await getCurrentReelAsync();
  getScrollParent(currentVideo).scrollBy({
    top: currentVideo.offsetHeight + 100,
    behavior: "smooth",
  });
};

/**
 * Creates a UI info box to display the time until the next reel.
 *
 * @param {Object} options - The options for creating the info box.
 * @param {number} options.time - The time until the next reel in seconds.
 * @return {HTMLElement} The created info box element.
 */
export const createUIInfoBox = ({ time }) => {
  // Create a UI to show the time until the next reel
  const html = `
    <div id="reel-switching-info">
      <p>⌛ Time until next reel: ${Math.round(time, 2)} seconds</p>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
  // Style the info box
  const infoBox = document.getElementById("reel-switching-info");
  infoBox.style = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: flex-end;
    align-items: flex-start;
    z-index: 9999;
    pointer-events: none;
    font-family: 'Poppins', sans-serif;
    font-size: 1.25em;
    font-weight: 500;
    color: #fff;
    text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  `;
  infoBox.children[0].style = `
    background: rgba( 80, 227, 194, 0.75 );
    box-shadow: 0 8px 32px 0 rgba( 31, 38, 135, 0.37 );
    backdrop-filter: blur( 3.5px );
    -webkit-backdrop-filter: blur( 3.5px );
    border-radius: 10px;
    padding: 2em;
    margin: 1em;
    border-radius: 0.5em;
  `;

  return infoBox;
};
