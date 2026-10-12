import { pushRecent, type SortKey } from './catalog';

interface PrefsData {
	/** L-1: preset paths, opened last first. */
	recent: string[];
	/** L-11 */
	sort: SortKey;
	/** The phone tip ("press and hold…") goes away once press and hold has been used. */
	tipUsed: boolean;
}

const SORTS: readonly SortKey[] = ['edited', 'name', 'prompts'];

/**
 * The library's remembered choices: recent presets, sort, and the phone tip.
 * Loading and saving are passed in, so this file has no Obsidian code.
 * They're kept per device, like Obsidian's own recent files.
 */
export class LibraryPrefs {
	private data: PrefsData;
	private readonly listeners = new Set<() => void>();

	constructor(
		load: () => unknown,
		private readonly save: (data: PrefsData) => void,
	) {
		const saved = (load() ?? {}) as Partial<PrefsData>;
		this.data = {
			recent: Array.isArray(saved.recent) ? saved.recent.filter((p) => typeof p === 'string') : [],
			sort: SORTS.includes(saved.sort as SortKey) ? (saved.sort as SortKey) : 'edited',
			tipUsed: saved.tipUsed === true,
		};
	}

	onChange(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	private set(change: Partial<PrefsData>): void {
		this.data = { ...this.data, ...change };
		this.save(this.data);
		for (const l of this.listeners) l();
	}

	get recent(): readonly string[] {
		return this.data.recent;
	}
	get sort(): SortKey {
		return this.data.sort;
	}
	get tipUsed(): boolean {
		return this.data.tipUsed;
	}

	opened(path: string): void {
		if (this.data.recent[0] === path) return;
		this.set({ recent: pushRecent(this.data.recent, path) });
	}

	/** A preset file was renamed or moved: the recent list follows it. */
	renamed(oldPath: string, newPath: string): void {
		if (!this.data.recent.includes(oldPath)) return;
		this.set({ recent: this.data.recent.map((p) => (p === oldPath ? newPath : p)) });
	}

	setSort(sort: SortKey): void {
		this.set({ sort });
	}

	useTip(): void {
		if (!this.data.tipUsed) this.set({ tipUsed: true });
	}
}
