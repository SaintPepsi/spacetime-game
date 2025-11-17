import { option } from '$lib/Option';
import { TableQuery } from '$lib/runes/SpacetimeTable.svelte';
import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';

export class UserPlayer {
	#query = new TableQuery('player');
	#client = SpacetimeDB.getContext();

	get current() {
		return option(
			this.#query.rows.find(
				(p) => p.identity.toHexString() === this.#client.identity?.toHexString()
			)
		);
	}
}
