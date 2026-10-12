import type { LibrarySnapshot, SortKey } from '../catalog';

/** The library's remembered choices, as the screen sees them. */
export interface LibraryPrefsModel {
	readonly recent: readonly string[];
	readonly sort: SortKey;
	readonly tipUsed: boolean;
	setSort(sort: SortKey): void;
	useTip(): void;
	onChange(listener: () => void): () => void;
}

/**
 * Everything the library screen needs. The screen knows nothing about
 * Obsidian or files; it works through this.
 */
export interface LibraryModel {
	snapshot(): LibrarySnapshot;
	/** Calls `listener` after the presets or folders change. Returns a function that stops it. */
	onChange(listener: () => void): () => void;
	prefs: LibraryPrefsModel;
	open(path: string): Promise<void>;
	/** Returns a warning to show under the name box, or null when done. */
	rename(path: string, name: string): Promise<string | null>;
	move(paths: readonly string[], folder: string): Promise<void>;
	remove(paths: readonly string[]): Promise<void>;
	/** Returns the new preset's path, or null if it failed. */
	create(folder: string): Promise<string | null>;
}

/** One entry in a menu or sheet. */
export interface MenuItem {
	label: string;
	onPick: () => void;
	danger?: boolean;
	/** Shows a tick (the current sort). */
	checked?: boolean;
	/** Shows a folder icon, indented by depth. */
	folderDepth?: number;
	/** Greyed out, with a note (e.g. "Already here"). */
	disabledNote?: string;
	/** A line above this item. */
	separator?: boolean;
}
