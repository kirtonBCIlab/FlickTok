/**
 * @file main.js - Entry point for the Electron app.
 * @description Handles the main window, state management, and communication
 * between preload.js, main.js, and server/src/app.py.
 */
import fs from "fs";
import axios from "axios";
import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { proxy } from "valtio";
import { subscribeKey } from "valtio/utils";
import { io as sioClient } from "socket.io-client";
import { parse } from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const monoConfig = parse(
  fs.readFileSync(join(__dirname, "../../../packages/config/base.yml"), "utf8")
);
const serverURL = `http://${monoConfig.server.host}:${monoConfig.server.port}`; // http://localhost:8000
axios.defaults.baseURL = serverURL;

const socket = sioClient(serverURL, { transports: ["websocket"] });

/**
 * app state
 * */
let win; // main window
const ctx = proxy({
  navigatedToReels: false,
  currentReel: {
    id: null,
    duration: null,
    currentTime: null,
  },
}); // can subscribe to changes in ctx

/**
 * electron main window handling
 * & ipc (inter-process communication) setup
 * */
// create window
app.on("ready", () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: join(__dirname, "preload.mjs"),
      sandbox: false,
      contextIsolation: true,
    },
  });

  // win.webContents.openDevTools({ mode: "detach" }); // uncomment to open devtools in separate window on start

  // login; will redirect to main page after login or if already logged in
  win.loadURL("https://www.instagram.com/accounts/login/");

  win.webContents.once("did-navigate", (_event, url) => {
    console.info(
      `Navigated to: ${url}; navigatedToReels: ${ctx.navigatedToReels}...`
    );
    if (url === "https://www.instagram.com/" && !ctx.navigatedToReels) {
      // on main page (after login) --> navigate to reels
      console.info(`Navigated to: ${url}; Login successful...`);
      console.info("Navigating to reels...");
      win.webContents.on("did-finish-load", () =>
        win.webContents.send("login-success")
      ); // handled in preload.js
    }
  });

  win.on("closed", () => (win = null));
});
app.on("window-all-closed", () =>
  process.platform !== "darwin" ? app.quit() : null
);
app.on("activate", () => (win === null ? createWindow() : null));

/**
 * electron ipc ([e.g., communication between preload.js & main.js])
 * & socket (client-server communication) handling
 * */
// listen for 'reels loaded' event
ipcMain.once("reels-loaded", () => {
  // win.loadURL("https://www.instagram.com/reels/"); // could have navigated to reels here as well
  console.info("Reels loaded...");
  ctx.navigatedToReels = true; // update state; triggers the subscription below
});

// listen for ctx.navigatedToReels changes
subscribeKey(ctx, "navigatedToReels", (v) => {
  if (!v) return;
  win.webContents.on("did-navigate-in-page", (event, url) => {
    const reelId = /instagram\.com\/reels\/.+\//.test(url)
      ? url.split("/").at(-2)
      : null; // extract reel id from url

    if (reelId && reelId !== ctx.currentReel.id) {
      ctx.currentReel.id = reelId;

      console.info(`Current reel id: ${reelId}`);

      // region - request reel info (e.g., duration) from preload.js
      const getCurrentReelInfoRequest = () =>
        win.webContents.send("get-current-reel-info");
      win.webContents.once("did-finish-load", getCurrentReelInfoRequest); // needed for the first time
      getCurrentReelInfoRequest(); // subsequent requests
      // endregion

      ipcMain.once("set-current-reel-info", (event, data) => {
        // update state
        ctx.currentReel = { ...ctx.currentReel, ...data };

        // Let the server know that we are watching this reel; handled in server/src/app.py
        socket.emit("loaded_new_reel", data);

        win.webContents.removeListener(
          "did-finish-load",
          getCurrentReelInfoRequest
        ); // avoid memory leak
      });
    }
  });
});

// listen for 'switch_to_new_reel_at_time' message from server (server/src/app.py)
socket.on("switch_to_new_reel_at_time", ({ reelId, time }) => {
  console.info(
    `Python told me to swipe away from reel ${reelId} & get a new one at time: ${time}...`
  );
  win.webContents.send("switch-to-new-reel-at-time", { reelId, time });
});
