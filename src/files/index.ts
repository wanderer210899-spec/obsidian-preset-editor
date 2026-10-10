/**
 * Files module: decides which vault files the plugin offers to open, and
 * adds "Open in Preset Editor" to their right-click menu (SRS F-2 to F-4).
 * It registers no file extension, so Obsidian's own handling of JSON files,
 * including a single click, is unchanged (F-2, F-6).
 */
import { type App, Notice, type Plugin, TFile } from 'obsidian';
import { readPreset } from '../preset';

/** True if `path` is inside one of `folders`, at any depth. */
export function isInPresetFolder(path: string, folders: readonly string[]): boolean {
	return folders.some((folder) => path.startsWith(folder + '/'));
}

/**
 * Adds the right-click entry. `folders` gives the current preset folders;
 * `open` opens a file that has been checked to be a preset.
 */
export function registerFileMenu(
	plugin: Plugin,
	folders: () => readonly string[],
	open: (file: TFile) => Promise<void>,
): void {
	plugin.registerEvent(
		plugin.app.workspace.on('file-menu', (menu, file) => {
			if (!(file instanceof TFile) || file.extension !== 'json') return;
			if (!isInPresetFolder(file.path, folders())) return;
			menu.addItem((item) =>
				item
					.setTitle('Open in Preset Editor')
					.setIcon('sliders-horizontal')
					.onClick(() => void openIfPreset(plugin.app, file, open)),
			);
		}),
	);
}

/** F-3: opens the file only if it is a valid preset; otherwise says so. */
async function openIfPreset(app: App, file: TFile, open: (file: TFile) => Promise<void>): Promise<void> {
	if (!readPreset(await app.vault.cachedRead(file))) {
		new Notice(`${file.name} isn't a valid preset and can't be opened.`);
		return;
	}
	await open(file);
}
