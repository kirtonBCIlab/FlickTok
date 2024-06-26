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
const ctx = proxy({
  serversLoaded: false,
}); // can subscribe to changes in ctx (the application state)

app.on("ready", () => {
  // get screen dimensions
  let { width, height } = screen.getPrimaryDisplay().bounds;
  width *= 0.35;
  height *= 0.85;

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

  win.once("ready-to-show", () => win.show());
  win.on("closed", () => (win = null));
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
  if (!data.url.includes("/predict") && smView) {
    smView.webContents.close();
    win.contentView.removeChildView(smView);
    smView = null;
  }
};

const loadSocialMedia = (event, payload) => {
  const { id, data } = payload;
  const socialMediaURL = data.socialMediaURL;
  if (!smView) {
    smView = new WebContentsView({
      webPreferences: {
        enableRemoteModule: true,
        preload: `${__electron_dirname}/preloadExternal.js`,
      },
    });
    win.contentView.addChildView(smView);
    smView.webContents.loadURL(socialMediaURL); // https://instagram.com/reels ; https://www.youtube.com/shorts ; etc.
    smView.setBounds({
      width: win.getContentBounds().width * 0.8,
      height: win.getContentBounds().height * 0.8,
      x: win.getContentBounds().width * 0.1,
      y: win.getContentBounds().height * 0.1,
    });
    // smView.webContents.openDevTools({ mode: "detach" }); // uncomment to open devtools in separate window on start
  }
};
