import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), "");
    var devAuthPort = env.DEV_AUTH_PORT || "5174";
    var devAuthHost = env.DEV_AUTH_HOST || "localhost";
    var devWebPort = Number(env.DEV_WEB_PORT || 5173);
    return {
        base: "./",
        plugins: [react()],
        server: {
            port: devWebPort,
            strictPort: true,
            proxy: {
                "/api/dev-auth": {
                    target: "http://".concat(devAuthHost, ":").concat(devAuthPort),
                    changeOrigin: true,
                },
            },
        },
    };
});
