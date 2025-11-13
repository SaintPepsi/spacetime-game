import { PersistedState } from 'runed';
import { getContext, setContext } from 'svelte';
import { writable } from 'svelte/store';
import { DbConnection } from '../module_bindings';

export namespace SpacetimeDB {}

export class SpacetimeDB {
	public static status = writable<'disconnected' | 'connecting' | 'connected' | 'error'>(
		'disconnected'
	);
	public static authToken = new PersistedState(
		'spacetimedb_auth_token',
		undefined as string | undefined
	);

	static getContext<Connection = DbConnection>() {
		return getContext<Connection>('SpacetimeDB');
	}

	static setContext(connection: DbConnection) {
		setContext('SpacetimeDB', connection);
	}
}

export const spacetimeDB = new SpacetimeDB();
