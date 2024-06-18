/**
 * @file main.js - Entry point for the Electron app.
 * @description Handles the main window, state management, and communication
 * between preload.js, main.js, and server/src/app.py.
 */
import fs from "fs";
import axios from "axios";
import waitOn from "wait-on";
import { app as electronApp, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { proxy } from "valtio";
import { subscribeKey } from "valtio/utils";
import { io as sioClient } from "socket.io-client";
import { parse } from "yaml";
import Express from "express";
import handlebars from "express-handlebars";
import ViteExpress from "vite-express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const monoConfig = parse(
  fs.readFileSync(join(__dirname, "../../../packages/config/base.yml"), "utf8")
);
const serverURL = `http://${monoConfig.server.host}:${monoConfig.server.port}`; // http://localhost:8000
const clientURL = `http://${monoConfig.client.host}:${monoConfig.client.port}`; // http://localhost:8001
const waitOnPythonEndPoint =
  serverURL.replace("http://", "http-get://") + "/api/healthcheck";
axios.defaults.baseURL = serverURL;

const sio = sioClient(serverURL, { transports: ["websocket"] });
const expressApp = Express();
expressApp.use(Express.json());
expressApp.use(Express.urlencoded({ extended: false }));
expressApp.use(Express.static(join(__dirname, "../public")));
expressApp.engine(
  "handlebars",
  handlebars.engine({
    defaultLayout: "main",
    layoutsDir: join(__dirname, "../views/layouts"),
    partialsDir: join(__dirname, "../views/partials"),
  })
);
expressApp.set("view engine", "handlebars");
expressApp.set("views", join(__dirname, "../views"));
expressApp.get("/", (req, res) => res.render("index"));
const expressServer = expressApp.listen(
  monoConfig.client.port,
  monoConfig.client.host
);
ViteExpress.bind(expressApp, expressServer, async () => {
  const { root, base, ...rest } = await ViteExpress.getViteConfig();
  console.log(`Serving app from root ${root}`);
  console.log(
    `Server is listening at http://${monoConfig.client.host}:${monoConfig.client.port}${base}`
  );
  console.info(rest);
});

let win; // main window
const ctx = proxy({
  serverLoaded: false,
}); // can subscribe to changes in ctx (the application state)

electronApp.on("ready", () => {
  // create main window
  win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
  });

  // wait for server to be ready before loading the client
  waitOn({ resources: [waitOnPythonEndPoint] })
    .then(() => (ctx.serverLoaded = true))
    .catch((err) => console.error(" Error while waiting on resources...", err));
});

// server is ready, load the client
subscribeKey(ctx, "serverLoaded", (v) => {
  if (!v) return;

  // win.webContents.openDevTools({ mode: "detach" }); // uncomment to open devtools in separate window on start

  win.loadURL(clientURL); // client loads at http://localhost:8001 by default

  win.once("ready-to-show", () => win.show());
  win.on("closed", () => (win = null));
});

// electron - general window events
electronApp.on("window-all-closed", () =>
  process.platform !== "darwin" ? electronApp.quit() : null
);
electronApp.on("activate", () => (win === null ? createWindow() : null));
