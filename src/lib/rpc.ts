import { Electroview } from "electrobun/view";
import type { AppRPC } from "../shared/rpc";

export const bunRpc = Electroview.defineRPC<AppRPC>({
	handlers: {
		requests: {},
		messages: {},
	},
});

const canInitRpc =
	typeof window !== "undefined" &&
	typeof (window as any).__electrobunWebviewId !== "undefined" &&
	typeof (window as any).__electrobunRpcSocketPort !== "undefined";

export const rpcReady = canInitRpc;

if (canInitRpc) {
	try {
		new Electroview({ rpc: bunRpc });
	} catch (error) {
		console.error("Failed to initialize Electrobun RPC:", error);
	}
} else {
	console.warn("Electrobun RPC not available in this runtime.");
}
