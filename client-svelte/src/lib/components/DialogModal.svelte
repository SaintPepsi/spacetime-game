<script module lang="ts">
	import OnMount from '$lib/components/OnMount.svelte';
	import clsx from 'clsx';
	import { setContext, type Snippet } from 'svelte';
	import { backIn, backOut, cubicIn, cubicOut } from 'svelte/easing';
	import { fly, scale } from 'svelte/transition';

	type Props = {
		// Make sure to bind this if you want to control the modal from outside
		isOpen: boolean;
		children: Snippet;
		fullWidth?: boolean;
		noBackdrop?: boolean;
		preventCloseOnOutsideClick?: boolean;
		type?: 'default' | 'popup';
		'data-testid'?: string;
	};

	type Context = {
		isOpen: {
			value: boolean;
			set: (value: boolean) => void;
		};
	};

	const duration = 300;
</script>

<script lang="ts">
	let {
		isOpen = $bindable(),
		children,
		fullWidth = false,
		noBackdrop = false,
		preventCloseOnOutsideClick = false,
		type = 'default',
		...restProps
	}: Props = $props();

	let dialog = $state<HTMLDialogElement>(); // HTMLDialogElement
	let classes = $derived(
		clsx('Modal', `Modal--isOpen-${isOpen}`, `Modal--type-${type}`, {
			'Modal--fullWidth': fullWidth,
			'Modal--noBackdrop': noBackdrop
		})
	);

	let contentClasses = $derived(clsx('Modal__content'));

	$effect(() => {
		if (dialog && isOpen) dialog.showModal();
	});

	const onOutsideClick = (event: MouseEvent) => {
		if (dialog && event.target === dialog) isOpen = false;
	};

	function finaliseClose(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		e: CustomEvent<null> & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		if (dialog && !isOpen) dialog.close();
	}

	$effect(() => {
		if (preventCloseOnOutsideClick || !dialog) return;
		if (isOpen) {
			dialog.addEventListener('click', onOutsideClick);
		} else {
			dialog.removeEventListener('click', onOutsideClick);
		}
	});

	function updateisOpen(value: boolean) {
		isOpen = value;
	}

	setContext<Context>('Modal', {
		isOpen: { value: isOpen, set: updateisOpen }
	});
</script>

<dialog
	bind:this={dialog}
	onclose={() => (isOpen = false)}
	class={classes}
	style:margin-bottom={type === 'popup' ? 0 : null}
	{...restProps}
>
	{#if isOpen}
		<OnMount>
			{#if type === 'popup'}
				<div
					in:fly|global={{
						delay: 0,
						duration: duration,
						y: '100%',
						opacity: 0.2,
						easing: cubicOut
					}}
					out:fly|global={{
						delay: 0,
						duration: duration,
						y: '100%',
						opacity: 0.2,
						easing: cubicIn
					}}
					onoutroendcapture={(e) => {
						finaliseClose(e);
					}}
					class={contentClasses}
				>
					{@render children()}
				</div>
			{:else}
				<div class="Modal__contentWrapper">
					<div
						in:scale|global={{
							delay: 0,
							duration: duration,
							start: 0.8,
							opacity: 0.2,
							easing: backOut
						}}
						out:scale|global={{
							delay: 0,
							duration: duration,
							start: 0.8,
							opacity: 0.2,
							easing: backIn
						}}
						onoutroendcapture={(e) => {
							finaliseClose(e);
						}}
						class={contentClasses}
					>
						{@render children()}
					</div>
				</div>
			{/if}
		</OnMount>
	{/if}
</dialog>

<style lang="scss">
	@keyframes fade-in {
		from {
			opacity: 0;
		}
	}

	@keyframes fade-out {
		to {
			opacity: 0;
		}
	}

	dialog {
		--DialogModalBackdropColour: rgba(0, 0, 0, 0.2);
		background: transparent;
		border: none;
		padding: 0;
		margin: auto;
		transition-behavior: allow-discrete;
		z-index: 100;
		overflow: visible;
		outline: none;
		-webkit-tap-highlight-color: transparent;

		position: relative;
		view-transition-name: dialog;

		&.Modal--isOpen {
			&-true {
				&::backdrop {
					animation: 300ms cubic-bezier(0.33, 1, 0.68, 1) fade-in;
				}
			}

			&-false {
				&::backdrop {
					animation: 300ms cubic-bezier(0.32, 0, 0.67, 0) fade-out;
				}
			}
		}
	}

	.Modal {
		&__content {
			position: relative;
		}
		&--fullWidth {
			width: 100%;
		}

		&--type {
			&-popup {
			}

			&-default {
				.Modal {
					&__contentWrapper {
						padding-top: calc(env(safe-area-inset-top) + calc(var(--padding) * 4));
						padding-bottom: calc(env(safe-area-inset-bottom) + calc(calc(var(--padding) * 4)));
						padding-left: calc(env(safe-area-inset-left) + calc(var(--padding) * 4));
						padding-right: calc(env(safe-area-inset-right) + calc(calc(var(--padding) * 4)));
					}
				}
			}
		}
	}

	dialog:not(.Modal--noBackdrop)::backdrop {
		background: var(--DialogModalBackdropColour);
	}
</style>
