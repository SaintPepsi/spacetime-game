<script module lang="ts">
	export type Scene = BaseScene & { camera: Camera };
</script>

<script lang="ts">
	import { Camera } from '$lib/Camera';
	import Arena from '$lib/components/Arena.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import Entities from '$lib/components/Entities.svelte';
	import HandlePlayerInput from '$lib/components/HandlePlayerInput.svelte';
	import StartScreen from '$lib/components/StartScreen.svelte';
	import { createScene, type BaseScene } from '$lib/createScene';
	import { TableQuery } from '$lib/runes/SpacetimeTable.svelte';
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';
	import PixiJSContext from './SceneContext.svelte';

	let sceneContext = $state<Scene | null>(null);

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
		let scene = await createScene(canvasContainer, 1);

		const camera = new Camera(scene.app);

		sceneContext = {
			...scene,
			camera
		};
	}
</script>

<main>
	<!-- <TotalOnlinePlayers /> -->

	<!-- <ChangeName /> -->
	<!-- <PlayerColourChanger /> -->
	<!-- <DebugButton /> -->

	{#if sceneContext}
		<PixiJSContext scene={sceneContext}>
			<Arena stage={sceneContext.camera.container}>
				<Entities />
			</Arena>
			<HandlePlayerInput />
		</PixiJSContext>
	{/if}

	<view>
		<Canvas {onCreate} resolution={1} />
	</view>
	{#if player && !playerCircle}
		<StartScreen />
	{/if}
</main>

<style>
	main {
		overflow: hidden;
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
