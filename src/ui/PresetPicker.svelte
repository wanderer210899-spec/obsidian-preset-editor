<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '../i18n';
	import { portal } from './actions';
	import type { PresetChoice, PresetPort, SpotRow } from './types';

	/**
	 * M-1: Copy to… and Move to…. First pick a preset (mockup O.5), then tap the
	 * spot where the prompts go (O.6). Narrow: a sheet from the bottom. Wide: the
	 * same in a box in the middle of the screen.
	 */
	interface Props {
		verb: 'Copy' | 'Move';
		/** The prompts that go. */
		names: string[];
		narrow: boolean;
		port: PresetPort;
		onpick: (target: PresetChoice, at: number) => Promise<void>;
		onclose: () => void;
	}
	let { verb, names, narrow, port, onpick, onclose }: Props = $props();

	let presets = $state<PresetChoice[] | null>(null);
	let query = $state('');
	let target = $state<PresetChoice | null>(null);
	let spotRows = $state<SpotRow[] | null>(null);
	/** Where the prompts go, as a position in `spotRows`. None until tapped. */
	let spot = $state<number | null>(null);
	let busy = $state(false);

	const what = $derived(names.length === 1 ? (names[0] ?? '') : t('picker.prompts', { n: names.length }));
	const title = $derived(target ? target.name : t(verb === 'Copy' ? 'picker.copyTitle' : 'picker.moveTitle', { what }));
	const sub = $derived(
		!target ? t('picker.pickPreset') : t(names.length === 1 ? 'picker.tapOne' : 'picker.tapMany', { what }),
	);

	const byName = (a: { name: string }, b: { name: string }) =>
		a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

	/** Presets grouped by folder, as in O.5. Search looks at names only (as L-10). */
	const groups = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const folders = new Map<string, PresetChoice[]>();
		for (const p of presets ?? []) {
			if (q && !p.name.toLowerCase().includes(q)) continue;
			const list = folders.get(p.folder) ?? [];
			list.push(p);
			folders.set(p.folder, list);
		}
		return [...folders]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([folder, list]) => ({ folder, label: folder.split('/').join(' / '), presets: list.sort(byName) }));
	});

	onMount(() => {
		void port.presets().then((list) => (presets = list));
	});

	async function choose(p: PresetChoice) {
		target = p;
		spot = null;
		spotRows = null;
		spotRows = (await port.rows(p.path)) ?? [];
	}

	function back() {
		target = null;
		spotRows = null;
		spot = null;
	}

	/** The top half of a row puts the spot above it; the bottom half below it. */
	function pickSpot(e: MouseEvent, i: number) {
		const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
		spot = e.clientY < box.top + box.height / 2 ? i : i + 1;
	}

	async function confirm() {
		if (!target || spot === null || busy) return;
		busy = true;
		await onpick(target, spot);
		busy = false;
	}
</script>

<div class="pp-layer" class:pp-narrow={narrow} use:portal={document.body}>
	<div class="pp-scrim" aria-hidden="true" onclick={onclose}></div>
	<div class="pp-card" role="dialog" aria-modal="true" aria-label={title}>
		{#if narrow}<div class="pp-grab"><span></span></div>{/if}
		<div class="pp-head">
			{#if target}
				<div class="pp-icon" role="button" tabindex="0" aria-label={t('picker.back')} onclick={back}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
				</div>
			{/if}
			<div class="pp-titles">
				<div class="pp-title">{title}</div>
				<div class="pp-sub">{sub}</div>
			</div>
			<div class="pp-icon" role="button" tabindex="0" aria-label={t('picker.close')} onclick={onclose}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>
			</div>
		</div>

		{#if !target}
			<label class="pp-search">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
				<input type="text" placeholder={t('picker.search')} aria-label={t('picker.search')} bind:value={query} />
			</label>
			<div class="pp-scroll">
				{#each groups as group (group.folder)}
					<div class="pp-label">{group.label}</div>
					<div class="pp-group">
						{#each group.presets as p (p.path)}
							<div
								class="pp-item"
								class:pp-off={p.current}
								role="button"
								tabindex="0"
								aria-disabled={p.current}
								onclick={() => !p.current && void choose(p)}
							>
								<span class="pp-name">{p.name}</span>
								{#if p.current}
									<span class="pp-note">{t('picker.thisPreset')}</span>
								{:else}
									<span class="pp-note">{p.prompts === 1 ? t('picker.promptOne') : t('picker.prompts', { n: p.prompts })}</span>
									<svg class="pp-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
								{/if}
							</div>
						{/each}
					</div>
				{/each}
				{#if presets && !groups.length}
					<div class="pp-empty">{t('picker.noPresets')}</div>
				{/if}
			</div>
		{:else}
			<div class="pp-scroll pp-spots">
				{#if spotRows && !spotRows.length}
					<div class="pp-srow" role="button" tabindex="0" onclick={() => (spot = 0)}></div>
				{/if}
				{#each spotRows ?? [] as row, i (i)}
					{#if spot === i}<div class="pp-drop">{names.join(', ')}</div>{/if}
					<div class="pp-srow" role="button" tabindex="0" onclick={(e) => pickSpot(e, i)}>
						<span class="pp-n">{i + 1}</span>
						<span class="pp-sname" class:pp-ph={row.placeholder}>{row.name}</span>
					</div>
				{/each}
				{#if spotRows && spot === spotRows.length}<div class="pp-drop">{names.join(', ')}</div>{/if}
			</div>
			<div class="pp-foot">
				<div class="pp-go" class:pp-off={spot === null || busy} role="button" tabindex="0" aria-disabled={spot === null || busy} onclick={confirm}>
					{t(verb === 'Copy' ? 'picker.copyHere' : 'picker.moveHere', { what })}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.pp-layer {
		position: fixed;
		inset: 0;
		z-index: var(--layer-modal, 50);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-normal);
		font-family: var(--font-interface);
		font-size: 14px;
	}
	.pp-scrim {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.32);
	}
	.pp-card {
		position: relative;
		width: 420px;
		max-width: calc(100% - 32px);
		height: min(560px, 80vh);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		border-radius: 12px;
		background: var(--background-primary);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
		overflow: hidden;
	}
	.pp-narrow {
		align-items: flex-end;
		font-size: 15px;
	}
	.pp-narrow .pp-card {
		width: 100%;
		max-width: none;
		height: 88%;
		border-radius: 14px 14px 0 0;
		box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.18);
	}
	.pp-grab {
		display: flex;
		justify-content: center;
		padding-top: 8px;
	}
	.pp-grab span {
		width: 36px;
		height: 5px;
		border-radius: 3px;
		background: var(--background-modifier-border);
	}
	.pp-head {
		flex: none;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 12px 8px 10px 16px;
	}
	.pp-head .pp-icon:first-child {
		margin-left: -8px;
	}
	.pp-titles {
		flex: 1;
		min-width: 0;
	}
	.pp-title {
		font-size: 16px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pp-narrow .pp-title {
		font-size: 17px;
	}
	.pp-sub {
		margin-top: 2px;
		font-size: 12.5px;
		color: var(--text-muted);
	}
	.pp-icon {
		width: 36px;
		height: 36px;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		color: var(--text-muted);
		cursor: pointer;
	}
	.pp-icon:hover {
		background: var(--background-modifier-hover);
	}
	.pp-narrow .pp-icon {
		width: 44px;
		height: 44px;
	}
	.pp-search {
		flex: none;
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 16px 8px;
		padding: 0 12px;
		height: 36px;
		border-radius: 10px;
		background: var(--background-secondary);
		color: var(--text-muted);
	}
	.pp-search input,
	.pp-search input:focus {
		flex: 1;
		min-width: 0;
		height: 100%;
		padding: 0;
		border: 0;
		background: none;
		box-shadow: none;
		font-size: inherit;
		color: var(--text-normal);
	}
	.pp-scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 0 16px 16px;
	}
	.pp-label {
		padding: 14px 2px 6px;
		font-size: 12.5px;
		color: var(--text-muted);
	}
	.pp-group {
		border-radius: 10px;
		background: var(--background-secondary);
		overflow: hidden;
	}
	.pp-item {
		min-height: 40px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 12px;
		border-bottom: 1px solid var(--background-modifier-border);
		cursor: pointer;
	}
	.pp-narrow .pp-item {
		min-height: 46px;
	}
	.pp-item:last-child {
		border-bottom: 0;
	}
	.pp-item:hover {
		background: var(--background-modifier-hover);
	}
	.pp-item.pp-off {
		cursor: default;
		color: var(--text-faint);
	}
	.pp-item.pp-off:hover {
		background: none;
	}
	.pp-name {
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pp-note {
		flex: none;
		font-size: 12.5px;
		color: var(--text-muted);
	}
	.pp-item.pp-off .pp-note {
		color: var(--text-faint);
	}
	.pp-chev {
		flex: none;
		color: var(--text-faint);
	}
	.pp-empty {
		padding: 24px 0;
		text-align: center;
		color: var(--text-muted);
	}
	.pp-spots {
		border-top: 1px solid var(--background-modifier-border);
	}
	.pp-srow {
		min-height: 48px;
		display: flex;
		align-items: center;
		gap: 10px;
		border-bottom: 1px solid var(--background-modifier-border);
		cursor: pointer;
	}
	.pp-narrow .pp-srow {
		min-height: 56px;
	}
	.pp-n {
		width: 16px;
		flex: none;
		font-family: var(--font-monospace);
		font-size: 11px;
		color: var(--text-faint);
		text-align: right;
	}
	.pp-sname {
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pp-sname.pp-ph {
		font-style: italic;
	}
	.pp-drop {
		margin: 8px 0;
		padding: 8px 12px;
		border: 1.5px dashed var(--interactive-accent);
		border-radius: 8px;
		background: hsla(var(--interactive-accent-hsl), 0.08);
		color: var(--text-accent);
		font-size: 12.5px;
		font-weight: 600;
	}
	.pp-foot {
		flex: none;
		padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
		border-top: 1px solid var(--background-modifier-border);
	}
	.pp-go {
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: var(--interactive-accent);
		color: var(--text-on-accent);
		font-weight: 600;
		cursor: pointer;
	}
	.pp-narrow .pp-go {
		height: 46px;
		font-size: 16px;
	}
	.pp-go.pp-off {
		opacity: 0.45;
		cursor: default;
	}
</style>
