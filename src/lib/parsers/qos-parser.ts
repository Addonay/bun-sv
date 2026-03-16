import type { AreaData, KpiDataPoint } from "$lib/qos/qos-state.svelte";
import { Effect } from "effect";

const XLSX_CDN = "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";
const DEFAULT_UNLABELED_AREA = "KENYA";

type XlsxModule = typeof import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");

export interface QosParseResult {
	areas: Map<string, AreaData>;
	kpiNames: string[];
	areaNames: string[];
}

export type ParserTelemetryEvent = {
	code: string;
	message: string;
	meta?: Record<string, unknown>;
};

export interface ParserOptions {
	onEvent?: (event: ParserTelemetryEvent) => void;
}

class QosParserError extends Error {
	constructor(message: string, readonly cause?: unknown) {
		super(message);
		this.name = "QosParserError";
	}
}

let xlsxPromise: Promise<XlsxModule> | null = null;

const emit = (options: ParserOptions | undefined, event: ParserTelemetryEvent) => {
	options?.onEvent?.(event);
	if (typeof console !== "undefined") {
		console.debug(`[qos-parser] ${event.code}: ${event.message}`, event.meta ?? {});
	}
};

const getXlsx = () =>
	Effect.tryPromise({
		try: async () => {
			if (!xlsxPromise) {
				xlsxPromise = import(/* @vite-ignore */ XLSX_CDN);
			}
			return await xlsxPromise;
		},
		catch: (error) => new QosParserError("Failed to load XLSX runtime", error),
	});

const selectSheetName = (sheetNames: string[], selectedSheetName?: string): string | null => {
	if (selectedSheetName && sheetNames.includes(selectedSheetName)) return selectedSheetName;
	return sheetNames[0] ?? null;
};

const ensureArea = (
	acc: Map<string, Map<string, KpiDataPoint[]>>,
	areaOrder: string[],
	areaName: string,
): Map<string, KpiDataPoint[]> => {
	if (!acc.has(areaName)) {
		acc.set(areaName, new Map<string, KpiDataPoint[]>());
		areaOrder.push(areaName);
	}
	return acc.get(areaName)!;
};

const toDateOnly = (year: number, month: number, day: number): Date | null => {
	const date = new Date(year, month - 1, day, 12, 0, 0, 0);
	if (
		isNaN(date.getTime()) ||
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return null;
	}
	return date;
};

const parseDate = (XLSX: XlsxModule, val: unknown): Date | null => {
	if (val instanceof Date) {
		if (isNaN(val.getTime())) return null;
		return toDateOnly(val.getUTCFullYear(), val.getUTCMonth() + 1, val.getUTCDate());
	}

	if (typeof val === "number") {
		const d = XLSX.SSF.parse_date_code(val);
		if (d) return toDateOnly(d.y, d.m, d.d);
	}

	if (typeof val === "string") {
		const s = val.trim();
		if (!s) return null;

		const dmyMatch = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(s);
		if (dmyMatch) {
			return toDateOnly(Number(dmyMatch[3]), Number(dmyMatch[2]), Number(dmyMatch[1]));
		}

		const ymdMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
		if (ymdMatch) {
			return toDateOnly(Number(ymdMatch[1]), Number(ymdMatch[2]), Number(ymdMatch[3]));
		}

		const parsed = new Date(s);
		if (!isNaN(parsed.getTime())) return parsed;
	}

	return null;
};

const parseFloatSafe = (val: unknown): number | null => {
	if (val === null || val === undefined || val === "") return null;
	if (typeof val === "number") return isNaN(val) ? null : val;
	if (typeof val !== "string") return null;

	const cleaned = val.replace(/[%,\s]/g, "").trim();
	if (!cleaned) return null;
	const parsed = Number(cleaned);
	return isNaN(parsed) ? null : parsed;
};

const isEmptyRow = (row: unknown[] | undefined): boolean => {
	if (!row || row.length === 0) return true;
	return row.every((cell) => {
		if (cell === null || cell === undefined) return true;
		if (typeof cell === "string" && cell.trim() === "") return true;
		return false;
	});
};

const getKpiName = (row: unknown[]): string | null => {
	if (row.length < 3) return null;
	const cell = row[1];
	if (cell === null || cell === undefined) return null;
	const s = String(cell).trim();
	return s || null;
};

const isStandaloneAreaNameRow = (row: unknown[] | undefined): boolean => {
	if (!row) return false;
	const nonEmpty = row.filter(
		(cell) => !(cell === null || cell === undefined || (typeof cell === "string" && cell.trim() === "")),
	);
	if (nonEmpty.length !== 1) return false;
	if (typeof nonEmpty[0] !== "string") return false;
	const s = nonEmpty[0].trim();
	return s.length > 0 && isNaN(Number(s));
};

const extractAreaName = (row: unknown[]): string | null => {
	for (const cell of row) {
		if (cell === null || cell === undefined) continue;
		const s = String(cell).trim();
		if (s && isNaN(Number(s))) return s;
	}
	return null;
};

const isHeaderRow = (XLSX: XlsxModule, row: unknown[] | undefined): boolean => {
	if (!row || row.length < 3) return false;
	let dateCount = 0;
	for (let col = 2; col < row.length; col += 1) {
		if (parseDate(XLSX, row[col])) dateCount += 1;
	}
	return dateCount >= 2;
};

const extractHeaderDates = (XLSX: XlsxModule, row: unknown[]): (Date | null)[] =>
	row.slice(2).map((cell) => parseDate(XLSX, cell));

const parseKpiRow = (row: unknown[], dates: (Date | null)[]) => {
	const name = getKpiName(row);
	if (!name) return null;

	const values: KpiDataPoint[] = [];
	for (let col = 2; col < Math.min(row.length, dates.length + 2); col += 1) {
		const date = dates[col - 2];
		if (!date || isNaN(date.getTime())) continue;
		const value = parseFloatSafe(row[col]);
		if (value !== null) values.push({ date, value });
	}

	if (values.length === 0) return null;
	values.sort((a, b) => a.date.getTime() - b.date.getTime());
	return { name, values };
};

const toParseResult = (acc: Map<string, Map<string, KpiDataPoint[]>>, areaOrder: string[]): QosParseResult => {
	const areas = new Map<string, AreaData>();
	const areaNames: string[] = [];

	for (const areaName of areaOrder) {
		const perKpi = acc.get(areaName);
		if (!perKpi) continue;

		const kpis = Array.from(perKpi.entries())
			.map(([name, values]) => {
				const byTime = new Map<number, number>();
				for (const point of values) byTime.set(point.date.getTime(), point.value);
				const deduped = Array.from(byTime.entries())
					.map(([time, value]) => ({ date: new Date(time), value }))
					.sort((a, b) => a.date.getTime() - b.date.getTime());
				return { name, values: deduped };
			})
			.filter((kpi) => kpi.values.length > 0);

		if (kpis.length > 0) {
			areas.set(areaName, { name: areaName, kpis });
			areaNames.push(areaName);
		}
	}

	const kpiSourceArea =
		areas.get(DEFAULT_UNLABELED_AREA) ?? (areaNames.length > 0 ? areas.get(areaNames[0]) : undefined);
	const kpiNames = kpiSourceArea ? kpiSourceArea.kpis.map((kpi) => kpi.name) : [];

	return { areas, areaNames, kpiNames };
};

const parseWorkbook = (
	XLSX: XlsxModule,
	buffer: ArrayBuffer,
	selectedSheetName?: string,
	options?: ParserOptions,
): QosParseResult => {
	const workbook = XLSX.read(buffer, { type: "array", cellDates: true, cellNF: true });
	const sheetName = selectSheetName(workbook.SheetNames ?? [], selectedSheetName);
	if (!sheetName) {
		emit(options, { code: "no-sheet", message: "No sheet found in workbook" });
		return { areas: new Map(), kpiNames: [], areaNames: [] };
	}

	emit(options, { code: "sheet-selected", message: "Sheet selected", meta: { sheetName } });

	const sheet = workbook.Sheets[sheetName];
	if (!sheet) {
		throw new QosParserError(`Sheet not found: ${sheetName}`);
	}

	const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
	const acc = new Map<string, Map<string, KpiDataPoint[]>>();
	const areaOrder: string[] = [];

	let currentArea = DEFAULT_UNLABELED_AREA;
	let pendingArea: string | null = null;
	let dates: (Date | null)[] | null = null;

	for (const row of rows) {
		if (isEmptyRow(row)) continue;

		if (isHeaderRow(XLSX, row)) {
			dates = extractHeaderDates(XLSX, row);
			if (pendingArea) {
				currentArea = pendingArea;
				pendingArea = null;
			}
			ensureArea(acc, areaOrder, currentArea);
			continue;
		}

		if (isStandaloneAreaNameRow(row)) {
			pendingArea = extractAreaName(row);
			continue;
		}

		if (!dates) continue;
		if (pendingArea) {
			currentArea = pendingArea;
			pendingArea = null;
			ensureArea(acc, areaOrder, currentArea);
		}

		const parsed = parseKpiRow(row, dates);
		if (!parsed) continue;

		const areaMap = ensureArea(acc, areaOrder, currentArea);
		const current = areaMap.get(parsed.name) ?? [];
		current.push(...parsed.values);
		areaMap.set(parsed.name, current);
	}

	const result = toParseResult(acc, areaOrder);
	emit(options, {
		code: "parse-finished",
		message: "Workbook parsed",
		meta: { areas: result.areaNames.length, kpis: result.kpiNames.length },
	});
	return result;
};

export async function parseExcelBuffer(
	buffer: ArrayBuffer,
	selectedSheetName?: string,
	options?: ParserOptions,
): Promise<QosParseResult> {
	const program = Effect.gen(function* () {
		const XLSX = yield* getXlsx();
		return parseWorkbook(XLSX, buffer, selectedSheetName, options);
	}).pipe(
		Effect.mapError((error) =>
			error instanceof QosParserError ? error : new QosParserError("Failed to parse workbook", error),
		),
	);

	return await Effect.runPromise(program);
}

export async function getExcelSheetNames(
	buffer: ArrayBuffer,
	options?: ParserOptions,
): Promise<string[]> {
	const program = Effect.gen(function* () {
		const XLSX = yield* getXlsx();
		const workbook = XLSX.read(buffer, { type: "array", cellDates: true, cellNF: true });
		const sheets = workbook.SheetNames ?? [];
		emit(options, {
			code: "sheets-loaded",
			message: "Workbook sheet names loaded",
			meta: { count: sheets.length },
		});
		return sheets;
	}).pipe(
		Effect.mapError((error) =>
			error instanceof QosParserError ? error : new QosParserError("Failed to load sheet names", error),
		),
	);

	return await Effect.runPromise(program);
}