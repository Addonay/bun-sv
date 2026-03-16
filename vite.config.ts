import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
	plugins: [tailwindcss(), svelte()],
	root: "src/mainview",
	build: {
		outDir: "../../dist",
		emptyOutDir: true,
	},
	resolve: {
		alias: {
			$lib: path.resolve("./src/lib"),
		},
	},
	server: {
		port: 5173,
		strictPort: true,
		fs: {
			allow: [path.resolve("./src")],
		},
	},
});
