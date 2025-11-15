<script lang="ts">
	import DialogModal from '$lib/components/DialogModal.svelte';
	import { TableQuery } from '$lib/runes/SpacetimeTable.svelte';
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';

	let client = SpacetimeDB.getContext();

	let playerData = new TableQuery('player');

	let player = $derived(
		playerData.rows.find((p) => p.identity.toHexString() === client.identity?.toHexString())
	);

	let name = $derived(player?.name || 'Unknown');
	let currentColour = $derived(player?.color || '#ffffff');
</script>

<DialogModal isOpen>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			client.reducers.setName(name);
			client.reducers.setColor(currentColour);
			client.reducers.enterGame();
		}}
	>
		<label for="name">Choose a name:</label>
		<input id="name" bind:value={name} />
		<label for="currentColour">color:</label>
		<input type="color" name="currentColour" bind:value={currentColour} />

		<button>Enter</button>
	</form>
</DialogModal>

<style>
	form {
		background-color: white;
		padding: 20px;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 12px;

		input {
			padding: 8px;
			border: 1px solid #ccc;
			border-radius: 4px;
			width: 100%;
			min-height: 40px;
		}
		input[type='color'] {
			padding: 0;
		}

		* {
			font-family: 'Weiholmir_regular';
			font-size: 14px;
		}
	}
</style>
