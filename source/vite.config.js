import { defineConfig } from "vite";

export default defineConfig({
  // Windows Electron loads the bundled page through file://, so asset URLs must be relative.
  base: "./"
});
