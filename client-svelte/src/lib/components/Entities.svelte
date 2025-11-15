<script lang="ts">
	import { arenaContext } from '$lib/components/Arena.svelte';
	import { TableQuery } from '$lib/runes/SpacetimeTable.svelte';
	import { Graphics } from 'pixi.js';

	let entitiesDictionary = $state<Record<number, Graphics>>({});

	const [getArenaContext] = arenaContext;

	const arena = getArenaContext();

	let entities = new TableQuery('entity', void 0, {
		onUpdate: (oldRow, newRow) => {
			// console.log('Entity oldRow, newRow', oldRow, newRow);

			const entityGraphic = entitiesDictionary[newRow.entityId];
			if (!entityGraphic) return;
			entityGraphic.position.set(newRow.position.x, newRow.position.y);
		},
		onDelete: (row) => {
			// console.log('Entity data deleted:', row);

			const entityGraphic = entitiesDictionary[row.entityId];
			if (!entityGraphic) return;
			entityGraphic.destroy();
			delete entitiesDictionary[row.entityId];
		},
		onInsert: (row) => {
			// console.log('Entity data inserted:', row);
			// const { entityId, position } = row;
			// const existingEntity = entitiesDictionary[entityId];
			// existingEntity?.destroy();
			// const entityGraphic = new Graphics().circle(0, 0, 10).fill(0x00ff00);
			// // .endFill();
			// entityGraphic.position.set(position.x, position.y);
			// arena.addChild(entityGraphic);
		}
	});

	new TableQuery('circle', void 0, {
		onUpdate: (oldRow, newRow) => {
			// console.log('circle oldRow, newRow', oldRow, newRow);
		},
		onDelete: (row) => {
			const entityGraphic = entitiesDictionary[row.entityId];
			if (!entityGraphic) return;
			entityGraphic.destroy();
			delete entitiesDictionary[row.entityId];
		},
		onInsert: (row) => {
			// console.log('circle data inserted:', row);

			const { entityId } = row;

			const existingEntity = entitiesDictionary[entityId];
			if (existingEntity) return;

			const entityGraphic = new Graphics().circle(0, 0, 10).fill(0x00ff00);
			// .endFill();

			arena.addChild(entityGraphic);
		}
	});

	let totalEntities = $derived(entities.rows.length);
</script>

<code> Total Entities: {totalEntities} </code>
