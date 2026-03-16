import { Effect } from "effect";
import { BrowserView, BrowserWindow, Updater } from "electrobun/bun";
import type { AppRPC, QosConfig } from "../shared/rpc";
import { runWipeTask } from "./background";
import { DbService, DbServiceLive } from "./services/db-service";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;
const DEV_SERVER_TIMEOUT_MS = 3000;

const log = (msg: string) => console.log(`[bun] ${new Date().toISOString()} ${msg}`);

async function getMainViewUrl(): Promise<string> {
	log("Resolving main view url...");
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			const timeout = new Promise((_, reject) =>
				setTimeout(() => reject(new Error("timeout")), DEV_SERVER_TIMEOUT_MS),
			);
			await Promise.race([fetch(DEV_SERVER_URL, { method: "HEAD" }), timeout]);
			log(`HMR enabled: ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			log("Vite dev server not reachable, falling back to packaged view.");
		}
	}
	return "views://mainview/index.html";
}

// ─── Bootstrap the app using Effect ───

const appProgram = Effect.gen(function* () {
	const dbService = yield* DbService;

	// Helper: run an Effect from an async RPC handler
	const run = <A>(effect: Effect.Effect<A, unknown, DbService>) =>
		Effect.runPromise(Effect.provide(effect, DbServiceLive));

	const url = yield* Effect.promise(() => getMainViewUrl());
	log(`Main view url resolved: ${url}`);

	const rpc = BrowserView.defineRPC<AppRPC>({
		handlers: {
			requests: {
				getQosConfig: async () => ({
					config: await run(dbService.getQosConfig()),
				}),
				saveQosConfig: async (params: QosConfig) => {
					await run(dbService.saveQosConfig(params));
					return { ok: true as const };
				},
			},
			messages: {},
		},
	});

	const mainWindow = new BrowserWindow({
		title: "Svelte App",
		url,
		frame: { width: 900, height: 700, x: 200, y: 200 },
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

	// Start the background wipe task (runs forever via schedule)
	yield* Effect.forkChild(runWipeTask);

	log("App started.");
});

// Run the app with the live DB layer
Effect.runFork(appProgram.pipe(Effect.provide(DbServiceLive)));
