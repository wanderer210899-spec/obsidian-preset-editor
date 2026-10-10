<script lang="ts">
	import { assemble, type PreviewBlock } from '../assemble';
	import { macroSpans } from '../text-editor';
	import type { Sizes, UiRow } from './types';

	interface Props {
		rows: UiRow[];
		sizes: Sizes;
		onjump: (id: string) => void;
	}
	let { rows, sizes, onjump }: Props = $props();

	const blocks = $derived(assemble(rows));

	const ROLE_DOT: Record<string, string> = {
		system: 'var(--text-faint)',
		user: 'var(--color-blue)',
		assistant: 'var(--color-green)',
	};

	/** V-9: the role, or "Inserted" for Chat History and Chat Examples. */
	function roleOf(b: PreviewBlock): string {
		const role = b.type === 'history' ? null : b.role;
		return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Inserted';
	}

	function dotOf(b: PreviewBlock): string {
		return (b.type !== 'history' && b.role && ROLE_DOT[b.role]) || 'var(--text-faint)';
	}

	const messages = (n: number) => (n === 1 ? '1 message' : `${n} messages`);

	/** V-7: where an in-chat prompt goes. */
	function whereOf(depth: number): string {
		return depth === 0 ? 'After the last message' : `${messages(depth)} from the end`;
	}

	/** V-3: splits text into plain parts and macros, which stay as typed. */
	function segments(text: string): { text: string; kept: boolean }[] {
		const out: { text: string; kept: boolean }[] = [];
		let at = 0;
		for (const span of macroSpans(text)) {
			if (span.from > at) out.push({ text: text.slice(at, span.from), kept: false });
			out.push({ text: text.slice(span.from, span.to), kept: true });
			at = span.to;
		}
		if (at < text.length) out.push({ text: text.slice(at), kept: false });
		return out;
	}
</script>

<!-- Preview screen (SRS 3.4). Macros are worked out from 1.2 on (V-4 to V-6). -->
<div class="pane" class:narrow={sizes.narrow}>
	<div class="legend">
		<span><span class="key-kept">{'{ }'}</span>Left as typed</span>
		<span><span class="key-ph"></span>Placeholder</span>
	</div>
	{#each blocks as b, i (i)}
		{#if b.type === 'history'}
			<!-- V-7: the chat history is one tinted block that holds the in-chat prompts. -->
			<div class="history">
				<div class="blk">{@render block(b)}</div>
				{#each b.inChat as p, j (j)}
					<div class="blk">{@render block(p)}</div>
				{/each}
			</div>
		{:else}
			<div class="blk">{@render block(b)}</div>
		{/if}
	{/each}
</div>

{#snippet block(b: PreviewBlock)}
	<div class="lab">
		<div class="role"><span class="dot" style:background={dotOf(b)}></span>{roleOf(b)}</div>
		<div class="chip" role="button" tabindex="0" title="Edit this prompt" onclick={() => onjump(b.id)}>
			{b.name}<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"></path></svg>
		</div>
		{#if b.type !== 'history' && b.depth !== null}
			<div class="where">{whereOf(b.depth)}</div>
		{/if}
	</div>
	<div class="content">
		{#if b.type === 'text'}
			<div class="txt">{#each segments(b.text) as s}<span class:kept={s.kept}>{s.text}</span>{/each}</div>
		{:else}
			<div class="ph">{b.name}</div>
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
	/* Tinted with the theme's accent colour; reaches a little past the
	   columns so the text inside lines up with the blocks around it. */
	.history {
		margin: 0 -12px;
		padding: 0 12px;
		border-radius: 8px;
		background: hsla(var(--interactive-accent-hsl), 0.08);
	}
	.narrow .history {
		margin: 0 -10px;
		padding: 0 10px;
	}
	.history > .blk:first-child,
	.history + .blk {
		border-top-color: transparent;
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
	.where {
		font-size: 12px;
		line-height: 1.35;
		color: var(--text-faint);
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
