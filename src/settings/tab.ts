import { type App, normalizePath, Notice, type Plugin, PluginSettingTab, Setting, TFolder } from 'obsidian';
import { t } from '../i18n';
import { FolderSuggest } from './folder-suggest';
import type { SettingsStore } from './store';

/** The plugin's settings page, in Obsidian's standard look (SRS F-1, W-5, I-2). */
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
				.setName(t('settings.jsonHidden'))
				.setDesc(t('settings.jsonHiddenDesc'));
		}

		let path = '';
		new Setting(containerEl)
			.setName(t('settings.folders'))
			.setDesc(t('settings.foldersDesc'))
			.addText((text) => {
				text.setPlaceholder(t('settings.folderPlaceholder')).onChange((value) => (path = value));
				new FolderSuggest(this.app, text.inputEl);
			})
			.addButton((button) => button.setButtonText(t('settings.add')).onClick(() => this.add(path)));

		for (const folder of this.store.presetFolders) {
			new Setting(containerEl).setName(folder).addExtraButton((button) =>
				button
					.setIcon('trash')
					.setTooltip(t('settings.remove'))
					.onClick(async () => {
						await this.store.removePresetFolder(folder);
						this.display();
					}),
			);
		}

		new Setting(containerEl)
			.setName(t('settings.autoComplete'))
			.setDesc(t('settings.autoCompleteDesc'))
			.addToggle((toggle) => toggle.setValue(this.store.autoComplete).onChange((on) => this.store.setAutoComplete(on)));
	}

	private async add(input: string): Promise<void> {
		const path = normalizePath(input.trim());
		if (!(this.app.vault.getAbstractFileByPath(path) instanceof TFolder) || path === '/') {
			new Notice(t('settings.folderNotFound', { folder: input }));
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
