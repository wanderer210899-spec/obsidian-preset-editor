<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { portal } from './actions';
	import EditPane from './EditPane.svelte';
	import PreviewPane from './PreviewPane.svelte';
	import Segmented from './Segmented.svelte';
	import SidePanel from './SidePanel.svelte';
	import { type EditorDocument, type Engine, type Mode, type SaveState, sizesFor, type Tab } from './types';

	interface Props {
		doc: EditorDocument;
		/** Obsidian's view header actions; the mode switch and panel button go there. */
		header: HTMLElement;
		title: string;
		/** E-6: show the Undo and Redo buttons (Obsidian mobile only). */
		undoButton: boolean;
	}
	let { doc, header, title, undoButton }: Props = $props();

	let rows = $state(untrack(() => doc.rows()));
	let shownTitle = $state(untrack(() => title));
	let status = $state<SaveState>('saved');
	let mode = $state<Mode>('edit');
	let engine = $state<Engine>('new');
	let tab = $state<Tab>('order');
	let panelOpen = $state(true);
	let drawer = $state(false);
	let pop = $state<string | null>(null);
	let flash = $state<string | null>(null);
	let narrow = $state(false);
	let canUndo = $state(untrack(() => doc.canUndo()));
	let canRedo = $state(untrack(() => doc.canRedo()));

	const sizes = $derived(sizesFor(narrow));
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

	onMount(() => {
		const stop = doc.onChange(() => {
			rows = doc.rows();
			canUndo = doc.canUndo();
			canRedo = doc.canRedo();
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

	function setMode(next: Mode) {
		if (next === mode) return;
		mode = next;
		tab = next === 'edit' ? 'order' : 'vars';
		pop = null;
		scroller.scrollTop = 0;
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
		await tick();
		showRow(id);
	}

	/** E-4: adds a prompt at position `at`, then puts the cursor in its name. */
	async function insert(at: number) {
		const id = doc.insert(at);
		pop = null;
		mode = 'edit';
		await tick();
		showRow(id);
		const name = scroller.querySelector<HTMLInputElement>(`[data-anchor="${CSS.escape(id)}"] input[data-name]`);
		name?.focus({ preventScroll: true });
		name?.select();
	}

	function onPointerDown(e: PointerEvent) {
		if (pop && !narrow && !(e.target as Element | null)?.closest?.('[data-pop-keep]')) pop = null;
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key !== 'Escape') return;
		pop = null;
		drawer = false;
	}
</script>

<svelte:window onpointerdown={onPointerDown} onkeydown={onKeyDown} />

<div class="pe-vars header" use:portal={header}>
	{#if !narrow && mode === 'preview'}
		<span class="engine-label">Macro engine</span>
		<Segmented
			options={[
				{ value: 'new' as Engine, label: 'New' },
				{ value: 'legacy' as Engine, label: 'Legacy' },
			]}
			value={engine}
			onpick={(v) => (engine = v)}
		/>
	{/if}
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
					tapToReveal={narrow || noHover}
					ontogglepop={(id) => (pop = pop === id ? null : id)}
					oninsert={insert}
				/>
			{:else}
				<PreviewPane {sizes} {engine} onpickengine={(v) => (engine = v)} />
			{/if}
		</div>
		{#if narrow && drawer}
			<div class="scrim" role="presentation" onclick={() => (drawer = false)}></div>
		{/if}
		<div class="panel" class:narrow class:hidden={!narrow && !panelOpen} class:open={drawer}>
			<SidePanel
				{doc}
				{rows}
				{sizes}
				{tab}
				{flash}
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
	}
	.header {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--text-muted);
	}
	.engine-label {
		font-size: 12.5px;
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
