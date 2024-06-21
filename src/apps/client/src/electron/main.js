/**
 * @file main.js - Entry point for the Electron app.
 */
import axios from "axios";
import waitOn from "wait-on";
import { app, BrowserWindow, BrowserView, ipcMain } from "electron";
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
let view; // instagram view
const ctx = proxy({
  serversLoaded: false,
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
    .then(() => (ctx.serversLoaded = true))
    .catch((err) => console.error(" Error while waiting on resources...", err));
});

// servers are ready, load the client
subscribeKey(ctx, "serversLoaded", (v) => {
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

ipcMain.on("toMain", (event, payload) => {
  const { id, data } = payload;
  switch (id) {
    case "ping":
      event.sender.send("fromMain", { id, data: { msg: "pong" } });
      break;
    case "navigated-to":
      // if (data.url.includes("/train")) {
      //   view = new BrowserView();
      //   win.addBrowserView(view);
      //   view.setBounds({
      //     // Center the view on the main window
      //     x: win.getBounds().width / 2 - 200,
      //     y: win.getBounds().height / 2 - 200,
      //     width: 400,
      //     height: 400,
      //   });
      //   view.webContents.loadURL("https://instagram.com/reels");
      //   // Adjust the view's bounds when the main window's bounds change
      //   win.on("resize", () => {
      //     view.setBounds({
      //       x: win.getBounds().width / 2 - 200,
      //       y: win.getBounds().height / 2 - 200,
      //       width: 400,
      //       height: 400,
      //     });
      //   });
      // } else {
      //   // Remove view
      //   win.removeBrowserView(view);
      //   view = null;
      // }
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

sio.on("fromPython", ({ id, data }) =>
  win.webContents.send("fromMain", { id: `py:${id}`, data })
);
