<script lang="ts">
	import { arenaContext } from '$lib/components/Arena.svelte';
	import { TableQuery } from '$lib/runes/SpacetimeTable.svelte';
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';
	import { BitmapText, Container, Graphics, Point, Ticker } from 'pixi.js';
	import type { Circle, Player } from '../../module_bindings';
	import { sceneContext } from '../../routes/SceneContext.svelte';

	let circlesDictionary = $state<Record<number, ClientCircle>>({});

	const [getArenaContext] = arenaContext;
	const arena = getArenaContext();

	const [getSceneContext] = sceneContext;
	const { app, camera } = getSceneContext();

	let client = SpacetimeDB.getContext();

	let playerData = new TableQuery('player', void 0, {
		onUpdate: (oldRow, newRow) => {
			handlePlayerColourChange(oldRow, newRow);
			handlePlayerNameChange(oldRow, newRow);
		}
	});

	let player = $derived(
		playerData.rows.find((p) => p.identity.toHexString() === client.identity?.toHexString())
	);
	$inspect('player.playerId', player?.playerId);

	function handlePlayerColourChange(oldRow: Player, newRow: Player) {
		// console.log('Player oldRow, newRow', oldRow, newRow);

		if (oldRow.color === newRow.color) return;

		// Update the color of the player's circle
		const playerCircles = circleData.rows.filter((circle) => circle.playerId === newRow.playerId);

		for (const circle of playerCircles) {
			const entity = circlesDictionary[circle.entityId];
			if (!entity) continue;

			const colorHex = parseInt(newRow.color?.replace('#', '') || 'ffffff', 16);
			entity.graphic.clear().circle(0, 0, 10).fill(colorHex);
		}
	}

	function handlePlayerNameChange(oldRow: Player, newRow: Player) {
		// console.log('Player oldRow, newRow', oldRow, newRow);

		if (oldRow.name === newRow.name) return;

		// Update the name tag of the player's circle
		const playerCircles = circleData.rows.filter((circle) => circle.playerId === newRow.playerId);

		for (const circle of playerCircles) {
			const entity = circlesDictionary[circle.entityId];
			if (!entity) continue;

			entity.playerNameTag.text = newRow.name || 'Unknown';
		}
	}

	function createClientCircle(data: Circle) {
		const player = playerData.rows.find((p) => p.playerId === data.playerId);
		const colorHex = parseInt(player?.color?.replace('#', '') || 'ffffff', 16);

		const playerContainer = new Container();
		playerContainer.pivot.set(0.5, 0.5);
		const graphic = new Graphics().circle(0, 0, 10).fill(colorHex);

		const playerNameTag = new BitmapText({
			text: player?.name || 'Unknown',
			style: {
				fontFamily: 'Weiholmir_regular',
				fontSize: 7,
				lineHeight: 10

				// fill: '#ffcc00',
			},
			anchor: { x: 0.5, y: 2 }
		});
		const pointer = new Graphics().rect(0, -1, 10, 2).fill('0xffffff');

		pointer.rotation = Math.atan2(data.direction.y, data.direction.x);
		playerContainer.addChild(graphic);
		playerContainer.addChild(playerNameTag);
		playerContainer.addChild(pointer);

		return {
			...data,
			targetPosition: { x: 0, y: 0 },
			playerContainer,
			graphic,
			pointer,
			playerNameTag
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
			entity.playerContainer.destroy();
			delete circlesDictionary[row.entityId];
		},

		onInsert: (row) => {
			// console.log('Entity data inserted:', row);
			const entity = circlesDictionary[row.entityId];
			if (!entity) return;
			entity.playerContainer.position.set(row.position.x, row.position.y);
			entity.targetPosition = { x: row.position.x, y: row.position.y };
		}
	});

	function handleCircleInsert(row: Circle) {
		// console.log('circle data inserted:', row);

		const { entityId } = row;

		const existingCircle = circlesDictionary[entityId];
		if (existingCircle) return;

		const clientCircle = createClientCircle(row);

		circlesDictionary[entityId] = clientCircle;

		arena.addChild(clientCircle.playerContainer);
	}

	let circleData = new TableQuery('circle', void 0, {
		onInsert: (row) => {
			// console.log('circle data inserted:', row);
			handleCircleInsert(row);
		},

		onDelete: (row) => {
			// console.log('circle data deleted:', row);

			const entity = circlesDictionary[row.entityId];
			if (!entity) return;
			entity.playerContainer.destroy();
			delete circlesDictionary[row.entityId];
		},

		onUpdate: (oldRow, newRow) => {
			// console.log('circle oldRow, newRow', oldRow, newRow);

			const entity = circlesDictionary[newRow.entityId];
			if (!entity) return;

			const angle = Math.atan2(newRow.direction.y, newRow.direction.x);
			entity.pointer.rotation = angle;
		}
	});

	$effect(() => {
		circleData.rows.forEach((row) => {
			handleCircleInsert(row);
		});
	});

	let playerCircle = $derived(
		circleData.rows.find((circle) => circle.playerId === player?.playerId)
	);

	$effect(() => {
		const entity = circlesDictionary[playerCircle?.entityId || -1];
		if (!entity) return;
		const unfollow = camera.follow(entity.playerContainer);

		return () => {
			unfollow();
		};
	});

	$effect(() => {
		const handleGraphicsTicker = (ticker: Ticker) => {
			// Update graphics if needed

			for (const entity of Object.values(circlesDictionary)) {
				entity.playerContainer.position.add(
					new Point(
						(entity.targetPosition.x - entity.playerContainer.position.x) * 0.1 * ticker.deltaTime,
						(entity.targetPosition.y - entity.playerContainer.position.y) * 0.1 * ticker.deltaTime
					),
					entity.playerContainer.position
				);
			}
		};

		app.ticker.add(handleGraphicsTicker);

		return () => {
			app.ticker.remove(handleGraphicsTicker);
		};
	});

	let totalEntities = $derived(entities.rows.length);
</script>

<code> Total Entities: {totalEntities} </code>

<style>
	code {
		position: fixed;
		color: white;
	}
</style>
