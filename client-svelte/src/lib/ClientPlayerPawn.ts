import type { ClientCircle } from '$lib/ClientCircle';
import type { Player } from '@module_bindings';
import { Point } from 'pixi.js';

/**
 * ClientPlayerPawn class - manages multiple owned circles for a player
 * Calculates center of mass across all owned entities for camera positioning
 */
export class ClientPlayerPawn {
	// Player data
	public playerId: number;
	public playerData: Player;

	// Owned circles
	private ownedCircles: Map<number, ClientCircle> = new Map();

	// Center of mass for camera tracking
	private centerOfMass: Point = new Point(0, 0);

	constructor(playerData: Player) {
		this.playerId = playerData.playerId;
		this.playerData = playerData;
	}

	/**
	 * Add a circle to the owned circles
	 */
	public addCircle(circle: ClientCircle): void {
		this.ownedCircles.set(circle.entityId, circle);
		this.updateCenterOfMass();
	}

	/**
	 * Remove a circle from the owned circles
	 */
	public removeCircle(entityId: number): void {
		this.ownedCircles.delete(entityId);
		this.updateCenterOfMass();
	}

	/**
	 * Get a circle by entity ID
	 */
	public getCircle(entityId: number): ClientCircle | undefined {
		return this.ownedCircles.get(entityId);
	}

	/**
	 * Get all owned circles
	 */
	public getCircles(): ClientCircle[] {
		return Array.from(this.ownedCircles.values());
	}

	/**
	 * Get the number of owned circles
	 */
	public getCircleCount(): number {
		return this.ownedCircles.size;
	}

	/**
	 * Calculate and update the center of mass across all owned circles
	 * This is used for camera positioning
	 */
	private updateCenterOfMass(): void {
		if (this.ownedCircles.size === 0) {
			this.centerOfMass.set(0, 0);
			return;
		}

		let totalX = 0;
		let totalY = 0;
		let totalMass = 0;

		for (const circle of this.ownedCircles.values()) {
			const mass = circle.targetScale; // Using targetScale as mass proxy
			totalX += circle.container.position.x * mass;
			totalY += circle.container.position.y * mass;
			totalMass += mass;
		}

		if (totalMass > 0) {
			this.centerOfMass.set(totalX / totalMass, totalY / totalMass);
		} else {
			// Fallback to simple average if no mass
			this.centerOfMass.set(totalX / this.ownedCircles.size, totalY / this.ownedCircles.size);
		}
	}

	/**
	 * Get the center of mass position for camera tracking
	 */
	public getCenterOfMass(): Point {
		// Recalculate before returning to ensure up-to-date position
		this.updateCenterOfMass();
		return this.centerOfMass;
	}

	/**
	 * Update player data (name, color, etc.)
	 */
	public updatePlayerData(playerData: Player): void {
		this.playerData = playerData;

		// Update all owned circles with new player data
		for (const circle of this.ownedCircles.values()) {
			circle.setPlayerData(playerData);

			// Update color if changed
			if (playerData.color) {
				circle.updateColor(playerData.color);
			}

			// Update name if changed
			if (playerData.name) {
				circle.updateName(playerData.name);
			}
		}
	}

	/**
	 * Check if this pawn owns a specific circle
	 */
	public ownsCircle(entityId: number): boolean {
		return this.ownedCircles.has(entityId);
	}

	/**
	 * Destroy all owned circles and cleanup
	 */
	public destroy(): void {
		for (const circle of this.ownedCircles.values()) {
			circle.onDelete({});
		}
		this.ownedCircles.clear();
	}
}
