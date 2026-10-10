<script lang="ts">
	import type { PromptData } from '../preset';
	import { rulesFor } from '../kinds';
	import Grip from './Grip.svelte';
	import PromptMeta from './PromptMeta.svelte';
	import PromptSettings from './PromptSettings.svelte';
	import PromptText from './PromptText.svelte';
	import Toggle from './Toggle.svelte';
	import type { Sizes, UiRow } from './types';

	interface Props {
		row: UiRow;
		sizes: Sizes;
		popOpen: boolean;
		update: (patch: Partial<PromptData>) => void;
		ontoggle: () => void;
		ontogglepop: () => void;
		oninsert: (offset: 0 | 1) => void;
		ondelete: () => void;
	}
	let { row, sizes, popOpen, update, ontoggle, ontogglepop, oninsert, ondelete }: Props = $props();

	const p = $derived(row.prompt);
	const removable = $derived(rulesFor(row.id).remove);
</script>

<div class="head" class:narrow={sizes.narrow}>
	<Grip width={sizes.gripW} height={sizes.gripH} />
	<input
		class="name"
		data-name
		aria-label="Prompt name"
		style:font-size={sizes.nameFs}
		style:opacity={row.enabled ? 1 : 0.45}
		value={p.name ?? ''}
		oninput={(e) => update({ name: e.currentTarget.value })}
	/>
	<div class="meta">
		<PromptMeta prompt={p} {sizes} {popOpen} {update} {ontogglepop} />
		{#if sizes.narrow}
			<div style:flex="1"></div>
			{@render deleteOrLock('40px', 16, 14)}
		{/if}
	</div>
	{#if !sizes.narrow}{@render deleteOrLock('28px', 15, 13)}{/if}
	<div class="toggle">
		<Toggle on={row.enabled} {ontoggle} flushLeft title={row.enabled ? 'On — click to switch off' : 'Off — click to switch on'} />
	</div>
</div>
<div class="body" style:padding-left={sizes.narrow ? '0' : '28px'}>
	<div class="text" style:font-size={sizes.monoFs} style:opacity={row.enabled ? 1 : 0.45}>
		<PromptText text={p.content ?? ''} onchange={(content) => update({ content })} />
	</div>
</div>
{#if popOpen}
	<PromptSettings prompt={p} {sizes} {update} onclose={ontogglepop} {oninsert} {ondelete} />
{/if}

{#snippet deleteOrLock(size: string, trashPx: number, lockPx: number)}
	{#if removable}
		<div class="del" role="button" tabindex="0" title="Delete prompt" aria-label="Delete prompt" style:width={size} style:height={size} onclick={ondelete}>
			<svg width={trashPx} height={trashPx} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
		</div>
	{:else}
		<div class="lock" title="Built-in prompts can’t be deleted" style:width={size} style:height={size}>
			<svg width={lockPx} height={lockPx} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>
		</div>
	{/if}
{/snippet}

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		column-gap: 8px;
		row-gap: 2px;
		min-height: 32px;
	}
	.name,
	.name:focus,
	.name:hover {
		order: 1;
		flex: 1 1 120px;
		min-width: 0;
		height: auto;
		background: transparent;
		border: 0;
		outline: none;
		box-shadow: none;
		color: var(--text-normal);
		font-family: inherit;
		font-weight: 600;
		padding: 4px 0;
	}
	.meta {
		order: 2;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 2px;
		min-width: 0;
	}
	.narrow .meta {
		order: 3;
		flex-basis: 100%;
		padding-left: 32px;
	}
	.del,
	.lock {
		order: 4;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
	}
	.head:not(.narrow) .del,
	.head:not(.narrow) .lock {
		margin-left: 4px;
	}
	.del {
		color: var(--text-faint);
		cursor: pointer;
	}
	.narrow .del {
		color: var(--text-muted);
	}
	.del:hover,
	.narrow .del:active {
		background: var(--background-modifier-hover);
		color: var(--text-error);
	}
	.lock {
		color: var(--text-faint);
	}
	.toggle {
		order: 3;
		display: flex;
	}
	.narrow .toggle {
		order: 2;
	}
	.body {
		margin-top: 6px;
	}
	.text {
		position: relative;
		font-family: var(--font-monospace);
		line-height: 1.7;
	}
</style>
