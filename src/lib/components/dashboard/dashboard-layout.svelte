<script lang="ts">
	import { onMount } from "svelte";
	import { Sidebar, SidebarInset, SidebarProvider } from "$lib/components/ui/sidebar/index.js";
	import DashboardSidebar from "./dashboard-sidebar.svelte";
	import DashboardPage from "./dashboard-page.svelte";
	import KmlGenerationPage from "./kml-generation-page.svelte";
	import QosChartsPage from "./qos-charts-page.svelte";
	import ChartArea from "@lucide/svelte/icons/chart-area";
	import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
	import Map from "@lucide/svelte/icons/map";
    import { SvelteSet } from "svelte/reactivity";

	const routes = [
		{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
		{ id: "qos-charts", label: "QoS Charts", icon: ChartArea },
		{ id: "kml-generation", label: "KML Generation", icon: Map },
	];

	const routeSet = new SvelteSet(routes.map((route) => route.id));
	let activeRoute = $state("dashboard");

	const normalizeRoute = (hash: string) => {
		const trimmed = hash.replace(/^#\/?/, "");
		return routeSet.has(trimmed) ? trimmed : "dashboard";
	};

	const setRoute = (id: string) => {
		activeRoute = id;
		if (typeof window !== "undefined") {
			window.location.hash = `/${id}`;
		}
	};

	onMount(() => {
		const syncRoute = () => {
			activeRoute = normalizeRoute(window.location.hash);
		};

		syncRoute();
		window.addEventListener("hashchange", syncRoute);

		return () => window.removeEventListener("hashchange", syncRoute);
	});
</script>

<SidebarProvider>
	<div class="relative h-screen w-full overflow-hidden bg-slate-50">
		<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(14,116,144,0.12),transparent_45%),radial-gradient(circle_at_90%_10%,rgba(30,64,175,0.12),transparent_40%),radial-gradient(circle_at_50%_90%,rgba(15,118,110,0.08),transparent_45%)]"></div>

		<div class="relative flex h-screen w-full">
			<Sidebar
				collapsible="offcanvas"
				variant="sidebar"
				class="h-screen border-r/70 bg-white/80 backdrop-blur"
			>
				<DashboardSidebar {routes} {activeRoute} {setRoute} />
			</Sidebar>

			<SidebarInset class="w-full overflow-y-auto">
				{#if activeRoute === "dashboard"}
					<DashboardPage />
				{:else if activeRoute === "qos-charts"}
					<QosChartsPage />
				{:else}
					<KmlGenerationPage />
				{/if}
			</SidebarInset>
		</div>
	</div>
</SidebarProvider>
