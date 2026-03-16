import { readFile, writeFile } from "node:fs/promises";

async function main() {
    let index = await readFile("src/bun/index.ts", "utf-8");
    if (!index.includes("runWipeTask")) {
        index = index.replace(
            `import { getQosConfig, saveQosConfig } from "./db";`,
            `import { getQosConfig, saveQosConfig } from "./db";\nimport { runWipeTask } from "./background";\nimport { Effect } from "effect";`
        );
        index += `\n\n// Start background wipe task\nEffect.runFork(runWipeTask);\n`;
        await writeFile("src/bun/index.ts", index);
        console.log("Updated index.ts");
    }

    let sharedRpc = await readFile("src/shared/rpc.ts", "utf-8");
    if (!sharedRpc.includes("getQosConfig: {")) {
        // Nothing
    } else {
        sharedRpc = sharedRpc.replace(
            `params: { fileName: string };`,
            `params: {}; // global config no longer needs fileName`
        );
        await writeFile("src/shared/rpc.ts", sharedRpc);
        console.log("Updated shared/rpc.ts");
    }

    let qosFileStep = await readFile("src/lib/components/qos/qos-file-step.svelte", "utf-8");
    qosFileStep = qosFileStep.replace(`const { config } = await bunRpc.request.getQosConfig({ fileName: file.name });`, `const { config } = await bunRpc.request.getQosConfig({});`);
    await writeFile("src/lib/components/qos/qos-file-step.svelte", qosFileStep);

    let indexTs = await readFile("src/bun/index.ts", "utf-8");
    indexTs = indexTs.replace(`getQosConfig: async ({ fileName }: { fileName: string }) => ({
		config: await getQosConfig(fileName),
	}),`, `getQosConfig: async () => ({
		config: await getQosConfig(),
	}),`);
    await writeFile("src/bun/index.ts", indexTs);
}

main().catch(console.error);
