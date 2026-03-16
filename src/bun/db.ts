import { DuckDBInstance } from '@duckdb/node-api';
import { drizzle } from '@duckdbfan/drizzle-duckdb';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

const instance = await DuckDBInstance.create(':memory:');
const connection = await instance.connect();
export const db = drizzle(connection, { schema });

/**
 * Bootstrap tables in the in-memory DB.
 * This is the only place raw DDL lives — all CRUD uses Drizzle query builder.
 * Once drizzle-kit supports duckdb push, this can be replaced with `drizzle-kit push`.
 */
export async function initDb() {
	await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS qos_data_id_seq`);
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS qos_config (
			id INTEGER PRIMARY KEY,
			thresholds_json VARCHAR NOT NULL,
			groups_json VARCHAR NOT NULL,
			regions_json VARCHAR NOT NULL,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`);
	await db.execute(sql`
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
