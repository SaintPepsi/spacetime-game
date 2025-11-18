<script module lang="ts">
	export const arenaContext = createContext<Container<ContainerChild>>();
</script>

<script lang="ts">
	import { Container, Graphics, type ContainerChild } from 'pixi.js';
	import { TableQuery } from 'spacetimedb-runes';
	import { createContext, type Snippet } from 'svelte';

	let configQuery = new TableQuery('config', ({ where, eq }) => where(eq('id', 0)));

	type Props = {
		stage: Container;
		children: Snippet;
	};

	const { stage, children }: Props = $props();

	// Get config and world size
	let config = $derived(configQuery.rows[0]);
	let worldSize = $derived(config ? Number(config.worldSize) : 1000);

	// Create arena and border graphics
	let arena = $state(new Container());
	let border = $state(new Graphics());

	// Initialize arena with border
	$effect(() => {
		// Add border to arena if not already added
		if (!arena.children.includes(border)) {
			arena.addChild(border);
		}
	});

	// Update border when world size changes
	$effect(() => {
		border.clear().rect(0, 0, worldSize, worldSize).stroke({ width: 2, color: 0xff0000 });
	});

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
