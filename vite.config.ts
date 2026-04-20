import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devAuthPort = env.DEV_AUTH_PORT || "5174";
  const devAuthHost = env.DEV_AUTH_HOST || "localhost";
  const devWebPort = Number(env.DEV_WEB_PORT || 5173);

  return {
    base: "./",
    plugins: [react()],
    server: {
      port: devWebPort,
      strictPort: true,
      proxy: {
        "/api/dev-auth": {
          target: `http://${devAuthHost}:${devAuthPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
