import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "svelte-app",
		identifier: "svelteapp.electrobun.dev",
		version: "0.0.1",
	},
	build: {
		// Vite builds to dist/, we copy from there
		copy: {
			"dist/index.html": "views/mainview/index.html",
			"dist/assets": "views/mainview/assets",
		},
		bun: {
			entrypoint: "src/bun/index.ts",
			external: ["@duckdb/node-api"],
		},
		// Ignore Vite output in watch mode — HMR handles view rebuilds separately
		watchIgnore: ["dist/**"],
		
		// Code signing (configure for production)
		mac: {
			bundleCEF: false,
			// codeSign: {
			// 	identity: "Developer ID Application: Your Name",
			// 	teamId: "YOUR_TEAM_ID",
			// },
			// notarize: {
			// 	appleId: "your.apple.id@example.com",
			// 	teamId: "YOUR_TEAM_ID",
			// 	password: "@keychain:AC_PASSWORD",
			// },
		},
		linux: {
			bundleCEF: false,
		},
		win: {
			bundleCEF: false,
			// codeSign: {
			// 	certificateFile: "./path/to/certificate.p12",
			// 	certificatePassword: "your-password",
			// },
		},
		
		// Update configuration
		update: {
			// URL for update checks
			url: "https://your-domain.com/updates",
			// How often to check for updates (in hours)
			checkInterval: 24,
		},
	},
} satisfies ElectrobunConfig;
