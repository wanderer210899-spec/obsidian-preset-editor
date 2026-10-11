<script lang="ts">
	import { onMount } from 'svelte';
	import { findRanges } from '../search';
	import { createPromptEditor, type PromptEditor } from '../text-editor';
	import { getTextSettings } from './text-settings';

	interface Props {
		text: string;
		/** C-4: the search, already normalised ('' = none). Matches are highlighted. */
		query?: string;
		onchange: (text: string) => void;
	}
	let { text, query = '', onchange }: Props = $props();

	const settings = getTextSettings();
	let host: HTMLDivElement;
	let editor: PromptEditor | undefined;

	onMount(() => {
		editor = createPromptEditor(host, {
			text,
			placeholder: 'Write the prompt…',
			autoComplete: settings.autoComplete,
			onChange: (t) => onchange(t),
		});
		return () => editor?.destroy();
	});

	$effect(() => {
		editor?.setText(text);
	});

	$effect(() => {
		editor?.setHits(findRanges(text, query));
	});

	$effect(() => {
		editor?.setAutoComplete(settings.autoComplete);
	});
</script>

<div class="pe-text" bind:this={host}></div>

<style>
	.pe-text {
		min-height: 24px;
	}
	.pe-text :global(.cm-editor) {
		background: transparent;
		font: inherit;
	}
	.pe-text :global(.cm-editor.cm-focused) {
		outline: none;
	}
	.pe-text :global(.cm-scroller) {
		font: inherit;
		line-height: inherit;
	}
	.pe-text :global(.cm-content) {
		padding: 0;
		color: var(--text-normal);
		caret-color: var(--text-normal);
	}
	.pe-text :global(.cm-line) {
		padding: 0;
	}
	.pe-text :global(.cm-placeholder) {
		color: var(--text-faint);
	}
	.pe-text :global(.pe-macro) {
		color: var(--pe-macro);
		background: var(--pe-macro-bg);
		border-radius: 3px;
	}
	.pe-text :global(.pe-variable) {
		color: var(--pe-var);
		background: var(--pe-var-bg);
		border-radius: 3px;
	}
	.pe-text :global(.pe-hit) {
		background: var(--pe-hit);
		border-radius: 2px;
	}
	/* W-4: the tag pair the cursor is in. */
	.pe-text :global(.pe-pair) {
		background-color: var(--pe-pair);
		border-radius: 3px;
	}
	.pe-text :global(.pe-control) {
		color: var(--pe-ctl);
		background: var(--pe-ctl-bg);
		border-radius: 3px;
	}
</style>
