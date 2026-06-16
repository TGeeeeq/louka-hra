import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build also works when opened from a sub-path or static host.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173, open: false },
});
