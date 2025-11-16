<script lang="ts">
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';
	import type { DbConnection } from '@module_bindings';
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
		connection: DbConnection;
	};
	let { children, connection }: Props = $props();

	SpacetimeDB.setContext(connection);
</script>

{@render children()}
