<script lang="ts">
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';

	const client = SpacetimeDB.getContext();
</script>

<button onclick={() => client.reducers.debug()}>DEBUG</button>

<style lang="scss">
</style>
