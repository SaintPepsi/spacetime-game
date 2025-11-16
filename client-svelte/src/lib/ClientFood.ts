import { ClientEntity } from '$lib/ClientEntity';
import type { Entity, Food as FoodData } from '@module_bindings';
import { Graphics } from 'pixi.js';

/**
 * ClientFood entity class - represents collectible food items
 * Extends ClientEntity with food-specific functionality
 */
export class ClientFood extends ClientEntity {
	// Visual component
	public graphic: Graphics;

	// Color palette for food items
	private static readonly COLOR_PALETTE = [
		0xff6b6b, // Red
		0x4ecdc4, // Teal
		0xffe66d, // Yellow
		0x95e1d3, // Mint
		0xf38181, // Pink
		0xaa96da, // Purple
		0xfcbad3, // Light Pink
		0xa8e6cf, // Light Green
		0xffd3b6, // Peach
		0xffaaa5, // Coral
		0xff8b94, // Salmon
		0xa8dadc, // Sky Blue
		0xf7dc6f, // Gold
		0xbb8fce, // Lavender
		0x85c1e2 // Powder Blue
	];

	constructor(foodData: FoodData, entityData: Entity) {
		super();

		// Initialize entity
		this.spawn(foodData.entityId, {
			position: { x: entityData.position.x, y: entityData.position.y },
			mass: entityData.mass
		});

		// Create visual component with randomized color based on entity ID
		this.graphic = this.createGraphic(foodData.entityId);

		// Add graphic to container
		this.container.addChild(this.graphic);
	}

	/**
	 * Create the food graphic with a color from the palette
	 * Uses entity ID to deterministically select a color
	 * Uses mass-based radius from entity data
	 */
	private createGraphic(entityId: number): Graphics {
		const colorIndex = entityId % ClientFood.COLOR_PALETTE.length;
		const color = ClientFood.COLOR_PALETTE[colorIndex];
		const radius = ClientEntity.massToRadius(this.targetScale);

		// Create circle with mass-based radius
		return new Graphics().circle(0, 0, radius).fill(color);
	}

	/**
	 * Override setColor to update the food graphic
	 * Maintains mass-based radius
	 */
	public override setColor(color: number): void {
		const radius = ClientEntity.massToRadius(this.targetScale);
		this.graphic.clear().circle(0, 0, radius).fill(color);
	}

	/**
	 * Override tick to update graphic size when mass changes
	 */
	public override tick(deltaTime: number): void {
		super.tick(deltaTime);

		// Update graphic size based on current scale
		const radius = ClientEntity.massToRadius(this.targetScale);
		const colorIndex = this.entityId % ClientFood.COLOR_PALETTE.length;
		const color = ClientFood.COLOR_PALETTE[colorIndex];

		this.graphic.clear().circle(0, 0, radius).fill(color);
	}

	/**
	 * Get a random color from the palette
	 */
	public static getRandomColor(): number {
		const randomIndex = Math.floor(Math.random() * ClientFood.COLOR_PALETTE.length);
		return ClientFood.COLOR_PALETTE[randomIndex];
	}

	/**
	 * Get a color from the palette by index
	 */
	public static getColorByIndex(index: number): number {
		return ClientFood.COLOR_PALETTE[index % ClientFood.COLOR_PALETTE.length];
	}
}
