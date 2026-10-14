<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { kindOf } from '../kinds';
	import type { VariableInfo } from '../variables';
	import { sortable } from './actions';
	import Grip from './Grip.svelte';
	import PresetPicker from './PresetPicker.svelte';
	import type { PickedActions } from './select-actions';
	import SelectBar from './SelectBar.svelte';
	import Segmented from './Segmented.svelte';
	import type { EditorDocument, PresetChoice, PresetPort, Sizes, Tab, UiRow } from './types';
	import VariablesPanel from './VariablesPanel.svelte';

	interface Props {
		doc: EditorDocument;
		rows: UiRow[];
		/** SRS 3.5 */
		vars: VariableInfo[];
		sizes: Sizes;
		tab: Tab;
		flash: string | null;
		/** C-5: the prompt that's open in the editor is marked here too. */
		openId: string | null;
		/** SRS 3.7: select mode's actions, and the other presets. */
		actions: PickedActions;
		port: PresetPort;
		onpicktab: (tab: Tab) => void;
		onjump: (id: string) => void;
		onclose: () => void;
	}
	let { doc, rows, vars, sizes, tab, flash, openId, actions, port, onpicktab, onjump, onclose }: Props = $props();

	/** M-2: select mode and the picked prompts. */
	let selecting = $state(false);
	const picked = new SvelteSet<string>();
	/** M-1: the open Copy to… or Move to… list. */
	let picker = $state<{ verb: 'Copy' | 'Move'; ids: string[]; names: string[] } | null>(null);
	/** M-3: the row being dragged with the picked ones, and their names for its label. */
	let dragging = $state<{ id: string; others: string } | null>(null);
	/** M-3: the prompts a group drag just moved light up, as in O.4. */
	let lit = $state<string[]>([]);
	let litTimer: ReturnType<typeof setTimeout> | undefined;

	// Prompts that are gone (Undo, the file changed) are no longer picked.
	$effect(() => {
		const ids = new Set(rows.map((r) => r.id));
		for (const id of [...picked]) if (!ids.has(id)) picked.delete(id);
	});
	$effect(() => () => clearTimeout(litTimer));

	function start(first?: string) {
		picked.clear();
		if (first) picked.add(first);
		selecting = true;
	}

	/** M-2: select mode ends after every action, and with Done. */
	function stop() {
		selecting = false;
		picked.clear();
		picker = null;
	}

	function toggle(id: string) {
		if (picked.has(id)) picked.delete(id);
		else picked.add(id);
	}

	function selectAll() {
		for (const r of rows) picked.add(r.id);
	}

	/** The picked prompts in list order. */
	const pickedIds = () => rows.filter((r) => picked.has(r.id)).map((r) => r.id);

	function remove() {
		if (actions.delete(pickedIds())) stop();
	}

	/** M-1, M-4: opens the preset list for the picked prompts that can go. */
	function openPicker(verb: 'Copy' | 'Move') {
		const ids = pickedIds();
		if (!actions.canSend(ids)) return;
		const { go } = actions.split(ids);
		picker = { verb, ids, names: go.map((r) => r.prompt.name ?? r.id) };
	}

	async function send(target: PresetChoice, at: number) {
		if (!picker) return;
		const done = picker.verb === 'Copy' ? await actions.copy(target, at, picker.ids) : await actions.move(target, at, picker.ids);
		if (done) stop();
	}

	/** M-3: in select mode, dragging a picked prompt takes the other picked ones with it. */
	function groupOf(id: string): string[] | null {
		return selecting && picked.has(id) ? pickedIds().filter((p) => p !== id) : null;
	}

	function groupStart(id: string, others: string[]) {
		const names = rows.filter((r) => others.includes(r.id)).map((r) => r.prompt.name ?? r.id);
		dragging = { id, others: names.join(', ') };
	}

	function groupEnd(to: number) {
		dragging = null;
		const ids = pickedIds();
		if (!actions.drag(ids, to)) return;
		stop();
		lit = ids;
		clearTimeout(litTimer);
		litTimer = setTimeout(() => (lit = []), 1600);
	}

	// M-2: on a phone, pressing and holding a prompt starts select mode (as L-9). Moving the finger cancels it.
	const HOLD_MS = 500;
	let holdTimer: ReturnType<typeof setTimeout> | undefined;
	let held = false;
	let holdStart = { x: 0, y: 0 };

	function down(e: PointerEvent, id: string) {
		held = false;
		clearTimeout(holdTimer);
		if (e.pointerType !== 'touch' || selecting) return;
		holdStart = { x: e.clientX, y: e.clientY };
		holdTimer = setTimeout(() => {
			held = true;
			start(id);
			navigator.vibrate?.(10);
		}, HOLD_MS);
	}
	function moveFinger(e: PointerEvent) {
		if (Math.abs(e.clientX - holdStart.x) > 10 || Math.abs(e.clientY - holdStart.y) > 10) clearTimeout(holdTimer);
	}
	function up() {
		clearTimeout(holdTimer);
	}

	/** A tap on a name jumps to the prompt, or picks it in select mode. */
	function tapName(id: string) {
		if (held) {
			held = false;
			return;
		}
		if (selecting) toggle(id);
		else onjump(id);
	}

	/** Esc closes the preset list, or ends select mode. True if it did something. */
	export function escape(): boolean {
		if (picker) picker = null;
		else if (selecting) stop();
		else return false;
		return true;
	}
</script>

<div class="hd" style:height={sizes.narrow ? '56px' : '48px'}>
	<Segmented
		fill
		options={[
			{ value: 'order' as Tab, label: 'Order', count: rows.length },
			{ value: 'vars' as Tab, label: 'Variables', count: vars.length },
		]}
		value={tab}
		onpick={onpicktab}
		height={sizes.narrow ? '36px' : '26px'}
	/>
	{#if sizes.narrow}
		<div class="close" role="button" tabindex="0" title="Close" onclick={onclose}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>
		</div>
	{/if}
</div>

{#if tab === 'order'}
	{#if selecting}
		<div class="selhd">
			<div class="link" role="button" tabindex="0" onclick={selectAll}>Select all</div>
			<div class="count">{picked.size} selected</div>
			<div class="link" role="button" tabindex="0" onclick={stop}>Done</div>
		</div>
	{:else}
		<div class="hintrow">
			<div class="hint">Drag a handle to reorder · {sizes.narrow ? 'tap' : 'click'} a name to jump to it</div>
			<div class="link" role="button" tabindex="0" onclick={() => start()}>Select</div>
		</div>
	{/if}
	<div
		class="list"
		use:sortable={{
			handle: '.pe-grip',
			onMove: (id, to) => doc.move(id, to),
			groupOf,
			onGroupStart: groupStart,
			onGroupEnd: groupEnd,
		}}
	>
		{#each rows as row, i (row.id)}
			<div
				class="orow"
				class:flash={flash === row.id || lit.includes(row.id)}
				class:open={openId === row.id && !selecting}
				class:picked={selecting && picked.has(row.id)}
				data-row={row.id}
				style:height={sizes.oRowH}
			>
				<Grip width={sizes.gripW} height="100%" />
				{#if selecting}
					<div
						class="pick"
						role="checkbox"
						tabindex="0"
						aria-checked={picked.has(row.id)}
						aria-label="Pick {row.prompt.name ?? row.id}"
						onclick={() => toggle(row.id)}
					>
						<span class="circle" class:on={picked.has(row.id)} style:width={sizes.narrow ? '22px' : '18px'} style:height={sizes.narrow ? '22px' : '18px'}>
							{#if picked.has(row.id)}
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"></path></svg>
							{/if}
						</span>
					</div>
				{/if}
				<span class="n">{i + 1}</span>
				<div
					class="name"
					role="button"
					tabindex="0"
					title={selecting ? 'Pick' : 'Jump to prompt'}
					class:ph={kindOf(row.id).startsWith('placeholder')}
					style:opacity={row.enabled ? 1 : 0.45}
					onpointerdown={(e) => down(e, row.id)}
					onpointermove={moveFinger}
					onpointerup={up}
					onpointerleave={up}
					onpointercancel={up}
					onclick={() => tapName(row.id)}
				>
					<span>{row.prompt.name ?? row.id}</span>
					{#if dragging?.id === row.id && dragging.others}
						<span class="others">+ {dragging.others}</span>
					{/if}
				</div>
				<div
					class="dot-hit"
					role="switch"
					aria-checked={row.enabled}
					tabindex="0"
					title={row.enabled ? 'On — click to switch off' : 'Off — click to switch on'}
					onclick={() => doc.setEnabled(row.id, !row.enabled)}
				>
					<span class="dot" class:on={row.enabled}></span>
				</div>
			</div>
		{/each}
	</div>
	{#if selecting}
		<SelectBar
			count={picked.size}
			narrow={sizes.narrow}
			oncopy={() => openPicker('Copy')}
			onmove={() => openPicker('Move')}
			ondelete={remove}
		/>
	{/if}
{:else}
	<VariablesPanel {vars} narrow={sizes.narrow} {onjump} />
{/if}

{#if picker}
	<PresetPicker verb={picker.verb} names={picker.names} narrow={sizes.narrow} {port} onpick={send} onclose={() => (picker = null)} />
{/if}

<style>
	.hd {
		flex: none;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 8px 0 12px;
	}
	.close {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		cursor: pointer;
		color: var(--text-muted);
	}
	.hintrow,
	.selhd {
		flex: none;
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 2px 14px 8px;
		font-size: 12px;
	}
	.hint {
		flex: 1;
		min-width: 0;
		color: var(--text-muted);
	}
	.selhd {
		align-items: center;
		font-size: 13px;
	}
	.selhd .count {
		flex: 1;
		text-align: center;
		font-weight: 600;
	}
	.link {
		flex: none;
		color: var(--text-accent);
		cursor: pointer;
	}
	.hintrow .link {
		font-size: 13px;
	}
	.list {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 0 8px 16px;
	}
	/* I-5: in the mobile app, the last row clears Obsidian's bottom bar, with one row to spare. */
	:global(body.is-mobile) .list {
		padding-bottom: calc(var(--navbar-height, 0px) + var(--safe-area-inset-bottom, 0px) + 44px);
	}
	.orow {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 0 2px;
		border-radius: 6px;
		background: transparent;
	}
	.orow:hover {
		background: var(--background-modifier-hover);
	}
	.orow.flash,
	.orow.open {
		background: var(--background-modifier-active-hover);
	}
	.orow.picked {
		background: hsla(var(--interactive-accent-hsl), 0.14);
	}
	.pick {
		width: 28px;
		height: 100%;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.circle {
		width: 18px;
		height: 18px;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1.5px solid var(--text-faint);
		border-radius: 50%;
		color: var(--text-on-accent);
	}
	.circle.on {
		border-color: var(--interactive-accent);
		background: var(--interactive-accent);
	}
	.others {
		flex: none;
		max-width: 60%;
		margin-left: auto;
		padding-left: 8px;
		font-size: 11.5px;
		color: var(--text-muted);
	}
	:global(.pe-drag-clone) {
		opacity: 0 !important;
	}
	.orow:global(.pe-lifted) {
		background: var(--background-primary);
		box-shadow: var(--pe-lift);
	}
	.n {
		width: 18px;
		flex: none;
		font-family: var(--font-monospace);
		font-size: 11px;
		color: var(--text-faint);
		text-align: right;
	}
	.name {
		flex: 1;
		min-width: 0;
		height: 100%;
		display: flex;
		align-items: center;
		padding-left: 6px;
		cursor: pointer;
		font-size: 13px;
		color: var(--text-normal);
	}
	.name.ph {
		font-style: italic;
	}
	.name:hover {
		color: var(--text-accent);
	}
	.name span {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.name {
		-webkit-touch-callout: none;
		user-select: none;
	}
	.dot-hit {
		width: 32px;
		height: 100%;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 4px;
		background: var(--pe-toggle-off);
		transition: background 0.15s;
	}
	.dot.on {
		background: var(--interactive-accent);
	}
</style>
