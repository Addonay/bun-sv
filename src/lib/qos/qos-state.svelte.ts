import { getContext, setContext, tick } from "svelte";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
import { getDefaultThreshold } from "$lib/qos/default-thresholds";
import type { QosConfig } from "../../shared/rpc";

export type Operator = ">=" | "<=" | ">" | "<" | "==" | "!=";

export interface Threshold {
	operator: Operator;
	value: number;
}

export interface KpiDataPoint {
	date: Date;
	value: number;
}

export interface KpiData {
	name: string;
	values: KpiDataPoint[];
}

export interface AreaData {
	name: string;
	kpis: KpiData[];
}

export interface KpiGroup {
	id: string;
	name: string;
	kpiNames: string[];
}

export const OPERATORS: { label: string; value: Operator }[] = [
	{ label: ">=", value: ">=" },
	{ label: "<=", value: "<=" },
	{ label: ">", value: ">" },
	{ label: "<", value: "<" },
	{ label: "==", value: "==" },
	{ label: "!=", value: "!=" },
];

const QOS_STATE_KEY = Symbol("qos-state");

export class QosState {
	data = $state<Map<string, AreaData>>(new SvelteMap());
	kpiNames = $state<string[]>([]);
	areaNames = $state<string[]>([]);
	fileName = $state<string | null>(null);
	hasData = $derived(this.data.size > 0);

	thresholds = $state<Map<string, Threshold>>(new SvelteMap());
	thresholdsConfigured = $state(false);

	selectedArea = $state<string>("");
	globalDays = $state(30);

	kpiGroups = $state<KpiGroup[]>([]);
	selectedGroupId = $state<string | null>(null);

	groupedKpis = $derived.by(() => {
		const set = new SvelteSet<string>();
		for (const group of this.kpiGroups) {
			for (const name of group.kpiNames) set.add(name);
		}
		return set;
	});

	ungroupedKpis = $derived.by(() => {
		return this.kpiNames.filter((name) => !this.groupedKpis.has(name));
	});

	focusedChart = $state<string | null>(null);
	view = $state<"splash" | "thresholds" | "grouping" | "dashboard">("splash");

	loadData(
		result: { areas: Map<string, AreaData>; kpiNames: string[]; areaNames: string[] },
		fileName: string,
	) {
		const { areas, kpiNames, areaNames } = result;
		this.data = areas;
		this.kpiNames = kpiNames;
		this.areaNames = areaNames;
		this.fileName = fileName;
		this.selectedArea = areaNames[0] ?? "";

		const newThresholds = new SvelteMap(this.thresholds);
		for (const name of kpiNames) {
			if (!newThresholds.has(name)) {
				const defaultThreshold = getDefaultThreshold(name);
				if (defaultThreshold) {
					newThresholds.set(name, defaultThreshold);
				}
			}
		}
		this.thresholds = newThresholds;
	}

	applyConfig(config: QosConfig) {
		const map = new SvelteMap(this.thresholds);
		for (const t of config.thresholds ?? []) {
			map.set(t.name, { operator: t.operator, value: t.value });
		}
		this.thresholds = map;
		this.thresholdsConfigured = map.size > 0;
		this.kpiGroups = config.groups ?? [];
	}

	serializeConfig(): QosConfig {
		return {
			thresholds: Array.from(this.thresholds.entries()).map(([name, value]) => ({
				name,
				operator: value.operator,
				value: value.value,
			})),
			groups: this.kpiGroups,
			regions: this.areaNames,
		};
	}

	async openFocusedChart(kpiName: string) {
		if (typeof document !== "undefined" && "startViewTransition" in document) {
			(document as any).startViewTransition(async () => {
				this.focusedChart = kpiName;
				await tick();
			});
		} else {
			this.focusedChart = kpiName;
		}
	}

	async closeFocusedChart() {
		if (typeof document !== "undefined" && "startViewTransition" in document) {
			(document as any).startViewTransition(async () => {
				this.focusedChart = null;
				await tick();
			});
		} else {
			this.focusedChart = null;
		}
	}

	getKpiData(kpiName: string): KpiData | undefined {
		const area = this.data.get(this.selectedArea);
		if (!area) return undefined;
		return area.kpis.find((kpi) => kpi.name === kpiName);
	}

	getLatestValue(kpiName: string): number | null {
		const kpi = this.getKpiData(kpiName);
		if (!kpi || kpi.values.length === 0) return null;
		for (let i = kpi.values.length - 1; i >= 0; i -= 1) {
			const value = kpi.values[i]?.value;
			if (value !== null && value !== undefined && !isNaN(value)) {
				return value;
			}
		}
		return null;
	}

	meetsThreshold(kpiName: string, value: number): boolean | null {
		const t = this.thresholds.get(kpiName);
		if (!t) return null;
		switch (t.operator) {
			case ">=":
				return value >= t.value;
			case "<=":
				return value <= t.value;
			case ">":
				return value > t.value;
			case "<":
				return value < t.value;
			case "==":
				return Math.abs(value - t.value) < 1e-9;
			case "!=":
				return Math.abs(value - t.value) >= 1e-9;
		}
	}

	getFilteredValues(kpiName: string, daysOverride?: number): KpiDataPoint[] {
		const kpi = this.getKpiData(kpiName);
		if (!kpi) return [];

		const sorted = kpi.values.slice().sort((a, b) => a.date.getTime() - b.date.getTime());
		if (sorted.length === 0) return [];

		const days = Math.max(1, daysOverride ?? this.globalDays);
		const latestDate = sorted[sorted.length - 1].date;
		const cutoff = new Date(latestDate);
		cutoff.setHours(0, 0, 0, 0);
		cutoff.setDate(cutoff.getDate() - (days - 1));

		return sorted.filter((v) => v.date >= cutoff);
	}

	getStats(): { total: number; passing: number; failing: number; noThreshold: number } {
		let passing = 0;
		let failing = 0;
		let noThreshold = 0;

		for (const name of this.kpiNames) {
			const latest = this.getLatestValue(name);
			if (latest === null) {
				noThreshold += 1;
				continue;
			}
			const result = this.meetsThreshold(name, latest);
			if (result === null) noThreshold += 1;
			else if (result) passing += 1;
			else failing += 1;
		}

		return { total: this.kpiNames.length, passing, failing, noThreshold };
	}

	addGroup(name: string, kpiNames: string[]) {
		const id = crypto.randomUUID();
		this.kpiGroups = [...this.kpiGroups, { id, name, kpiNames }];
	}

	removeGroup(id: string) {
		this.kpiGroups = this.kpiGroups.filter((g) => g.id !== id);
	}

	updateGroup(id: string, updates: Partial<Omit<KpiGroup, "id">>) {
		this.kpiGroups = this.kpiGroups.map((g) => (g.id === id ? { ...g, ...updates } : g));
	}

	reset() {
		this.data = new SvelteMap();
		this.kpiNames = [];
		this.areaNames = [];
		this.fileName = null;
		this.selectedArea = "";
		this.thresholds = new SvelteMap();
		this.thresholdsConfigured = false;
		this.kpiGroups = [];
		this.globalDays = 30;
		this.selectedGroupId = null;
		this.focusedChart = null;
		this.view = "splash";
	}
}

export function setQosState(): QosState {
	const state = new QosState();
	setContext(QOS_STATE_KEY, state);
	return state;
}

export function useQosState(): QosState {
	return getContext<QosState>(QOS_STATE_KEY);
}

export function formatFloat(n: number): string {
	if (Number.isInteger(n)) return n.toString();
	return parseFloat(n.toFixed(4)).toString();
}
