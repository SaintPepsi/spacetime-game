import type { ClientPlayerPawn } from '$lib/ClientPlayerPawn';
import type { Circle as CircleData, Entity, Player } from '@module_bindings';
import { BitmapText, Container, Graphics } from 'pixi.js';
import { ClientEntity } from './ClientEntity';

/**
 * ClientCircle entity class - represents a player-controlled entity
 * Extends ClientEntity with player-specific functionality
 */
export class ClientCircle extends ClientEntity {
	// Circle-specific data
	public playerId: number;
	public direction: { x: number; y: number };
	public speed: number;

	// Visual components
	public graphic: Graphics;
	public pointer: Graphics;
	public graphicContainer = new Container();
	public playerNameTag: BitmapText;

	// Player reference
	public owner?: ClientPlayerPawn;
	private playerData?: Player;

	constructor(circleData: CircleData, entityData: Entity, playerData?: Player, __debug = false) {
		super(__debug);

		this.playerId = circleData.playerId;
		this.direction = { x: circleData.direction.x, y: circleData.direction.y };
		this.speed = circleData.speed;
		this.playerData = playerData;

		// Initialize entity
		this.spawn(circleData.entityId, {
			position: { x: entityData.position.x, y: entityData.position.y },
			mass: entityData.mass
		});

		// Create visual components

		this.graphic = this.createGraphic(playerData);
		this.pointer = this.createPointer();
		this.playerNameTag = this.createNameTag(playerData);

		// Set pivot for proper centering
		this.container.pivot.set(0.5, 0.5);

		// Add children to container
		this.graphicContainer.addChild(this.graphic);
		this.graphicContainer.addChild(this.pointer);
		this.container.addChild(this.graphicContainer);
		this.container.addChild(this.playerNameTag);

		// Set initial pointer rotation
		this.updatePointerDirection(circleData.direction);
	}

	/**
	 * Create the circular graphic with player color
	 * Uses mass-based radius from entity data
	 */
	private createGraphic(playerData?: Player): Graphics {
		const colorHex = parseInt(playerData?.color?.replace('#', '') || 'ffffff', 16);
		const radius = ClientEntity.massToRadius(this.mass);
		return new Graphics().circle(0, 0, radius).fill(colorHex);
	}

	/**
	 * Create the direction pointer
	 * Scales with entity radius
	 */
	private createPointer(): Graphics {
		const radius = ClientEntity.massToRadius(this.mass);
		return new Graphics().rect(0, -1, radius, 2).fill(0xffffff);
	}

	/**
	 * Create the player name tag
	 */
	private createNameTag(playerData?: Player): BitmapText {
		return new BitmapText({
			text: playerData?.name || 'Unknown',
			style: {
				fontFamily: 'Weiholmir_regular',
				fontSize: 7,
				lineHeight: 10
			},
			anchor: { x: 0.5, y: 2 }
		});
	}

	/**
	 * Update the circle's direction pointer
	 */
	public updateDirection(direction: { x: number; y: number }): void {
		this.direction = direction;
		this.updatePointerDirection(direction);
	}

	/**
	 * Update pointer rotation based on direction
	 */
	private updatePointerDirection(direction: { x: number; y: number }): void {
		const angle = Math.atan2(direction.y, direction.x);
		this.pointer.rotation = angle;
	}

	/**
	 * Update the player's color
	 * Maintains mass-based radius
	 */
	public updateColor(color: string): void {
		const colorHex = parseInt(color.replace('#', '') || 'ffffff', 16);
		const radius = ClientEntity.massToRadius(this.mass);
		this.graphic.clear().circle(0, 0, radius).fill(colorHex);
	}

	/**
	 * Update the player's name
	 */
	public updateName(name: string): void {
		this.playerNameTag.text = name || 'Unknown';
	}

	/**
	 * Get the player data associated with this circle
	 */
	public getPlayerData(): Player | undefined {
		return this.playerData;
	}

	/**
	 * Set the player data associated with this circle
	 */
	public setPlayerData(playerData: Player): void {
		this.playerData = playerData;
	}

	/**
	 * Override tick to update graphic size when mass changes
	 */
	public override tick(deltaTime: number): void {
		super.tick(deltaTime);

		// Update graphic and pointer size based on current scale
		const radius = ClientEntity.massToRadius(this.mass);

		// Update circle graphic with current color
		const colorHex = parseInt(this.playerData?.color?.replace('#', '') || 'ffffff', 16);
		this.graphic.clear().circle(0, 0, radius).fill(colorHex);

		// Update pointer size and rotation
		this.pointer.clear().rect(0, -1, radius, 2).fill(0xffffff);
		this.pointer.rotation = Math.atan2(this.direction.y, this.direction.x);

		// Interp scale
		// const newScale = lerp(this.graphicContainer.scale.x, this.mass, 0.2 * deltaTime);
		// this.graphicContainer.scale.set(newScale);

		// Counter-scale the name tag so it stays the same size
		// Since the container is scaled, we need to scale the name tag inversely
	}
}
