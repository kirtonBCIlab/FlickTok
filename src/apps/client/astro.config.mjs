import { defineConfig } from "astro/config";
import { monoConfig } from "./src/config/paths";
import tailwind from "@astrojs/tailwind";
const host = monoConfig.client.host || "0.0.0.0";
const port = monoConfig.client.port || 8001;

// https://astro.build/config
export default defineConfig({
  prefetch: true,
  devToolbar: {
    enabled: false,
  },
  server: {
    host,
    port,
  },
  integrations: [tailwind()],
});
