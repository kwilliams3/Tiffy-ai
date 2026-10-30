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
  define: mode === "mobile" ? { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(process.env.VITE_API_BASE_URL || "https://spark-my-ai.vercel.app") } : {},
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
      disable: mode === "mobile",
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "tiffy-logo.svg", "tiffy-icon-192.png", "tiffy-icon-512.png", "notification-events.js"],
      manifest: {
        name: "Tiffy - Assistant IA",
        short_name: "Tiffy",
        description: "Ton assistant IA personnel, toujours prêt à t'aider !",
        theme_color: "#6d28d9",
        background_color: "#f7f5ff",
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
        importScripts: ["/notification-events.js"],
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
      "@tiffy/platform": path.resolve(__dirname, mode === "mobile" ? "./src/platform.mobile.ts" : "./src/platform.web.ts"),
      ...(mode === "mobile" ? {
        "@capacitor/core": path.resolve(__dirname, "mobile/node_modules/@capacitor/core"),
        "@capacitor-community/text-to-speech": path.resolve(__dirname, "mobile/node_modules/@capacitor-community/text-to-speech"),
        "@capgo/capacitor-speech-recognition": path.resolve(__dirname, "mobile/node_modules/@capgo/capacitor-speech-recognition"),
      } : {}),
    },
  },
  };
});
