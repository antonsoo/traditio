import { defineConfig } from "vite";

export default defineConfig({
  base: "/traditio/",
  build: { rollupOptions: { input: ["index.html", "ceremony.html", "river.html"] } },
});
