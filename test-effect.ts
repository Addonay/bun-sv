import { Effect } from "effect";

const task = Effect.succeed(1);
Effect.runPromise(task).then(console.log);
