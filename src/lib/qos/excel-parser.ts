import type { AreaData, KpiData, KpiDataPoint } from "$lib/qos/qos-state.svelte";

const MAX_SOURCE_ROW = 403;
const XLSX_CDN = "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

type XlsxModule = typeof import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");

let xlsxPromise: Promise<XlsxModule> | null = null;

async function getXlsx(): Promise<XlsxModule> {
	if (!xlsxPromise) {
		xlsxPromise = import(/* @vite-ignore */ XLSX_CDN);
	}
	return xlsxPromise;
}

/**
 * Parse an Excel file buffer into area data.
 *
 * Expected structure -- SINGLE SHEET format:
 * - Row 1: Header row with dates starting from column C (index 2)
 * - Row 2+: KPI data rows for the first area (no area name header -- defaults to sheet name)
 *   - Column A (index 0): code like "KE" (ignored)
 *   - Column B (index 1): KPI name
 *   - Columns C+ (index 2+): Numeric values for each date
 * - After the first area's KPIs: 1 empty row, then a row with the area name in a cell,
 *   then KPI data rows for that area, repeat for each additional area.
 */
export async function parseExcelBuffer(
	buffer: ArrayBuffer,
): Promise<{ areas: Map<string, AreaData>; kpiNames: string[]; areaNames: string[] }> {
	const XLSX = await getXlsx();
	const workbook = XLSX.read(buffer, { type: "array", cellDates: true, cellNF: true });
	const areas = new Map<string, AreaData>();
	const kpiNames: string[] = [];
	const areaNames: string[] = [];

	const sheetName = workbook.SheetNames[0];
	if (!sheetName) return { areas, kpiNames, areaNames };

	const sheet = workbook.Sheets[sheetName];
	const allRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
		header: 1,
		raw: true,
		defval: null,
	});
	const raw = allRows.slice(0, MAX_SOURCE_ROW);

	if (raw.length < 2) return { areas, kpiNames, areaNames };

	const headerRow = raw[0];
	if (!headerRow || headerRow.length < 3) return { areas, kpiNames, areaNames };

	const dates: (Date | null)[] = [];
	for (let col = 2; col < headerRow.length; col += 1) {
		dates.push(parseDate(XLSX, headerRow[col]));
	}

	const blocks = splitIntoAreaBlocks(raw, sheetName);

	for (const block of blocks) {
		const areaData = parseAreaBlock(block.rows, block.areaName, dates);
		if (areaData && areaData.kpis.length > 0) {
			areas.set(block.areaName, areaData);
			areaNames.push(block.areaName);
			if (kpiNames.length === 0) {
				for (const kpi of areaData.kpis) kpiNames.push(kpi.name);
			}
		}
	}

	return { areas, kpiNames, areaNames };
}

interface AreaBlock {
	areaName: string;
	rows: unknown[][];
}

function splitIntoAreaBlocks(raw: unknown[][], defaultAreaName: string): AreaBlock[] {
	const blocks: AreaBlock[] = [];
	let currentName = defaultAreaName;
	let currentRows: unknown[][] = [];
	let expectingAreaName = false;

	for (let i = 1; i < raw.length; i += 1) {
		const row = raw[i];

		if (isEmptyRow(row)) {
			if (currentRows.length > 0) {
				blocks.push({ areaName: currentName, rows: currentRows });
				currentRows = [];
			}
			expectingAreaName = true;
			continue;
		}

		if (expectingAreaName) {
			const areaName = extractAreaName(row);
			if (areaName) {
				currentName = areaName;
				expectingAreaName = false;
				const kpiName = getKpiName(row);
				if (!kpiName) {
					continue;
				}
			}
			expectingAreaName = false;
		}

		const kpiName = getKpiName(row);
		if (kpiName) currentRows.push(row);
	}

	if (currentRows.length > 0) {
		blocks.push({ areaName: currentName, rows: currentRows });
	}

	return blocks;
}

function isEmptyRow(row: unknown[] | undefined): boolean {
	if (!row || row.length === 0) return true;
	return row.every((cell) => {
		if (cell === null || cell === undefined) return true;
		if (typeof cell === "string" && cell.trim() === "") return true;
		return false;
	});
}

function extractAreaName(row: unknown[]): string | null {
	for (const cell of row) {
		if (cell !== null && cell !== undefined) {
			const s = String(cell).trim();
			if (s && isNaN(Number(s))) {
				return s;
			}
		}
	}
	return null;
}

function getKpiName(row: unknown[]): string | null {
	if (!row || row.length < 3) return null;
	const cell = row[1];
	if (cell === null || cell === undefined) return null;
	const s = String(cell).trim();
	return s || null;
}

function parseAreaBlock(
	rows: unknown[][],
	areaName: string,
	dates: (Date | null)[],
): AreaData | null {
	const kpis: KpiData[] = [];

	for (const row of rows) {
		const kpiName = getKpiName(row);
		if (!kpiName) continue;

		const values: KpiDataPoint[] = [];
		for (let col = 2; col < Math.min(row.length, dates.length + 2); col += 1) {
			const dateIdx = col - 2;
			const date = dates[dateIdx];
			if (!date || isNaN(date.getTime())) continue;

			const rawVal = row[col];
			const value = parseFloatSafe(rawVal);

			if (value !== null) {
				values.push({ date, value });
			}
		}

		if (values.length > 0) {
			values.sort((a, b) => a.date.getTime() - b.date.getTime());
			kpis.push({ name: kpiName, values });
		}
	}

	if (kpis.length === 0) return null;
	return { name: areaName, kpis };
}

function makeDateOnly(year: number, month: number, day: number): Date | null {
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
}

function parseDate(XLSX: XlsxModule, val: unknown): Date | null {
	if (val instanceof Date) {
		if (isNaN(val.getTime())) return null;
		return makeDateOnly(val.getUTCFullYear(), val.getUTCMonth() + 1, val.getUTCDate());
	}
	if (typeof val === "number") {
		const d = XLSX.SSF.parse_date_code(val);
		if (d) {
			return makeDateOnly(d.y, d.m, d.d);
		}
	}
	if (typeof val === "string") {
		const s = val.trim();
		if (!s) return null;

		const dmyMatch = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);
		if (dmyMatch) {
			const day = Number(dmyMatch[1]);
			const month = Number(dmyMatch[2]);
			const year = Number(dmyMatch[3]);
			return makeDateOnly(year, month, day);
		}

		const ymdMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
		if (ymdMatch) {
			const year = Number(ymdMatch[1]);
			const month = Number(ymdMatch[2]);
			const day = Number(ymdMatch[3]);
			return makeDateOnly(year, month, day);
		}

		const parsed = new Date(s);
		if (!isNaN(parsed.getTime())) return parsed;
	}
	return null;
}

function parseFloatSafe(val: unknown): number | null {
	if (val === null || val === undefined || val === "") return null;
	if (typeof val === "number") {
		return isNaN(val) ? null : val;
	}
	if (typeof val === "string") {
		const cleaned = val.replace(/[%,\s]/g, "").trim();
		if (!cleaned) return null;
		const n = Number(cleaned);
		return isNaN(n) ? null : n;
	}
	return null;
}
