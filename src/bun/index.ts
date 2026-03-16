import { BrowserView, BrowserWindow, Updater } from "electrobun/bun";
import type { AppRPC } from "../shared/rpc";
import { getQosConfig, saveQosConfig } from "./db";
import { runWipeTask } from "./background";
import { Effect } from "effect";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;
const DEV_SERVER_TIMEOUT_MS = 800;

const log = (message: string) => {
	const stamp = new Date().toISOString();
	console.log(`[bun] ${stamp} ${message}`);
};

// Check if Vite dev server is running for HMR
async function getMainViewUrl(): Promise<string> {
	log("Resolving main view url...");
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			const timeout = new Promise((_, reject) =>
				setTimeout(() => reject(new Error("dev server timeout")), DEV_SERVER_TIMEOUT_MS),
			);
			await Promise.race([fetch(DEV_SERVER_URL, { method: "HEAD" }), timeout]);
			log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			log("Vite dev server not reachable. Falling back to packaged view.");
		}
	}
	return "views://mainview/index.html";
}

// Create the main application window
const url = await getMainViewUrl();
log(`Main view url resolved: ${url}`);

const rpcHandlers = {
	getQosConfig: async () => ({
		config: await getQosConfig(),
	}),
	saveQosConfig: async (params: Parameters<typeof saveQosConfig>[0]) => {
		await saveQosConfig(params);
		return { ok: true };
	},
};

const rpc = BrowserView.defineRPC<AppRPC>({
	handlers: {
		requests: {
			...rpcHandlers,
			_: async (method, params) => {
				if (method === "getQosConfig") return rpcHandlers.getQosConfig(params as any);
				if (method === "saveQosConfig") return rpcHandlers.saveQosConfig(params as any);
				throw new Error(`Unhandled RPC request: ${String(method)}`);
			},
		},
		messages: {},
	},
});

const mainWindow = new BrowserWindow({
	title: "Svelte App",
	url,
	frame: {
		width: 900,
		height: 700,
		x: 200,
		y: 200,
	},
	rpc,
});

log("BrowserWindow created.");
setTimeout(() => {
	try {
		mainWindow.show();
		mainWindow.focus();
	} catch (err) {
		log(`Failed to show window: ${err instanceof Error ? err.message : String(err)}`);
	}
}, 150);

log("Svelte app started!");


// Start background wipe task
Effect.runFork(runWipeTask);
