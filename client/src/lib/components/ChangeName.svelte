<script lang="ts">
	import { SpacetimeDB, TableQuery } from 'spacetimedb-runes';

	const client = SpacetimeDB.getContext();

	let name = $state('');

	const userData = new TableQuery('player');

	let user = $derived(
		userData.rows.find((u) => u.identity.toHexString() === client.identity?.toHexString())
	);
</script>

{#if userData.state === 'loading'}
	<p>Loading...</p>
{:else if userData.rows.length === 0}
	<p>No user found.</p>
{:else if user}
	<p>
		Your current name is:
		{#if user.name}
			<strong>{user.name}</strong>
		{:else}
			<em>(not set)</em>
		{/if}
	</p>
{:else}
	<p>No user data available.</p>
{/if}

<form
	onsubmit={(e) => {
		e.preventDefault();
		client.reducers.setName(name);
	}}
>
	<label for="name">Change your name:</label>
	<input id="name" bind:value={name} />

	<button>Change name</button>
</form>

<style lang="scss">
</style>
