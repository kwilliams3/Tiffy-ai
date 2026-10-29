import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ["FRONTEND_", "BACKEND_"]);
  const frontendPort = Number(process.env.FRONTEND_PORT || env.FRONTEND_PORT || 5187);
  const backendPort = Number(process.env.BACKEND_PORT || env.BACKEND_PORT || 4317);
  const proxy = { "/api": { target: `http://127.0.0.1:${backendPort}` } };
  return {
  server: {
    host: "::",
    port: frontendPort,
    strictPort: true,
    proxy,
    hmr: {
      overlay: false,
    },
  },
  preview: { port: frontendPort, strictPort: true, proxy },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "tiffy-logo.svg", "tiffy-icon-192.png", "tiffy-icon-512.png"],
      manifest: {
        name: "Tiffy - Assistant IA",
        short_name: "Tiffy",
        description: "Ton assistant IA personnel, toujours prêt à t'aider !",
        theme_color: "#263e30",
        background_color: "#faf8f4",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/tiffy-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/tiffy-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
