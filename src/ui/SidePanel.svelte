<script lang="ts">
	import { kindOf } from '../kinds';
	import { sortable } from './actions';
	import Grip from './Grip.svelte';
	import Segmented from './Segmented.svelte';
	import type { EditorDocument, Sizes, Tab, UiRow } from './types';

	interface Props {
		doc: EditorDocument;
		rows: UiRow[];
		sizes: Sizes;
		tab: Tab;
		flash: string | null;
		onpicktab: (tab: Tab) => void;
		onjump: (id: string) => void;
		onclose: () => void;
	}
	let { doc, rows, sizes, tab, flash, onpicktab, onjump, onclose }: Props = $props();
</script>

<div class="hd" style:height={sizes.narrow ? '56px' : '48px'}>
	<Segmented
		fill
		options={[
			{ value: 'order' as Tab, label: 'Order', count: rows.length },
			{ value: 'vars' as Tab, label: 'Variables', count: '' },
		]}
		value={tab}
		onpick={onpicktab}
		height={sizes.narrow ? '36px' : '26px'}
	/>
	{#if sizes.narrow}
		<div class="close" role="button" tabindex="0" title="Close" onclick={onclose}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>
		</div>
	{/if}
</div>

{#if tab === 'order'}
	<div class="hint">Drag a handle to reorder · {sizes.narrow ? 'tap' : 'click'} a name to jump to it</div>
	<div class="list" use:sortable={{ handle: '.pe-grip', onMove: (id, to) => doc.move(id, to) }}>
		{#each rows as row, i (row.id)}
			<div class="orow" class:flash={flash === row.id} data-row={row.id} style:height={sizes.oRowH}>
				<Grip plain width={sizes.gripW} height="100%" />
				<span class="n">{i + 1}</span>
				<div
					class="name"
					role="button"
					tabindex="0"
					title="Jump to prompt"
					class:ph={kindOf(row.id).startsWith('placeholder')}
					style:opacity={row.enabled ? 1 : 0.45}
					onclick={() => onjump(row.id)}
				>
					<span>{row.prompt.name ?? row.id}</span>
				</div>
				<div
					class="dot-hit"
					role="switch"
					aria-checked={row.enabled}
					tabindex="0"
					title={row.enabled ? 'On — click to switch off' : 'Off — click to switch on'}
					onclick={() => doc.setEnabled(row.id, !row.enabled)}
				>
					<span class="dot" class:on={row.enabled}></span>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<!-- Variables tab: logic arrives in 1.1+ (SRS 3.5); what 1.0 shows is open item 5. -->
	<div class="list vars"></div>
{/if}

<style>
	.hd {
		flex: none;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 8px 0 12px;
	}
	.close {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		cursor: pointer;
		color: var(--text-muted);
	}
	.hint {
		padding: 2px 14px 8px;
		font-size: 12px;
		color: var(--text-muted);
	}
	.list {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 0 8px 16px;
	}
	.list.vars {
		padding: 2px 16px 24px;
	}
	.orow {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 0 2px;
		border-radius: 6px;
		background: transparent;
	}
	.orow:hover {
		background: var(--background-modifier-hover);
	}
	.orow.flash {
		background: var(--background-modifier-active-hover);
	}
	.orow:global(.pe-lifted) {
		background: var(--background-primary);
		box-shadow: var(--pe-lift);
	}
	.n {
		width: 18px;
		flex: none;
		font-family: var(--font-monospace);
		font-size: 11px;
		color: var(--text-faint);
		text-align: right;
	}
	.name {
		flex: 1;
		min-width: 0;
		height: 100%;
		display: flex;
		align-items: center;
		padding-left: 6px;
		cursor: pointer;
		font-size: 13px;
		color: var(--text-normal);
	}
	.name.ph {
		font-style: italic;
	}
	.name:hover {
		color: var(--text-accent);
	}
	.name span {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.dot-hit {
		width: 32px;
		height: 100%;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 4px;
		background: var(--pe-toggle-off);
		transition: background 0.15s;
	}
	.dot.on {
		background: var(--interactive-accent);
	}
</style>
