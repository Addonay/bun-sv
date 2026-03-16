<script lang="ts">
	import ChevronRight from "@lucide/svelte/icons/chevron-right";
	import CircleArrowRight from "@lucide/svelte/icons/circle-arrow-right";
	import CircleCheck from "@lucide/svelte/icons/circle-check";
	import Layers from "@lucide/svelte/icons/layers";
	import X from "@lucide/svelte/icons/x";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { useQosState } from "$lib/qos/qos-state.svelte";
	import { bunRpc } from "$lib/rpc";

	const qosState = useQosState();

	let groupName = $state("");
	let selectedKpis = $state<Set<string>>(new Set());
	let showNameInput = $state(false);
	let nameInputEl: HTMLInputElement | null = $state(null);
	let saving = $state(false);
	let errorMessage = $state("");

	function toggleKpi(name: string) {
		const next = new Set(selectedKpis);
		if (next.has(name)) next.delete(name);
		else next.add(name);
		selectedKpis = next;

		if (next.size > 0 && !showNameInput) {
			showNameInput = true;
			requestAnimationFrame(() => nameInputEl?.focus());
		}
		if (next.size === 0) {
			showNameInput = false;
			groupName = "";
		}
	}

	function confirmGroup() {
		if (!groupName.trim()) {
			errorMessage = "Please enter a group name.";
			return;
		}
		if (selectedKpis.size === 0) {
			errorMessage = "Please select at least one KPI.";
			return;
		}

		qosState.addGroup(groupName.trim(), [...selectedKpis]);
		groupName = "";
		selectedKpis = new Set();
		showNameInput = false;
		errorMessage = "";
	}

	function cancelGroup() {
		groupName = "";
		selectedKpis = new Set();
		showNameInput = false;
	}

	function removeGroup(id: string) {
		qosState.removeGroup(id);
	}

	function getGroupFor(kpiName: string): string | null {
		for (const group of qosState.kpiGroups) {
			if (group.kpiNames.includes(kpiName)) return group.name;
		}
		return null;
	}

	async function persistAndContinue() {
		if (!qosState.fileName) {
			errorMessage = "No file loaded.";
			return;
		}
		saving = true;
		errorMessage = "";
		try {
			await bunRpc.request.saveQosConfig(qosState.serializeConfig());
			qosState.view = "dashboard";
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : "Failed to save configuration.";
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex min-h-[calc(100svh-6rem)] flex-col items-center bg-background px-6 py-8">
	<div class="w-full max-w-3xl space-y-6">
		<div class="space-y-2">
			<div class="flex items-center gap-2">
				<Layers class="h-6 w-6 text-primary" />
				<h1 class="text-xl font-semibold">Organize KPI Groups</h1>
			</div>
			<p class="text-sm text-muted-foreground">
				Select KPIs to organize them into named groups. Groups will be displayed as sections on the
				dashboard.
			</p>
		</div>

		{#if qosState.kpiGroups.length > 0}
			<div class="space-y-2">
				<h3 class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
					Created Groups
				</h3>
				<div class="space-y-1.5">
					{#each qosState.kpiGroups as group (group.id)}
						<div class="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
							<div class="flex items-center gap-2">
								<span class="text-sm font-medium text-foreground">{group.name}</span>
								<span class="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
									{group.kpiNames.length} KPIs
								</span>
							</div>
							<button
								onclick={() => removeGroup(group.id)}
								class="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
								title="Remove group"
							>
								<X class="h-3.5 w-3.5" />
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if showNameInput}
			<div class="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
				<Input
					bind:ref={nameInputEl}
					bind:value={groupName}
					placeholder="Group name (e.g. Voice, Data, LTE...)"
					class="h-8 flex-1 text-sm"
					onkeydown={(e) => {
						if (e.key === "Enter" && groupName.trim() && selectedKpis.size > 0) confirmGroup();
					}}
				/>
				<span class="shrink-0 text-xs text-muted-foreground">{selectedKpis.size} selected</span>
				<Button
					size="sm"
					onclick={confirmGroup}
					disabled={!groupName.trim() || selectedKpis.size === 0}
				>
					<CircleCheck class="mr-1 h-3.5 w-3.5" />
					Create
				</Button>
				<Button size="sm" variant="ghost" onclick={cancelGroup}>
					<X class="h-3.5 w-3.5" />
				</Button>
			</div>
		{/if}

		<div class="rounded-lg border border-border bg-card">
			<div class="border-b border-border px-4 py-2">
				<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
					All KPIs ({qosState.kpiNames.length})
				</span>
			</div>
			<div class="max-h-[55vh] overflow-y-auto">
				{#each qosState.kpiNames as name, i (name)}
					{@const groupedIn = getGroupFor(name)}
					{@const isSelected = selectedKpis.has(name)}
					{@const isGrouped = groupedIn !== null}
					<button
						class="flex w-full items-center gap-3 border-b border-border/50 px-4 py-2.5 text-left transition-colors last:border-b-0
							{isSelected
							? 'bg-primary/10'
							: isGrouped
								? 'opacity-50'
								: i % 2 === 0
									? 'hover:bg-accent/50'
									: 'bg-muted/20 hover:bg-accent/50'}"
						onclick={() => !isGrouped && toggleKpi(name)}
						disabled={isGrouped}
					>
						<div
							class="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors
								{isSelected ? 'border-primary bg-primary' : 'border-border'}"
						>
							{#if isSelected}
								<CircleCheck class="h-3 w-3 text-primary-foreground" />
							{/if}
						</div>

						<span
							class="flex-1 text-sm {isGrouped
								? 'text-muted-foreground line-through'
								: 'text-foreground'}"
						>
							{name}
						</span>

						{#if isGrouped}
							<span class="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
								{groupedIn}
							</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		{#if errorMessage}
			<div class="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
				{errorMessage}
			</div>
		{/if}

		<div class="flex items-center justify-between">
			<Button variant="outline" onclick={() => (qosState.view = "thresholds")}>Back</Button>
			<div class="flex gap-2">
				<Button variant="ghost" onclick={persistAndContinue} disabled={saving}>
					Skip
					<ChevronRight class="ml-1 h-3.5 w-3.5" />
				</Button>
				<Button onclick={persistAndContinue} disabled={saving}>
					<CircleArrowRight class="mr-2 h-4 w-4" />
					{saving ? "Saving..." : "Finish"}
				</Button>
			</div>
		</div>
	</div>
</div>
