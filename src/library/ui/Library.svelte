<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		baseName,
		buildTree,
		folderChoices,
		type FolderNode,
		peek,
		presetCount,
		type PresetEntry,
		recentPresets,
		searchPresets,
		SORT_LABELS,
		type SortKey,
		timeLabel,
	} from '../catalog';
	import { headerSlot, pressable } from './actions';
	import FolderRow from './FolderRow.svelte';
	import Icon from './Icon.svelte';
	import MenuList from './MenuList.svelte';
	import MoveDialog from './MoveDialog.svelte';
	import PresetRow from './PresetRow.svelte';
	import RecentRow from './RecentRow.svelte';
	import SelectBar from './SelectBar.svelte';
	import Sheet from './Sheet.svelte';
	import type { LibraryModel, MenuItem } from './types';

	interface Props {
		model: LibraryModel;
		/** Obsidian's view header actions; the narrow layout's "+" goes there. */
		header: HTMLElement;
		/** The phone tip only shows in the Obsidian mobile app. */
		isMobile: boolean;
	}
	let { model, header, isMobile }: Props = $props();

	/** Below this width the library uses the phone layout (B2 Phone mockup). */
	const NARROW_PX = 600;
	const noHover = window.matchMedia('(hover: none)').matches;

	let snap = $state(untrack(() => model.snapshot()));
	let sort = $state<SortKey>(untrack(() => model.prefs.sort));
	let recentPaths = $state<readonly string[]>(untrack(() => model.prefs.recent));
	let tipUsed = $state(untrack(() => model.prefs.tipUsed));
	let now = $state(Date.now());
	let narrow = $state(false);
	let query = $state('');
	/** L-1: folders start folded. */
	const openFolders = new SvelteSet<string>();
	let selecting = $state(false);
	const picked = new SvelteSet<string>();
	let renaming = $state<string | null>(null);
	let renameValue = $state('');
	let renameError = $state('');
	let renameBusy = false;
	let flash = $state<string | null>(null);
	/** Wide layout: the open popover (a row's menu, New preset, Sort). */
	let pop = $state<{ kind: 'row'; path: string } | { kind: 'new' } | { kind: 'sort' } | null>(null);
	/** Narrow layout: the open sheet. */
	let sheet = $state<{ kind: 'row'; path: string } | { kind: 'new' } | { kind: 'sort' } | { kind: 'move'; paths: string[] } | null>(null);
	/** Wide layout: the "Move to…" box. */
	let moveBox = $state<string[] | null>(null);

	let root: HTMLDivElement;
	let flashTimer: ReturnType<typeof setTimeout> | undefined;

	const byPath = $derived(new Map(snap.presets.map((p) => [p.path, p])));
	const tree = $derived(buildTree(snap.roots, snap.folders, snap.presets, sort));
	const choices = $derived(folderChoices(snap.roots, snap.folders));
	const q = $derived(query.trim());
	const results = $derived(searchPresets(snap.presets, q, sort));
	const recent = $derived(recentPresets(recentPaths, snap.presets));
	const moreOnHover = $derived(!narrow && !noHover);

	type Item =
		| { kind: 'folder'; node: FolderNode }
		| { kind: 'preset'; p: PresetEntry; depth: number }
		| { kind: 'empty'; text: string; depth: number };

	/** The list as rows, top to bottom: each open folder shows its presets, then its folders. */
	const items = $derived.by(() => {
		const out: Item[] = [];
		if (q) {
			for (const p of results) out.push({ kind: 'preset', p, depth: -1 });
			if (!results.length) out.push({ kind: 'empty', text: `No presets match “${q}”`, depth: -1 });
			return out;
		}
		const add = (node: FolderNode) => {
			out.push({ kind: 'folder', node });
			if (!openFolders.has(node.path)) return;
			for (const p of node.presets) out.push({ kind: 'preset', p, depth: node.depth });
			node.children.forEach(add);
			if (!node.presets.length && !node.children.length) out.push({ kind: 'empty', text: 'No presets here yet', depth: node.depth });
		};
		tree.forEach(add);
		return out;
	});

	onMount(() => {
		const stopIndex = model.onChange(() => {
			snap = model.snapshot();
			for (const path of [...picked]) if (!snap.presets.some((p) => p.path === path)) picked.delete(path);
		});
		const stopPrefs = model.prefs.onChange(() => {
			sort = model.prefs.sort;
			recentPaths = model.prefs.recent;
			tipUsed = model.prefs.tipUsed;
		});
		const ro = new ResizeObserver(([entry]) => {
			const n = (entry?.contentRect.width ?? 0) < NARROW_PX;
			if (n !== narrow) {
				narrow = n;
				pop = sheet = moveBox = null;
			}
		});
		ro.observe(root);
		const tick = setInterval(() => (now = Date.now()), 60_000);
		return () => {
			stopIndex();
			stopPrefs();
			ro.disconnect();
			clearInterval(tick);
			clearTimeout(flashTimer);
		};
	});

	/** Esc closes a menu, sheet or box first, then select mode. */
	export function escape() {
		if (pop || sheet || moveBox) {
			pop = sheet = moveBox = null;
		} else if (selecting) {
			stopSelect();
		}
	}

	/** The "New preset" command from inside the library. */
	export function newPreset() {
		closeAll();
		if (narrow) sheet = { kind: 'new' };
		else pop = { kind: 'new' };
	}

	function closeAll() {
		pop = sheet = moveBox = null;
	}

	function flashRow(path: string) {
		clearTimeout(flashTimer);
		flash = path;
		flashTimer = setTimeout(() => (flash = null), 1600);
	}

	/** Unfolds `folder` and every folder above it. */
	function reveal(folder: string) {
		for (const c of choices) if (folder === c.path || folder.startsWith(c.path + '/')) openFolders.add(c.path);
	}

	function toggleFolder(path: string) {
		closeAll();
		if (openFolders.has(path)) openFolders.delete(path);
		else openFolders.add(path);
	}

	function tap(p: PresetEntry) {
		closeAll();
		if (selecting) {
			if (picked.has(p.path)) picked.delete(p.path);
			else picked.add(p.path);
			return;
		}
		void model.open(p.path);
	}

	function startSelect() {
		closeAll();
		renaming = null;
		picked.clear();
		selecting = true;
	}

	function stopSelect() {
		selecting = false;
		picked.clear();
	}

	function longPress(p: PresetEntry) {
		closeAll();
		renaming = null;
		picked.clear();
		picked.add(p.path);
		selecting = true;
		model.prefs.useTip();
	}

	function startRename(p: PresetEntry) {
		closeAll();
		renaming = p.path;
		renameValue = p.name;
		renameError = '';
	}

	async function saveRename() {
		const path = renaming;
		if (!path || renameBusy) return;
		const p = byPath.get(path);
		const name = renameValue.trim();
		if (!p || !name || name === p.name) {
			renaming = null;
			renameError = '';
			return;
		}
		renameBusy = true;
		const problem = await model.rename(path, name);
		renameBusy = false;
		if (renaming !== path) return;
		if (problem) {
			renameError = problem;
			return;
		}
		renaming = null;
		renameError = '';
	}

	function cancelRename() {
		renaming = null;
		renameError = '';
	}

	async function newIn(folder: string) {
		closeAll();
		const path = await model.create(folder);
		if (!path) return;
		query = '';
		stopSelect();
		reveal(folder);
		renaming = path;
		renameValue = baseName(path).replace(/\.json$/, '');
		renameError = '';
		flashRow(path);
	}

	function askMove(paths: string[]) {
		closeAll();
		if (narrow) sheet = { kind: 'move', paths };
		else moveBox = paths;
	}

	async function moveTo(paths: string[], folder: string) {
		closeAll();
		await model.move(paths, folder);
		stopSelect();
		reveal(folder);
		if (paths.length === 1 && paths[0]) flashRow(`${folder}/${baseName(paths[0])}`);
	}

	async function remove(paths: string[]) {
		closeAll();
		await model.remove(paths);
		stopSelect();
	}

	/** L-8: folders to move to. The folder they're all in already is greyed out. */
	function moveItems(paths: string[]): MenuItem[] {
		const folders = new Set(paths.map((path) => byPath.get(path)?.folder));
		const here = folders.size === 1 ? [...folders][0] : undefined;
		return choices.map((c) => ({
			label: c.name,
			folderDepth: c.depth,
			disabledNote: c.path === here ? 'Already here' : undefined,
			onPick: () => void moveTo(paths, c.path),
		}));
	}

	function moveTitle(paths: string[]): string {
		const one = paths.length === 1 ? byPath.get(paths[0] ?? '') : undefined;
		return `Move ${one ? `“${one.name}”` : presetCount(paths.length)} to…`;
	}

	const newItems = $derived<MenuItem[]>(choices.map((c) => ({ label: c.name, folderDepth: c.depth, onPick: () => void newIn(c.path) })));
	const sortItems = $derived<MenuItem[]>(
		(Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({
			label: SORT_LABELS[k],
			checked: sort === k,
			onPick: () => {
				closeAll();
				model.prefs.setSort(k);
			},
		})),
	);

	/** L-12: the desktop menu. */
	function rowMenu(p: PresetEntry): MenuItem[] {
		return [
			{ label: 'Open in new tab', onPick: () => tap(p) },
			{ label: 'Rename', separator: true, onPick: () => startRename(p) },
			{ label: 'Move to…', onPick: () => askMove([p.path]) },
			{ label: 'Delete', danger: true, separator: true, onPick: () => void remove([p.path]) },
		];
	}

	/** L-12: the phone sheet. No "Open": a tap already does that. */
	function rowSheet(p: PresetEntry): MenuItem[] {
		return [
			{ label: 'Rename', onPick: () => startRename(p) },
			{ label: 'Move to…', onPick: () => askMove([p.path]) },
			{ label: 'Delete', danger: true, onPick: () => void remove([p.path]) },
		];
	}

	function onMore(p: PresetEntry) {
		renaming = null;
		if (narrow) {
			closeAll();
			sheet = { kind: 'row', path: p.path };
		} else {
			pop = pop?.kind === 'row' && pop.path === p.path ? null : { kind: 'row', path: p.path };
		}
	}

	const sheetView = $derived.by(() => {
		if (!sheet) return null;
		if (sheet.kind === 'row') {
			const p = byPath.get(sheet.path);
			if (!p) return null;
			return { title: p.name, sub: `${baseName(p.folder)} · ${p.prompts} prompts`, items: rowSheet(p) };
		}
		if (sheet.kind === 'sort') return { title: 'Sort by', sub: undefined, items: sortItems };
		if (sheet.kind === 'new') return { title: 'New preset in…', sub: 'It starts as a copy of SillyTavern’s Default, with empty prompts', items: newItems };
		return { title: moveTitle(sheet.paths), sub: undefined, items: moveItems(sheet.paths) };
	});

	const pickedText = $derived(`${picked.size} picked`);
	const showRecent = $derived(!q && !selecting && recent.length > 0);
	const showTip = $derived(narrow && isMobile && !tipUsed && !q && !selecting && snap.presets.length > 0);
</script>

{#if narrow}
	<div role="button" tabindex="0" use:pressable class="pl-vars clickable-icon view-action pl-hplus" aria-label="New preset" use:headerSlot={header} onclick={() => newPreset()}>
		<Icon name="plus" size={20} stroke={2} />
	</div>
{/if}

<div class="pl-vars pl-root" class:pl-narrow={narrow} bind:this={root}>
	<div class="pl-scroll">
		<div class="pl-page">
			{#if narrow}
				<label class="pl-search">
					<Icon name="search" size={16} stroke={2} />
					<input type="text" placeholder="Search presets" aria-label="Search presets" bind:value={query} onfocus={closeAll} />
					{#if query}<div role="button" tabindex="0" use:pressable class="pl-clear" aria-label="Clear search" onclick={() => (query = '')}><Icon name="x" size={14} stroke={2.2} /></div>{/if}
				</label>
			{:else}
				<div class="pl-top">
					<h1>Presets</h1>
					<span class="pl-grow"></span>
					<label class="pl-search">
						<Icon name="search" size={15} stroke={2} />
						<input type="text" placeholder="Search presets" aria-label="Search presets" bind:value={query} onfocus={closeAll} />
						{#if query}<div role="button" tabindex="0" use:pressable class="pl-clear" aria-label="Clear search" onclick={() => (query = '')}><Icon name="x" size={13} stroke={2.2} /></div>{/if}
					</label>
					<div class="pl-anchor" class:pl-raised={pop?.kind === 'new'}>
						<div role="button" tabindex="0" use:pressable class="pl-newbtn" aria-haspopup="menu" aria-expanded={pop?.kind === 'new'} onclick={() => (pop = pop?.kind === 'new' ? null : { kind: 'new' })}>
							<Icon name="plus" size={14} stroke={2.2} /><span>New preset</span>
						</div>
						{#if pop?.kind === 'new'}
							<div class="pl-spot-new"><MenuList items={newItems} title="New preset in…" label="New preset in" width={220} /></div>
						{/if}
					</div>
				</div>
			{/if}

			{#if showRecent}
				<RecentRow
					{narrow}
					cards={recent.map((p) => ({ path: p.path, name: p.name, folder: baseName(p.folder), when: timeLabel(p.mtime, now) }))}
					onOpen={(path) => {
						closeAll();
						void model.open(path);
					}}
				/>
			{/if}

			<div class="pl-folders">
				{#if q}
					<h2 class="pl-head">{results.length === 1 ? '1 result' : `${results.length} results`}</h2>
				{:else if selecting}
					<div class="pl-headrow">
						<h2 class="pl-head pl-strong">{narrow ? pickedText : `${pickedText} · click presets to pick them`}</h2>
						<div role="button" tabindex="0" use:pressable class="pl-link" onclick={stopSelect}>Done</div>
					</div>
				{:else}
					<div class="pl-headrow">
						<h2 class="pl-head">Folders</h2>
						<div class="pl-anchor" class:pl-raised={pop?.kind === 'sort'}>
							<div role="button" tabindex="0" use:pressable
								class="pl-sortbtn"
								aria-haspopup="menu"
								aria-expanded={pop?.kind === 'sort'}
								onclick={() => {
									if (narrow) {
										closeAll();
										sheet = { kind: 'sort' };
									} else pop = pop?.kind === 'sort' ? null : { kind: 'sort' };
								}}
							>
								<span>{narrow ? SORT_LABELS[sort] : `Sort: ${SORT_LABELS[sort].toLowerCase()}`}</span>
								<Icon name="chevron-down" size={12} stroke={2} />
							</div>
							{#if pop?.kind === 'sort'}
								<div class="pl-spot-sort"><MenuList items={sortItems} label="Sort by" /></div>
							{/if}
						</div>
						<div role="button" tabindex="0" use:pressable class="pl-link" onclick={startSelect}>Select</div>
					</div>
				{/if}

				<div class="pl-list">
					{#if !snap.roots.length}
						<div class="pl-empty">No preset folders yet. Add one in the plugin settings.</div>
					{/if}
					{#each items as item (item.kind === 'folder' ? `f:${item.node.path}` : item.kind === 'preset' ? `p:${item.p.path}` : `e:${item.depth}:${item.text}`)}
						{#if item.kind === 'folder'}
							<FolderRow
								{narrow}
								name={item.node.name}
								depth={item.node.depth}
								open={openFolders.has(item.node.path)}
								count={item.node.presets.length}
								peek={peek(item.node)}
								when={item.node.newest ? timeLabel(item.node.newest, now) : ''}
								onToggle={() => toggleFolder(item.node.path)}
							/>
						{:else if item.kind === 'preset'}
							{@const p = item.p}
							<PresetRow
								{narrow}
								{moreOnHover}
								{selecting}
								name={p.name}
								prompts="{p.prompts} prompts"
								when={timeLabel(p.mtime, now)}
								depth={item.depth}
								folderName={item.depth < 0 ? baseName(p.folder) : undefined}
								picked={picked.has(p.path)}
								flash={flash === p.path}
								renaming={renaming === p.path}
								{renameValue}
								{renameError}
								menuOpen={pop?.kind === 'row' && pop.path === p.path}
								menuItems={pop?.kind === 'row' && pop.path === p.path ? rowMenu(p) : []}
								onTap={() => tap(p)}
								onLongPress={() => longPress(p)}
								onMore={() => onMore(p)}
								onRenameInput={(v) => {
									renameValue = v;
									renameError = '';
								}}
								onRenameSave={() => void saveRename()}
								onRenameCancel={cancelRename}
							/>
						{:else}
							<div class="pl-empty" style:padding-left="{narrow ? (item.depth < 0 ? 14 : 42 + item.depth * 22) : item.depth < 0 ? 8 : 38 + item.depth * 24}px">{item.text}</div>
						{/if}
					{/each}
				</div>
				{#if showTip}<p class="pl-tip">Tip: press and hold a preset to pick several.</p>{/if}
			</div>
		</div>
	</div>

	{#if pop}
		<div class="pl-backdrop" aria-hidden="true" onclick={closeAll}></div>
	{/if}

	{#if selecting}
		<SelectBar
			{narrow}
			count={picked.size}
			onMove={() => askMove([...picked])}
			onDelete={() => void remove([...picked])}
			onStop={stopSelect}
		/>
	{/if}
</div>

{#if sheetView}
	<Sheet title={sheetView.title} sub={sheetView.sub} items={sheetView.items} onClose={closeAll} />
{/if}
{#if moveBox}
	{@const paths = moveBox}
	<MoveDialog title={moveTitle(paths)} items={moveItems(paths)} onClose={closeAll} />
{/if}

<style>
	:global(body.theme-light) :global(.pl-vars),
	:global(.pl-vars) {
		--pl-accent: #7a52e6;
		--pl-accent-text: #6b43d9;
		--pl-pick-bg: rgba(138, 92, 245, 0.1);
		--pl-flash: rgba(138, 92, 245, 0.16);
		--pl-danger: #c42b3b;
		--pl-field: #f3f3f3;
		--pl-line: #f0f0f0;
		--pl-card-line: #e6e6e6;
		--pl-hover: #f7f7f7;
		--pl-menu-bg: #ffffff;
		--pl-menu-line: #e3e3e3;
		--pl-menu-sep: #ececec;
		--pl-menu-hover: #f1f1f1;
		--pl-bar: #262626;
		--pl-bar-sep: #4a4a4a;
		--pl-bar-danger: #ff8a95;
		--pl-shadow: 0 16px 40px rgba(0, 0, 0, 0.14);
		--pl-scrim: rgba(0, 0, 0, 0.28);
		--pl-group: #f6f6f6;
		--pl-group-line: #e9e9e9;
		--pl-row-bg: #ffffff;
		--pl-circle: #b8b8b8;
		--pl-ring: rgba(138, 92, 245, 0.18);
		--pl-ring-line: #8a5cf5;
		--pl-btn2: #f1f1f1;
		--pl-grab: #d0d0d0;
	}
	:global(body.theme-dark) :global(.pl-vars) {
		--pl-accent: #7a52e6;
		--pl-accent-text: #b49cfb;
		--pl-pick-bg: rgba(138, 92, 245, 0.16);
		--pl-flash: rgba(138, 92, 245, 0.24);
		--pl-danger: #ff6b78;
		--pl-field: #2a2a2a;
		--pl-line: #2e2e2e;
		--pl-card-line: #3a3a3a;
		--pl-hover: #252525;
		--pl-menu-bg: #262626;
		--pl-menu-line: #3a3a3a;
		--pl-menu-sep: #3a3a3a;
		--pl-menu-hover: #333333;
		--pl-bar: #3a3a3a;
		--pl-bar-sep: #5a5a5a;
		--pl-bar-danger: #ff8a95;
		--pl-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
		--pl-scrim: rgba(0, 0, 0, 0.5);
		--pl-group: #262626;
		--pl-group-line: #333333;
		--pl-row-bg: #262626;
		--pl-circle: #6a6a6a;
		--pl-ring: rgba(138, 92, 245, 0.3);
		--pl-ring-line: #8a5cf5;
		--pl-btn2: #333333;
		--pl-grab: #555555;
	}
	:global(.pl-vars [role='button']),
	:global(.pl-vars [role^='menuitem']) {
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	:global(.pl-hplus.view-action) {
		color: var(--pl-accent-text);
	}
	.pl-root {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: var(--background-primary);
		color: var(--text-normal);
		font-family: var(--font-interface);
		font-size: 14px;
	}
	.pl-root.pl-narrow {
		font-size: 15px;
	}
	.pl-scroll {
		height: 100%;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}
	.pl-page {
		max-width: 760px;
		margin: 0 auto;
		box-sizing: border-box;
		padding: 28px 24px 120px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.pl-narrow .pl-page {
		max-width: none;
		padding: 16px 0 140px;
		gap: 18px;
	}
	.pl-top {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	h1 {
		margin: 0;
		font-size: 28px;
		font-weight: 700;
		letter-spacing: -0.01em;
	}
	.pl-grow {
		flex: 1;
	}
	.pl-search {
		width: 240px;
		height: 34px;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 6px 0 10px;
		border-radius: 8px;
		background: var(--pl-field);
		color: var(--text-muted);
	}
	.pl-narrow .pl-search {
		width: auto;
		height: 40px;
		flex: none;
		margin: 0 16px;
		padding: 0 6px 0 12px;
		border-radius: 10px;
	}
	.pl-search input,
	.pl-search input:hover,
	.pl-search input:focus {
		flex: 1;
		min-width: 0;
		height: auto;
		padding: 0;
		border: 0;
		background: transparent;
		box-shadow: none;
		outline: none;
		color: var(--text-normal);
		font: inherit;
		font-size: 14px;
	}
	.pl-narrow .pl-search input {
		font-size: 16px;
	}
	.pl-clear {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 5px;
		color: var(--text-muted);
	}
	.pl-narrow .pl-clear {
		width: 32px;
		height: 32px;
	}
	.pl-anchor {
		position: relative;
	}
	.pl-newbtn {
		height: 34px;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 14px;
		border-radius: 8px;
		background: var(--pl-accent);
		color: #ffffff;
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
	}
	.pl-root .pl-newbtn {
		background: var(--pl-accent);
		padding: 0 14px;
		border-radius: 8px;
	}
	.pl-spot-new :global(.pl-menu) {
		right: 0;
		top: 40px;
	}
	.pl-spot-sort :global(.pl-menu) {
		right: 0;
		top: 32px;
	}
	.pl-folders {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.pl-narrow .pl-folders {
		gap: 6px;
		padding: 0 16px;
	}
	.pl-headrow {
		min-height: 30px;
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.pl-head {
		margin: 0;
		flex: 1;
		min-height: 30px;
		display: flex;
		align-items: center;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-muted);
	}
	.pl-head.pl-strong {
		color: var(--text-normal);
	}
	.pl-narrow .pl-head.pl-strong {
		font-size: 14px;
	}
	.pl-sortbtn {
		height: 28px;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 0 8px;
		border-radius: 6px;
		font-size: 12.5px;
		color: var(--text-muted);
	}
	.pl-root .pl-sortbtn {
		padding: 0 8px;
		border-radius: 6px;
	}
	.pl-narrow .pl-sortbtn {
		height: 44px;
		padding: 0 6px;
		font-size: 13px;
	}
	.pl-link {
		display: flex;
		align-items: center;
		height: 28px;
		padding: 0 8px;
		border-radius: 6px;
		font-size: 12.5px;
		font-weight: 600;
		color: var(--pl-accent-text);
	}
	.pl-root .pl-link {
		padding: 0 8px;
		color: var(--pl-accent-text);
	}
	.pl-narrow .pl-link {
		height: 44px;
		font-size: 14px;
	}
	.pl-root.pl-narrow .pl-link {
		padding: 0 6px;
	}
	.pl-list {
		display: flex;
		flex-direction: column;
		border-top: 1px solid var(--pl-line);
	}
	.pl-narrow .pl-list {
		border-top: 0;
		border-radius: 12px;
		background: var(--pl-group);
		overflow: hidden;
	}
	.pl-empty {
		padding: 12px 8px;
		border-bottom: 1px solid var(--pl-line);
		font-size: 13px;
		color: var(--text-muted);
	}
	.pl-narrow .pl-empty {
		padding-top: 16px;
		padding-bottom: 16px;
		padding-right: 14px;
		border-bottom-color: var(--pl-group-line);
		background: var(--pl-row-bg);
		font-size: 14px;
	}
	.pl-tip {
		margin: 4px 2px 0;
		font-size: 12.5px;
		color: var(--text-muted);
	}
	.pl-backdrop {
		position: absolute;
		inset: 0;
		z-index: 4;
		cursor: default;
	}
	.pl-root .pl-backdrop {
		background: transparent;
	}
	.pl-anchor.pl-raised {
		z-index: 5;
	}
	.pl-newbtn:hover {
		background: var(--pl-accent);
	}
</style>
