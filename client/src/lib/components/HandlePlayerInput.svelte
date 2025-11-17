<script lang="ts">
	import { dictionaries } from '$lib/data/dictionaries';
	import { option } from '$lib/Option';
	import { UserPlayer } from '$lib/runes/UserPlayer.svelte';
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';
	import { sceneContext } from '@routes/SceneContext.svelte';
	import { Point } from 'pixi.js';

	let client = SpacetimeDB.getContext();

	const [getSceneContext] = sceneContext;
	let { app } = getSceneContext();

	const { playerPawn: playerPawnDictionary } = dictionaries;
	// Input state
	let inputLocked = $state(false);
	let lastDirection = $state(new Point(0, 0));
	let lastUpdateTime = 0;
	const UPDATE_THROTTLE_MS = 50; // Send updates every 50ms max

	let userPlayer = new UserPlayer();

	/**
	 * Compute desired movement direction
	 * Normalized by viewport height thirds for consistent feel
	 */
	function computeDesiredDirection(
		mousePos: Point,
		canvasSize: { width: number; height: number }
	): Point {
		const centerOfScreen = new Point(canvasSize.width / 2, canvasSize.height / 2);
		let direction = mousePos.subtract(centerOfScreen);

		// Normalize by viewport height divided by 3 (as per Unreal tutorial)
		const normalizer = canvasSize.height / 3;
		direction.x /= normalizer;
		direction.y /= normalizer;

		// Normalize the direction vector
		const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
		if (length > 0) {
			direction.x /= length;
			direction.y /= length;
		}

		return direction;
	}

	/**
	 * Send input update to server with throttling
	 */
	function sendInputUpdate(direction: Point) {
		const now = Date.now();
		if (now - lastUpdateTime < UPDATE_THROTTLE_MS) {
			return; // Throttle updates
		}

		lastUpdateTime = now;
		client.reducers.updatePlayerInput(direction);

		userPlayer.current
			.flatMap((_player) => option(playerPawnDictionary.get(_player.playerId)))
			.map((pawn) => {
				pawn.updateDirection(direction);
			});
	}

	// Mouse move handler
	$effect(() => {
		const handlePointerMove = (e: PointerEvent) => {
			if (!e.target) return;
			if (inputLocked) return;
			const canvas = e.target as HTMLCanvasElement;
			const clientRect = canvas.getBoundingClientRect();

			const mousePosition = new Point(e.clientX - clientRect.left, e.clientY - clientRect.top);

			lastDirection = computeDesiredDirection(mousePosition, {
				width: canvas.width,
				height: canvas.height
			});

			// Use current mouse direction
			sendInputUpdate(lastDirection);
		};

		app.canvas.addEventListener('pointermove', handlePointerMove);

		return () => {
			app.canvas.removeEventListener('pointermove', handlePointerMove);
		};
	});

	// Keyboard handler for input lock toggle (Q key)
	$effect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === 'q') {
				inputLocked = !inputLocked;
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>
