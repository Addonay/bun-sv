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
</script>

<div class="flex flex-col gap-6 p-6 lg:p-8">
	<header class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<p class="text-sm text-muted-foreground">Exports</p>
			<h1 class="text-2xl font-semibold tracking-tight">KML Generation</h1>
			<p class="text-sm text-muted-foreground">Skeleton view</p>
		</div>
		<div class="flex items-center gap-2">
			<SidebarTrigger class="md:hidden" />
			<Skeleton class="h-9 w-40 rounded-full" />
		</div>
	</header>

	<Card class="bg-white/70 backdrop-blur">
		<CardHeader>
			<CardTitle>Generation Settings</CardTitle>
			<CardDescription>Placeholder form</CardDescription>
		</CardHeader>
		<CardContent class="grid gap-4 lg:grid-cols-2">
			<Skeleton class="h-10 w-full rounded-lg" />
			<Skeleton class="h-10 w-full rounded-lg" />
			<Skeleton class="h-10 w-full rounded-lg" />
			<Skeleton class="h-10 w-full rounded-lg" />
			<Skeleton class="h-32 w-full rounded-lg lg:col-span-2" />
		</CardContent>
	</Card>

	<Card class="bg-white/70 backdrop-blur">
		<CardHeader>
			<CardTitle>Output Preview</CardTitle>
			<CardDescription>Placeholder panel</CardDescription>
		</CardHeader>
		<CardContent>
			<Skeleton class="h-48 w-full rounded-xl" />
		</CardContent>
	</Card>
</div>
