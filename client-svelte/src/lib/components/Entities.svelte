<script lang="ts">
	import { arenaContext } from '$lib/components/Arena.svelte';
	import { TableQuery } from '$lib/runes/SpacetimeTable.svelte';
	import { Graphics } from 'pixi.js';

	let entitiesDictionary = $state<Record<number, Graphics>>({});

	const [getArenaContext] = arenaContext;

	const arena = getArenaContext();

	let entities = new TableQuery('entity', void 0, {
		onUpdate: (oldRow, newRow) => {
			console.log('oldRow, newRow', oldRow, newRow);
		},
		onDelete: (row) => {
			console.log('Entity data deleted:', row);
		},
		onInsert: (row) => {
			console.log('Entity data inserted:', row);

			const { entityId, position } = row;

			const existingEntity = entitiesDictionary[entityId];
			existingEntity?.destroy();

			const entityGraphic = new Graphics().circle(0, 0, 10).fill(0x00ff00);
			// .endFill();

			entityGraphic.position.set(position.x, position.y);

			arena.addChild(entityGraphic);
		}
	});

	let totalEntities = $derived(entities.rows.length);
</script>

<code> Total Entities: {totalEntities} </code>
