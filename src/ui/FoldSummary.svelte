<script lang="ts">
	import { foldSummary } from './folding';

	interface Props {
		text: string;
		/** Left padding, so the line sits under the prompt name. */
		indent: string;
		dimmed: boolean;
		/** C-4: search matches in this prompt; shown instead of the line count. */
		matches?: number;
		onopen: () => void;
	}
	let { text, indent, dimmed, matches = 0, onopen }: Props = $props();

	const s = $derived(foldSummary(text));
</script>

<!-- C-1: a folded prompt shows its first line and how many lines it has. Clicking it opens the prompt. -->
<button type="button" class="sum" style:padding-left={indent} style:opacity={dimmed ? 0.45 : 1} onclick={onopen}>
	<span class="first">{s.firstLine || 'Empty'}</span>
	{#if matches}
		<span class="count hit">{matches === 1 ? '1 match' : `${matches} matches`}</span>
	{:else if s.lines}
		<span class="count">{s.lines === 1 ? '1 line' : `${s.lines} lines`}</span>
	{/if}
</button>

<style>
	.sum,
	.sum:hover {
		width: 100%;
		height: auto;
		box-sizing: border-box;
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin-top: 2px;
		padding-top: 2px;
		padding-right: 0;
		padding-bottom: 0;
		border: 0;
		background: transparent;
		box-shadow: none;
		text-align: left;
		font: inherit;
		cursor: pointer;
	}
	.first {
		flex: 1;
		min-width: 0;
		font-family: var(--font-monospace);
		font-size: 12.5px;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.count {
		flex: none;
		font-size: 12px;
		color: var(--text-faint);
	}
	.count.hit {
		color: var(--text-accent);
	}
</style>
