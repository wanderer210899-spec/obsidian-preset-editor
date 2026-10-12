import { type App, type EventRef, type TAbstractFile, TFile, TFolder } from 'obsidian';
import { isInPresetFolder } from '../files';
import { readPreset } from '../preset';
import { type LibrarySnapshot, type PresetEntry, topFolders } from './catalog';

/** The top preset folders that exist, and every folder inside them (hidden ones left out). */
export function listFolders(app: App, presetFolders: readonly string[]): { roots: string[]; folders: string[] } {
	const roots = topFolders(presetFolders).filter((r) => app.vault.getFolderByPath(r));
	const folders: string[] = [];
	const walk = (folder: TFolder) => {
		for (const child of folder.children) {
			if (child instanceof TFolder && !child.name.startsWith('.')) {
				folders.push(child.path);
				walk(child);
			}
		}
	};
	for (const r of roots) {
		const folder = app.vault.getFolderByPath(r);
		if (folder) walk(folder);
	}
	return { roots, folders };
}

/**
 * Keeps a list of the valid presets in the preset folders (SRS F-1, F-3),
 * and follows changes made anywhere: the library, the editor, Obsidian's
 * file list, sync.
 */
export class PresetsIndex {
	private entries = new Map<string, PresetEntry>();
	private refs: EventRef[] = [];
	private readonly listeners = new Set<() => void>();
	private timer: ReturnType<typeof setTimeout> | null = null;

	constructor(
		private readonly app: App,
		private readonly presetFolders: () => readonly string[],
	) {}

	async start(): Promise<void> {
		const { vault } = this.app;
		this.refs = [
			vault.on('create', (f) => void this.changed(f)),
			vault.on('modify', (f) => void this.changed(f)),
			vault.on('delete', (f) => this.removed(f.path, f instanceof TFolder)),
			vault.on('rename', (f, oldPath) => {
				this.removed(oldPath, f instanceof TFolder);
				if (f instanceof TFolder) void this.rescan();
				else void this.changed(f);
			}),
		];
		await this.rescan();
	}

	stop(): void {
		for (const ref of this.refs) this.app.vault.offref(ref);
		this.refs = [];
		if (this.timer) clearTimeout(this.timer);
		this.listeners.clear();
	}

	/** Calls `listener` after the list changes. Returns a function that stops it. */
	onChange(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	snapshot(): LibrarySnapshot {
		const { roots, folders } = listFolders(this.app, this.presetFolders());
		return { roots, folders, presets: [...this.entries.values()] };
	}

	/** Reads every file again, e.g. after the preset folders change. */
	async rescan(): Promise<void> {
		this.entries.clear();
		const files = this.app.vault.getFiles().filter((f) => this.counts(f));
		await Promise.all(files.map((f) => this.read(f)));
		this.notify();
	}

	private counts(file: TAbstractFile): file is TFile {
		return file instanceof TFile && file.extension === 'json' && isInPresetFolder(file.path, this.presetFolders());
	}

	private async changed(file: TAbstractFile): Promise<void> {
		if (file instanceof TFolder) {
			if (isInPresetFolder(file.path, this.presetFolders())) this.notify();
			return;
		}
		if (!this.counts(file)) return;
		await this.read(file);
		this.notify();
	}

	private removed(path: string, isFolder: boolean): void {
		if (isFolder) {
			for (const key of [...this.entries.keys()]) if (key.startsWith(path + '/')) this.entries.delete(key);
		} else {
			this.entries.delete(path);
		}
		this.notify();
	}

	/** F-3: only valid presets are listed. */
	private async read(file: TFile): Promise<void> {
		const content = readPreset(await this.app.vault.cachedRead(file));
		if (!content) {
			this.entries.delete(file.path);
			return;
		}
		this.entries.set(file.path, {
			path: file.path,
			name: file.basename,
			folder: file.parent?.path ?? '',
			mtime: file.stat.mtime,
			prompts: content.order.length,
		});
	}

	/** Changes often come in bursts (a move, a sync), so the list updates once after them. */
	private notify(): void {
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(() => {
			this.timer = null;
			for (const l of this.listeners) l();
		}, 50);
	}
}
