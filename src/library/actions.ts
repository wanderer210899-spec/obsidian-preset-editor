import { type App, normalizePath, Notice, TFile, TFolder } from 'obsidian';
import { blankPresetText, untitledName } from '../new-preset';
import { baseName, nameProblem, presetCount } from './catalog';

/**
 * What the library does to preset files: open, rename, move, delete, create
 * (SRS L-2, L-6 to L-9, L-13, L-14). Every change goes through Obsidian, so
 * links, open tabs and the file list follow it.
 */
export class LibraryActions {
	constructor(
		private readonly app: App,
		/** L-7: opens a preset in the editor, in a new tab. */
		private readonly openPreset: (file: TFile) => Promise<void>,
	) {}

	private file(path: string): TFile | null {
		return this.app.vault.getFileByPath(path);
	}

	/** Names (without extension) of the other `.json` files in `folder`. */
	private takenNames(folder: string, except?: string): string[] {
		const dir = this.app.vault.getFolderByPath(folder);
		if (!dir) return [];
		return dir.children
			.filter((c): c is TFile => c instanceof TFile && c.extension === 'json' && c.path !== except)
			.map((c) => c.basename);
	}

	async open(path: string): Promise<void> {
		const file = this.file(path);
		if (file) await this.openPreset(file);
	}

	/** L-2: returns a warning to show under the name box, or null when done. */
	async rename(path: string, name: string): Promise<string | null> {
		const file = this.file(path);
		if (!file) return null;
		const problem = nameProblem(name, this.takenNames(file.parent?.path ?? '', file.path));
		if (problem) return problem;
		try {
			await this.app.fileManager.renameFile(file, normalizePath(`${file.parent?.path ?? ''}/${name}.json`));
		} catch (e) {
			console.error('Preset Editor: rename failed', e);
			return "Couldn't rename this preset";
		}
		new Notice(`Renamed to “${name}”`);
		return null;
	}

	/** L-8, L-9: moves presets into `folder`. A preset whose name is taken there stays put. */
	async move(paths: readonly string[], folder: string): Promise<void> {
		let moved = 0;
		const stuck: string[] = [];
		for (const path of paths) {
			const file = this.file(path);
			if (!file || file.parent?.path === folder) continue;
			if (nameProblem(file.basename, this.takenNames(folder))) {
				stuck.push(file.basename);
				continue;
			}
			try {
				await this.app.fileManager.renameFile(file, normalizePath(`${folder}/${file.name}`));
				moved++;
			} catch (e) {
				console.error('Preset Editor: move failed', e);
				stuck.push(file.basename);
			}
		}
		const where = baseName(folder);
		if (moved) new Notice(`Moved ${presetCount(moved)} to ${where}`);
		if (stuck.length) new Notice(`Couldn't move ${stuck.map((n) => `“${n}”`).join(', ')}: ${where} already has a preset with that name.`);
	}

	/**
	 * L-13: Obsidian's own delete box, one per preset, as Obsidian's file list
	 * does. It follows Obsidian's settings for deleted files.
	 */
	async remove(paths: readonly string[]): Promise<void> {
		const gone: string[] = [];
		for (const path of paths) {
			const file = this.file(path);
			if (!file) continue;
			await this.app.fileManager.promptForDeletion(file);
			if (!this.file(path)) gone.push(file.basename);
		}
		if (gone.length === 1) new Notice(`Deleted “${gone[0]}”`);
		else if (gone.length > 1) new Notice(`Deleted ${presetCount(gone.length)}`);
	}

	/** L-4 to L-6: makes a new preset in `folder`. Returns its path, or null if it failed. */
	async create(folder: string): Promise<string | null> {
		if (!(this.app.vault.getAbstractFileByPath(folder) instanceof TFolder)) return null;
		const taken = this.takenNames(folder).map((n) => n.toLowerCase());
		const name = untitledName((n) => taken.includes(n.toLowerCase()));
		try {
			const file = await this.app.vault.create(normalizePath(`${folder}/${name}.json`), blankPresetText());
			return file.path;
		} catch (e) {
			console.error('Preset Editor: new preset failed', e);
			new Notice("Couldn't make a new preset.");
			return null;
		}
	}
}
