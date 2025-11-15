<!-- 
	@component
	Mounts a component when the DOM is ready.  Useful for intro animations.
 -->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();

	let loaded = $state(false);

	onMount(() => {
		loaded = true;
	});
</script>

{#if loaded}
	{@render children()}
{/if}
