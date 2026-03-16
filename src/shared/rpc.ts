import type { RPCSchema } from "electrobun/bun";

export type QosOperator = ">=" | "<=" | ">" | "<" | "==" | "!=";

export type QosThreshold = {
	name: string;
	operator: QosOperator;
	value: number;
};

export type QosGroup = {
	id: string;
	name: string;
	kpiNames: string[];
};

export type QosConfig = {
	thresholds: QosThreshold[];
	groups: QosGroup[];
	regions: string[];
};

export type AppRPC = {
	bun: RPCSchema<{
		requests: {
			getQosConfig: {
				params: {}; // global config no longer needs fileName
				response: { config: QosConfig | null };
			};
			saveQosConfig: {
				params: QosConfig;
				response: { ok: true };
			};
		};
		messages: {};
	}>;
	webview: RPCSchema<{
		requests: {};
		messages: {};
	}>;
};
