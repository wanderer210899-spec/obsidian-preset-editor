import { Plugin } from 'obsidian';
import { registerFileMenu } from './files';
import { SettingsStore, SettingsTab } from './settings';
import { openPresetEditor, PresetEditorView, VIEW_TYPE } from './view';

export default class PresetEditorPlugin extends Plugin {
	settings!: SettingsStore;

	async onload() {
		this.settings = new SettingsStore(
			() => this.loadData(),
			(data) => this.saveData(data),
		);
		await this.settings.init();
		this.addSettingTab(new SettingsTab(this.app, this, this.settings));

		this.registerView(VIEW_TYPE, (leaf) => new PresetEditorView(leaf));
		registerFileMenu(
			this,
			() => this.settings.presetFolders,
			(file) => openPresetEditor(this.app, file),
		);
	}

	onunload() {}
}
