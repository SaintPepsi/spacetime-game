<script lang="ts">
	import Arena from '$lib/components/Arena.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import ChangeName from '$lib/components/ChangeName.svelte';
	import DebugButton from '$lib/components/DebugButton.svelte';
	import Entities from '$lib/components/Entities.svelte';
	import TotalOnlinePlayers from '$lib/components/TotalOnlinePlayers.svelte';
	import { createScene, type BaseScene } from '$lib/createScene';

	let sceneContext = $state<BaseScene | null>(null);

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
