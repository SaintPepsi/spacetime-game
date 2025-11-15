<script lang="ts">
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';
	import { Point } from 'pixi.js';
	import { sceneContext } from '../../routes/SceneContext.svelte';

	let client = SpacetimeDB.getContext();

	const [getSceneContext] = sceneContext;
	let { app } = getSceneContext();

	$effect(() => {
		app.canvas.addEventListener('pointermove', (e) => {
			if (!e.target) return;
			const canvas = e.target as HTMLCanvasElement;
			const clientRect = canvas.getBoundingClientRect();

			const centerOfScreen = new Point(canvas.width / 2, canvas.height / 2);
			const mousePosition = new Point(e.clientX - clientRect.left, e.clientY - clientRect.top);
			let direction = mousePosition.subtract(centerOfScreen);
			client.reducers.updatePlayerInput(direction);
		});
	});
</script>
