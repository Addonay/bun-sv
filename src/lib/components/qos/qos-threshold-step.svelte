<script lang="ts">
	import CircleCheck from "@lucide/svelte/icons/circle-check";
	import Settings2 from "@lucide/svelte/icons/settings-2";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import * as NativeSelect from "$lib/components/ui/native-select/index.js";
	import { useQosState, OPERATORS, formatFloat } from "$lib/qos/qos-state.svelte";
	import type { Operator } from "$lib/qos/qos-state.svelte";
	import { SvelteMap } from "svelte/reactivity";

	const qosState = useQosState();

	let editableThresholds = $state<{ name: string; operator: Operator; value: string }[]>([]);
	let bulkOperator = $state<Operator>(">=");
	let bulkValue = $state<string | number>("");

	$effect(() => {
		if (qosState.kpiNames.length > 0 && editableThresholds.length === 0) {
			editableThresholds = qosState.kpiNames.map((name) => {
				const existing = qosState.thresholds.get(name);
				return {
					name,
					operator: existing?.operator ?? ">=",
					value: existing?.value !== undefined ? formatFloat(existing.value) : "",
				};
			});
		}
	});

	function applyThresholds() {
		const next = new SvelteMap(qosState.thresholds);
		let validCount = 0;

		for (const item of editableThresholds) {
			const val = parseFloat(item.value);
			if (!isNaN(val)) {
				next.set(item.name, { operator: item.operator, value: val });
				validCount += 1;
			}
		}

		qosState.thresholds = next;
		qosState.thresholdsConfigured = true;
		return validCount;
	}

	function proceedToGrouping() {
		applyThresholds();
		qosState.view = "grouping";
	}

	function applyBulk() {
		const val = String(bulkValue).trim();
		if (!val || isNaN(parseFloat(val))) return;
		editableThresholds = editableThresholds.map((t) => ({
			...t,
			operator: bulkOperator,
			value: val,
		}));
	}
</script>

<div class="flex min-h-[calc(100svh-6rem)] flex-col items-center bg-background px-6 py-8">
	<div class="w-full max-w-4xl space-y-6">
		<div class="space-y-2">
			<div class="flex items-center gap-2">
				<Settings2 class="h-6 w-6 text-primary" />
				<h1 class="text-xl font-semibold">Configure Thresholds</h1>
			</div>
			<p class="text-sm text-muted-foreground">
				Set a threshold for each KPI. Charts where the latest value does not meet the threshold
				will be highlighted.
			</p>
		</div>

		<div class="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
			<div class="space-y-1">
				<label for="bulk-op" class="text-xs text-muted-foreground">Bulk operator</label>
				<NativeSelect.Root id="bulk-op" bind:value={bulkOperator} class="w-24">
					{#each OPERATORS as op}
						<NativeSelect.Option value={op.value}>{op.label}</NativeSelect.Option>
					{/each}
				</NativeSelect.Root>
			</div>
			<div class="flex-1 space-y-1">
				<label for="bulk-val" class="text-xs text-muted-foreground">Bulk value</label>
				<Input
					id="bulk-val"
					type="number"
					step="any"
					bind:value={bulkValue}
					placeholder="e.g. 99.5"
				/>
			</div>
			<Button variant="secondary" size="sm" onclick={applyBulk}>Apply to all</Button>
		</div>

		<div class="rounded-lg border border-border bg-card">
			<div class="grid grid-cols-[1fr_110px_160px] gap-2 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
				<span>KPI Name</span>
				<span>Operator</span>
				<span>Threshold Value</span>
			</div>
			<div class="max-h-[60vh] overflow-y-auto">
				{#each editableThresholds as item, i}
					<div
						class="grid grid-cols-[1fr_110px_160px] items-center gap-2 border-b border-border/50 px-4 py-2 text-sm last:border-b-0 {i %
							2 ===
						0
							? ''
							: 'bg-muted/30'}"
					>
						<span class="truncate text-sm text-foreground" title={item.name}>{item.name}</span>
						<NativeSelect.Root bind:value={item.operator} class="h-8 text-xs">
							{#each OPERATORS as op}
								<NativeSelect.Option value={op.value}>{op.label}</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
						<Input
							type="number"
							step="any"
							bind:value={item.value}
							placeholder="0"
							class="h-8 text-xs"
						/>
					</div>
				{/each}
			</div>
		</div>

		<div class="flex items-center justify-between">
			<Button variant="outline" onclick={() => (qosState.view = "splash")}>Back</Button>
			<div class="flex gap-2">
				<Button variant="secondary" onclick={applyThresholds}>Save Thresholds</Button>
				<Button onclick={proceedToGrouping}>
					<CircleCheck class="mr-2 h-4 w-4" />
					Continue
				</Button>
			</div>
		</div>
	</div>
</div>
