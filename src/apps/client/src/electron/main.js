/**
 * @file main.js - Entry point for the Electron app.
 */
import axios from "axios";
import waitOn from "wait-on";
import { app, BrowserWindow, ipcMain } from "electron";
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
const ctx = proxy({
  serverLoaded: false,
}); // can subscribe to changes in ctx (the application state)

app.on("ready", () => {
  // create main window
  win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      enableRemoteModule: true,
      preload: `${__electron_dirname}/preload.js`,
    },
  });

  win.setMinimumSize(400, 300); // set minimum window size
  win.setMaximumSize(800, 600); // set maximum window size
  win.removeMenu(); // remove default menu

  // wait for servers to be ready before loading the client
  waitOn({ resources: [waitOnPythonEndPoint, waitOnAstroEndPoint] })
    .then(() => (ctx.serverLoaded = true))
    .catch((err) => console.error(" Error while waiting on resources...", err));
});

// server is ready, load the client
subscribeKey(ctx, "serverLoaded", (v) => {
  if (!v) return;

  win.webContents.openDevTools({ mode: "detach" }); // uncomment to open devtools in separate window on start

  win.loadURL(clientURL); // client loads at http://localhost:8001 by default

  win.once("ready-to-show", () => win.show());
  win.on("closed", () => (win = null));
});

// electron - general window events
app.on("window-all-closed", () =>
  process.platform !== "darwin" ? app.quit() : null
);
app.on("activate", () => (win === null ? createWindow() : null));

ipcMain.on("toMain", (event, data) => {
  const { id, payload } = data;
  switch (id) {
    case "ping":
      event.sender.send("fromMain", { id, payload: "pong" });
      break;
    default:
      sio.emit(id, payload);
      event.sender.send("fromMain", { id, payload: `Sent ${id} to Python...` });
      break;
  }
});
