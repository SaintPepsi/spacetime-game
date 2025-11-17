import { loadFonts } from '$lib/assets/fonts/FONTS';
import { initDevtools } from '@pixi/devtools';
import { Application } from 'pixi.js';

export async function createScene(canvasContainer: HTMLDivElement, resolution: number) {
	const app = new Application();

	initDevtools({ app });

	await app.init({
		resizeTo: canvasContainer,
		resolution: resolution,
		antialias: false
	});

	app.stage.eventMode = 'static';

	canvasContainer.appendChild(app.canvas);

	await loadFonts();

	return { app };
}

export type BaseScene = Awaited<ReturnType<typeof createScene>>;
