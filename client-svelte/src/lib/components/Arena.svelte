<script module lang="ts">
	export const arenaContext = createContext<Container<ContainerChild>>();
</script>

<script lang="ts">
	import { TableQuery } from '$lib/runes/SpacetimeTable.svelte';
	import { Container, Graphics, type ContainerChild } from 'pixi.js';
	import { createContext, type Snippet } from 'svelte';

	let config = new TableQuery('config');

	type Props = {
		stage: Container;
		children: Snippet;
	};

	const { stage, children }: Props = $props();

	$inspect('config', config);
	$inspect('stage', stage);

	function createArena() {
		const arena = new Container();

		const border = new Graphics().rect(0, 0, 1000, 1000).stroke({ width: 2, color: 0xff0000 });

		arena.addChild(border);

		return arena;
	}

	let arena = $state(createArena());

	$effect(() => {
		stage.addChild(arena);

		return () => {
			stage.removeChild(arena);
		};
	});

	const [, setArenaContext] = arenaContext;

	setArenaContext(arena);
</script>

{@render children()}
