import { readFile, writeFile } from "node:fs/promises";

async function main() {
    let sharedRpc = await readFile("src/shared/rpc.ts", "utf-8");
    if (sharedRpc.includes("fileName: string")) {
        sharedRpc = sharedRpc.replace(
            `export type QosConfig = {\n\tfileName: string;`,
            `export type QosConfig = {`
        );
        await writeFile("src/shared/rpc.ts", sharedRpc);
        console.log("Updated shared/rpc.ts");
    }

    let qosState = await readFile("src/lib/qos/qos-state.svelte.ts", "utf-8");
    qosState = qosState.replace(
        `fileName: this.fileName ?? "unknown",\n\t\t\tthresholds:`,
        `thresholds:`
    );
    await writeFile("src/lib/qos/qos-state.svelte.ts", qosState);
    console.log("Updated qos-state.svelte.ts");
}

main().catch(console.error);
