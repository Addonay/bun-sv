import { Effect, Schedule } from 'effect';
import { DbService } from './services/db-service';

// EAT is UTC+3. 00:00 EAT = 21:00 UTC.
export const runWipeTask = Effect.gen(function* () {
	const dbService = yield* DbService;

	const checkAndWipe = Effect.gen(function* () {
		const now = new Date();
		if (now.getUTCHours() === 21 && now.getUTCMinutes() === 0) {
			console.log('[background] 00:00 EAT — wiping QoS data');
			yield* dbService.clearQosData();
		}
	});

	yield* Effect.repeat(checkAndWipe, Schedule.fixed('1 minute'));
});
