<script lang="ts">
	import { ClientCircle } from '$lib/ClientCircle';
	import { ClientFood } from '$lib/ClientFood';
	import { ClientPlayerPawn } from '$lib/ClientPlayerPawn';
	import { arenaContext } from '$lib/components/Arena.svelte';
	import { dictionaries } from '$lib/data/dictionaries';
	import { option } from '$lib/Option';
	// import { PlayerCircles } from '$lib/runes/UserPlayerP';
	import { TableQuery } from '$lib/runes/SpacetimeTable.svelte';
	import { UserPlayer } from '$lib/runes/UserPlayer.svelte';
	import { Player, type Circle, type Entity, type Food } from '@module_bindings';
	import { sceneContext } from '@routes/SceneContext.svelte';
	import { Ticker } from 'pixi.js';

	// Entity dictionaries

	const {
		circles: circlesDictionary,
		food: foodDictionary,
		playerPawn: playerPawnDictionary
	} = dictionaries;

	// Context
	const [getArenaContext] = arenaContext;
	const arena = getArenaContext();

	const [getSceneContext] = sceneContext;
	const { app, camera } = getSceneContext();

	// Config data query (for world size)
	let configData = new TableQuery('config', ({ where, eq }) => where(eq('id', 0)));

	let config = $derived(configData.rows[0]);
	let worldSize = $derived(config ? Number(config.worldSize) : 0);

	// let currentPlayer = new CurrentPlayer();
	// Player data query
	let playerData = new TableQuery('player', void 0, {
		onUpdate: (oldRow, newRow) => {
			handlePlayerColourChange(oldRow, newRow);
			handlePlayerNameChange(oldRow, newRow);
		},
		onInsert: (newRow) => {
			const playerPawn = new ClientPlayerPawn(newRow);
			playerPawnDictionary.set(newRow.playerId, playerPawn);
		},
		onDelete: (oldRow) => {
			const pawn = option(playerPawnDictionary.get(oldRow.playerId));
			pawn.map((p) => p.destroy());
			playerPawnDictionary.delete(oldRow.playerId);
		},
		onInitialSnapshot: (rows) => {
			for (const row of rows) {
				const playerPawn = new ClientPlayerPawn(row);
				playerPawnDictionary.set(row.playerId, playerPawn);
			}
		}
	});

	let player = new UserPlayer();
	/**
	 * Handle player color changes
	 */
	function handlePlayerColourChange(oldRow: Player, newRow: Player) {
		let { color } = newRow;
		if (!color) return;
		if (oldRow.color === color) return;

		// Update the color of the player's circles
		const playerCircles = circleData.rows.filter((circle) => circle.playerId === newRow.playerId);

		for (const circle of playerCircles) {
			const entity = option(circlesDictionary.get(circle.entityId));
			entity.map((e) => e.updateColor(color));
		}
	}

	/**
	 * Handle player name changes
	 */
	function handlePlayerNameChange(oldRow: Player, newRow: Player) {
		const { name } = newRow;
		if (!name) return;
		if (oldRow.name === name) return;

		// Update the name tag of the player's circles
		const playerCircles = circleData.rows.filter((circle) => circle.playerId === newRow.playerId);

		for (const circle of playerCircles) {
			const entity = option(circlesDictionary.get(circle.entityId));
			entity.map((e) => e.updateName(name));
		}
	}

	/**
	 * Create a client circle instance
	 */
	function createClientCircle(circleRow: Circle, entityRow: Entity): ClientCircle {
		const owningPlayer = playerData.rows.find((p) => p.playerId === circleRow.playerId);

		const clientCircle = new ClientCircle(circleRow, entityRow, owningPlayer, true);
		const playerPawn = option(playerPawnDictionary.get(circleRow.playerId));

		playerPawn.map((pawn) => {
			pawn.addCircle(clientCircle);
			clientCircle.owner = pawn;
		});

		return clientCircle;
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

		const entity = option(circlesDictionary.get(entityId));

		// Check if circle already exists
		if (entity.isSome()) {
			return;
		}

		option(entityRow ? entityRow : entities.rows.find((e) => e.entityId === entityId))
			// Create client circle
			.map((entityRow) => createClientCircle(circleRow, entityRow))
			.map((circle) => {
				// Add to dictionary
				circlesDictionary.set(entityId, circle);
				// Add to arena
				arena.addChild(circle.container);
			});
	}

	// Helper function to try creating food if both entity and food data exist
	function tryCreateFood(foodRow: Food, entityRow?: Entity) {
		const { entityId } = foodRow;

		const foodEntry = option(foodDictionary.get(entityId));

		// Check if food already exists
		if (foodEntry.isSome()) return;

		// Find corresponding entity data if not provided
		option(entityRow ? entityRow : entities.rows.find((e) => e.entityId === entityId))
			.map((row) =>
				// Create client food
				createClientFood(foodRow, row)
			)
			.map((clientFood) => {
				// Add to arena
				foodDictionary.set(entityId, clientFood);
				arena.addChild(clientFood.container);
			});
	}

	// Circle table query
	let circleData = new TableQuery('circle', void 0, {
		onInsert: (row) => {
			tryCreateCircle(row);
		},

		onDelete: (row) => {
			const circle = option(circlesDictionary.get(row.entityId));
			circle.map((entity) => {
				entity.owner?.removeCircle(entity.entityId);
				entity.onDelete();
			});
			circlesDictionary.delete(row.entityId);
		},

		onUpdate: (_oldRow, newRow) => {
			option(circlesDictionary.get(newRow.entityId)).map((entity) =>
				// Update direction
				entity.updateDirection(newRow.direction)
			);
		},
		onInitialSnapshot: (rows) => {
			for (const row of rows) {
				tryCreateCircle(row);
			}
		}
	});

	// Food table query
	let foodData = new TableQuery('food', void 0, {
		onInsert: (row) => {
			tryCreateFood(row);
		},

		onDelete: (row) => {
			const food = option(foodDictionary.get(row.entityId));
			food.map((entity) => {
				entity.onDelete();
			});
			foodDictionary.delete(row.entityId);
		},

		onInitialSnapshot: (rows) => {
			for (const row of rows) {
				tryCreateFood(row);
			}
		}
	});

	// Entity table query
	let entities = new TableQuery('entity', void 0, {
		onUpdate: (_oldRow, newRow) => {
			// Update circle entity if it exists
			const circle = option(circlesDictionary.get(newRow.entityId)).map((circle) =>
				circle.onEntityUpdated({
					position: { x: newRow.position.x, y: newRow.position.y },
					mass: newRow.mass
				})
			);
			// Early return so that we don't try to continue unnecessarily
			if (circle.isSome()) return;

			// Update food entity if it exists
			option(foodDictionary.get(newRow.entityId)).map((food) =>
				food.onEntityUpdated({
					position: { x: newRow.position.x, y: newRow.position.y },
					mass: newRow.mass
				})
			);
		},

		onDelete: (row) => {
			// Delete circle entity if it exists

			option(circlesDictionary.get(row.entityId)).map((circle) => circle.onDelete());

			option(foodDictionary.get(row.entityId)).map((food) => food.onDelete());
		},

		onInsert: (row) => {
			// Try to create circle if circle data exists
			const circleRow = circleData.rows.find((c) => c.entityId === row.entityId);
			if (circleRow) {
				// Pass the entity row directly since it's not in entities.rows yet
				tryCreateCircle(circleRow, row);
				return;
			}

			// Try to create food if food data exists
			const foodRow = foodData.rows.find((f) => f.entityId === row.entityId);
			if (foodRow) {
				// Pass the entity row directly since it's not in entities.rows yet
				tryCreateFood(foodRow, row);
				return;
			}
		},

		onInitialSnapshot: (rows) => {
			for (const row of rows) {
				// Try to create circle if circle data exists
				const circleRow = circleData.rows.find((c) => c.entityId === row.entityId);
				if (circleRow) {
					// Pass the entity row directly since it's not in entities.rows yet
					tryCreateCircle(circleRow, row);
					continue;
				}

				// Try to create food if food data exists
				const foodRow = foodData.rows.find((f) => f.entityId === row.entityId);
				if (foodRow) {
					// Pass the entity row directly since it's not in entities.rows yet
					tryCreateFood(foodRow, row);
					continue;
				}
			}
		}
	});

	// Camera follow effect
	$effect(() => {
		return player.current
			.flatMap((_player) => option(playerPawnDictionary.get(_player.playerId)))
			.map((pawn) => {
				const unfollow = camera.followPoint(() => pawn.getCenterOfMass());
				return unfollow;
			})
			.unwrap();
	});

	// Animation ticker effect
	$effect(() => {
		const handleGraphicsTicker = (ticker: Ticker) => {
			const deltaTime = ticker.deltaTime; // Convert to seconds

			// Update all circles
			circlesDictionary.forEach((circle) => {
				circle.tick(deltaTime);
			});

			// Update all food
			foodDictionary.forEach((food) => {
				food.tick(deltaTime);
			});
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
