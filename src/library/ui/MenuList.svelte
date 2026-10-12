<script lang="ts">
	import { pressable } from './actions';
	import Icon from './Icon.svelte';
	import type { MenuItem } from './types';

	/** A desktop popover menu, as in the B2 PC mockup. */
	interface Props {
		items: MenuItem[];
		/** A small grey line on top, e.g. "New preset in…". */
		title?: string;
		label: string;
		width?: number;
	}
	let { items, title, label, width = 200 }: Props = $props();
</script>

<div class="pl-menu" role="menu" aria-label={label} style:width="{width}px">
	{#if title}<span class="pl-title">{title}</span>{/if}
	{#each items as item, i (i)}
		{#if item.separator}<span class="pl-sep"></span>{/if}
		{#if item.checked !== undefined}
			<div
				tabindex="0"
				use:pressable
				role="menuitemradio"
				aria-checked={item.checked}
				class="pl-item"
				onclick={item.onPick}
			>
				<span class="pl-tick">{#if item.checked}<Icon name="check" size={14} stroke={2.4} />{/if}</span>
				<span class="pl-label">{item.label}</span>
			</div>
		{:else}
			<div
				tabindex="0"
				use:pressable
				role="menuitem"
				aria-disabled={item.disabledNote ? 'true' : undefined}
				class="pl-item"
				class:pl-danger={item.danger}
				class:pl-off={!!item.disabledNote}
				style:padding-left={item.folderDepth !== undefined ? `${8 + item.folderDepth * 18}px` : undefined}
				onclick={() => !item.disabledNote && item.onPick()}
			>
				{#if item.folderDepth !== undefined}<span class="pl-ficon"><Icon name="folder" size={14} /></span>{/if}
				<span class="pl-label">{item.label}</span>
				{#if item.disabledNote}<span class="pl-note">{item.disabledNote}</span>{/if}
			</div>
		{/if}
	{/each}
</div>

<style>
	.pl-menu {
		position: absolute;
		z-index: 6;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		padding: 6px;
		border: 1px solid var(--pl-menu-line);
		border-radius: 10px;
		background: var(--pl-menu-bg);
		box-shadow: var(--pl-shadow);
		max-height: 60vh;
		overflow-y: auto;
	}
	.pl-title {
		padding: 6px 8px 4px;
		font-size: 12px;
		color: var(--text-muted);
	}
	.pl-sep {
		height: 1px;
		margin: 4px;
		background: var(--pl-menu-sep);
	}
	.pl-item {
		height: 32px;
		flex: none;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 8px;
		border-radius: 6px;
		color: var(--text-normal);
		font-size: 14px;
	}
	.pl-item:hover {
		background: var(--pl-menu-hover);
	}
	.pl-item.pl-danger {
		color: var(--pl-danger);
	}
	.pl-item.pl-off {
		opacity: 0.45;
		cursor: default;
	}
	.pl-item.pl-off:hover {
		background: none;
	}
	.pl-tick {
		width: 14px;
		display: flex;
		color: var(--pl-accent-text);
	}
	.pl-ficon {
		display: flex;
		color: var(--text-muted);
	}
	.pl-label {
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pl-note {
		font-size: 12px;
		color: var(--text-muted);
	}
</style>
