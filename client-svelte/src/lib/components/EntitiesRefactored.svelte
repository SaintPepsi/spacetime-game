<script lang="ts">
	import { ClientCircle } from '$lib/ClientCircle';
	import { ClientFood } from '$lib/ClientFood';
	import { arenaContext } from '$lib/components/Arena.svelte';
	import { TableQuery } from '$lib/runes/SpacetimeTable.svelte';
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';
	import { Ticker } from 'pixi.js';
	import type { Circle, Entity, Food, Player } from '../../module_bindings';
	import { sceneContext } from '../../routes/SceneContext.svelte';

	// Entity dictionaries
	let circlesDictionary = $state<Record<number, ClientCircle>>({});
	let foodDictionary = $state<Record<number, ClientFood>>({});

	// Context
	const [getArenaContext] = arenaContext;
	const arena = getArenaContext();

	const [getSceneContext] = sceneContext;
	const { app, camera } = getSceneContext();

	let client = SpacetimeDB.getContext();

	// Config data query (for world size)
	let configData = new TableQuery('config', void 0);

	let config = $derived(configData.rows[0]);
	let worldSize = $derived(config ? Number(config.worldSize) : 0);

	// Player data query
	let playerData = new TableQuery('player', void 0, {
		onUpdate: (oldRow, newRow) => {
			handlePlayerColourChange(oldRow, newRow);
			handlePlayerNameChange(oldRow, newRow);
		}
	});

	let player = $derived(
		playerData.rows.find((p) => p.identity.toHexString() === client.identity?.toHexString())
	);

	/**
	 * Handle player color changes
	 */
	function handlePlayerColourChange(oldRow: Player, newRow: Player) {
		if (oldRow.color === newRow.color) return;

		// Update the color of the player's circles
		const playerCircles = circleData.rows.filter((circle) => circle.playerId === newRow.playerId);

		for (const circle of playerCircles) {
			const entity = circlesDictionary[circle.entityId];
			if (!entity || !newRow.color) continue;

			entity.updateColor(newRow.color);
		}
	}

	/**
	 * Handle player name changes
	 */
	function handlePlayerNameChange(oldRow: Player, newRow: Player) {
		if (oldRow.name === newRow.name) return;

		// Update the name tag of the player's circles
		const playerCircles = circleData.rows.filter((circle) => circle.playerId === newRow.playerId);

		for (const circle of playerCircles) {
			const entity = circlesDictionary[circle.entityId];
			if (!entity || !newRow.name) continue;

			entity.updateName(newRow.name);
		}
	}

	/**
	 * Create a client circle instance
	 */
	function createClientCircle(circleRow: Circle, entityRow: Entity): ClientCircle {
		const playerRow = playerData.rows.find((p) => p.playerId === circleRow.playerId);
		return new ClientCircle(circleRow, entityRow, playerRow);
	}

	/**
	 * Create a client food instance
	 */
	function createClientFood(foodRow: Food, entityRow: Entity): ClientFood {
		return new ClientFood(foodRow, entityRow);
	}

	// Helper function to try creating a circle if both entity and circle data exist
	function tryCreateCircle(circleRow: Circle, entityRow?: Entity) {
		const { entityId } = circleRow;

		// Check if circle already exists
		if (circlesDictionary[entityId]) {
			console.log('Circle already exists:', entityId);
			return;
		}

		// Find corresponding entity data if not provided
		if (!entityRow) {
			entityRow = entities.rows.find((e) => e.entityId === entityId);
		}

		if (!entityRow) {
			console.log('Entity not found for circle:', entityId, 'Available entities:', entities.rows.length);
			return; // Entity not ready yet
		}

		console.log('Creating circle:', entityId);
		// Create client circle
		const clientCircle = createClientCircle(circleRow, entityRow);
		circlesDictionary[entityId] = clientCircle;

		// Add to arena
		arena.addChild(clientCircle.container);
		console.log('Circle created and added to arena:', entityId);
	}

	// Helper function to try creating food if both entity and food data exist
	function tryCreateFood(foodRow: Food, entityRow?: Entity) {
		const { entityId } = foodRow;

		// Check if food already exists
		if (foodDictionary[entityId]) return;

		// Find corresponding entity data if not provided
		if (!entityRow) {
			entityRow = entities.rows.find((e) => e.entityId === entityId);
		}

		if (!entityRow) return; // Entity not ready yet

		// Create client food
		const clientFood = createClientFood(foodRow, entityRow);
		foodDictionary[entityId] = clientFood;

		// Add to arena
		arena.addChild(clientFood.container);
	}

	// Circle table query
	let circleData = new TableQuery('circle', void 0, {
		onInsert: (row) => {
			console.log('Circle inserted:', row.entityId, row);
			tryCreateCircle(row);
		},

		onDelete: (row) => {
			console.log('Circle deleted:', row.entityId);
			const entity = circlesDictionary[row.entityId];
			if (!entity) return;

			entity.onDelete({});
			delete circlesDictionary[row.entityId];
		},

		onUpdate: (_oldRow, newRow) => {
			const entity = circlesDictionary[newRow.entityId];
			if (!entity) return;

			// Update direction
			entity.updateDirection(newRow.direction);
		}
	});

	// Food table query
	let foodData = new TableQuery('food', void 0, {
		onInsert: (row) => {
			tryCreateFood(row);
		},

		onDelete: (row) => {
			const entity = foodDictionary[row.entityId];
			if (!entity) return;

			entity.onDelete({});
			delete foodDictionary[row.entityId];
		}
	});

	// Entity table query
	let entities = new TableQuery('entity', void 0, {
		onUpdate: (_oldRow, newRow) => {
			// Update circle entity if it exists
			const circle = circlesDictionary[newRow.entityId];
			if (circle) {
				circle.onEntityUpdated({
					position: { x: newRow.position.x, y: newRow.position.y },
					mass: newRow.mass
				});
				return;
			}

			// Update food entity if it exists
			const food = foodDictionary[newRow.entityId];
			if (food) {
				food.onEntityUpdated({
					position: { x: newRow.position.x, y: newRow.position.y },
					mass: newRow.mass
				});
			}
		},

		onDelete: (row) => {
			// Delete circle entity if it exists
			const circle = circlesDictionary[row.entityId];
			if (circle) {
				circle.onDelete({});
				delete circlesDictionary[row.entityId];
				return;
			}

			// Delete food entity if it exists
			const food = foodDictionary[row.entityId];
			if (food) {
				food.onDelete({});
				delete foodDictionary[row.entityId];
			}
		},

		onInsert: (row) => {
			console.log('Entity inserted:', row.entityId, row);

			// Try to create circle if circle data exists
			const circleRow = circleData.rows.find((c) => c.entityId === row.entityId);
			if (circleRow) {
				console.log('Found matching circle for entity:', row.entityId);
				// Pass the entity row directly since it's not in entities.rows yet
				tryCreateCircle(circleRow, row);
				return;
			}

			// Try to create food if food data exists
			const foodRow = foodData.rows.find((f) => f.entityId === row.entityId);
			if (foodRow) {
				console.log('Found matching food for entity:', row.entityId);
				// Pass the entity row directly since it's not in entities.rows yet
				tryCreateFood(foodRow, row);
				return;
			}

			console.log('No matching circle or food found for entity:', row.entityId);
		}
	});

	// Player circle (for camera tracking)
	let playerCircle = $derived(
		circleData.rows.find((circle) => circle.playerId === player?.playerId)
	);

	$inspect('circleData', circleData);
	$inspect('entities', entities);
	$inspect('playerCircle', playerCircle);

	// Camera follow effect
	$effect(() => {
		const entity = circlesDictionary[playerCircle?.entityId || -1];
		if (!entity) return;

		const unfollow = camera.follow(entity.container);

		return () => {
			unfollow();
		};
	});

	// Animation ticker effect
	$effect(() => {
		const handleGraphicsTicker = (ticker: Ticker) => {
			const deltaTime = ticker.deltaTime / 60; // Convert to seconds

			// Update all circles
			for (const circle of Object.values(circlesDictionary)) {
				circle.tick(deltaTime);
			}

			// Update all food
			for (const food of Object.values(foodDictionary)) {
				food.tick(deltaTime);
			}
		};

		app.ticker.add(handleGraphicsTicker);

		return () => {
			app.ticker.remove(handleGraphicsTicker);
		};
	});

	// Derived stats
	let totalEntities = $derived(entities.rows.length);
	let totalPlayers = $derived(playerData.rows.length);
	let totalCircles = $derived(Object.keys(circlesDictionary).length);
	let totalFood = $derived(Object.keys(foodDictionary).length);
</script>

<code>
	World Size: {worldSize}<br />
	Total Entities: {totalEntities}<br />
	Total Players: {totalPlayers}<br />
	Total Circles: {totalCircles}<br />
	Total Food: {totalFood}
</code>

<style>
	code {
		position: fixed;
		color: white;
	}
</style>
