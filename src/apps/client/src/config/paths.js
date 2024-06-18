import fs from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { parse } from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const __client_dirname = join(__dirname, "../..");
export const __electron_dirname = join(__dirname, "../electron");

export const monoConfig = parse(
  fs.readFileSync(
    join(__dirname, "../../../../packages/config/base.yml"),
    "utf8"
  )
);

export const serverURL = `http://${monoConfig.server.host}:${monoConfig.server.port}`; // http://localhost:8000
export const clientURL = `http://${monoConfig.client.host}:${monoConfig.client.port}`; // http://localhost:8001
