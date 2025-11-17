<script module lang="ts">
	export const sceneContext = createContext<Scene>();
</script>

<script lang="ts">
	import { createContext, type Snippet } from 'svelte';
	import type { Scene } from './+page.svelte';

	type Props = {
		scene: Scene;
		children?: Snippet;
	};

	let { scene, children }: Props = $props();
	const [, setSceneContext] = sceneContext;

	setSceneContext(scene);
</script>

{@render children?.()}
