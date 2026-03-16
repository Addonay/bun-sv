<script lang="ts">
	import { useQosState, formatFloat } from "$lib/qos/qos-state.svelte";
	import * as Card from "$lib/components/ui/card/index.js";
	
	import { Chart, Svg, Axis, Highlight, Rule, Spline } from "layerchart";
	import { ChartContainer, ChartTooltip } from "$lib/components/ui/chart/index.js";
	import type { KpiDataPoint } from "$lib/qos/qos-state.svelte";

	let { name, status, values, latest } = $props<{
		name: string;
		status: { label: string; className: string };
		values: KpiDataPoint[];
		latest: number | null;
	}>();

	const qosState = useQosState();

	const threshold = $derived(qosState.thresholds.get(name));
	const hasThreshold = $derived(!!threshold);
	const minVal = $derived(values.length > 0 ? Math.min(...values.map((v: KpiDataPoint) => v.value)) : 0);
	const maxVal = $derived(values.length > 0 ? Math.max(...values.map((v: KpiDataPoint) => v.value)) : 100);
	
	const valRange = $derived(maxVal - minVal || 1);
	const yDomain = $derived([Math.max(0, minVal - valRange * 0.1), maxVal + valRange * 0.1]);

	const isFailing = $derived(status.label === "Failing");
	const isPassing = $derived(status.label === "Passing");

	const config = $derived({
		value: { 
			label: name, 
			color: isFailing ? "hsl(var(--destructive))" : "hsl(var(--primary))" 
		}
	});

	function formatDate(d: Date) {
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}
</script>

<Card.Root class="group/chart relative flex flex-col bg-card transition-all duration-200 hover:border-primary/40 hover:shadow-sm {isFailing ? 'bg-destructive/5 border-destructive/20' : ''}">
	<Card.Content class="space-y-4 py-4 flex flex-col h-full">
		<div class="flex items-start justify-between">
			<div class="flex min-w-0 flex-1 flex-col gap-1 pr-4">
				<div class="flex items-center gap-2">
					{#if isPassing}
						<span class="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
					{:else if isFailing}
						<span class="h-2 w-2 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse"></span>
					{:else}
						<span class="h-2 w-2 rounded-full bg-muted-foreground/30"></span>
					{/if}
					<h3 class="min-w-0 break-all text-xs font-semibold tracking-wide uppercase leading-tight {isFailing ? 'text-destructive' : 'text-foreground'}" title={name}>
						{name}
					</h3>
				</div>
				<p class="text-[10px] text-muted-foreground ml-4">
					{hasThreshold
						? `${name} ${threshold?.operator} ${formatFloat(threshold?.value ?? 0)}`
						: "No threshold"}
				</p>
			</div>

			{#if latest !== null}
				<span class="shrink-0 rounded-sm px-1.5 py-0.5 text-xs font-bold {isFailing ? 'bg-destructive/15 text-destructive' : 'bg-primary/10 text-primary'}">
					{formatFloat(latest)}
				</span>
			{/if}
		</div>

		<div class="h-40 w-full mt-2 -mx-2">
			{#if values.length > 0}
				<ChartContainer {config} class="h-full w-full">
					<Chart
						data={values}
						x="date"
						y="value"
						yDomain={yDomain}
						padding={{ top: 10, bottom: 20, left: 30, right: 10 }}
						tooltip={{ mode: 'bisect-x' }}
					>
						<Svg>
							<Axis placement="left" grid rule={{ class: "stroke-border/50" }} format={(d) => formatFloat(d)} tickLabelProps={{ class: "fill-muted-foreground text-[9px]", dx: -4 }} />
							<Axis placement="bottom" format={(d) => formatDate(d)} tickLabelProps={{ class: "fill-muted-foreground text-[9px]", dy: 4 }} />
							
							{#if hasThreshold && threshold}
								<Rule y={threshold.value} class="stroke-muted-foreground/50" stroke-dasharray="4" strokeWidth={1.5} />
							{/if}
							
							<Spline stroke="var(--color-value)" strokeWidth={2} />
							<Highlight points lines={{ stroke: "var(--color-value)", strokeWidth: 1 }} />
						</Svg>
						<ChartTooltip />
					</Chart>
				</ChartContainer>
			{:else}
				<div class="flex h-full items-center justify-center text-xs text-muted-foreground">
					No data
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
