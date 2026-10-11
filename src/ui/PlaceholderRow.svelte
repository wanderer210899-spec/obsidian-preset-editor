<script lang="ts">
	import type { PromptData } from '../preset';
	import { rulesFor } from '../kinds';
	import FoldChevron from './FoldChevron.svelte';
	import PromptMeta from './PromptMeta.svelte';
	import PromptSettings from './PromptSettings.svelte';
	import Toggle from './Toggle.svelte';
	import type { Sizes, UiRow } from './types';

	interface Props {
		row: UiRow;
		sizes: Sizes;
		popOpen: boolean;
		/** C-1: a placeholder with settings opens to show its role and settings. */
		open: boolean;
		ontoggleopen: () => void;
		update: (patch: Partial<PromptData>) => void;
		ontoggle: () => void;
		ontogglepop: () => void;
		oninsert: (offset: 0 | 1) => void;
	}
	let { row, sizes, popOpen, open, ontoggleopen, update, ontoggle, ontogglepop, oninsert }: Props = $props();

	/**
	 * SRS 3.3, as in SillyTavern: placeholders with settings can be renamed and
	 * have a role and settings; their text comes from SillyTavern.
	 */
	const editable = $derived(rulesFor(row.id).settings);
	const name = $derived(row.prompt.name ?? row.id);
</script>

<div class="line" class:narrow={sizes.narrow}>
	{#if editable}
		<FoldChevron {open} width={sizes.narrow ? '36px' : '24px'} height={sizes.gripH} onclick={ontoggleopen} />
	{:else}
		<!-- Nothing to open; keeps the name in line with the others. -->
		<div class="chev-slot" style:width={sizes.narrow ? '36px' : '24px'}></div>
	{/if}
	<div class="box" style:opacity={row.enabled ? 1 : 0.45}>
		<span class="name">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.8" stroke-dasharray="3 3" style="flex:none"><rect x="4" y="4" width="16" height="16" rx="3"></rect></svg>
			{#if editable}
				<input
					class="name-input"
					data-name
					aria-label="Prompt name"
					size={Math.max(1, name.length)}
					value={name}
					oninput={(e) => update({ name: e.currentTarget.value })}
				/>
			{:else}
				{name}
			{/if}
		</span>
		<span class="note">Inserted by SillyTavern</span>
	</div>
	{#if editable && open}
		<div class="meta">
			<PromptMeta prompt={row.prompt} {sizes} {popOpen} {update} {ontogglepop} />
		</div>
	{/if}
	<div class="toggle">
		<Toggle on={row.enabled} {ontoggle} flushLeft title={row.enabled ? 'On — click to switch off' : 'Off — click to switch on'} />
	</div>
	{#if !sizes.narrow}
		<!-- Same width as a prompt row's lock/delete icon, so all toggles line up. -->
		<div class="icon-slot"></div>
	{/if}
</div>
{#if editable && open && popOpen}
	<PromptSettings prompt={row.prompt} {sizes} {update} onclose={ontogglepop} {oninsert} ondelete={() => {}} />
{/if}

<style>
	.line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		column-gap: 8px;
		row-gap: 2px;
		min-height: 32px;
	}
	.chev-slot {
		flex: none;
		margin-left: -6px;
	}
	.box {
		order: 1;
		flex: 1 1 160px;
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		column-gap: 10px;
		row-gap: 2px;
		padding: 8px 12px;
		border: 1px dashed var(--background-modifier-border-hover);
		border-radius: 8px;
		background: var(--background-primary-alt);
	}
	.name {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		font-weight: 500;
		color: var(--text-normal);
	}
	.name .name-input,
	.name .name-input:focus,
	.name .name-input:hover {
		field-sizing: content;
		min-width: 1ch;
		max-width: 100%;
		height: auto;
		background: transparent;
		border: 0;
		outline: none;
		box-shadow: none;
		padding: 0;
		color: inherit;
		font: inherit;
	}
	.note {
		color: var(--text-muted);
		font-size: 12.5px;
	}
	.meta {
		order: 2;
		display: flex;
		align-items: center;
		gap: 2px;
		min-width: 0;
	}
	.narrow .meta {
		order: 3;
		flex-basis: 100%;
		padding-left: 32px;
		box-sizing: border-box;
	}
	.toggle {
		order: 3;
		display: flex;
	}
	.narrow .toggle {
		order: 2;
	}
	.icon-slot {
		order: 4;
		flex: none;
		width: 28px;
		margin-left: 4px;
	}
</style>
