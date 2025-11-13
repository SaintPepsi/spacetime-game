<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';
	import type { Identity } from 'spacetimedb';
	import { onMount } from 'svelte';
	import { DbConnection, type ErrorContext } from '../module_bindings';
	import SpacetimeDBContext from './SpacetimeDBContext.svelte';

	let connection = $state(<DbConnection | null>null);

	onMount(() => {
		const onConnect = (conn: DbConnection, identity: Identity, token: string) => {
			// SpacetimeDB.status.set('connected');
			SpacetimeDB.status.set('connected');
			SpacetimeDB.authToken.current = token;
			console.log('Connected to SpacetimeDB with identity:', identity.toHexString());
			console.log('handle on open');
			// The conn.isActive property from the base class is already set to true at this point
			conn.reducers.onSendMessage(() => {
				console.log('Message sent.');
			});
		};

		const onDisconnect = () => {
			SpacetimeDB.status.set('disconnected');
			console.log('Disconnected from SpacetimeDB');
		};

		const onConnectError = (_ctx: ErrorContext, err: Error) => {
			SpacetimeDB.status.set('error');
			console.log('Error connecting to SpacetimeDB:', err);
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
	<warning> Disconnected from SpacetimeDB. </warning>
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
	* {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
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
