<script lang="ts">
	import Calendar from "@lucide/svelte/icons/calendar";
	import CircleCheck from "@lucide/svelte/icons/circle-check";
	import CircleX from "@lucide/svelte/icons/circle-x";
	import FolderOpen from "@lucide/svelte/icons/folder-open";
	import Info from "@lucide/svelte/icons/info";
	import MapPin from "@lucide/svelte/icons/map-pin";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
	import { SidebarTrigger } from "$lib/components/ui/sidebar/index.js";
	import { useQosState, formatFloat } from "$lib/qos/qos-state.svelte";
	import QosChart from "$lib/components/qos/kpi-chart.svelte";

	const qosState = useQosState();
	const stats = $derived(qosState.getStats());

	type KpiStatusFilter = "all" | "passing" | "failing" | "noThreshold";
	let statusFilter = $state<KpiStatusFilter>("all");

	const baseKpiNames = $derived.by(() => {
		if (!qosState.selectedGroupId) return qosState.kpiNames;
		const group = qosState.kpiGroups.find((g) => g.id === qosState.selectedGroupId);
		return group ? group.kpiNames : qosState.kpiNames;
	});

	const filteredKpiNames = $derived.by(() => {
		if (statusFilter === "all") return baseKpiNames;

		return baseKpiNames.filter((name) => {
			const latest = qosState.getLatestValue(name);
			const result = latest === null ? null : qosState.meetsThreshold(name, latest);
			if (statusFilter === "passing") return result === true;
			if (statusFilter === "failing") return result === false;
			return result === null;
		});
	});

	const filteredSectionTitle = $derived.by(() => {
		const selectedGroup = qosState.kpiGroups.find((g) => g.id === qosState.selectedGroupId);
		const groupLabel = selectedGroup ? ` - ${selectedGroup.name}` : "";

		switch (statusFilter) {
			case "passing":
				return `Passing KPIs${groupLabel}`;
			case "failing":
				return `Failing KPIs${groupLabel}`;
			case "noThreshold":
				return `KPIs Without Threshold${groupLabel}`;
			default:
				return selectedGroup?.name ?? "All KPIs";
		}
	});

	const visibleGroups = $derived.by(() => {
		if (!qosState.selectedGroupId) return qosState.kpiGroups;
		return qosState.kpiGroups.filter((g) => g.id === qosState.selectedGroupId);
	});

	const visibleGroupedKpis = $derived.by(() => {
		const set = new Set<string>();
		for (const group of visibleGroups) {
			for (const name of group.kpiNames) set.add(name);
		}
		return set;
	});

	const visibleUngroupedKpis = $derived.by(() => {
		if (qosState.selectedGroupId) return [];
		return qosState.kpiNames.filter((name) => !visibleGroupedKpis.has(name));
	});

	function toggleFilter(filter: Exclude<KpiStatusFilter, "all">) {
		statusFilter = statusFilter === filter ? "all" : filter;
	}

	function getStatus(name: string): { label: string; className: string } {
		const latest = qosState.getLatestValue(name);
		if (latest === null) {
			return { label: "No data", className: "text-muted-foreground" };
		}
		const result = qosState.meetsThreshold(name, latest);
		if (result === null) return { label: "No threshold", className: "text-muted-foreground" };
		if (result) return { label: "Passing", className: "text-emerald-600" };
		return { label: "Failing", className: "text-destructive" };
	}



	function selectArea(area: string) {
		qosState.selectedArea = area;
		qosState.selectedGroupId = null;
	}
</script>

<div class="flex flex-col gap-6 p-6 lg:p-8">
	<header class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<p class="text-sm text-muted-foreground">QoS Dashboard</p>
			<h1 class="text-2xl font-semibold tracking-tight">Charts & Thresholds</h1>
			<p class="text-sm text-muted-foreground">
				QoS Key Performance Indicators
			</p>
		</div>
		<div class="flex items-center gap-2">
			<SidebarTrigger class="md:hidden" />
			<Button variant="outline" size="sm" onclick={() => qosState.reset()}>
				Load New Data
			</Button>
		</div>
	</header>

	<Card.Root class="bg-white/70 backdrop-blur">
		<Card.Content class="space-y-4 pt-6">
			<div class="flex flex-wrap items-center gap-2">
				<div class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
					<MapPin class="h-3.5 w-3.5" />
					<span>Regions</span>
				</div>
				<div class="flex flex-wrap gap-2">
					{#each qosState.areaNames as area}
						<Button
							variant={qosState.selectedArea === area ? "default" : "outline"}
							size="sm"
							onclick={() => selectArea(area)}
						>
							{area}
						</Button>
					{/each}
				</div>
			</div>

			{#if qosState.kpiGroups.length > 0}
				<div class="flex flex-wrap items-center gap-2">
					<div class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
						<FolderOpen class="h-3.5 w-3.5" />
						<span>KPI Groups</span>
					</div>
					<div class="flex flex-wrap gap-2">
						<Button
							variant={qosState.selectedGroupId === null ? "default" : "outline"}
							size="sm"
							onclick={() => (qosState.selectedGroupId = null)}
						>
							All Groups
						</Button>
						{#each qosState.kpiGroups as group}
							<Button
								variant={qosState.selectedGroupId === group.id ? "default" : "outline"}
								size="sm"
								onclick={() => (qosState.selectedGroupId = group.id)}
							>
								{group.name}
							</Button>
						{/each}
					</div>
				</div>
			{/if}

			<div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
				<div class="flex items-center gap-2">
					<Calendar class="h-3.5 w-3.5" />
					<span>Last {qosState.globalDays} days</span>
				</div>
				<div class="flex items-center gap-1">
					{#each [7, 14, 30, 60, 90] as d}
						<button
							class="rounded-full px-2 py-0.5 text-[10px] transition-colors {qosState.globalDays ===
							d
								? 'bg-primary text-primary-foreground'
								: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
							onclick={() => (qosState.globalDays = d)}
						>
							{d}d
						</button>
					{/each}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="grid gap-4 md:grid-cols-3">
		<Card.Root class="bg-white/70 backdrop-blur">
			<Card.Content class="flex items-center justify-between py-4">
				<div>
					<p class="text-xs text-muted-foreground">Passing</p>
					<p class="text-lg font-semibold text-emerald-600">{stats.passing}</p>
				</div>
				<button
					class="rounded-full px-2 py-1 text-xs transition-colors {statusFilter === 'passing'
						? 'bg-emerald-500/15 text-emerald-600'
						: 'text-emerald-600 hover:bg-accent'}"
					onclick={() => toggleFilter("passing")}
				>
					<CircleCheck class="h-4 w-4" />
				</button>
			</Card.Content>
		</Card.Root>
		<Card.Root class="bg-white/70 backdrop-blur">
			<Card.Content class="flex items-center justify-between py-4">
				<div>
					<p class="text-xs text-muted-foreground">Failing</p>
					<p class="text-lg font-semibold text-destructive">{stats.failing}</p>
				</div>
				<button
					class="rounded-full px-2 py-1 text-xs transition-colors {statusFilter === 'failing'
						? 'bg-destructive/15 text-destructive'
						: 'text-destructive hover:bg-accent'}"
					onclick={() => toggleFilter("failing")}
				>
					<CircleX class="h-4 w-4" />
				</button>
			</Card.Content>
		</Card.Root>
		<Card.Root class="bg-white/70 backdrop-blur">
			<Card.Content class="flex items-center justify-between py-4">
				<div>
					<p class="text-xs text-muted-foreground">No Threshold</p>
					<p class="text-lg font-semibold text-muted-foreground">{stats.noThreshold}</p>
				</div>
				<button
					class="rounded-full px-2 py-1 text-xs transition-colors {statusFilter === 'noThreshold'
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
					onclick={() => toggleFilter("noThreshold")}
				>
					<Info class="h-4 w-4" />
				</button>
			</Card.Content>
		</Card.Root>
	</div>

	<main class="space-y-6">
		{#if qosState.data.size === 0}
			<Card.Root class="bg-white/70 backdrop-blur">
				<Card.Content class="py-12 text-center text-sm text-muted-foreground">
					No data loaded yet.
				</Card.Content>
			</Card.Root>
		{:else if statusFilter !== "all"}
			<h2 class="text-sm font-semibold text-muted-foreground">{filteredSectionTitle}</h2>
			{#if filteredKpiNames.length > 0}
				<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{#each filteredKpiNames as name}
						{@const values = qosState.getFilteredValues(name)}
						{@const status = getStatus(name)}
						{@const latest = qosState.getLatestValue(name)}
						<QosChart name={name} status={status} values={values} latest={latest} />
					{/each}
				</div>
			{:else}
				<Card.Root class="bg-white/70 backdrop-blur">
					<Card.Content class="py-12 text-center text-sm text-muted-foreground">
						No KPIs match this filter.
					</Card.Content>
				</Card.Root>
			{/if}
		{:else}
			{#each visibleGroups as group (group.id)}
				<div class="space-y-3">
					<h2 class="text-sm font-semibold text-muted-foreground">{group.name}</h2>
					<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{#each group.kpiNames as name}
							{@const values = qosState.getFilteredValues(name)}
							{@const status = getStatus(name)}
							{@const latest = qosState.getLatestValue(name)}
							<QosChart {name} {status} {values} {latest} />
						{/each}
					</div>
				</div>
			{/each}

			{#if visibleUngroupedKpis.length > 0}
				<div class="space-y-3">
					<h2 class="text-sm font-semibold text-muted-foreground">
						{visibleGroups.length > 0 ? "Other KPIs" : "All KPIs"}
					</h2>
					<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{#each visibleUngroupedKpis as name}
							{@const values = qosState.getFilteredValues(name)}
							{@const status = getStatus(name)}
							{@const latest = qosState.getLatestValue(name)}
							<QosChart {name} {status} {values} {latest} />
						{/each}
					</div>
				</div>
			{:else if visibleGroups.length === 0}
				<Card.Root class="bg-white/70 backdrop-blur">
					<Card.Content class="py-12 text-center text-sm text-muted-foreground">
						No KPIs available.
					</Card.Content>
				</Card.Root>
			{/if}
		{/if}
	</main>
</div>
