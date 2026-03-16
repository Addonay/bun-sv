import * as XLSX from "xlsx";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { DEFAULT_THRESHOLDS } from "../lib/qos/default-thresholds";

type Operator = ">=" | "<=" | ">" | "<" | "==" | "!=";

interface Threshold {
	operator: Operator;
	value: number;
}

interface Range {
	min: number;
	max: number;
}

const DEFAULT_AREAS = ["North", "South", "East", "West"];
const DEFAULT_MONTHS_BACK = 6;
const DEFAULT_FORMAT = "xlsx";
const DEFAULT_SEED = 42;

const args = parseArgs(process.argv.slice(2));
const areas = args.areas && args.areas.length > 0 ? args.areas : DEFAULT_AREAS;
const monthsBack = Math.max(1, args.months ?? DEFAULT_MONTHS_BACK);
const format = args.format ?? DEFAULT_FORMAT;
const seed = args.seed ?? DEFAULT_SEED;

const today = new Date();
today.setHours(12, 0, 0, 0);
const start = new Date(today);
start.setMonth(start.getMonth() - monthsBack);

const dates = buildDates(start, today);
const dateLabels = dates.map(formatDate);

const kpiEntries = Object.entries(DEFAULT_THRESHOLDS) as [string, Threshold][];
const rows: (string | number | null)[][] = [];

rows.push(["Code", "KPI Name", ...dateLabels]);

for (const area of areas) {
	rows.push([]);
	rows.push([area]);

	const areaCode = makeAreaCode(area);
	for (const [kpiName, threshold] of kpiEntries) {
		const range = getPassingRange(threshold);
		const rng = mulberry32(seed ^ hashString(`${area}|${kpiName}`));
		const series = buildSeries(range, dates.length, rng);
		rows.push([areaCode, kpiName, ...series]);
	}
}

const sheet = XLSX.utils.aoa_to_sheet(rows);
const workbook = XLSX.utils.book_new();
const sheetName = areas[0] ?? "QoS Test Data";
XLSX.utils.book_append_sheet(workbook, sheet, sheetName);

await writeOutputs({ workbook, sheet, format, outPath: args.out });

function parseArgs(argv: string[]) {
	const out: {
		format?: "xlsx" | "csv" | "both";
		out?: string;
		areas?: string[];
		months?: number;
		seed?: number;
	} = {};

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		const next = argv[i + 1];
		if (arg === "--format" && next) {
			if (next === "xlsx" || next === "csv" || next === "both") out.format = next;
			i += 1;
			continue;
		}
		if (arg === "--out" && next) {
			out.out = next;
			i += 1;
			continue;
		}
		if (arg === "--areas" && next) {
			out.areas = next
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean);
			i += 1;
			continue;
		}
		if (arg === "--months" && next) {
			const parsed = Number(next);
			if (!Number.isNaN(parsed)) out.months = parsed;
			i += 1;
			continue;
		}
		if (arg === "--seed" && next) {
			const parsed = Number(next);
			if (!Number.isNaN(parsed)) out.seed = parsed;
			i += 1;
		}
	}

	return out;
}

function buildDates(startDate: Date, endDate: Date): Date[] {
	const list: Date[] = [];
	const d = new Date(startDate);
	d.setHours(12, 0, 0, 0);
	while (d <= endDate) {
		list.push(new Date(d));
		d.setDate(d.getDate() + 1);
	}
	return list;
}

function formatDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function makeAreaCode(area: string): string {
	const cleaned = area.replace(/[^a-zA-Z]/g, "");
	const code = cleaned.slice(0, 2).toUpperCase();
	return code || "RG";
}

function getPassingRange(threshold: Threshold): Range {
	const value = threshold.value;
	const magnitude = Math.abs(value);
	const pct =
		magnitude >= 1000 ? 0.03 : magnitude >= 100 ? 0.05 : magnitude >= 10 ? 0.1 : magnitude >= 1 ? 0.2 : 0.5;
	const absWide = Math.max(magnitude * pct, magnitude < 1 ? 0.002 : 0.1);
	const epsilon = Math.max(magnitude * 0.001, 1e-4);
	const likelyPercent = value > 1 && value <= 100;

	switch (threshold.operator) {
		case ">=": {
			let min = value;
			let max = value + absWide;
			if (likelyPercent) max = Math.min(max, 100);
			if (min > max) min = max;
			return { min, max };
		}
		case ">": {
			let min = value + epsilon;
			let max = value + absWide;
			if (likelyPercent) max = Math.min(max, 100);
			if (min > max) min = max;
			return { min, max };
		}
		case "<=": {
			const max = value;
			const min = Math.max(0, value - absWide);
			return { min, max };
		}
		case "<": {
			const max = value - epsilon;
			const min = Math.max(0, value - absWide);
			return { min, max: Math.max(min, max) };
		}
		case "==":
			return { min: value, max: value };
		case "!=": {
			const min = value + epsilon;
			const max = value + absWide;
			return { min, max };
		}
	}
}

function buildSeries(range: Range, count: number, rng: () => number): number[] {
	const span = range.max - range.min;
	if (span <= 0 || count <= 0) {
		return Array.from({ length: count }, () => roundValue(range.min));
	}

	const base = range.min + span * (0.35 + rng() * 0.3);
	const amplitude = span * (0.15 + rng() * 0.1);
	const noise = span * 0.05;
	const phase = rng() * Math.PI * 2;
	const denom = Math.max(1, count - 1);

	return Array.from({ length: count }, (_, i) => {
		const wave = Math.sin((i / denom) * Math.PI * 2 + phase);
		let value = base + wave * amplitude + (rng() - 0.5) * 2 * noise;
		value = clamp(value, range.min, range.max);
		return roundValue(value);
	});
}

function clamp(value: number, min: number, max: number): number {
	if (value < min) return min;
	if (value > max) return max;
	return value;
}

function roundValue(value: number): number {
	const abs = Math.abs(value);
	if (abs >= 1000) return Math.round(value);
	if (abs >= 100) return Math.round(value * 10) / 10;
	if (abs >= 1) return Math.round(value * 100) / 100;
	return Math.round(value * 10000) / 10000;
}

function hashString(input: string): number {
	let hash = 2166136261;
	for (let i = 0; i < input.length; i += 1) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function mulberry32(seedValue: number) {
	let t = seedValue >>> 0;
	return () => {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), t | 1);
		r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

async function writeOutputs(opts: {
	workbook: XLSX.WorkBook;
	sheet: XLSX.WorkSheet;
	format: "xlsx" | "csv" | "both";
	outPath?: string;
}) {
	const root = path.dirname(fileURLToPath(import.meta.url));
	const defaultBase = path.resolve(root, "..", "..", "data", "qos-test-data");
	const outBase = opts.outPath ? path.resolve(opts.outPath) : defaultBase;
	const parsed = path.parse(outBase);
	const basePath = parsed.ext ? path.join(parsed.dir, parsed.name) : outBase;

	const outputs: { format: "xlsx" | "csv"; path: string }[] = [];
	if (opts.format === "both") {
		outputs.push({ format: "xlsx", path: `${basePath}.xlsx` });
		outputs.push({ format: "csv", path: `${basePath}.csv` });
	} else if (opts.format === "csv") {
		outputs.push({ format: "csv", path: parsed.ext ? outBase : `${basePath}.csv` });
	} else {
		outputs.push({ format: "xlsx", path: parsed.ext ? outBase : `${basePath}.xlsx` });
	}

	for (const output of outputs) {
		await mkdir(path.dirname(output.path), { recursive: true });
		if (output.format === "xlsx") {
			const workbookBytes = XLSX.write(opts.workbook, { bookType: "xlsx", type: "buffer" });
			await writeFile(output.path, workbookBytes);
		} else {
			const csv = XLSX.utils.sheet_to_csv(opts.sheet);
			await writeFile(output.path, csv, "utf8");
		}
		console.log(`Generated ${output.format.toUpperCase()}: ${output.path}`);
	}
}
