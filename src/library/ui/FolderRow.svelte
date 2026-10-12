<script lang="ts">
	import { pressable } from './actions';
	import Icon from './Icon.svelte';

	/** A folder in the list: tap to fold or unfold (L-1). */
	interface Props {
		name: string;
		depth: number;
		open: boolean;
		count: number;
		/** First few preset names, shown while folded. */
		peek: string;
		/** Newest edit, e.g. "2h ago" (wide layout only). */
		when: string;
		narrow: boolean;
		onToggle: () => void;
	}
	let { name, depth, open, count, peek, when, narrow, onToggle }: Props = $props();
</script>

{#if narrow}
	<div role="button" tabindex="0" use:pressable class="pl-row pl-narrow" aria-expanded={open} style:padding-left="{14 + depth * 22}px" onclick={onToggle}>
		<span class="pl-ficon"><Icon name="folder" size={18} /></span>
		<span class="pl-text pl-col">
			<span class="pl-name">{name}</span>
			{#if !open && peek}<span class="pl-peek">{peek}</span>{/if}
		</span>
		<span class="pl-count">{count}</span>
		<span class="pl-chev"><Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} stroke={2} /></span>
	</div>
{:else}
	<div role="button" tabindex="0" use:pressable class="pl-row" aria-expanded={open} style:padding-left="{8 + depth * 24}px" onclick={onToggle}>
		<span class="pl-chev"><Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} stroke={2} /></span>
		<span class="pl-ficon"><Icon name="folder" size={16} /></span>
		<span class="pl-text">
			<span class="pl-name">{name}</span>
			{#if !open && peek}<span class="pl-peek">{peek}</span>{/if}
		</span>
		<span class="pl-count pl-w28">{count}</span>
		<span class="pl-when">{when}</span>
	</div>
{/if}

<style>
	.pl-row {
		width: 100%;
		min-height: 46px;
		display: flex;
		align-items: center;
		gap: 10px;
		padding-right: 8px;
		border-bottom: 1px solid var(--pl-line);
		color: var(--text-normal);
	}
	.pl-row:hover {
		background: var(--pl-hover);
	}
	.pl-row.pl-narrow {
		min-height: 58px;
		padding-top: 6px;
		padding-bottom: 6px;
		padding-right: 14px;
		border-bottom-color: var(--pl-group-line);
	}
	.pl-row.pl-narrow:hover {
		background: none;
	}
	.pl-chev,
	.pl-ficon {
		display: flex;
		flex: none;
		color: var(--text-muted);
	}
	.pl-text {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: baseline;
		gap: 10px;
	}
	.pl-text.pl-col {
		flex-direction: column;
		align-items: stretch;
		gap: 2px;
	}
	.pl-name {
		flex: none;
		font-weight: 600;
	}
	.pl-peek {
		min-width: 0;
		font-size: 12.5px;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pl-count {
		flex: none;
		font-size: 13px;
		color: var(--text-muted);
	}
	.pl-w28 {
		width: 28px;
		text-align: right;
	}
	.pl-when {
		width: 80px;
		flex: none;
		text-align: right;
		font-size: 13px;
		color: var(--text-muted);
	}
</style>
