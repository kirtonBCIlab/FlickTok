/**
 * @file main.js - Entry point for the Electron app.
 */
import axios from "axios";
import waitOn from "wait-on";
import { app, BrowserWindow, WebContentsView, ipcMain, screen } from "electron";
import { proxy } from "valtio";
import { subscribeKey } from "valtio/utils";
import { io as sioClient } from "socket.io-client";
import { clientURL, serverURL, __electron_dirname } from "../config/paths.js";

console.info(__electron_dirname);

axios.defaults.baseURL = serverURL;

const waitOnPythonEndPoint =
  serverURL.replace("http://", "http-get://") + "/api/healthcheck";
const waitOnAstroEndPoint = clientURL.replace("http://", "http-get://");

const sio = sioClient(serverURL, { transports: ["websocket"] });

let win; // main window
let instaView; // instagram view
const ctx = proxy({
  serversLoaded: false,
}); // can subscribe to changes in ctx (the application state)

app.on("ready", () => {
  // get screen dimensions
  let { width, height } = screen.getPrimaryDisplay().bounds;
  width *= 0.4;
  height *= 0.8;

  // create main window
  win = new BrowserWindow({
    width,
    height,
    show: false,
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

  win.webContents.openDevTools({ mode: "detach" }); // uncomment to open devtools in separate window on start

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
    case "ping":
      event.sender.send("fromMain", { id, data: { msg: "pong" } });
      break;
    case "navigated-to":
      handleNav(event, payload);
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
    if (instaView) {
      instaView.webContents.send("fromMain", {
        id: `py:${payload?.id ?? eventName}`,
        data: payload?.data ?? {},
      });
    }
  });
});

const handleNav = (event, payload) => {
  const { id, data } = payload;
  if (data.url.includes("/predict")) {
    instaView = new WebContentsView({
      webPreferences: {
        enableRemoteModule: true,
        preload: `${__electron_dirname}/preloadInstaSimplified.js`,
        // preload: `${__electron_dirname}/preloadInsta.mjs`,
        // sandbox: false,
      },
    });
    win.contentView.addChildView(instaView);
    instaView.webContents.loadURL("https://instagram.com/reels");
    instaView.setBounds({
      width: win.getContentBounds().width * 0.8,
      height: win.getContentBounds().height * 0.8,
      x: win.getContentBounds().width * 0.1,
      y: win.getContentBounds().height * 0.1,
    });
    // instaView.webContents.openDevTools({ mode: "detach" }); // uncomment to open devtools in separate window on start
  } else {
    if (instaView) {
      win.contentView.removeChildView(instaView);
      instaView = null;
    }
  }
};
