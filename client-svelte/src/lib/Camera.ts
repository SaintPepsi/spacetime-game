import { clamp } from 'es-toolkit';
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

		this.app.canvas.addEventListener('wheel', this.handleWheel.bind(this));
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

		const containerMiddleX = targetContainer.width / 2;
		const containerMiddleY = targetContainer.height / 2;

		const finalPositionX = targetX + containerMiddleX;
		const finalPositionY = targetY + containerMiddleY;

		this.setPosition(-finalPositionX, -finalPositionY);
	}

	screenToWorld(screenX: number, screenY: number) {
		const resolution = this.app.renderer.resolution;

		const screenXR = screenX / resolution;
		const screenYR = screenY / resolution;
		const worldX = (screenXR - this.container.position.x) / this.container.scale.x;
		const worldY = (screenYR - this.container.position.y) / this.container.scale.y;

		console.log('this.container.pivot.x', this.container.pivot.x);
		return { x: worldX + this.container.pivot.x, y: worldY + this.container.pivot.y };
	}

	private handleRendererResize() {
		this.container.pivot.set(-this.app.renderer.width / 2, -this.app.renderer.height / 2);
	}

	private handleWheel(event: WheelEvent) {
		const scale = this.container.scale.x;
		const pointerX = event.clientX / this.app.renderer.resolution;
		const pointerY = event.clientY / this.app.renderer.resolution;
		const isZoomingIn = event.deltaY < 0;
		const zoomPercent = 0.03;
		const zoomAmount = zoomPercent * scale;
		const zoomSizeChange = isZoomingIn ? zoomAmount : -zoomAmount;
		// TODO: Get computer specs and base scale based of that :)))
		// navigator.hardwareConcurrency
		const newScale = clamp(scale + zoomSizeChange, 0.08, 2);
		const translateX = (pointerX - this.container.position.x) / scale;
		const translateY = (pointerY - this.container.position.y) / scale;

		const positionX = -translateX * newScale + pointerX;
		const positionY = -translateY * newScale + pointerY;

		this.container.scale.set(newScale, newScale);
		this.setPosition(positionX, positionY);
	}

	setPosition(x: number, y: number) {
		// this.container.pivot.set(x, y);
		this.container.position.set(x, y);
		this.events.emit('on-position-change', { x, y });
	}
}
