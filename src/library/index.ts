/**
 * Library module (SRS 3.8): the library tab, its ribbon button and commands,
 * and New preset. It links to the rest of the plugin only through what
 * registerLibrary is given, plus the preset reader and the preset-folder check.
 */
import { FileView, Notice, type Plugin, TFile } from 'obsidian';
import { LibraryActions } from './actions';
import { folderChoices } from './catalog';
import { FolderPickModal } from './folder-modal';
import { LibraryPrefs } from './prefs';
import { listFolders } from './presets-index';
import { LIBRARY_VIEW_TYPE, LibraryView } from './view';

export interface LibraryOptions {
	presetFolders: () => readonly string[];
	onFoldersChange: (listener: () => void) => () => void;
	/** L-7: opens a preset in the editor, in a new tab. */
	openPreset: (file: TFile) => Promise<void>;
	/** The editor's view type, to keep the recent list (L-1). */
	editorViewType: string;
}

/** Recent presets and sort are kept per device, in Obsidian's local storage. */
const PREFS_KEY = 'preset-editor-library';

export function registerLibrary(plugin: Plugin, options: LibraryOptions): void {
	const { app } = plugin;
	const prefs = new LibraryPrefs(
		() => app.loadLocalStorage(PREFS_KEY),
		(data) => app.saveLocalStorage(PREFS_KEY, data),
	);
	const actions = new LibraryActions(app, options.openPreset);

	plugin.registerView(
		LIBRARY_VIEW_TYPE,
		(leaf) => new LibraryView(leaf, { presetFolders: options.presetFolders, onFoldersChange: options.onFoldersChange, actions, prefs }),
	);

	// L-1: a preset shown in the editor, opened from anywhere, goes to the top of Recent.
	plugin.registerEvent(
		app.workspace.on('file-open', (file) => {
			if (!file) return;
			const inEditor = app.workspace
				.getLeavesOfType(options.editorViewType)
				.some((leaf) => leaf.view instanceof FileView && leaf.view.file === file);
			if (inEditor) prefs.opened(file.path);
		}),
	);
	plugin.registerEvent(
		app.vault.on('rename', (file, oldPath) => {
			if (file instanceof TFile) prefs.renamed(oldPath, file.path);
		}),
	);

	const openLibrary = async () => {
		const existing = app.workspace.getLeavesOfType(LIBRARY_VIEW_TYPE)[0];
		const leaf = existing ?? app.workspace.getLeaf('tab');
		if (!existing) await leaf.setViewState({ type: LIBRARY_VIEW_TYPE, active: true });
		await app.workspace.revealLeaf(leaf);
	};

	plugin.addRibbonIcon('sliders-horizontal', 'Open preset library', () => void openLibrary());
	plugin.addCommand({ id: 'open-library', name: 'Open preset library', callback: () => void openLibrary() });
	// L-3, L-6: in the library it shows "New preset in…"; elsewhere a folder list.
	plugin.addCommand({
		id: 'new-preset',
		name: 'New preset',
		callback: () => {
			const library = app.workspace.getActiveViewOfType(LibraryView);
			if (library) {
				library.newPreset();
				return;
			}
			const { roots, folders } = listFolders(app, options.presetFolders());
			if (!roots.length) {
				new Notice('Add a preset folder in the plugin settings first.');
				return;
			}
			new FolderPickModal(app, folderChoices(roots, folders), async (folder) => {
				const path = await actions.create(folder);
				if (path) await actions.open(path);
			}).open();
		},
	});
}
