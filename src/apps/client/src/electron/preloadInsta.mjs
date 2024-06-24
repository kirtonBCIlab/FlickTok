// const { contextBridge, ipcRenderer } = require("electron");
// const { getCurrentReelAsync, scrollToNextReel } = require("./helpers.js");

import { ipcRenderer } from "electron";
import { getCurrentReelAsync, scrollToNextReel } from "./helpers.js";

console.log("preload");

window.onload = () => {
  window.scrollTo(0, 0);
  document.body.scrollIntoView();

  ipcRenderer.on("fromMain", async (event, payload) => {
    console.info(event, payload);
    const { id, data } = payload;
    switch (id) {
      case "py:action-detected":
        const currentVideo = await getCurrentReelAsync();
        if (!currentVideo) console.warn("No video playing...");
        scrollToNextReel();
        break;
    }
  });
};
