<script lang="ts">
	import { arenaContext } from '$lib/components/Arena.svelte';
	import { TableQuery } from '$lib/runes/SpacetimeTable.svelte';
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';
	import { Graphics, Ticker } from 'pixi.js';
	import type { Circle } from '../../module_bindings';
	import { sceneContext } from '../../routes/SceneContext.svelte';

	let circlesDictionary = $state<Record<number, ClientCircle>>({});

	const [getArenaContext] = arenaContext;
	const arena = getArenaContext();

	const [getSceneContext] = sceneContext;
	const { app, camera } = getSceneContext();

	function createClientCircle(data: Circle) {
		const graphic = new Graphics().circle(0, 0, 10).fill(0x00ff00);

		return {
			...data,
			targetPosition: { x: 0, y: 0 },
			graphic
		};
	}
	type ClientCircle = ReturnType<typeof createClientCircle>;

	let entities = new TableQuery('entity', void 0, {
		onUpdate: (oldRow, newRow) => {
			// console.log('Entity oldRow, newRow', oldRow, newRow);

			const entity = circlesDictionary[newRow.entityId];
			if (!entity) return;

			entity.targetPosition = { x: newRow.position.x, y: newRow.position.y };
		},
		onDelete: (row) => {
			// console.log('Entity data deleted:', row);

			const entity = circlesDictionary[row.entityId];
			if (!entity) return;
			entity.graphic.destroy();
			delete circlesDictionary[row.entityId];
		},

		onInsert: (row) => {
			// console.log('Entity data inserted:', row);
			const entity = circlesDictionary[row.entityId];
			if (!entity) return;
			entity.graphic.position.set(row.position.x, row.position.y);
			entity.targetPosition = { x: row.position.x, y: row.position.y };
		}
	});

	let circleData = new TableQuery('circle', void 0, {
		onInsert: (row) => {
			// console.log('circle data inserted:', row);

			const { entityId } = row;

			const existingCircle = circlesDictionary[entityId];
			if (existingCircle) return;

			const clientCircle = createClientCircle(row);

			circlesDictionary[entityId] = clientCircle;

			arena.addChild(clientCircle.graphic);
		}
	});

	function handleGraphicsTicker(ticker: Ticker) {
		// Update graphics if needed

		for (const circle of circleData.rows) {
			const entity = circlesDictionary[circle.entityId];
			if (!entity) return;

			entity.graphic.position.x +=
				(entity.targetPosition.x - entity.graphic.position.x) * 0.1 * ticker.deltaTime;
			entity.graphic.position.y +=
				(entity.targetPosition.y - entity.graphic.position.y) * 0.1 * ticker.deltaTime;
		}
	}
	let client = SpacetimeDB.getContext();

	let playerData = new TableQuery('player');

	let player = $derived(
		playerData.rows.find((p) => p.identity.toHexString() === client.identity?.toHexString())
	);

	let playerCircle = $derived(
		circleData.rows.find((circle) => circle.playerId === player?.playerId)
	);

	$effect(() => {
		const entity = circlesDictionary[playerCircle?.entityId || -1];
		if (!entity) return;
		const unfollow = camera.follow(entity.graphic);

		return () => {
			unfollow();
		};
	});

	$effect(() => {
		app.ticker.add(handleGraphicsTicker);

		return () => {
			app.ticker.remove(handleGraphicsTicker);
		};
	});

	let totalEntities = $derived(entities.rows.length);
</script>

<code> Total Entities: {totalEntities} </code>
