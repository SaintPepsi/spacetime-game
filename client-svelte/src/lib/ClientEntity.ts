import { Container, Point, Sprite } from 'pixi.js';

// Type definitions matching the C++ structs
interface EventContext {
	// Define properties based on your FEventContext structure
}

interface EntityType {
	position: { x: number; y: number };
	mass: number;
}

/**
 * Linear interpolation helper
 */
function lerp(start: number, end: number, alpha: number): number {
	return start + (end - start) * alpha;
}

/**
 * Interpolate float to target value
 */
function interpolateTo(
	current: number,
	target: number,
	deltaTime: number,
	interpolateSpeed: number
): number {
	const delta = target - current;
	if (Math.abs(delta) < 0.001) return target;
	const step = delta * Math.min(deltaTime * interpolateSpeed, 1.0);
	return current + step;
}

/**
 * TypeScript equivalent of the Unreal Engine AEntity class
 * Represents a game entity with position interpolation and lifecycle management
 */
export class ClientEntity {
	// Protected properties (equivalent to UPROPERTY EditDefaultsOnly)
	protected lerpTime = 0.0;
	protected lerpDuration = 0.1;

	// Position interpolation vectors
	protected lerpStartPosition = new Point(0, 0);
	protected lerpTargetPosition = new Point(0, 0);
	targetScale = 1.0;

	// Public properties
	public entityId = 0;

	// Visual container (replaces AActor's visual component)
	container = new Container();

	constructor() {
		this.lerpTime = 0.0;
	}

	/**
	 * Called every frame to update the entity
	 * Interpolates position and scale based on C++ implementation
	 * @param deltaTime Time elapsed since last frame in seconds
	 */
	public tick(deltaTime: number): void {
		// Interpolate the position and scale
		this.lerpTime = Math.min(this.lerpTime + deltaTime, this.lerpDuration);
		const alpha = this.lerpDuration > 0 ? this.lerpTime / this.lerpDuration : 1.0;

		// Lerp position
		this.container.position.x = lerp(this.lerpStartPosition.x, this.lerpTargetPosition.x, alpha);
		this.container.position.y = lerp(this.lerpStartPosition.y, this.lerpTargetPosition.y, alpha);

		// Interp scale
		const newScale = interpolateTo(this.container.scale.x, this.targetScale, deltaTime, 8.0);
		this.container.scale.set(newScale);
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
		this.targetScale = ClientEntity.massToDiameter(entityData.mass);
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
		this.targetScale = ClientEntity.massToDiameter(newVal.mass);
		this.lerpTime = 0.0;
	}

	/**
	 * Called when the entity is being deleted
	 * Cleanup logic - destroys the entity
	 * @param _context Deletion context information
	 */
	public onDelete(_context: EventContext): void {
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
}
