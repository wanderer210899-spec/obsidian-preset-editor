<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { t } from '../i18n';

	interface Props {
		query: string;
		/** "2 of 5", "No matches", or '' before anything is typed. */
		count: string;
		narrow: boolean;
		/** C-8 */
		matchCase: boolean;
		/** C-9: replace works in Edit only, so the arrow and replace box only show there. */
		canReplace: boolean;
		replaceOpen: boolean;
		replacement: string;
		onquery: (query: string) => void;
		onstep: (by: 1 | -1) => void;
		onclose: () => void;
		onmatchcase: () => void;
		ontogglereplace: () => void;
		onreplacement: (text: string) => void;
		onreplace: () => void;
		onreplaceall: () => void;
	}
	let {
		query,
		count,
		narrow,
		matchCase,
		canReplace,
		replaceOpen,
		replacement,
		onquery,
		onstep,
		onclose,
		onmatchcase,
		ontogglereplace,
		onreplacement,
		onreplace,
		onreplaceall,
	}: Props = $props();

	let input: HTMLInputElement;
	let replaceInput = $state<HTMLInputElement>();

	/** Puts the cursor in the box and selects what's there (Ctrl+F again, or the button). */
	export function focus() {
		input?.focus();
		input?.select();
	}

	onMount(focus);

	/** C-9: the arrow shows or hides the replace box. Showing it puts the cursor there. */
	async function toggleReplace() {
		ontogglereplace();
		await tick();
		if (replaceOpen) replaceInput?.focus();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			onstep(e.shiftKey ? -1 : 1);
		} else if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}

	function onReplaceKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			onreplace();
		} else if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}
</script>

<!-- C-4: "Find in prompts", from the 1.3 mockup. C-8 to C-10: Match case and replace, in the same look. -->
<div class="bar" class:narrow>
	<div class="row">
		<label class="box">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
			<input
				bind:this={input}
				value={query}
				oninput={(e) => onquery(e.currentTarget.value)}
				onkeydown={onKeyDown}
				placeholder={t('find.box')}
				aria-label={t('find.box')}
			/>
			<span class="count">{count}</span>
			<button
				type="button"
				class="case"
				class:on={matchCase}
				aria-label={t('find.matchCase')}
				aria-pressed={matchCase}
				title={t('find.matchCase')}
				onclick={onmatchcase}>Aa</button
			>
		</label>
		<button type="button" class="btn" aria-label={t('find.previous')} title={t('find.previousKey')} onclick={() => onstep(-1)}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"></path></svg>
		</button>
		<button type="button" class="btn" aria-label={t('find.next')} title={t('find.nextKey')} onclick={() => onstep(1)}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
		</button>
		<button type="button" class="btn" aria-label={t('find.close')} title={t('find.closeKey')} onclick={onclose}>
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>
		</button>
	</div>
	{#if canReplace}
		<button
			type="button"
			class="btn arrow"
			aria-label={replaceOpen ? t('find.hideReplace') : t('find.showReplace')}
			aria-expanded={replaceOpen}
			title={replaceOpen ? t('find.hideReplace') : t('find.replace')}
			onclick={toggleReplace}
		>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d={replaceOpen ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'}></path></svg>
		</button>
		{#if replaceOpen}
			<div class="row">
				<label class="box">
					<input
						bind:this={replaceInput}
						value={replacement}
						oninput={(e) => onreplacement(e.currentTarget.value)}
						onkeydown={onReplaceKeyDown}
						placeholder={t('find.replaceWithBox')}
						aria-label={t('find.replaceWith')}
					/>
				</label>
				<button type="button" class="btn" aria-label={t('find.replace')} title={t('find.replaceKey')} onclick={onreplace}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4c0-1.1.9-2 2-2"></path><path d="M20 2c1.1 0 2 .9 2 2"></path><path d="M22 8c0 1.1-.9 2-2 2"></path><path d="M16 10c-1.1 0-2-.9-2-2"></path><path d="m3 7 3 3 3-3"></path><path d="M6 10V5c0-1.7 1.3-3 3-3h1"></path><rect width="8" height="8" x="2" y="14" rx="2"></rect></svg>
				</button>
				<button type="button" class="btn" aria-label={t('find.replaceAll')} title={t('find.replaceAll')} onclick={onreplaceall}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4c0-1.1.9-2 2-2"></path><path d="M20 2c1.1 0 2 .9 2 2"></path><path d="M22 8c0 1.1-.9 2-2 2"></path><path d="M16 10c-1.1 0-2-.9-2-2"></path><path d="m3 7 3 3 3-3"></path><path d="M6 10V5c0-1.7 1.3-3 3-3h1"></path><rect width="8" height="8" x="2" y="14" rx="2"></rect><rect width="8" height="8" x="14" y="14" rx="2"></rect></svg>
				</button>
				<!-- Keeps the replace box the same width as the find box. -->
				<span class="btn spacer" aria-hidden="true"></span>
			</div>
		{/if}
	{/if}
</div>

<style>
	.bar {
		flex: none;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 8px 16px;
		border-bottom: 1px solid var(--background-modifier-border);
		background: var(--background-primary);
	}
	.bar.narrow {
		padding: 8px 12px;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.box {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		height: 32px;
		box-sizing: border-box;
		padding: 0 4px 0 10px;
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
	/* C-8: "Aa" inside the find box. On shows in the accent colour. */
	.case,
	.case:hover {
		flex: none;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 0;
		border-radius: 5px;
		background: transparent;
		box-shadow: none;
		color: var(--text-muted);
		font: inherit;
		font-size: 12.5px;
		font-weight: 600;
		cursor: pointer;
	}
	.case:hover {
		background: var(--background-modifier-hover);
		color: var(--text-normal);
	}
	.case.on,
	.case.on:hover {
		color: var(--text-accent);
		background: hsla(var(--interactive-accent-hsl), 0.15);
	}
	.narrow .case {
		width: 32px;
		height: 32px;
		font-size: 14px;
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
	/* C-9: the arrow under the find box. */
	.btn.arrow {
		height: 22px;
	}
	.narrow .btn.arrow {
		height: 32px;
	}
	.btn.spacer {
		visibility: hidden;
	}
</style>
