<script>
	import ChangeName from '$lib/components/ChangeName.svelte';
	import DebugButton from '$lib/components/DebugButton.svelte';
	import TotalOnlinePlayers from '$lib/components/TotalOnlinePlayers.svelte';
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<TotalOnlinePlayers />

<ChangeName />

<DebugButton />
