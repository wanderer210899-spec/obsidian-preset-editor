/** What the plugin saves in its data.json. */
interface SettingsData {
	presetFolders: string[];
}

/**
 * Holds the plugin settings (SRS F-1). Loading and saving are passed in,
 * so this file has no Obsidian code.
 */
export class SettingsStore {
	private data: SettingsData = { presetFolders: [] };

	constructor(
		private readonly load: () => Promise<unknown>,
		private readonly save: (data: SettingsData) => Promise<void>,
	) {}

	async init(): Promise<void> {
		const saved = (await this.load()) as Partial<SettingsData> | null;
		const folders = saved?.presetFolders;
		this.data.presetFolders = Array.isArray(folders) ? folders.filter((f) => typeof f === 'string') : [];
	}

	get presetFolders(): readonly string[] {
		return this.data.presetFolders;
	}

	async addPresetFolder(path: string): Promise<void> {
		if (this.data.presetFolders.includes(path)) return;
		this.data.presetFolders.push(path);
		await this.save(this.data);
	}

	async removePresetFolder(path: string): Promise<void> {
		this.data.presetFolders = this.data.presetFolders.filter((f) => f !== path);
		await this.save(this.data);
	}
}
