/**
 * @file main.js - Entry point for the Electron app.
 */
import fs from "fs";
import axios from "axios";
import waitOn from "wait-on";
import { app, BrowserWindow, WebContentsView, ipcMain, screen } from "electron";
import { proxy } from "valtio";
import { subscribeKey } from "valtio/utils";
import { io as sioClient } from "socket.io-client";
import { clientURL, serverURL, __electron_dirname } from "../config/paths.js";

axios.defaults.baseURL = serverURL;

const waitOnPythonEndPoint =
  serverURL.replace("http://", "http-get://") + "/api/healthcheck";
const waitOnAstroEndPoint = clientURL.replace("http://", "http-get://");

const sio = sioClient(serverURL, { transports: ["websocket"] });

let win; // main window
let smView; // social media view (Instagram, YouTube, etc.)
let overlayView; // overlay view (for alerts, celebrations, etc.)
const ctx = proxy({
  serversLoaded: false,
}); // can subscribe to changes in ctx (the application state)

app.on("ready", () => {
  // get screen dimensions
  let { width, height } = screen.getPrimaryDisplay().bounds;
  width *= 0.35;
  height *= 0.95;

  // create main window
  win = new BrowserWindow({
    width,
    height,
    show: false,
    maximizable: false,
    webPreferences: {
      enableRemoteModule: true,
      preload: `${__electron_dirname}/preload.js`,
    },
  });

  win.setMinimumSize(width, height); // set minimum window size
  win.setMaximumSize(width, height); // set maximum window size
  win.removeMenu(); // remove default menu

  // wait for servers to be ready before loading the client
  waitOn({ resources: [waitOnPythonEndPoint, waitOnAstroEndPoint] })
    .then(() => (ctx.serversLoaded = true))
    .catch((err) => console.error(" Error while waiting on resources...", err));
});

// servers are ready, load the client
subscribeKey(ctx, "serversLoaded", (v) => {
  if (!v) return;

  // win.webContents.openDevTools({ mode: "detach" }); // uncomment to open devtools in separate window on start

  win.loadURL(clientURL.replace("0.0.0.0", "localhost")); // client loads at http://localhost:8001 by default

  // create overlay view
  overlayView = new WebContentsView({
    webPreferences: {
      enableRemoteModule: true,
      preload: `${__electron_dirname}/preload.js`,
      transparent: true,
    },
    transparent: true,
  });
  win.contentView.addChildView(overlayView, 1); // 1 index -> above social media view
  overlayView.setBounds({
    width: win.getContentBounds().width,
    height: win.getContentBounds().height - 96 - 72, // 96px = header, 72px = footer (approx.) in PrototypeLayout.astro
    x: 0,
    y: 0 + 96 / 2 + 72 / 2 + 10,
  });
  overlayView.webContents.loadURL(
    clientURL.replace("0.0.0.0", "localhost") + "/overlay"
  ); // overlay loads at http://localhost:8001/overlay by default
  overlayView.setVisible(false); // hide the overlay view until needed
  // overlayView.webContents.openDevTools({ mode: "detach" }); // uncomment to open devtools in separate window on start

  win.once("ready-to-show", () => win.show());
  win.on("closed", () => {
    win = null;
  });
});

// electron - general window events
app.on("window-all-closed", () =>
  process.platform !== "darwin" ? app.quit() : null
);
app.on("activate", () => (win === null ? createWindow() : null));

ipcMain.on("toMain", (event, payload) => {
  const { id, data } = payload;
  switch (id) {
    case "info:navigated-to":
      handleNav(event, payload);
      break;
    case "req:load-social-media":
      loadSocialMedia(event, payload);
      break;
    case "req:unload-social-media":
      unloadSocialMedia(event, payload);
      break;
    case "req:load-overlay":
      loadOverlay(event, payload);
      break;
    case "info:video-playing":
      informVideoPlaying(event, payload);
      break;
    default:
      sio.emit(id, data);
      event.sender.send("fromMain", {
        id: `re:${id}`,
        data: { msg: `Sent ${id} to Python...` },
      });
      break;
  }
});

["connect", "disconnect", "fromPython"].forEach((eventName) => {
  sio.on(eventName, (payload) => {
    win.webContents.send("fromMain", {
      id: `py:${payload?.id ?? eventName}`,
      data: payload?.data ?? {},
    });
    if (smView) {
      smView.webContents.send("fromMain", {
        id: `py:${payload?.id ?? eventName}`,
        data: payload?.data ?? {},
      });
    }
  });
});

const handleNav = (event, payload) => {
  const { id, data } = payload;
};

const loadSocialMedia = (event, payload) => {
  const { id, data } = payload;
  const socialMediaURL = data.socialMediaURL;
  console.info(`Loading social media URL: ${socialMediaURL}...`);
  if (!smView) {
    smView = new WebContentsView({
      webPreferences: {
        enableRemoteModule: true,
        preload: `${__electron_dirname}/preloadExternal.js`,
      },
    });
    win.contentView.addChildView(smView, 0); // 0 index -> below overlay view
    smView.webContents.loadURL(socialMediaURL); // https://instagram.com/reels ; https://www.youtube.com/shorts ; etc.
    smView.setBounds({
      width: win.getContentBounds().width * 0.8,
      height: win.getContentBounds().height * 0.8,
      x: win.getContentBounds().width * 0.1,
      y: win.getContentBounds().height * 0.112,
    });
    // smView.webContents.openDevTools({ mode: "detach" }); // uncomment to open devtools in separate window on start
  }
};

const unloadSocialMedia = (event, payload) => {
  console.info(`Unloading social media...`);
  if (smView) {
    smView.webContents.close();
    win.contentView.removeChildView(smView);
    smView = null;
    overlayView.setVisible(false);
    informVideoPlaying(event, {
      id: "info:video-playing",
      data: { value: false },
    });
  }
};

const loadOverlay = (event, payload) => {
  const { id, data } = payload;
  const { imgSrc } = data;
  if (smView) {
    overlayView.setVisible(true);
    overlayView.webContents.send("fromMain", {
      id: "req:load-overlay",
      data: payload.data,
    });
    if (imgSrc.includes("empty")) {
      setTimeout(() => overlayView.setVisible(false), 500);
    }
  }
};

const informVideoPlaying = (event, payload) => {
  const { id, data } = payload;
  win.webContents.send("fromMain", {
    id: "info:video-playing",
    data: { value: data.value },
  });
};
