import { ServiceMap, Effect, Layer } from 'effect';
import { eq } from 'drizzle-orm';
import { db, initDb } from '../db';
import { qosConfig, qosData } from '../schema';
import type { QosConfig } from '../../shared/rpc';

// ─── Service interface ───

export class DbService extends ServiceMap.Service<DbService,
	{
		readonly getQosConfig: () => Effect.Effect<QosConfig | null>;
		readonly saveQosConfig: (config: QosConfig) => Effect.Effect<void>;
		readonly saveQosData: (data: { area: string; kpi_name: string; date: string; value: number }[]) => Effect.Effect<void>;
		readonly clearQosData: () => Effect.Effect<void>;
	}
>()('DbService') {}

// ─── Live implementation ───

const CHUNK_SIZE = 1000;

export const DbServiceLive = Layer.effect(
	DbService,
	Effect.gen(function* () {
		yield* Effect.promise(() => initDb());

		return {
			getQosConfig: () =>
				Effect.gen(function* () {
					const rows = yield* Effect.promise(() =>
						db.select().from(qosConfig).where(eq(qosConfig.id, 1)).limit(1)
					);
					if (!rows || rows.length === 0) return null;
					const row = rows[0];
					return {
						thresholds: JSON.parse(row.thresholds_json),
						groups: JSON.parse(row.groups_json),
						regions: JSON.parse(row.regions_json),
					} as QosConfig;
				}),

			saveQosConfig: (config: QosConfig) =>
				Effect.gen(function* () {
					const thresholds_json = JSON.stringify(config.thresholds);
					const groups_json = JSON.stringify(config.groups);
					const regions_json = JSON.stringify(config.regions);

					yield* Effect.promise(() =>
						db.insert(qosConfig)
							.values({ id: 1, thresholds_json, groups_json, regions_json })
							.onConflictDoUpdate({
								target: qosConfig.id,
								set: { thresholds_json, groups_json, regions_json },
							})
					);
				}),

			saveQosData: (data: { area: string; kpi_name: string; date: string; value: number }[]) =>
				Effect.gen(function* () {
					if (data.length === 0) return;
					for (let i = 0; i < data.length; i += CHUNK_SIZE) {
						const chunk = data.slice(i, i + CHUNK_SIZE);
						yield* Effect.promise(() =>
							db.insert(qosData).values(
								chunk.map((d) => ({
									area: d.area,
									kpi_name: d.kpi_name,
									date: new Date(d.date),
									value: d.value,
								}))
							)
						);
					}
				}),

			clearQosData: () =>
				Effect.promise(() => db.delete(qosData) as unknown as Promise<void>),
		};
	})
);
