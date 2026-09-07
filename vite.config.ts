import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
	base: "/admin/",
	plugins: [react()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"@shared": fileURLToPath(new URL("./shared", import.meta.url)),
		},
	},
	server: {
		host: "::",
		port: 8080,
		proxy: {
			"/api": "http://127.0.0.1:3300",
			"/healthz": "http://127.0.0.1:3300",
			"/readyz": "http://127.0.0.1:3300",
		},
	},
});
