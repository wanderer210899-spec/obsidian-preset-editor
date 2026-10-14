<script lang="ts">
	import { t } from '../../i18n';
	import { portal, pressable } from './actions';
	import Icon from './Icon.svelte';
	import type { MenuItem } from './types';

	/** The desktop "Move to…" box, as in the B2 PC mockup (L-8). */
	interface Props {
		title: string;
		items: MenuItem[];
		onClose: () => void;
	}
	let { title, items, onClose }: Props = $props();
</script>

<div class="pl-vars pl-layer" use:portal={document.body}>
	<div class="pl-scrim" aria-hidden="true" onclick={onClose}></div>
	<div class="pl-box" role="dialog" aria-modal="true" aria-label={title}>
		<h2>{title}</h2>
		<div class="pl-list">
			{#each items as item, i (i)}
				<div role="button" tabindex="0" use:pressable
					class="pl-item"
					class:pl-off={!!item.disabledNote}
					aria-disabled={item.disabledNote ? 'true' : undefined}
					style:padding-left="{8 + (item.folderDepth ?? 0) * 18}px"
					onclick={() => !item.disabledNote && item.onPick()}
				>
					<span class="pl-ficon"><Icon name="folder" size={15} /></span>
					<span class="pl-label">{item.label}</span>
					{#if item.disabledNote}<span class="pl-note">{item.disabledNote}</span>{/if}
				</div>
			{/each}
		</div>
		<div class="pl-foot">
			<div role="button" tabindex="0" use:pressable class="pl-cancel" onclick={onClose}>{t('library.cancel')}</div>
		</div>
	</div>
</div>

<style>
	.pl-layer {
		position: fixed;
		inset: 0;
		z-index: var(--layer-modal, 50);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.pl-scrim {
		position: absolute;
		inset: 0;
		background: var(--pl-scrim);
		cursor: default;
	}
	.pl-box {
		position: relative;
		width: 380px;
		max-width: calc(100% - 32px);
		max-height: 80vh;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 20px;
		border-radius: 12px;
		background: var(--pl-menu-bg);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
		color: var(--text-normal);
		font-family: var(--font-interface);
		font-size: 14px;
	}
	h2 {
		margin: 0;
		font-size: 17px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pl-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		overflow-y: auto;
	}
	.pl-item {
		height: 36px;
		flex: none;
		display: flex;
		align-items: center;
		gap: 8px;
		padding-right: 8px;
		border-radius: 6px;
	}
	.pl-item:hover {
		background: var(--pl-menu-hover);
	}
	.pl-item.pl-off {
		opacity: 0.45;
		cursor: default;
	}
	.pl-item.pl-off:hover {
		background: none;
	}
	.pl-ficon {
		display: flex;
		color: var(--text-muted);
	}
	.pl-label {
		flex: 1;
	}
	.pl-note {
		font-size: 12px;
		color: var(--text-muted);
	}
	.pl-foot {
		display: flex;
		justify-content: flex-end;
	}
	.pl-cancel,
	.pl-cancel:hover {
		display: flex;
		align-items: center;
		height: 34px;
		padding: 0 14px;
		border-radius: 8px;
		background: var(--pl-btn2);
		font-size: 13px;
	}
</style>
