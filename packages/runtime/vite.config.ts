import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Plein", short_name: "Plein",
        description: "Jouw diensten, één Plein",
        theme_color: "#1a3c6e", background_color: "#ffffff", display: "standalone",
        icons: [{ src: "icon-512.png", sizes: "512x512", type: "image/png" }],
      },
    }),
  ],
  server: { proxy: { "/api": "http://localhost:5175" } },
});
