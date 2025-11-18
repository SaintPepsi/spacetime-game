<script lang="ts">
	import { SpacetimeDB, TableQuery } from 'spacetimedb-runes';

	let client = SpacetimeDB.getContext();

	let playerData = new TableQuery('player');

	let player = $derived(
		playerData.rows.find((p) => p.identity.toHexString() === client.identity?.toHexString())
	);

	let currentColour = $derived(player?.color || '#ffffff');
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		client.reducers.setColor(currentColour);
	}}
>
	<input type="color" name="currentColour" bind:value={currentColour} />
	<button>Change color</button>
</form>

<style lang="scss">
</style>
