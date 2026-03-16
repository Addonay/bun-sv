import { mkdirSync } from "node:fs";
import path from "node:path";
import { DuckDBInstance } from '@duckdb/node-api';
import { drizzle } from '@duckdbfan/drizzle-duckdb';
import { sql as drizzleSql } from 'drizzle-orm';
import { text, integer, pgTable, timestamp, real } from 'drizzle-orm/pg-core';
import type { QosConfig } from "../shared/rpc";

const dbUrl = ":memory:"; // User requested :memory: instead of a file

if (dbUrl !== ":memory:") {
	mkdirSync(path.dirname(dbUrl), { recursive: true });
}

export const instance = await DuckDBInstance.create(dbUrl);
export const connection = await instance.connect();
export const db = drizzle(connection);

export const qosConfig = pgTable('qos_config', {
	id: integer('id').primaryKey(),
	thresholds_json: text('thresholds_json').notNull(),
	groups_json: text('groups_json').notNull(),
	regions_json: text('regions_json').notNull(),
	updated_at: timestamp('updated_at').defaultNow()
});

export const qosData = pgTable('qos_data', {
    id: integer('id').primaryKey(), // We'll use sequences or just generate uuid
    area: text('area').notNull(),
    kpi_name: text('kpi_name').notNull(),
    date: timestamp('date').notNull(),
    value: real('value').notNull(),
    created_at: timestamp('created_at').defaultNow()
});

export async function ensureQosTables() {
	await db.execute(drizzleSql`
		CREATE TABLE IF NOT EXISTS qos_config (
			id INTEGER PRIMARY KEY,
			thresholds_json VARCHAR NOT NULL,
			groups_json VARCHAR NOT NULL,
			regions_json VARCHAR NOT NULL,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`);
    await db.execute(drizzleSql`
        CREATE SEQUENCE IF NOT EXISTS qos_data_id_seq;
        CREATE TABLE IF NOT EXISTS qos_data (
            id INTEGER PRIMARY KEY DEFAULT nextval('qos_data_id_seq'),
            area VARCHAR NOT NULL,
            kpi_name VARCHAR NOT NULL,
            date TIMESTAMP NOT NULL,
            value DOUBLE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

export async function getQosConfig(): Promise<QosConfig | null> {
	await ensureQosTables();
	const rows = await db.select().from(qosConfig).where(drizzleSql`id = 1`).limit(1);
	if (!rows || rows.length === 0) return null;

	const row = rows[0];

	return {
		fileName: "global",
		thresholds: JSON.parse(row.thresholds_json),
		groups: JSON.parse(row.groups_json),
		regions: JSON.parse(row.regions_json),
	};
}

export async function saveQosConfig(config: QosConfig) {
	await ensureQosTables();
    await db.execute(drizzleSql`
        INSERT INTO qos_config (id, thresholds_json, groups_json, regions_json, updated_at)
        VALUES (1, ${JSON.stringify(config.thresholds)}, ${JSON.stringify(config.groups)}, ${JSON.stringify(config.regions)}, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET 
            thresholds_json = excluded.thresholds_json,
            groups_json = excluded.groups_json,
            regions_json = excluded.regions_json,
            updated_at = CURRENT_TIMESTAMP
    `);
	return { ok: true as const };
}

export async function saveQosData(data: { area: string, kpi_name: string, date: string, value: number }[]) {
    await ensureQosTables();
    if (data.length === 0) return { ok: true };
    
    // Chunk inserts if too large
    const chunkSize = 1000;
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await db.insert(qosData).values(chunk.map(d => ({
            area: d.area,
            kpi_name: d.kpi_name,
            date: new Date(d.date),
            value: d.value
        })));
    }
    return { ok: true };
}

export async function clearQosData() {
    await ensureQosTables();
    await db.delete(qosData);
    return { ok: true };
}
