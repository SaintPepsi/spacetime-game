<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { DbConnection } from '@module_bindings';
	import type { Identity } from 'spacetimedb';
	import { SpacetimeDB, SpacetimeDBContext } from 'spacetimedb-runes';
	import { onMount } from 'svelte';

	let connection = $state(<DbConnection | null>null);

	onMount(() => {
		const onConnect = (conn: DbConnection, identity: Identity, token: string) => {
			SpacetimeDB.status.set('connected');
			SpacetimeDB.authToken.current = token;
			// The conn.isActive property from the base class is already set to true at this point
			conn.reducers.onSendMessage(() => {
				// Message sent callback
			});
		};

		const onDisconnect = () =>
			// ctx: ErrorContext,
			// error?: Error | undefined
			{
				SpacetimeDB.status.set('disconnected');
			};

		const onConnectError = () =>
			// _ctx: ErrorContext,
			// err: Error
			{
				SpacetimeDB.status.set('error');
			};

		const connectionBuilder = DbConnection.builder()
			.withUri('ws://localhost:3000')
			.withModuleName('spacetime-game')
			.withToken(SpacetimeDB.authToken.current || undefined)
			.onConnect(onConnect)
			.onDisconnect(onDisconnect)
			.onConnectError(onConnectError);
		SpacetimeDB.status.set('connecting');

		connection = connectionBuilder.build();
	});

	let status = SpacetimeDB.status;

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if $status === 'connecting'}
	<info> Connecting to SpacetimeDB... </info>
{/if}
{#if $status === 'disconnected'}
	<warning>
		Disconnected from SpacetimeDB. Could you already be connected from another tab or device?</warning
	>
{/if}
{#if $status === 'error'}
	<error> An error occurred while connecting to SpacetimeDB. </error>
{/if}

{#if connection && $status === 'connected'}
	<SpacetimeDBContext {connection}>
		{@render children()}
	</SpacetimeDBContext>
{:else}
	<p>Initializing connection...</p>
{/if}

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		width: 100dvw;
		height: 100dvh;
		overflow: hidden;
	}

	error,
	warning,
	info {
		top: 0;
		left: 0;
		font-family: sans-serif;
		padding: 0.5rem;
		text-align: center;
		z-index: 1000;
		display: block;
		position: fixed;
		width: 100dvw;
	}

	error {
		background-color: tomato;
		color: white;
	}

	warning {
		background-color: orange;
		color: black;
	}
	info {
		background-color: deepskyblue;
		color: white;
	}
</style>
