import type { ClientCircle } from '$lib/ClientCircle';
import type { ClientFood } from '$lib/ClientFood';
import type { ClientPlayerPawn } from '$lib/ClientPlayerPawn';
import { SvelteMap } from 'svelte/reactivity';

export const dictionaries = {
	circles: new SvelteMap<number, ClientCircle>(),
	food: new SvelteMap<number, ClientFood>(),
	playerPawn: new SvelteMap<number, ClientPlayerPawn>()
};
