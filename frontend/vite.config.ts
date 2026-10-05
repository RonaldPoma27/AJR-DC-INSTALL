import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    // En desarrollo, /api va al Django local (python manage.py runserver).
    proxy: { "/api": { target: "http://localhost:8000", changeOrigin: true } },
  },
});
