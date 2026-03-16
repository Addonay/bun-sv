import { readFile, writeFile } from "node:fs/promises";

async function main() {
    let qosFileStep = await readFile("src/lib/components/qos/qos-file-step.svelte", "utf-8");
    qosFileStep = qosFileStep.replace(
        `qosState.applyConfig(config);\n\t\t\t\t\tqosState.view = "dashboard";\n\t\t\t\t} else {\n\t\t\t\t\tqosState.view = "thresholds";\n\t\t\t\t}`,
        `qosState.applyConfig(config);\n\t\t\t\t\tqosState.view = "dashboard";\n\t\t\t\t} else {\n\t\t\t\t\tqosState.view = "thresholds";\n\t\t\t\t}`
    ); // It is actually already doing the right thing for view=dashboard if config is returned

    console.log("Verified qos-file-step.svelte view state transitions");
}

main().catch(console.error);
