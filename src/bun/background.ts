import { Effect, Schedule, Option, DateTime } from "effect";
import { clearQosData } from "./db";

// EAT is UTC+3. 00:00 EAT is 21:00 UTC.
export const runWipeTask = Effect.gen(function* () {
    console.log("Starting background task for QoS data wiping at 00:00 EAT (21:00 UTC)");
    
    // We can use a schedule that triggers every hour and checks if the current time is 00:00 EAT
    // But since it's just wiping, running a check every minute or hour is fine.
    // Let's create an effect that checks the time.
    const checkAndWipe = Effect.gen(function* () {
        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        
        // 00:00 EAT -> 21:00 UTC
        if (utcHours === 21 && utcMinutes === 0) {
            console.log("It's 00:00 EAT, wiping QoS data from duckdb...");
            yield* Effect.promise(() => clearQosData());
        }
    });

    const schedule = Schedule.fixed("1 minute");
    
    yield* Effect.repeat(checkAndWipe, schedule);
});
