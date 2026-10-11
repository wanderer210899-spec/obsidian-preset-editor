<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		query: string;
		/** "2 of 5", "No matches", or '' before anything is typed. */
		count: string;
		narrow: boolean;
		onquery: (query: string) => void;
		onstep: (by: 1 | -1) => void;
		onclose: () => void;
	}
	let { query, count, narrow, onquery, onstep, onclose }: Props = $props();

	let input: HTMLInputElement;

	/** Puts the cursor in the box and selects what's there (Ctrl+F again, or the button). */
	export function focus() {
		input?.focus();
		input?.select();
	}

	onMount(focus);

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			onstep(e.shiftKey ? -1 : 1);
		} else if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}
</script>

<!-- C-4: "Find in prompts", from the 1.3 mockup. -->
<div class="bar" class:narrow>
	<label class="box">
		<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
		<input
			bind:this={input}
			value={query}
			oninput={(e) => onquery(e.currentTarget.value)}
			onkeydown={onKeyDown}
			placeholder="Find in prompts"
			aria-label="Find in prompts"
		/>
		<span class="count">{count}</span>
	</label>
	<button type="button" class="btn" aria-label="Previous match" title="Previous match (Shift+Enter)" onclick={() => onstep(-1)}>
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"></path></svg>
	</button>
	<button type="button" class="btn" aria-label="Next match" title="Next match (Enter)" onclick={() => onstep(1)}>
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
	</button>
	<button type="button" class="btn" aria-label="Close search" title="Close (Esc)" onclick={onclose}>
		<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>
	</button>
</div>

<style>
	.bar {
		flex: none;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 8px 16px;
		border-bottom: 1px solid var(--background-modifier-border);
		background: var(--background-primary);
	}
	.bar.narrow {
		padding: 8px 12px;
	}
	.box {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		height: 32px;
		box-sizing: border-box;
		padding: 0 10px;
		border-radius: 8px;
		background: var(--background-modifier-form-field);
		border: 1px solid var(--background-modifier-border);
		color: var(--text-muted);
	}
	.narrow .box {
		height: 40px;
	}
	.box svg {
		flex: none;
	}
	input,
	input:focus,
	input:hover {
		flex: 1;
		min-width: 0;
		height: auto;
		border: 0;
		background: transparent;
		box-shadow: none;
		outline: none;
		padding: 0;
		color: var(--text-normal);
		font: inherit;
		font-size: 13.5px;
	}
	.narrow input {
		font-size: 16px;
	}
	.count {
		flex: none;
		font-size: 12.5px;
		color: var(--text-muted);
		white-space: nowrap;
	}
	.btn,
	.btn:hover {
		width: 30px;
		height: 30px;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 0;
		border-radius: 6px;
		background: transparent;
		box-shadow: none;
		color: var(--text-muted);
		cursor: pointer;
	}
	.btn:hover {
		background: var(--background-modifier-hover);
		color: var(--text-normal);
	}
	.narrow .btn {
		width: 40px;
		height: 40px;
	}
</style>
