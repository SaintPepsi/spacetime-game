<script lang="ts">
	import { eq, TableQuery, where } from '$lib/runes/SpacetimeTable.svelte';
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';

	const client = SpacetimeDB.getContext();

	let status = SpacetimeDB.status;
	const userData = new TableQuery('user', where(eq('online', true)));

	let onlinePlayerCount = $derived(userData.rows.length);
</script>

<div class="TotalOnlinePlayers">
	IsActive: {client.isActive} | Status: {$status} | Online players: {onlinePlayerCount}
</div>

{#each userData.rows as user (user.identity.toHexString())}
	<div class="player">
		{user.identity} - {user.name} - Player ID: {user.playerId} - online: {user.online}
	</div>
{/each}

<style lang="scss">
</style>
