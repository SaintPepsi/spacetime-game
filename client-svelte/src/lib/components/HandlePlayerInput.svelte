<script lang="ts">
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';
	import { Point } from 'pixi.js';
	import { sceneContext } from '../../routes/SceneContext.svelte';

	let client = SpacetimeDB.getContext();

	const [getSceneContext] = sceneContext;
	let { app } = getSceneContext();

	// Input state
	let inputLocked = $state(false);
	let lockedDirection = $state(new Point(0, 0));
	let lastUpdateTime = 0;
	const UPDATE_THROTTLE_MS = 50; // Send updates every 50ms max

	/**
	 * Compute desired movement direction
	 * Normalized by viewport height thirds for consistent feel
	 */
	function computeDesiredDirection(mousePos: Point, canvasSize: { width: number; height: number }): Point {
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
	}

	// Mouse move handler
	$effect(() => {
		const handlePointerMove = (e: PointerEvent) => {
			if (!e.target) return;
			const canvas = e.target as HTMLCanvasElement;
			const clientRect = canvas.getBoundingClientRect();

			const mousePosition = new Point(e.clientX - clientRect.left, e.clientY - clientRect.top);
			const direction = computeDesiredDirection(mousePosition, {
				width: canvas.width,
				height: canvas.height
			});

			if (inputLocked) {
				// Use locked direction
				sendInputUpdate(lockedDirection);
			} else {
				// Use current mouse direction
				sendInputUpdate(direction);
			}
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
				if (!inputLocked) {
					// Lock input - capture current mouse position
					const canvas = app.canvas;
					const rect = canvas.getBoundingClientRect();
					const mousePos = new Point(e.clientX - rect.left, e.clientY - rect.top);
					lockedDirection = computeDesiredDirection(mousePos, {
						width: canvas.width,
						height: canvas.height
					});
				}
				inputLocked = !inputLocked;
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>
