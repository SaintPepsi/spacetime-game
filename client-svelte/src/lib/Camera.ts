import { Container, EventEmitter, type Application } from 'pixi.js';

export namespace Camera {
	export type Events = {
		'on-position-change': { x: number; y: number };
	};
}

export class Camera {
	isDragging = false;
	container = new Container();
	events = new EventEmitter<Camera.Events>();

	constructor(private app: Application) {
		app.stage.addChild(this.container);

		this.app.renderer.on('resize', this.handleRendererResize.bind(this));
		this.handleRendererResize();
	}

	follow(targetContainer: Container) {
		const handleFollow = () => {
			this.centerOn(targetContainer);
		};

		this.app.ticker.add(handleFollow);
		return () => {
			this.app.ticker.remove(handleFollow);
		};
	}

	centerOn(targetContainer: Container) {
		const targetX = targetContainer.position.x;
		const targetY = targetContainer.position.y;

		this.setPosition(-targetX, -targetY);
	}

	screenToWorld(screenX: number, screenY: number) {
		const resolution = this.app.renderer.resolution;

		const screenXR = screenX / resolution;
		const screenYR = screenY / resolution;
		const worldX = (screenXR - this.container.position.x) / this.container.scale.x;
		const worldY = (screenYR - this.container.position.y) / this.container.scale.y;

		return { x: worldX + this.container.pivot.x, y: worldY + this.container.pivot.y };
	}

	private handleRendererResize() {
		this.container.pivot.set(-this.app.renderer.width / 2, -this.app.renderer.height / 2);
	}

	setPosition(x: number, y: number) {
		// this.container.pivot.set(x, y);
		this.container.position.set(x, y);
		this.events.emit('on-position-change', { x, y });
	}
}
