<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from "$lib/components/ui/card/index.js";
	import { Skeleton } from "$lib/components/ui/skeleton/index.js";
	import { SidebarTrigger } from "$lib/components/ui/sidebar/index.js";

	const statPlaceholders = Array.from({ length: 4 });
	const listPlaceholders = Array.from({ length: 3 });
	const rowPlaceholders = Array.from({ length: 4 });
</script>

<div class="flex flex-col gap-6 p-6 lg:p-8">
	<header class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<p class="text-sm text-muted-foreground">Finance overview</p>
			<h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
			<p class="text-sm text-muted-foreground">Skeleton view</p>
		</div>
		<div class="flex items-center gap-2">
			<SidebarTrigger class="md:hidden" />
			<Skeleton class="h-9 w-64 rounded-full" />
		</div>
	</header>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		{#each statPlaceholders as _}
			<Card class="bg-white/70 backdrop-blur">
				<CardHeader class="pb-2">
					<Skeleton class="h-4 w-24" />
				</CardHeader>
				<CardContent>
					<Skeleton class="h-7 w-28" />
					<Skeleton class="mt-3 h-3 w-36" />
				</CardContent>
			</Card>
		{/each}
	</div>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
		<Card class="bg-white/70 backdrop-blur">
			<CardHeader>
				<CardTitle>Monitoring Overview</CardTitle>
				<CardDescription>Skeleton chart</CardDescription>
			</CardHeader>
			<CardContent>
				<Skeleton class="h-56 w-full rounded-xl" />
			</CardContent>
		</Card>

		<Card class="bg-white/70 backdrop-blur">
			<CardHeader>
				<CardTitle>My Cards</CardTitle>
				<CardDescription>Skeleton list</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				{#each listPlaceholders as _}
					<Skeleton class="h-20 w-full rounded-xl" />
				{/each}
			</CardContent>
		</Card>
	</div>

	<Card class="bg-white/70 backdrop-blur">
		<CardHeader>
			<CardTitle>Recent Transactions</CardTitle>
			<CardDescription>Skeleton table</CardDescription>
		</CardHeader>
		<CardContent class="space-y-3">
			{#each rowPlaceholders as _}
				<Skeleton class="h-12 w-full rounded-lg" />
			{/each}
		</CardContent>
	</Card>
</div>
