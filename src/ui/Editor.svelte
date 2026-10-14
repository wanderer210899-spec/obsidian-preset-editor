<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { assemble } from '../assemble';
	import { workOutMacros } from '../macros';
	import { listVariables, type VariableInfo } from '../variables';
	import { findRanges, indexAfter, listMatches, makeQuery, NO_QUERY, replaceRanges, wrapIndex } from '../search';
	import { portal } from './actions';
	import EditPane from './EditPane.svelte';
	import { toggleOpen } from './folding';
	import PreviewPane from './PreviewPane.svelte';
	import SearchBar from './SearchBar.svelte';
	import { PickedActions } from './select-actions';
	import { editSearchables, previewSearchables } from './searchables';
	import Segmented from './Segmented.svelte';
	import SidePanel from './SidePanel.svelte';
	import { setTextSettings } from './text-settings';
	import { type CurrentMatch, type EditorDocument, type Mode, type Notify, type PresetPort, type SaveState, sizesFor, type Tab } from './types';

	interface Props {
		doc: EditorDocument;
		/** Obsidian's view header actions; the mode switch and panel button go there. */
		header: HTMLElement;
		title: string;
		/** E-6: show the Undo and Redo buttons (Obsidian mobile only). */
		undoButton: boolean;
		/** W-5: close tags while typing. */
		autoComplete: boolean;
		/** M-1: the other presets, for Copy to… and Move to…. */
		presets: PresetPort;
		/** M-7: shows a message in Obsidian's message box. */
		notify: Notify;
	}
	let { doc, header, title, undoButton, autoComplete: startAutoComplete, presets, notify }: Props = $props();

	let rows = $state(untrack(() => doc.rows()));
	let shownTitle = $state(untrack(() => title));
	let status = $state<SaveState>('saved');
	let mode = $state<Mode>('edit');
	let tab = $state<Tab>('order');
	let panelOpen = $state(true);
	let drawer = $state(false);
	let pop = $state<string | null>(null);
	let flash = $state<string | null>(null);
	/** C-5, C-6: the one open prompt. Starts with none, so every prompt is folded. */
	let openId = $state<string | null>(null);
	/** C-4: the search bar. */
	let searchOpen = $state(false);
	let query = $state('');
	let matchIndex = $state(0);
	/** C-7: goes up with each step, so the view scrolls to the current match once. */
	let jumpSeq = $state(0);
	/** C-8 */
	let matchCase = $state(false);
	/** C-9: the replace box. */
	let replaceOpen = $state(false);
	let replacement = $state('');
	let searchBar = $state<SearchBar>();
	let narrow = $state(false);
	let canUndo = $state(untrack(() => doc.canUndo()));
	let canRedo = $state(untrack(() => doc.canRedo()));
	let autoComplete = $state(untrack(() => startAutoComplete));
	/** SRS 3.7: select mode's actions and messages. */
	const actions = untrack(() => new PickedActions(doc, presets, notify, () => undo()));
	let sidePanel = $state<SidePanel>();
	setTextSettings({
		get autoComplete() {
			return autoComplete;
		},
	});

	const sizes = $derived(sizesFor(narrow));
	// V-4: macros are worked out with SillyTavern's New engine (V-6).
	const blocks = $derived(mode === 'preview' ? assemble(rows, workOutMacros) : []);
	/**
	 * SRS 3.5. Only worked out while the side panel shows, so typing on a phone
	 * stays fast. While it's hidden it keeps the last list.
	 */
	let lastVars: VariableInfo[] = [];
	const vars = $derived.by(() => {
		if (narrow ? drawer : panelOpen) lastVars = listVariables(rows);
		return lastVars;
	});
	const q = $derived(searchOpen ? makeQuery(query, matchCase) : NO_QUERY);
	/** C-9, C-10: replace works in Edit only. While it's open, names aren't searched. */
	const replacing = $derived(replaceOpen && mode === 'edit');
	const searchables = $derived(mode === 'edit' ? editSearchables(rows, !replacing) : previewSearchables(blocks));
	/** C-7: every match, in the order the current view shows them. */
	const matches = $derived(listMatches(searchables, q));
	const current = $derived<CurrentMatch | null>(
		matches.length ? { ...matches[Math.min(matchIndex, matches.length - 1)]!, seq: jumpSeq } : null,
	);
	/** C-4: how many matches each prompt has (shown on folded prompts). */
	const counts = $derived.by(() => {
		const out = new Map<string, number>();
		for (const m of matches) out.set(m.id, (out.get(m.id) ?? 0) + 1);
		return out;
	});
	const countText = $derived(
		!q.text ? '' : matches.length ? `${Math.min(matchIndex, matches.length - 1) + 1} of ${matches.length}` : 'No matches',
	);
	const noHover = window.matchMedia('(hover: none)').matches;

	let root: HTMLDivElement;
	let scroller: HTMLDivElement;
	let flashTimer: ReturnType<typeof setTimeout> | undefined;

	export function setStatus(next: SaveState) {
		status = next;
	}
	export function setTitle(next: string) {
		shownTitle = next;
	}
	export function setAutoComplete(on: boolean) {
		autoComplete = on;
	}

	onMount(() => {
		const stop = doc.onChange(() => {
			rows = doc.rows();
			canUndo = doc.canUndo();
			canRedo = doc.canRedo();
			actions.changed();
		});
		const ro = new ResizeObserver(([entry]) => {
			const n = (entry?.contentRect.width ?? 0) < 760;
			if (n !== narrow) {
				narrow = n;
				drawer = false;
				pop = null;
			}
		});
		ro.observe(root);
		return () => {
			stop();
			ro.disconnect();
			clearTimeout(flashTimer);
		};
	});

	async function setMode(next: Mode) {
		if (next === mode) return;
		mode = next;
		tab = next === 'edit' ? 'order' : 'vars';
		pop = null;
		matchIndex = 0;
		scroller.scrollTop = 0;
		// Edit and Preview both land on the prompt that's open (from the 1.3 mockup).
		if (!openId) return;
		await tick();
		const attr = next === 'edit' ? 'data-anchor' : 'data-pv';
		const el = scroller.querySelector<HTMLElement>(`[${attr}="${CSS.escape(openId)}"]`);
		if (el) scroller.scrollTop = Math.max(0, el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 12);
	}

	/** C-1, C-5: opens a prompt (folding the open one) or folds it. Its settings close with it. */
	function toggleRow(id: string) {
		openId = toggleOpen(openId, id);
		if (pop !== openId) pop = null;
	}

	/**
	 * C-4: Ctrl+F and the search button. If the bar is open, its text is selected.
	 * C-9: Ctrl+H also shows the replace box.
	 */
	export function openSearch(withReplace = false) {
		if (withReplace) setReplaceOpen(true);
		if (searchOpen) searchBar?.focus();
		else searchOpen = true;
	}

	/** Closing resets everything, so the replace box starts hidden and Match case starts off next time (C-8, C-9). */
	function closeSearch() {
		searchOpen = false;
		query = '';
		matchIndex = 0;
		matchCase = false;
		replaceOpen = false;
		replacement = '';
	}

	function onQuery(next: string) {
		query = next;
		void goToMatch(0);
	}

	function toggleMatchCase() {
		matchCase = !matchCase;
		void goToMatch(0);
	}

	/**
	 * C-10: showing or hiding the replace box adds or drops name matches.
	 * The current match stays if it's still there; otherwise the next one in the text takes over.
	 */
	function setReplaceOpen(open: boolean) {
		const was = current;
		replaceOpen = open;
		if (!was) return;
		const k = matches.findIndex((m) => m.id === was.id && m.inName === was.inName && m.from === was.from);
		if (k !== -1) matchIndex = k;
		else void goToMatch(indexAfter(matches, ids(), was.id, was.inName ? 0 : was.from));
	}

	/** The prompts the current view searches, in order. */
	function ids(): string[] {
		return searchables.map((s) => s.id);
	}

	/**
	 * C-7: shows match number `k` (wrapping round). In Edit the prompt opens;
	 * in Preview the view stays in Preview. A match in the text scrolls into
	 * the middle; a match in a name scrolls its prompt to the top.
	 */
	async function goToMatch(k: number) {
		matchIndex = wrapIndex(k, matches.length);
		jumpSeq++;
		const m = matches[matchIndex];
		if (!m) return;
		if (mode === 'edit') openRow(m.id);
		// Edit: the text box scrolls to its own match (PromptText).
		if (mode === 'edit' && !m.inName) return;
		await tick();
		await new Promise(requestAnimationFrame);
		const attr = mode === 'edit' ? 'data-anchor' : 'data-pv';
		const row = scroller.querySelector<HTMLElement>(`[${attr}="${CSS.escape(m.id)}"]`);
		if (!row) return;
		const hit = m.inName ? null : row.querySelector<HTMLElement>('.pe-now');
		const target = hit ?? row;
		const top =
			target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - (hit ? scroller.clientHeight / 2 : 12);
		scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
	}

	/** C-10: replaces the current match, then goes to the next one. One undo step. */
	function replaceOne() {
		const m = current;
		if (!replacing || !m || m.inName) return;
		const text = rows.find((r) => r.id === m.id)?.prompt.content ?? '';
		doc.setTexts([{ id: m.id, content: replaceRanges(text, [m], replacement) }]);
		void goToMatch(indexAfter(matches, ids(), m.id, m.from + replacement.length));
	}

	/** C-10: replaces every match, in prompts that are on or off. One undo step. */
	function replaceAll() {
		if (!replacing || !matches.length) return;
		const changes = searchables
			.filter((s) => counts.has(s.id))
			.map((s) => ({ id: s.id, content: replaceRanges(s.text, findRanges(s.text, q), replacement) }));
		doc.setTexts(changes);
		void goToMatch(0);
	}

	/** Opens a prompt so a jump, Undo or a new prompt lands on its text. */
	function openRow(id: string) {
		openId = id;
		if (pop !== id) pop = null;
	}

	function togglePanel() {
		if (narrow) {
			drawer = !drawer;
			pop = null;
		} else panelOpen = !panelOpen;
	}

	function flashRow(id: string) {
		flash = id;
		clearTimeout(flashTimer);
		flashTimer = setTimeout(() => {
			if (flash === id) flash = null;
		}, 1600);
	}

	function showRow(id: string) {
		flashRow(id);
		const el = scroller.querySelector<HTMLElement>(`[data-anchor="${CSS.escape(id)}"]`);
		if (!el) return;
		const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 12;
		scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
	}

	/** E-6: Ctrl+Z and the Undo button. */
	export function undo() {
		void reveal(doc.undo());
	}
	/** E-6: Ctrl+Shift+Z, Ctrl+Y and the Redo button. */
	export function redo() {
		void reveal(doc.redo());
	}

	/** E-6: flashes the prompt an undo or redo changed, and scrolls to it if it is off screen. */
	async function reveal(id: string | null) {
		if (!id || mode !== 'edit') return;
		openRow(id);
		await tick();
		const el = scroller.querySelector<HTMLElement>(`[data-anchor="${CSS.escape(id)}"]`);
		if (!el) return;
		const box = el.getBoundingClientRect();
		const view = scroller.getBoundingClientRect();
		if (box.bottom > view.top && box.top < view.bottom) flashRow(id);
		else showRow(id);
	}

	/** E-7 */
	async function jump(id: string) {
		mode = 'edit';
		drawer = false;
		pop = null;
		openRow(id);
		await tick();
		showRow(id);
	}

	/** E-4: adds a prompt at position `at`, then puts the cursor in its name. */
	async function insert(at: number) {
		const id = doc.insert(at);
		pop = null;
		mode = 'edit';
		openRow(id);
		await tick();
		showRow(id);
		const name = scroller.querySelector<HTMLInputElement>(`[data-anchor="${CSS.escape(id)}"] input[data-name]`);
		name?.focus({ preventScroll: true });
		name?.select();
	}

	function onPointerDown(e: PointerEvent) {
		if (pop && !narrow && !(e.target as Element | null)?.closest?.('[data-pop-keep]')) pop = null;
	}

	/** Esc, while the Preset Editor is the tab in use. */
	export function escape() {
		if (sidePanel?.escape()) return;
		pop = null;
		drawer = false;
		closeSearch();
	}
</script>

<svelte:window onpointerdown={onPointerDown} />

<div class="pe-vars header" use:portal={header}>
	{#if !narrow}
		<Segmented
			options={[
				{ value: 'edit' as Mode, label: 'Edit' },
				{ value: 'preview' as Mode, label: 'Preview' },
			]}
			value={mode}
			onpick={setMode}
		/>
	{/if}
	{#if undoButton && (canUndo || canRedo)}
		<!-- Both show once either can be used; the other is greyed out (DECISIONS.md, 2026-10-10).
		     mousedown is cancelled so a text box keeps focus and the keyboard stays up. -->
		<div
			class="hbtn"
			class:narrow
			class:off={!canUndo}
			role="button"
			tabindex="-1"
			title="Undo"
			aria-label="Undo"
			aria-disabled={!canUndo}
			onmousedown={(e) => e.preventDefault()}
			onclick={undo}
		>
			<svg width={narrow ? 20 : 17} height={narrow ? 20 : 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"></path><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"></path></svg>
		</div>
		<div
			class="hbtn"
			class:narrow
			class:off={!canRedo}
			role="button"
			tabindex="-1"
			title="Redo"
			aria-label="Redo"
			aria-disabled={!canRedo}
			onmousedown={(e) => e.preventDefault()}
			onclick={redo}
		>
			<svg width={narrow ? 20 : 17} height={narrow ? 20 : 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"></path><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"></path></svg>
		</div>
	{/if}
	<div
		class="hbtn"
		class:narrow
		class:open={searchOpen}
		role="button"
		tabindex="0"
		title={narrow ? 'Find in prompts' : 'Find in prompts (Ctrl+F)'}
		aria-label="Find in prompts"
		onclick={() => (searchOpen ? closeSearch() : openSearch())}
	>
		<svg width={narrow ? 20 : 17} height={narrow ? 20 : 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
	</div>
	<div
		class="hbtn"
		class:narrow
		class:open={!narrow && panelOpen}
		role="button"
		tabindex="0"
		title={narrow ? 'Prompt order & variables' : 'Toggle prompt order & variables'}
		onclick={togglePanel}
	>
		<svg width={narrow ? 20 : 17} height={narrow ? 20 : 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M15 3v18"></path></svg>
	</div>
</div>

<div class="pe-vars root" bind:this={root}>
	{#if narrow}
		<div class="top">
			<Segmented
				fill
				radius="9px"
				height="34px"
				fontSize="14px"
				options={[
					{ value: 'edit' as Mode, label: 'Edit' },
					{ value: 'preview' as Mode, label: 'Preview' },
				]}
				value={mode}
				onpick={setMode}
			/>
		</div>
	{/if}
	{#if searchOpen}
		<SearchBar
			bind:this={searchBar}
			{query}
			count={countText}
			{narrow}
			{matchCase}
			canReplace={mode === 'edit'}
			{replaceOpen}
			{replacement}
			onquery={onQuery}
			onstep={(by) => void goToMatch(matchIndex + by)}
			onclose={closeSearch}
			onmatchcase={toggleMatchCase}
			ontogglereplace={() => setReplaceOpen(!replaceOpen)}
			onreplacement={(text) => (replacement = text)}
			onreplace={replaceOne}
			onreplaceall={replaceAll}
		/>
	{/if}
	<div class="body">
		<div class="scroll" bind:this={scroller}>
			{#if mode === 'edit'}
				<EditPane
					{doc}
					{rows}
					title={shownTitle}
					{status}
					{sizes}
					{pop}
					{flash}
					{openId}
					ontoggleopen={toggleRow}
					query={q}
					{counts}
					{current}
					tapToReveal={narrow || noHover}
					ontogglepop={(id) => (pop = pop === id ? null : id)}
					oninsert={insert}
				/>
			{:else}
				<PreviewPane {blocks} {sizes} query={q} {current} onjump={jump} />
			{/if}
		</div>
		{#if narrow && drawer}
			<div class="scrim" role="presentation" onclick={() => (drawer = false)}></div>
		{/if}
		<div class="panel" class:narrow class:hidden={!narrow && !panelOpen} class:open={drawer}>
			<SidePanel
				bind:this={sidePanel}
				{doc}
				{actions}
				port={presets}
				{rows}
				{vars}
				{sizes}
				{tab}
				{flash}
				{openId}
				onpicktab={(t) => (tab = t)}
				onjump={jump}
				onclose={() => (drawer = false)}
			/>
		</div>
	</div>
</div>

<style>
	:global(body.theme-light) .pe-vars,
	.pe-vars {
		--pe-macro: #6a3fe0;
		--pe-macro-bg: rgba(124, 77, 255, 0.09);
		--pe-var: #0a7366;
		--pe-var-bg: rgba(10, 122, 106, 0.08);
		--pe-ctl: #9a5800;
		--pe-ctl-bg: rgba(178, 107, 0, 0.08);
		--pe-val-bg: rgba(10, 122, 106, 0.13);
		--pe-unsup-bg: rgba(178, 107, 0, 0.1);
		--pe-unsup-text: #7a4600;
		--pe-toggle-off: #d0d0d0;
		--pe-flash: rgba(138, 92, 245, 0.1);
		--pe-seg-bg: #efefef;
		--pe-seg-active: #ffffff;
		--pe-seg-shadow: 0 1px 2px rgba(0, 0, 0, 0.14);
		--pe-shadow-pop: 0 16px 40px rgba(0, 0, 0, 0.14);
		--pe-lift: 0 12px 30px rgba(0, 0, 0, 0.12), 0 0 0 1px #8a5cf5;
		--pe-scrim: rgba(0, 0, 0, 0.28);
		--pe-hit: rgba(255, 190, 0, 0.42);
		--pe-now: rgba(255, 128, 0, 0.6);
		--pe-pair: rgba(56, 132, 255, 0.16);
	}
	:global(body.theme-dark) .pe-vars {
		--pe-macro: #b49cfb;
		--pe-macro-bg: rgba(138, 92, 245, 0.16);
		--pe-var: #6cc8b8;
		--pe-var-bg: rgba(79, 193, 176, 0.13);
		--pe-ctl: #e3aa5c;
		--pe-ctl-bg: rgba(224, 167, 86, 0.13);
		--pe-val-bg: rgba(79, 193, 176, 0.2);
		--pe-unsup-bg: rgba(224, 167, 86, 0.14);
		--pe-unsup-text: #e3c08e;
		--pe-toggle-off: #4a4a4a;
		--pe-flash: rgba(138, 92, 245, 0.16);
		--pe-seg-bg: #2a2a2a;
		--pe-seg-active: #3d3d3d;
		--pe-seg-shadow: none;
		--pe-shadow-pop: 0 16px 40px rgba(0, 0, 0, 0.5);
		--pe-lift: 0 12px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px #8a5cf5;
		--pe-scrim: rgba(0, 0, 0, 0.5);
		--pe-hit: rgba(255, 190, 0, 0.32);
		--pe-now: rgba(255, 128, 0, 0.62);
		--pe-pair: rgba(96, 165, 255, 0.22);
	}
	.header {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--text-muted);
	}
	.hbtn {
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		cursor: pointer;
		color: var(--text-muted);
	}
	.hbtn.open {
		background: var(--background-modifier-hover);
	}
	.hbtn:hover {
		background: var(--background-modifier-hover);
		color: var(--text-normal);
	}
	.hbtn.off {
		opacity: 0.35;
	}
	.hbtn.narrow {
		width: 44px;
		height: 44px;
		border-radius: 8px;
	}
	.root {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--background-primary);
		color: var(--text-normal);
		font-family: var(--font-interface);
		font-size: 14px;
	}
	.top {
		flex: none;
		padding: 10px 16px;
		border-bottom: 1px solid var(--background-modifier-border);
	}
	.body {
		flex: 1;
		min-height: 0;
		display: flex;
		position: relative;
		overflow: hidden;
	}
	.scroll {
		flex: 1;
		min-width: 0;
		overflow-y: auto;
		overflow-x: hidden;
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
	}
	.scrim {
		position: absolute;
		inset: 0;
		background: var(--pe-scrim);
		z-index: 15;
	}
	.panel {
		flex: none;
		display: flex;
		flex-direction: column;
		position: relative;
		width: 280px;
		max-width: 100%;
		z-index: 20;
		background: var(--background-secondary);
		border-left: 1px solid var(--background-modifier-border);
	}
	.panel.hidden {
		display: none;
	}
	.panel.narrow {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(340px, 88%);
		transform: translateX(105%);
		transition: transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
		box-shadow: -12px 0 40px rgba(0, 0, 0, 0.25);
	}
	.panel.narrow.open {
		transform: translateX(0);
	}
</style>
