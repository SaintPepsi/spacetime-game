<script lang="ts">
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';
	import type { EventContext, User } from '../../module_bindings';

	let onlinePlayerCount = $state(0);

	let subscribeApplied = $state(false);
	const client = SpacetimeDB.getContext();
	const query = `SELECT * FROM user`;

	let users = $state<{
		rows: User[];
		state: string;
	}>({
		rows: [],
		state: 'loading'
	});

	let status = SpacetimeDB.status;

	const computeSnapshot = $derived(() => {
		const table = client.db['user'];
		const result = table.iter();

		return {
			rows: result as unknown as User[],
			state: subscribeApplied ? 'ready' : 'loading'
		};
	});

	$effect(() => {
		if ($status !== 'connected') return;
		if (!client.isActive) return;
		const cancel = client
			.subscriptionBuilder()
			.onApplied(() => {
				subscribeApplied = true;
				console.log('subscriptionApplied');
				//   setSubscribeApplied(true);
			})
			.subscribe(query);
		return () => {
			cancel.unsubscribe();
		};
	});

	$effect(() => {
		const table = client.db['user'];

		const onInsert = (ctx: EventContext, row: User) => {
			users = computeSnapshot();
		};

		const onDelete = (ctx: EventContext, row: User) => {
			users = computeSnapshot();
		};

		const onUpdate = (ctx: EventContext, oldRow: User, row: User) => {
			users = computeSnapshot();
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

<div class="TotalOnlinePlayers">
	IsActive: {client.isActive} | Status: {$status} | Online players: {onlinePlayerCount}
</div>

{#each users.rows as user (user.identity.__identity__)}
	<div class="player">
		{user.identity} - {user.name} - online: {user.online}
	</div>
{/each}

<style lang="scss">
</style>
