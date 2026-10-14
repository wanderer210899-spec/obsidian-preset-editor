<script lang="ts">
	import type { PreviewBlock } from '../assemble';
	import { t } from '../i18n';
	import type { WorkedOut } from '../macros';
	import { markParts, type Query } from '../search';
	import type { CurrentMatch, Sizes } from './types';

	interface Props {
		/** The full prompt, put together by the editor (V-1, V-4). */
		blocks: PreviewBlock<WorkedOut>[];
		sizes: Sizes;
		/** C-4: the search. Matches are highlighted. */
		query: Query;
		/** C-7: the match "2 of 5" points to. */
		current: CurrentMatch | null;
		onjump: (id: string) => void;
	}
	let { blocks, sizes, query, current, onjump }: Props = $props();

	/** C-7: the current match, when it's in this prompt's text. */
	function currentIn(id: string): CurrentMatch | null {
		return current && current.id === id ? current : null;
	}

	const ROLE_DOT: Record<string, string> = {
		system: 'var(--text-faint)',
		user: 'var(--color-blue)',
		assistant: 'var(--color-green)',
	};

	/** V-9: the role, or "Inserted" for Chat History and Chat Examples. */
	function roleOf(b: PreviewBlock<WorkedOut>): string {
		const role = b.type === 'history' ? null : b.role;
		if (role === 'system') return t('ps.system');
		if (role === 'user') return t('ps.user');
		if (role === 'assistant') return t('ps.assistant');
		return role ? role.charAt(0).toUpperCase() + role.slice(1) : t('preview.inserted');
	}

	function dotOf(b: PreviewBlock<WorkedOut>): string {
		return (b.type !== 'history' && b.role && ROLE_DOT[b.role]) || 'var(--text-faint)';
	}

	/** V-7: where an in-chat prompt goes. */
	function whereOf(depth: number): string {
		return depth === 0 ? t('preview.atEnd') : t('preview.fromEnd', { n: depth });
	}

	/** V-7: how many in-chat prompts the chat history holds. */
	function insideOf(n: number): string {
		return n === 1 ? t('preview.insideOne') : t('preview.inside', { n });
	}
</script>

<!-- Preview screen (SRS 3.4). -->
<div class="pane" class:narrow={sizes.narrow}>
	<div class="legend">
		<span><span class="key-val"></span>{t('preview.value')}</span>
		<span><span class="key-kept">{'{ }'}</span>{t('preview.kept')}</span>
		<span><span class="key-ph"></span>{t('preview.placeholder')}</span>
	</div>
	{#each blocks as b, i (i)}
		{#if b.type === 'history'}
			<!-- V-7: the chat history is one shaded block that holds the in-chat prompts. -->
			<div class="history-slot">
				<div class="history">
					<div class="blk" data-pv={b.id}>{@render block(b)}</div>
					{#each b.inChat as p, j (j)}
						<div class="blk" data-pv={p.id}>{@render block(p)}</div>
					{/each}
					{#if b.inChat.length}<div class="history-end">{t('preview.endOfHistory')}</div>{/if}
				</div>
			</div>
		{:else}
			<div class="blk" data-pv={b.id}>{@render block(b)}</div>
		{/if}
	{/each}
</div>

{#snippet block(b: PreviewBlock<WorkedOut>)}
	<div class="lab">
		<div class="role"><span class="dot" style:background={dotOf(b)}></span>{roleOf(b)}</div>
		<div class="chip" role="button" tabindex="0" title={t('preview.editThis')} onclick={() => onjump(b.id)}>
			{b.name}<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"></path></svg>
		</div>
		{#if b.type !== 'history' && b.depth !== null}
			<div class="where">{whereOf(b.depth)}</div>
		{/if}
	</div>
	<div class="content">
		{#if b.type === 'text'}
			<!-- V-11: a variable that isn't set shows the "empty" tag. -->
			<div class="txt">{#each markParts(b.text.parts, query, currentIn(b.id)) as p}{#if p.value && !p.text}<span class="empty">{t('preview.empty')}</span>{:else}<span class:val={p.value} class:kept={p.kept} class:pe-hit={p.hit} class:pe-now={p.now}>{p.text}</span>{/if}{/each}</div>
		{:else}
			<div class="ph-line">
				<div class="ph">{b.name}</div>
				{#if b.type === 'history' && b.inChat.length}<span class="inside">{insideOf(b.inChat.length)}</span>{/if}
			</div>
		{/if}
	</div>
{/snippet}

<style>
	.pane {
		max-width: 780px;
		margin: 0 auto;
		padding: 24px 48px 120px;
	}
	.pane.narrow {
		padding: 18px 16px 120px;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		column-gap: 18px;
		row-gap: 6px;
		margin-bottom: 14px;
		font-size: 12px;
		color: var(--text-muted);
	}
	.legend > span {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.key-val {
		width: 18px;
		height: 12px;
		border-radius: 3px;
		background: var(--pe-val-bg);
	}
	.key-kept {
		font-family: var(--font-monospace);
		color: var(--pe-macro);
	}
	.key-ph {
		width: 18px;
		height: 12px;
		box-sizing: border-box;
		border-radius: 3px;
		border: 1px dashed var(--background-modifier-border-hover);
	}
	.blk {
		display: grid;
		grid-template-columns: 130px minmax(0, 1fr);
		gap: 18px;
		padding: 14px 0;
		border-top: 1px solid var(--background-modifier-border);
	}
	.narrow .blk {
		grid-template-columns: minmax(0, 1fr);
		gap: 8px;
	}
	/* The chat history sits between two divider lines, on a shaded block
	   that reaches a little past the columns, so the text inside lines up
	   with the blocks around it. */
	.history-slot {
		padding: 12px 0;
		border-top: 1px solid var(--background-modifier-border);
	}
	.history {
		margin: 0 -12px;
		padding: 0 12px;
		border-radius: 10px;
		background: var(--background-secondary);
	}
	.narrow .history {
		margin: 0 -10px;
		padding: 0 10px;
	}
	.history > .blk:first-child {
		border-top-color: transparent;
	}
	.ph-line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		column-gap: 12px;
		row-gap: 6px;
	}
	.inside {
		font-size: 13px;
		color: var(--text-faint);
	}
	.history-end {
		padding: 12px 0 14px;
		border-top: 1px solid var(--background-modifier-border);
		font-size: 13px;
		color: var(--text-faint);
	}
	.lab {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
		min-width: 0;
	}
	.narrow .lab {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		column-gap: 10px;
		row-gap: 0;
	}
	.role {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-muted);
		font-weight: 600;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 3px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		line-height: 1.35;
		color: var(--text-muted);
		cursor: pointer;
	}
	.narrow .chip {
		min-height: 32px;
	}
	.chip:hover {
		color: var(--text-accent);
	}
	.chip svg {
		flex: none;
		opacity: 0.7;
	}
	/* V-7: the depth pill, tinted with the theme's accent colour. */
	.where {
		padding: 2px 9px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
		line-height: 1.5;
		color: var(--text-accent);
		background: hsla(var(--interactive-accent-hsl), 0.14);
	}
	:global(body.theme-dark) .where {
		background: hsla(var(--interactive-accent-hsl), 0.24);
	}
	.content {
		min-width: 0;
	}
	.txt {
		font-family: var(--font-monospace);
		font-size: 13px;
		line-height: 1.75;
		white-space: pre-wrap;
		word-break: break-word;
		overflow-wrap: anywhere;
		color: var(--text-normal);
	}
	.kept {
		color: var(--pe-macro);
	}
	.val {
		padding: 0 2px;
		border-radius: 3px;
		background: var(--pe-val-bg);
	}
	/* A search match can split a value in two; keep it looking like one. */
	.val + .val {
		padding-left: 0;
	}
	.val:has(+ .val) {
		padding-right: 0;
	}
	/* C-4: search matches. */
	.pe-hit {
		background: var(--pe-hit);
		border-radius: 2px;
	}
	/* C-7: the match "2 of 5" points to. */
	.pe-hit.pe-now {
		background: var(--pe-now);
	}
	.empty {
		padding: 0 4px;
		border-radius: 3px;
		color: var(--text-faint);
		background: var(--background-modifier-hover);
	}
	.ph {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 4px 10px;
		border: 1px dashed var(--background-modifier-border-hover);
		border-radius: 6px;
		font-family: var(--font-monospace);
		font-size: 13px;
		color: var(--text-muted);
	}
</style>
