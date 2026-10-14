import { getLanguage, Plugin } from 'obsidian';
import { registerFileMenu } from './files';
import { setLanguage } from './i18n';
import { listPresets, registerLibrary } from './library';
import { SettingsStore, SettingsTab } from './settings';
import { openPresetEditor, PresetEditorView, VIEW_TYPE } from './view';

export default class PresetEditorPlugin extends Plugin {
	settings!: SettingsStore;

	async onload() {
		// N-1: Obsidian restarts when its language changes, so reading it once is enough.
		setLanguage(getLanguage());
		this.settings = new SettingsStore(
			() => this.loadData(),
			(data) => this.saveData(data),
		);
		await this.settings.init();
		this.addSettingTab(new SettingsTab(this.app, this, this.settings));

		this.registerView(
			VIEW_TYPE,
			(leaf) =>
				new PresetEditorView(leaf, {
					autoComplete: () => this.settings.autoComplete,
					listPresets: () => listPresets(this.app, this.settings.presetFolders),
				}),
		);
		// W-5: open editors follow the "Auto complete" switch straight away.
		this.register(
			this.settings.onChange(() => {
				for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
					if (leaf.view instanceof PresetEditorView) leaf.view.setAutoComplete(this.settings.autoComplete);
				}
			}),
		);
		registerFileMenu(
			this,
			() => this.settings.presetFolders,
			(file) => openPresetEditor(this.app, file),
		);
		registerLibrary(this, {
			presetFolders: () => this.settings.presetFolders,
			onFoldersChange: (listener) => this.settings.onChange(listener),
			openPreset: (file) => openPresetEditor(this.app, file, true),
			editorViewType: VIEW_TYPE,
		});
	}

	onunload() {}
}
