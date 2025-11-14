// See https://svelte.dev/docs/kit/types#app.d.ts

import type { DbConnection } from './module_bindings';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Augment the SpacetimeTable Register interface with your actual DbConnection type
declare module '$lib/runes/SpacetimeTable.svelte' {
	interface Register {
		connection: DbConnection;
	}
}

export {};
