<script lang="ts">
	import { SpacetimeDB } from 'spacetimedb-runes';

	const client = SpacetimeDB.getContext();
</script>

<button onclick={() => client.reducers.debug()}>DEBUG</button>

<style lang="scss">
</style>
