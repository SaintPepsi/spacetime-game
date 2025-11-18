import { option } from '$lib/Option';
import { SpacetimeDB, TableQuery } from 'spacetimedb-runes';

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
