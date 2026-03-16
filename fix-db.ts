import { readFile, writeFile } from "node:fs/promises";

async function main() {
    let dbTs = await readFile("src/bun/db.ts", "utf-8");
    dbTs = dbTs.replace(
        `const dbUrl = process.env.DATABASE_URL ?? process.env.DUCKDB_URL ?? "data/app.duckdb";`,
        `const dbUrl = ":memory:"; // User requested :memory: instead of a file`
    );
    await writeFile("src/bun/db.ts", dbTs);
    console.log("Updated db.ts to use :memory:");
}

main().catch(console.error);
