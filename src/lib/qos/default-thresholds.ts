import type { Threshold } from "$lib/qos/qos-state.svelte";

/**
 * Default threshold values for KPIs.
 * Only KPIs with defined thresholds will be initialized.
 * Others will remain unset (undefined).
 */
export const DEFAULT_THRESHOLDS: Record<string, Threshold> = {
	// RNA/Accessibility
	"2G RNA": { operator: ">", value: 99.93 },
	"3G RNA": { operator: ">", value: 99.93 },
	"4G RNA": { operator: ">", value: 99.93 },
	"5G RNA": { operator: ">", value: 99.93 },

	// Drop rates
	"2G DCR": { operator: "<=", value: 0.3 },
	"3G CS DROP": { operator: "<=", value: 0.15 },
	"3G PS/HS DROP": { operator: "<=", value: 0.3 },
	"Service Drop Rate (All) (4G)": { operator: "<=", value: 0.1 },
	"VoLTE Drop Rate (QC1)": { operator: "<=", value: 0.13 },
	"5G Session Drop Rate": { operator: "<=", value: 0.15 },

	// Utilization
	"2G Utilization": { operator: "<=", value: 80 },
	"3G Utilization": { operator: "<=", value: 80 },
	"4G Utilization": { operator: "<=", value: 80 },
	"5G Utilization": { operator: "<=", value: 80 },

	// CSSR
	"2G CSSR": { operator: ">=", value: 99.5 },
	"3G CSSR": { operator: ">=", value: 99.5 },
	"3G HS/PS CSSR": { operator: ">=", value: 99.0 },
	"VoLTE CSSR": { operator: ">=", value: 99.5 },

	// PSR
	"2G PSR": { operator: ">=", value: 90.0 },
	"3G PSR": { operator: ">=", value: 90.0 },
	"4G PSR": { operator: ">=", value: 90.0 },

	// Success Rates
	"CSFB success rate (4G)": { operator: ">=", value: 99.9 },
	"Session Success Rate (4G)": { operator: ">=", value: 99.5 },
	"ERAB Setup Success Rate (QCI 1) -VoLTE": { operator: ">=", value: 99.5 },
	"SRVCC Success Rate (3G & 2G)": { operator: ">=", value: 97.5 },
	"SgNb Addition Success Rate": { operator: ">=", value: 99.5 },

	// Throughput
	"3G Throughput": { operator: ">=", value: 2500 },
	"4G Throughput(DL_User_throughput) (Mbps)": { operator: ">=", value: 10 },
	"5G DL Throughput (Mbps)": { operator: ">=", value: 20 },
	"5G UL Throughput (Mbps)": { operator: ">=", value: 5 },

	// CQI
	"4G CQI": { operator: ">=", value: 8 },
	"5G CQI": { operator: ">=", value: 8 },

	// TCH
	"2G_TCH_Availability": { operator: ">=", value: 99.5 },
	"2G_TCH_Blocking": { operator: "<=", value: 0.15 },

	// Data Integrity
	"2G voice Data integrity(%)": { operator: ">=", value: 99.9 },
	"3G CS Data integrity(%)": { operator: ">=", value: 99.9 },
	"3G PS Data integrity(%)": { operator: ">=", value: 99.9 },
	"4G Data integrity(%)": { operator: ">=", value: 99.9 },
	"5G Data integrity(%)": { operator: ">=", value: 99.9 },

	// Cell Performance
	"% of cells having 3G user throughput greater than 1000kbps": {
		operator: ">=",
		value: 85.0,
	},
	"% of cells having 4G user throughput greater than 5Mbps": {
		operator: ">=",
		value: 90.0,
	},
	"% of cells having 5G user throughput (>=20Mbps)": {
		operator: ">=",
		value: 70.0,
	},
	"% of cells with 2G RX Qual Samples 0-5(>=90%)": {
		operator: ">=",
		value: 90.0,
	},

	// Latency & Loss
	"5G Latency": { operator: "<", value: 30 },
	"5G Packet Loss": { operator: "<", value: 0.01 },

	// Other
	"Percentage_Cells_with_4G_User_Throughput_less_than_3Mbps": {
		operator: "<",
		value: 5,
	},
	"SD Blocking": { operator: "<", value: 0.3 },
};

/**
 * Get default threshold for a KPI name.
 * Returns undefined if no default threshold is defined.
 */
export function getDefaultThreshold(kpiName: string): Threshold | undefined {
	return DEFAULT_THRESHOLDS[kpiName];
}
