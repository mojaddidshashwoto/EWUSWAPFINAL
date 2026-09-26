import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createApiWebhookMiddleware } from "./server/middleware";

function apiMiddlewarePlugin(): Plugin {
  return {
    name: "api-webhook-middleware",
    configureServer(server) {
      server.middlewares.use(createApiWebhookMiddleware());
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiMiddlewarePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
