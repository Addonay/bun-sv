<script lang="ts">
	import {
		SidebarContent,
		SidebarFooter,
		SidebarGroup,
		SidebarGroupLabel,
		SidebarHeader,
		SidebarMenu,
		SidebarMenuButton,
		SidebarMenuItem,
		SidebarSeparator,
	} from "$lib/components/ui/sidebar/index.js";
	import Settings from "@lucide/svelte/icons/settings";

	let { routes, activeRoute, setRoute } = $props();
</script>

<SidebarHeader class="px-4 py-5">
	<div class="flex items-center gap-3">
		<div class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
			<span class="text-lg font-semibold">P</span>
		</div>
		<div>
			<p class="text-sm font-semibold">Prime Pay</p>
			<p class="text-xs text-muted-foreground">Finance App</p>
		</div>
	</div>
</SidebarHeader>

<SidebarContent class="px-2">
	<SidebarGroup>
		<SidebarGroupLabel>Menu</SidebarGroupLabel>
		<SidebarMenu>
			{#each routes as route}
				<SidebarMenuItem>
					<SidebarMenuButton
						isActive={activeRoute === route.id}
						onclick={() => setRoute(route.id)}
					>
						<route.icon />
						<span>{route.label}</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			{/each}
		</SidebarMenu>
	</SidebarGroup>

	<SidebarSeparator class="my-4" />
</SidebarContent>

<SidebarFooter class="p-3">
	<SidebarMenu>
		<SidebarMenuItem>
			<SidebarMenuButton>
				<Settings />
				<span>Settings</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	</SidebarMenu>
</SidebarFooter>
