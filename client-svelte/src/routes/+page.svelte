<script lang="ts">
	import Arena from '$lib/components/Arena.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import ChangeName from '$lib/components/ChangeName.svelte';
	import DebugButton from '$lib/components/DebugButton.svelte';
	import Entities from '$lib/components/Entities.svelte';
	import TotalOnlinePlayers from '$lib/components/TotalOnlinePlayers.svelte';
	import { createScene, type BaseScene } from '$lib/createScene';
	import { TableQuery } from '$lib/runes/SpacetimeTable.svelte';
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';

	let sceneContext = $state<BaseScene | null>(null);

	let client = SpacetimeDB.getContext();

	let playerData = new TableQuery('player');

	let player = $derived(
		playerData.rows.find((p) => p.identity.toHexString() === client.identity?.toHexString())
	);

	let circleData = new TableQuery('circle');

	let playerCircle = $derived(
		circleData.rows.find((circle) => circle.playerId === player?.playerId)
	);

	async function onCreate(canvasContainer: HTMLDivElement) {
		sceneContext = await createScene(canvasContainer, 1);
	}
</script>

<main>
	<TotalOnlinePlayers />

	<ChangeName />

	<DebugButton />

	{#if sceneContext}
		<p>Scene context initialized</p>

		<Arena stage={sceneContext.app.stage}>
			<Entities />
		</Arena>
	{/if}

	{#if player && !playerCircle}
		<button onclick={() => client.reducers.enterGame()}>Join Game</button>
	{/if}
	<view>
		<Canvas {onCreate} />
	</view>
</main>

<style>
	main {
		display: flex;
		width: 100dvw;
		height: 100dvh;
		flex-direction: column;
	}

	view {
		flex: 1;
		position: relative;
		overflow: hidden;
	}
</style>
