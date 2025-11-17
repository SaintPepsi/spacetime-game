import { lerp } from '$lib/lerp';
import { Container, Point, Sprite } from 'pixi.js';

// Type definitions matching the C++ structs
interface EventContext {
	// Define properties based on your FEventContext structure
}

export type EntityType = {
	position: { x: number; y: number };
	mass: number;
};

/**
 * TypeScript equivalent of the Unreal Engine AEntity class
 * Represents a game entity with position interpolation and lifecycle management
 */
export class ClientEntity {
	// Position interpolation vectors
	protected lerpStartPosition = new Point(0, 0);
	protected lerpTargetPosition = new Point(0, 0);
	mass = 1.0;

	// Public properties
	public entityId = 0;

	// Visual container (replaces AActor's visual component)
	container = new Container();

	constructor(private __debug = false) {}

	/**
	 * Called every frame to update the entity
	 * Interpolates position and scale based on C++ implementation
	 * @param deltaTime Time elapsed since last frame in seconds
	 */
	public tick(deltaTime: number): void {
		let speed = 0.2;
		// Interpolate the position and scale
		// Lerp position
		this.container.position.x = lerp(
			this.lerpStartPosition.x,
			this.lerpTargetPosition.x,
			deltaTime * speed
		);

		this.container.position.y = lerp(
			this.lerpStartPosition.y,
			this.lerpTargetPosition.y,
			deltaTime * speed
		);

		this.lerpStartPosition.set(this.container.position.x, this.container.position.y);
	}

	/**
	 * Initialize the entity with a unique ID
	 * Fetches entity data from database and sets initial position/scale
	 * @param inEntityId The entity's unique identifier
	 */
	public spawn(inEntityId: number, entityData: EntityType): void {
		this.entityId = inEntityId;

		// const entityRow = GameManager.instance.conn.db.entity.entityId.find(inEntityId);
		// For now, entityData is passed in as parameter
		this.lerpStartPosition = new Point(entityData.position.x, entityData.position.y);
		this.lerpTargetPosition = new Point(entityData.position.x, entityData.position.y);
		this.mass = entityData.mass;
		this.container.scale.set(1.0);
	}

	/**
	 * Called when the entity's data is updated
	 * Updates lerp targets and resets interpolation timer
	 * @param newVal Updated entity data
	 */
	public onEntityUpdated(newVal: EntityType): void {
		this.lerpStartPosition = new Point(this.container.position.x, this.container.position.y);
		this.lerpTargetPosition = new Point(newVal.position.x, newVal.position.y);
		this.mass = newVal.mass;
	}

	/**
	 * Called when the entity is being deleted
	 * Cleanup logic - destroys the entity
	 */
	public onDelete(): void {
		// Destroy() equivalent
		this.container.destroy({ children: true });
	}

	/**
	 * Set the visual color/tint of the entity
	 * Finds sprite component and applies color
	 * @param color Color value (can use number hex like 0xFF0000)
	 */
	public setColor(color: number): void {
		// Find sprite component equivalent (first Sprite child)
		const spriteComponent = this.container.children.find(
			(child) => child instanceof Sprite
		) as Sprite;
		if (spriteComponent) {
			spriteComponent.tint = color;
		}
	}

	/**
	 * Convert mass to radius for visual representation
	 * @param mass Entity mass value
	 * @returns Calculated radius
	 */
	public static massToRadius(mass: number): number {
		return Math.sqrt(mass);
	}

	/**
	 * Convert mass to diameter for visual representation
	 * @param mass Entity mass value
	 * @returns Calculated diameter
	 */
	public static massToDiameter(mass: number): number {
		return ClientEntity.massToRadius(mass) * 2;
	}

	public static diameterToMass(diameter: number): number {
		const radius = diameter / 2;
		return radius * radius;
	}
}
