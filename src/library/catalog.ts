/**
 * The library's list logic (SRS L-1, L-10, L-11): folders, sorting, search,
 * recent presets and time labels. Pure data in, data out. No Obsidian code.
 */

/** One valid preset in a preset folder. */
export interface PresetEntry {
	path: string;
	/** File name without ".json". */
	name: string;
	/** Path of the folder it's in. */
	folder: string;
	/** Last edited, in ms. */
	mtime: number;
	/** Number of prompts in the main prompt order. */
	prompts: number;
}

/** What the library shows: the folders and the valid presets in them. */
export interface LibrarySnapshot {
	/** Top folders (preset folders from the settings). */
	roots: string[];
	/** Every folder inside them, at any depth. */
	folders: string[];
	presets: PresetEntry[];
}

/** L-11: the sort choices, as in the B2 mockups. */
export type SortKey = 'edited' | 'name' | 'prompts';

export const SORT_LABELS: Record<SortKey, string> = {
	edited: 'Last edited',
	name: 'Name, A to Z',
	prompts: 'Most prompts',
};

export interface FolderNode {
	path: string;
	name: string;
	depth: number;
	/** Presets directly inside, sorted. */
	presets: PresetEntry[];
	/** Folders directly inside, sorted. */
	children: FolderNode[];
	/** Newest edit of the presets directly inside, or 0 if none. */
	newest: number;
}

/** A folder to pick in "New preset in…" and "Move to…". */
export interface FolderChoice {
	path: string;
	name: string;
	depth: number;
}

/** The last part of a path. */
export function baseName(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1);
}

function parentOf(path: string): string {
	const i = path.lastIndexOf('/');
	return i < 0 ? '' : path.slice(0, i);
}

function byName(a: { name: string }, b: { name: string }): number {
	return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}

export function sortPresets(presets: readonly PresetEntry[], sort: SortKey): PresetEntry[] {
	const list = [...presets];
	if (sort === 'edited') list.sort((a, b) => b.mtime - a.mtime || byName(a, b));
	else if (sort === 'prompts') list.sort((a, b) => b.prompts - a.prompts || byName(a, b));
	else list.sort(byName);
	return list;
}

function sortFolders(folders: FolderNode[], sort: SortKey): FolderNode[] {
	if (sort === 'edited') return folders.sort((a, b) => b.newest - a.newest || byName(a, b));
	if (sort === 'prompts') return folders.sort((a, b) => b.presets.length - a.presets.length || byName(a, b));
	return folders.sort(byName);
}

/**
 * Preset folders from the settings, minus any that sit inside another one
 * (those show as a folder inside it instead).
 */
export function topFolders(presetFolders: readonly string[]): string[] {
	const unique = [...new Set(presetFolders)];
	return unique.filter((f) => !unique.some((other) => other !== f && f.startsWith(other + '/')));
}

/**
 * L-1: the folder tree. `roots` are the top folders, `folders` every folder
 * inside them (any depth), `presets` every valid preset in them.
 */
export function buildTree(
	roots: readonly string[],
	folders: readonly string[],
	presets: readonly PresetEntry[],
	sort: SortKey,
): FolderNode[] {
	const byFolder = new Map<string, PresetEntry[]>();
	for (const p of presets) {
		const list = byFolder.get(p.folder) ?? [];
		list.push(p);
		byFolder.set(p.folder, list);
	}
	const make = (path: string, depth: number): FolderNode => {
		const own = byFolder.get(path) ?? [];
		const children = folders.filter((f) => parentOf(f) === path).map((f) => make(f, depth + 1));
		return {
			path,
			name: baseName(path),
			depth,
			presets: sortPresets(own, sort),
			children: sortFolders(children, sort),
			newest: own.reduce((max, p) => Math.max(max, p.mtime), 0),
		};
	};
	return sortFolders(
		roots.map((r) => make(r, 0)),
		sort,
	);
}

/** Every folder in the tree, top to bottom, in name order, for picking one. */
export function folderChoices(roots: readonly string[], folders: readonly string[]): FolderChoice[] {
	const out: FolderChoice[] = [];
	const walk = (path: string, depth: number) => {
		out.push({ path, name: baseName(path), depth });
		folders
			.filter((f) => parentOf(f) === path)
			.map((f) => ({ path: f, name: baseName(f) }))
			.sort(byName)
			.forEach((f) => walk(f.path, depth + 1));
	};
	roots
		.map((r) => ({ path: r, name: baseName(r) }))
		.sort(byName)
		.forEach((r) => walk(r.path, 0));
	return out;
}

/** A folded folder's first few preset names, e.g. "Default, Minimal" or "A, B, C…". */
export function peek(node: FolderNode): string {
	const names = node.presets.map((p) => p.name);
	return names.slice(0, 3).join(', ') + (names.length > 3 ? '…' : '');
}

/** L-10: presets whose name contains the query, ignoring case. */
export function searchPresets(presets: readonly PresetEntry[], query: string, sort: SortKey): PresetEntry[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	return sortPresets(
		presets.filter((p) => p.name.toLowerCase().includes(q)),
		sort,
	);
}

/** How many presets the Recent row shows (L-1). */
export const RECENT_COUNT = 4;

/** L-1: the presets opened last, newest first, skipping ones that are gone. */
export function recentPresets(recentPaths: readonly string[], presets: readonly PresetEntry[]): PresetEntry[] {
	const byPath = new Map(presets.map((p) => [p.path, p]));
	return recentPaths
		.map((path) => byPath.get(path))
		.filter((p): p is PresetEntry => !!p)
		.slice(0, RECENT_COUNT);
}

/** Puts `path` first in the recent list. */
export function pushRecent(recentPaths: readonly string[], path: string): string[] {
	return [path, ...recentPaths.filter((p) => p !== path)].slice(0, RECENT_COUNT * 3);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Just now", "5m ago", "2h ago", "Yesterday", "3 Oct", as in the mockups. Older years add the year. */
export function timeLabel(mtime: number, now: number): string {
	const minutes = Math.floor((now - mtime) / 60000);
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes}m ago`;
	if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
	if (minutes < 2880) return 'Yesterday';
	const d = new Date(mtime);
	const label = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
	return d.getFullYear() === new Date(now).getFullYear() ? label : `${label} ${d.getFullYear()}`;
}

/** "1 preset" / "3 presets". */
export function presetCount(n: number): string {
	return n === 1 ? '1 preset' : `${n} presets`;
}

/** Characters a file name can't hold, as Obsidian says. */
const BAD_NAME = /[\\/:*?"<>|]/;

/**
 * L-2: checks a new preset name. Returns the warning to show, or null if it's fine.
 * `taken` is every other file name (without ".json") in the same folder.
 */
export function nameProblem(name: string, taken: readonly string[]): string | null {
	if (BAD_NAME.test(name)) return 'A name can\'t contain any of these: * " \\ / < > : | ?';
	const lower = name.toLowerCase();
	if (taken.some((t) => t.toLowerCase() === lower)) return 'That name is already used in this folder';
	return null;
}
