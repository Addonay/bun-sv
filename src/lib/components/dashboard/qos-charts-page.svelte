<script lang="ts">
	import QosDashboard from "$lib/components/qos/qos-dashboard.svelte";
	import QosFileStep from "$lib/components/qos/qos-file-step.svelte";
	import QosGroupStep from "$lib/components/qos/qos-group-step.svelte";
	import QosThresholdStep from "$lib/components/qos/qos-threshold-step.svelte";
	import { setQosState } from "$lib/qos/qos-state.svelte";

	const qosState = setQosState();
</script>

{#if qosState.view === "splash"}
	<QosFileStep />
{:else if qosState.view === "thresholds"}
	<QosThresholdStep />
{:else if qosState.view === "grouping"}
	<QosGroupStep />
{:else}
	<QosDashboard />
{/if}
