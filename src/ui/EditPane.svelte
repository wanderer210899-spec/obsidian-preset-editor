<script lang="ts">
	import { kindOf } from '../kinds';
	import PlaceholderRow from './PlaceholderRow.svelte';
	import PromptRow from './PromptRow.svelte';
	import type { Query } from '../search';
	import type { CurrentMatch, EditorDocument, SaveState, Sizes, UiRow } from './types';

	const STATUS: Record<SaveState, string> = { saved: 'Saved', saving: 'Saving…', error: 'Not saved' };

	interface Props {
		doc: EditorDocument;
		rows: UiRow[];
		title: string;
		status: SaveState;
		sizes: Sizes;
		pop: string | null;
		flash: string | null;
		/** C-5: the one open prompt, or null when all are folded. */
		openId: string | null;
		ontoggleopen: (id: string) => void;
		/** C-4: the search. */
		query: Query;
		/** C-4: how many matches each prompt has. */
		counts: ReadonlyMap<string, number>;
		/** C-7: the match "2 of 5" points to. */
		current: CurrentMatch | null;
		/** No hover (narrow layout or touch): the first tap on a divider shows "Add prompt here". */
		tapToReveal: boolean;
		ontogglepop: (id: string) => void;
		oninsert: (at: number) => void;
	}
	let { doc, rows, title, status, sizes, pop, flash, openId, ontoggleopen, query, counts, current, tapToReveal, ontogglepop, oninsert }: Props = $props();

	/** The divider shown by a first tap (DECISIONS.md, 2026-10-10). */
	let revealed = $state<number | null>(null);

	function tapDivider(i: number) {
		if (tapToReveal && revealed !== i) {
			revealed = i;
			return;
		}
		revealed = null;
		oninsert(i);
	}

	const onCount = $derived(rows.filter((r) => r.enabled).length);
</script>

<svelte:window
	onpointerdown={(e) => {
		if (!(e.target as Element | null)?.closest?.('.add-here')) revealed = null;
	}}
/>

<div class="pane" class:narrow={sizes.narrow} class:tap={tapToReveal}>
	<div class="h1">{title}</div>
	<div class="status">{onCount} of {rows.length} prompts on · {STATUS[status]}</div>
	<!-- E-2: no dragging here from 1.3; prompts are dragged in the Order panel. -->
	<div>
		{#each rows as row, i (row.id)}
			<div
				class="row"
				class:flash={flash === row.id}
				class:pop-open={pop === row.id}
				data-anchor={row.id}
			>
				<div class="add-here" class:revealed={revealed === i} role="button" tabindex="-1" onclick={() => tapDivider(i)}>
					<div class="bar"></div><span>Add prompt here</span><div class="bar"></div>
				</div>
				{#if kindOf(row.id).startsWith('placeholder')}
					<PlaceholderRow
						{row}
						{sizes}
						popOpen={pop === row.id}
						open={openId === row.id}
						ontoggleopen={() => ontoggleopen(row.id)}
						update={(patch) => doc.update(row.id, patch)}
						ontoggle={() => doc.setEnabled(row.id, !row.enabled)}
						ontogglepop={() => ontogglepop(row.id)}
						oninsert={(offset) => oninsert(i + offset)}
					/>
				{:else}
					<PromptRow
						{row}
						{sizes}
						popOpen={pop === row.id}
						open={openId === row.id}
						ontoggleopen={() => ontoggleopen(row.id)}
						update={(patch) => doc.update(row.id, patch)}
						ontoggle={() => doc.setEnabled(row.id, !row.enabled)}
						ontogglepop={() => ontogglepop(row.id)}
						oninsert={(offset) => oninsert(i + offset)}
						ondelete={() => doc.remove(row.id)}
						{query}
						matches={counts.get(row.id) ?? 0}
						current={current && current.id === row.id && !current.inName ? current : null}
					/>
				{/if}
			</div>
		{/each}
	</div>
	<div class="add-end" role="button" tabindex="0" onclick={() => oninsert(rows.length)}>
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5v14"></path></svg>Add prompt
	</div>
</div>

<style>
	.pane {
		max-width: 720px;
		margin: 0 auto;
		padding: 24px 48px 120px;
	}
	.pane.narrow {
		padding: 18px 16px 120px;
	}
	.h1 {
		font-size: 32px;
		font-weight: 700;
		letter-spacing: -0.015em;
		line-height: 1.2;
	}
	.narrow .h1 {
		font-size: 26px;
	}
	.status {
		font-size: 13px;
		color: var(--text-muted);
		margin: 6px 0 20px;
	}
	.row {
		position: relative;
		border-top: 1px solid var(--background-modifier-border);
		padding: 14px 12px 16px;
		margin: 0 -12px;
		background: transparent;
		transition:
			background 0.5s ease,
			box-shadow 0.15s;
	}
	.row.flash {
		background: var(--pe-flash);
		border-radius: 8px;
	}
	.row.pop-open {
		z-index: 10;
	}
	.add-here {
		position: absolute;
		left: 12px;
		right: 12px;
		top: -9px;
		height: 18px;
		display: flex;
		align-items: center;
		gap: 8px;
		opacity: 0;
		cursor: pointer;
		z-index: 2;
		color: var(--text-accent);
		font-size: 12px;
		transition: opacity 0.12s;
	}
	.add-here:hover,
	.add-here.revealed {
		opacity: 1;
	}
	.tap .add-here:hover:not(.revealed) {
		opacity: 0;
	}
	.narrow .add-here {
		top: -12px;
		height: 24px;
	}
	.add-here .bar {
		flex: 1;
		height: 2px;
		background: var(--interactive-accent);
		border-radius: 1px;
	}
	.add-here span {
		background: var(--background-primary);
		padding: 0 6px;
	}
	.add-end {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		border-top: 1px solid var(--background-modifier-border);
		color: var(--text-muted);
		cursor: pointer;
		font-size: 14px;
	}
	.add-end:hover {
		color: var(--text-normal);
	}
</style>
