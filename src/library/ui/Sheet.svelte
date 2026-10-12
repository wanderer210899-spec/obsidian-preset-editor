<script lang="ts">
	import { portal, pressable } from './actions';
	import Icon from './Icon.svelte';
	import type { MenuItem } from './types';

	/** A phone sheet that slides up from the bottom, as in the B2 Phone mockup. */
	interface Props {
		title: string;
		sub?: string;
		items: MenuItem[];
		onClose: () => void;
	}
	let { title, sub, items, onClose }: Props = $props();
</script>

<div class="pl-vars pl-layer" use:portal={document.body}>
	<div class="pl-scrim" aria-hidden="true" onclick={onClose}></div>
	<div class="pl-sheet" role="dialog" aria-modal="true" aria-label={title}>
		<div class="pl-grab"><span></span></div>
		<div class="pl-head">
			<span class="pl-titles">
				<span class="pl-title">{title}</span>
				{#if sub}<span class="pl-sub">{sub}</span>{/if}
			</span>
			<div role="button" tabindex="0" use:pressable class="pl-close" aria-label="Close" onclick={onClose}><Icon name="x" size={16} stroke={2} /></div>
		</div>
		<div class="pl-list">
			{#each items as item, i (i)}
				<div role="button" tabindex="0" use:pressable
					class="pl-item"
					class:pl-danger={item.danger}
					class:pl-off={!!item.disabledNote}
					aria-disabled={item.disabledNote ? 'true' : undefined}
					style:padding-left={item.folderDepth !== undefined ? `${14 + item.folderDepth * 22}px` : undefined}
					onclick={() => !item.disabledNote && item.onPick()}
				>
					{#if item.folderDepth !== undefined}<span class="pl-ficon"><Icon name="folder" size={18} /></span>{/if}
					<span class="pl-label">{item.label}</span>
					{#if item.disabledNote}<span class="pl-note">{item.disabledNote}</span>{/if}
					{#if item.checked}<span class="pl-tick"><Icon name="check" size={16} stroke={2.4} /></span>{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.pl-layer {
		position: fixed;
		inset: 0;
		z-index: var(--layer-modal, 50);
	}
	.pl-scrim {
		position: absolute;
		inset: 0;
		background: var(--pl-scrim);
		cursor: default;
	}
	.pl-sheet {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		max-height: 80%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		padding-bottom: calc(30px + env(safe-area-inset-bottom, 0px));
		border-radius: 14px 14px 0 0;
		background: var(--background-primary);
		box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.18);
		overflow: hidden;
		color: var(--text-normal);
		font-family: var(--font-interface);
		font-size: 15px;
	}
	.pl-grab {
		display: flex;
		justify-content: center;
		padding-top: 8px;
	}
	.pl-grab span {
		width: 36px;
		height: 5px;
		border-radius: 3px;
		background: var(--pl-grab);
	}
	.pl-head {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 8px 4px 8px 16px;
	}
	.pl-titles {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.pl-title {
		font-size: 17px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pl-sub {
		font-size: 13px;
		color: var(--text-muted);
	}
	.pl-close {
		width: 44px;
		height: 44px;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
	}
	.pl-list {
		display: flex;
		flex-direction: column;
		margin: 0 16px;
		border-radius: 12px;
		background: var(--pl-group);
		overflow-y: auto;
	}
	.pl-item {
		min-height: 52px;
		flex: none;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0 14px;
		border-bottom: 1px solid var(--pl-group-line);
		color: var(--text-normal);
	}
	.pl-item:last-child {
		border-bottom: 0;
	}
	.pl-item.pl-danger {
		color: var(--pl-danger);
	}
	.pl-item.pl-off {
		opacity: 0.45;
	}
	.pl-ficon {
		display: flex;
		color: var(--text-muted);
	}
	.pl-label {
		flex: 1;
		min-width: 0;
	}
	.pl-note {
		font-size: 13px;
		color: var(--text-muted);
	}
	.pl-tick {
		display: flex;
		color: var(--pl-accent-text);
	}
</style>
