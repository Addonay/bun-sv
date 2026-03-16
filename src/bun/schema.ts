import { sql } from 'drizzle-orm';
import { text, integer, pgTable, timestamp, real } from 'drizzle-orm/pg-core';

// ─── QoS Config (single-row, upsert on id=1) ───
export const qosConfig = pgTable('qos_config', {
	id: integer('id').primaryKey(),
	thresholds_json: text('thresholds_json').notNull(),
	groups_json: text('groups_json').notNull(),
	regions_json: text('regions_json').notNull(),
	updated_at: timestamp('updated_at').defaultNow()
});

// ─── QoS Data (KPI measurement rows) ───
export const qosData = pgTable('qos_data', {
	id: integer('id').primaryKey().default(sql`nextval('qos_data_id_seq')`),
	area: text('area').notNull(),
	kpi_name: text('kpi_name').notNull(),
	date: timestamp('date').notNull(),
	value: real('value').notNull(),
	created_at: timestamp('created_at').defaultNow()
});
