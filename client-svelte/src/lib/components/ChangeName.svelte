<script lang="ts">
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';
	import type { EventContext, User } from '../../module_bindings';

	// conn.reducers.setName(newName);
	const client = SpacetimeDB.getContext();

	const query = `SELECT * FROM user WHERE identity = ${client.identity}`;

	let name = $state('');

	let user = $state<User | null>(null);

	const computeSnapshot = $derived(() => {
		const table = client.db['user'];
		const result = table.iter() as unknown as User[];

		return (
			result.find((row) => row.identity.toHexString() === client.identity?.toHexString()) || null
		);
	});

	let status = SpacetimeDB.status;

	$effect(() => {
		if ($status !== 'connected') return;
		if (!client.isActive) return;
		const cancel = client
			.subscriptionBuilder()

			.subscribe(query);
		return () => {
			cancel.unsubscribe();
		};
	});

	$effect(() => {
		const table = client.db['user'];

		const onInsert = (ctx: EventContext, row: User) => {
			console.log('ctx,user', ctx, row);
			user = computeSnapshot();
		};

		const onDelete = (ctx: EventContext, row: User) => {
			console.log('ctx,user', ctx, row);
			user = computeSnapshot();
		};

		const onUpdate = (ctx: EventContext, oldRow: User, row: User) => {
			console.log('ctx, oldRow, user', ctx, oldRow, row);
			user = computeSnapshot();
		};

		table.onInsert(onInsert);
		table.onDelete(onDelete);
		table.onUpdate?.(onUpdate);
		return () => {
			table.removeOnInsert(onInsert);
			table.removeOnDelete(onDelete);
			table.removeOnUpdate?.(onUpdate);
		};
	});
</script>

{#if user}
	<p>
		Your current name is:
		{#if user.name}
			<strong>{user.name}</strong>
		{:else}
			<em>(not set)</em>
		{/if}
	</p>
{:else}
	<p>Loading your user data...</p>
{/if}

<form
	onsubmit={(e) => {
		e.preventDefault();
		client.reducers.setName(name);
	}}
>
	<label for="name">Change your name:</label>
	<input id="name" bind:value={name} />

	<button>Change name</button>
</form>

<style lang="scss">
</style>
