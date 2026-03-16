<script lang="ts">
	import CloudUpload from "@lucide/svelte/icons/cloud-upload";
	import FileSpreadsheet from "@lucide/svelte/icons/file-spreadsheet";
	import LoaderCircle from "@lucide/svelte/icons/loader-circle";
	import * as Card from "$lib/components/ui/card/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import { parseExcelBuffer } from "$lib/qos/excel-parser";
	import { useQosState } from "$lib/qos/qos-state.svelte";
	import { bunRpc, rpcReady } from "$lib/rpc";

	const qosState = useQosState();

	let loading = $state(false);
	let dragOver = $state(false);
	let errorMessage = $state("");
	let fileInput: HTMLInputElement | undefined = $state();

	async function handleFile(file: File) {
		if (!file) return;
		errorMessage = "";

		const validTypes = [
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"application/vnd.ms-excel",
			"text/csv",
		];
		const validExtensions = [".xlsx", ".xls", ".csv"];
		const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

		if (!validTypes.includes(file.type) && !hasValidExt) {
			errorMessage = "Please upload a valid Excel file (.xlsx, .xls, .csv).";
			return;
		}

		loading = true;
		try {
			const buffer = await file.arrayBuffer();
			const result = await parseExcelBuffer(buffer);
			if (result.areas.size === 0) {
				errorMessage = "No valid data found in the spreadsheet.";
				return;
			}

			qosState.reset();
			qosState.loadData(result, file.name);

			if (rpcReady) {
				const { config } = await bunRpc.request.getQosConfig({});
				if (config) {
					qosState.applyConfig(config);
					qosState.view = "dashboard";
				} else {
					qosState.view = "thresholds";
				}
			} else {
				qosState.view = "thresholds";
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : "Failed to parse file.";
			qosState.view = "thresholds";
		} finally {
			loading = false;
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) handleFile(file);
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function onDragLeave() {
		dragOver = false;
	}

	function onFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) handleFile(file);
	}
</script>

<div class="flex min-h-[calc(100svh-6rem)] items-center justify-center p-6">
	<div class="w-full max-w-xl space-y-6">
		<div class="space-y-2 text-center">
			<div class="flex items-center justify-center gap-2">
				<FileSpreadsheet class="h-8 w-8 text-primary" />
				<h1 class="text-2xl font-semibold tracking-tight">Load QoS Data</h1>
			</div>
			<p class="text-sm text-muted-foreground">
				Upload a KPI report to analyze data in DuckDB.
			</p>
		</div>

		<Card.Root>
			<Card.Content class="space-y-4 pt-6">
				<div
					class="relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-colors {dragOver
						? 'border-primary bg-primary/5'
						: 'border-border hover:border-muted-foreground/50'}"
					ondrop={onDrop}
					ondragover={onDragOver}
					ondragleave={onDragLeave}
					onclick={() => fileInput?.click()}
					role="button"
					tabindex="0"
					onkeydown={(e) => {
						if (e.key === "Enter" || e.key === " ") fileInput?.click();
					}}
				>
					{#if loading}
						<LoaderCircle class="h-10 w-10 animate-spin text-primary" />
						<p class="text-sm text-muted-foreground">Processing...</p>
					{:else}
						<CloudUpload class="h-10 w-10 {dragOver ? 'text-primary' : 'text-muted-foreground'}" />
						<div class="space-y-1 text-center">
							<p class="text-sm font-medium text-foreground">Drop your spreadsheet here</p>
							<p class="text-xs text-muted-foreground">or click to browse</p>
						</div>
						<p class="text-xs text-muted-foreground/60">.xlsx, .xls, .csv</p>
					{/if}

					<input
						bind:this={fileInput}
						type="file"
						accept=".xlsx,.xls,.csv"
						class="hidden"
						onchange={onFileSelect}
					/>
				</div>

				<div class="flex items-center gap-3">
					<Separator class="flex-1" />
					<span class="text-xs text-muted-foreground">LOCAL FILE</span>
					<Separator class="flex-1" />
				</div>

				<div class="space-y-2">
					<label for="qos-file-name" class="text-xs text-muted-foreground">File name</label>
					<Input id="qos-file-name" placeholder="Select a report file above" disabled />
				</div>
			</Card.Content>
		</Card.Root>

		{#if errorMessage}
			<div class="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
				{errorMessage}
			</div>
		{/if}

		<div class="text-center text-xs text-muted-foreground/60">
			Single sheet with areas separated by empty rows. First area uses the sheet name.
		</div>
	</div>
</div>
