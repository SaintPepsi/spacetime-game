<script lang="ts">
	import { SpacetimeDB, TableQuery } from 'spacetimedb-runes';

	const client = SpacetimeDB.getContext();

	let status = SpacetimeDB.status;
	const userData = new TableQuery('player');

	let onlinePlayerCount = $derived(userData.rows.length);
</script>

<div class="TotalOnlinePlayers">
	IsActive: {client.isActive} | Status: {$status} | Online players: {onlinePlayerCount}
</div>

{#each userData.rows as user (user.identity.toHexString())}
	<div class="player">
		{user.identity} - {user.name} - {user.color} - Player ID: {user.playerId}
	</div>
{/each}

<style lang="scss">
</style>
