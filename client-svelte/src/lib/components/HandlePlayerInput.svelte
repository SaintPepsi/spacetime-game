<script lang="ts">
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';
	import { Point } from 'pixi.js';

	let client = SpacetimeDB.getContext();
</script>

<svelte:document
	onpointermove={(e) => {
		const centerOfScreen = new Point(window.innerWidth / 2, window.innerHeight / 2);

		const mousePosition = new Point(e.clientX, e.clientY);

		let direction = mousePosition.subtract(centerOfScreen);
		client.reducers.updatePlayerInput(direction);
	}}
/>

<style lang="scss">
</style>
