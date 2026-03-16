import { readFile, writeFile } from "node:fs/promises";

async function main() {
    let qosDashboard = await readFile("src/lib/components/qos/qos-dashboard.svelte", "utf-8");
    qosDashboard = qosDashboard.replace(
        `{qosState.fileName ? \`Report: \${qosState.fileName}\` : "Report loaded"}`,
        `QoS Key Performance Indicators`
    );
    qosDashboard = qosDashboard.replace(
        `New File`,
        `Load New Data`
    );
    await writeFile("src/lib/components/qos/qos-dashboard.svelte", qosDashboard);
    
    let qosFileStep = await readFile("src/lib/components/qos/qos-file-step.svelte", "utf-8");
    qosFileStep = qosFileStep.replace(
        `<h1 class="text-2xl font-semibold tracking-tight">QoS Charts</h1>`,
        `<h1 class="text-2xl font-semibold tracking-tight">Load QoS Data</h1>`
    );
    qosFileStep = qosFileStep.replace(
        `<p class="text-sm text-muted-foreground">\n\t\t\t\tUpload a KPI report to configure thresholds, groups, and charts.\n\t\t\t</p>`,
        `<p class="text-sm text-muted-foreground">\n\t\t\t\tUpload a KPI report to analyze data in DuckDB.\n\t\t\t</p>`
    );
    
    await writeFile("src/lib/components/qos/qos-file-step.svelte", qosFileStep);
    console.log("Updated UI wording");
}

main().catch(console.error);
