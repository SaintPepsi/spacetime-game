<script module lang="ts">
	type Props = {
		onCreate: (canvasContainer: HTMLDivElement) => void;
		resolution?: number;
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	const { onCreate, resolution = 1 }: Props = $props();

	let canvasContainer = $state<HTMLDivElement>();

	onMount(() => {
		if (!canvasContainer) throw new Error('Canvas container not found on mount');
		onCreate(canvasContainer);
	});

	let style = $derived(`--resolution: ${resolution};`);
</script>

<div class="canvas-container" bind:this={canvasContainer} {style}></div>

<style>
	.canvas-container {
		position: absolute;
		top: 0;
		left: 0;
		width: calc(100% / var(--resolution, 1));
		height: calc(100% / var(--resolution, 1));
	}
</style>
