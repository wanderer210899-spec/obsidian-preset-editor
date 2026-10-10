import { type App, normalizePath, Notice, type Plugin, PluginSettingTab, Setting, TFolder } from 'obsidian';
import { FolderSuggest } from './folder-suggest';
import type { SettingsStore } from './store';

/** The plugin's settings page, in Obsidian's standard look (SRS F-1, I-2). */
export class SettingsTab extends PluginSettingTab {
	constructor(
		app: App,
		plugin: Plugin,
		private readonly store: SettingsStore,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Without this Obsidian setting, .json files aren't in the file list (DECISIONS.md, 2026-10-10).
		if (!detectsAllExtensions(this.app)) {
			new Setting(containerEl)
				.setName('JSON files are hidden')
				.setDesc(
					'Obsidian only shows presets in the file list when "Detect all file extensions" is on, in Settings → Files and links.',
				);
		}

		let path = '';
		new Setting(containerEl)
			.setName('Preset folders')
			.setDesc('Vault folders that hold SillyTavern presets.')
			.addText((text) => {
				text.setPlaceholder('Folder').onChange((value) => (path = value));
				new FolderSuggest(this.app, text.inputEl);
			})
			.addButton((button) => button.setButtonText('Add').onClick(() => this.add(path)));

		for (const folder of this.store.presetFolders) {
			new Setting(containerEl).setName(folder).addExtraButton((button) =>
				button
					.setIcon('trash')
					.setTooltip('Remove')
					.onClick(async () => {
						await this.store.removePresetFolder(folder);
						this.display();
					}),
			);
		}
	}

	private async add(input: string): Promise<void> {
		const path = normalizePath(input.trim());
		if (!(this.app.vault.getAbstractFileByPath(path) instanceof TFolder) || path === '/') {
			new Notice(`Folder not found: ${input}`);
			return;
		}
		await this.store.addPresetFolder(path);
		this.display();
	}
}

/** Obsidian's "Detect all file extensions" setting (not in the public API). */
function detectsAllExtensions(app: App): boolean {
	const vault = app.vault as unknown as { getConfig?: (key: string) => unknown };
	return vault.getConfig?.('showUnsupportedFiles') === true;
}
